import "jsr:@supabase/functions-js@^2.4.1/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Postmark inbound webhook: BEOs emailed to ryan@oldhawthorne.com arrive here
// instead of being downloaded and re-uploaded by hand on the Events page.
//
// Nothing is applied automatically. An emailed BEO is almost always an UPDATE to
// an event the crew is already working from, so this only ever queues a row in
// pending_beo_imports for the office to review.
//
// Two facts about Postmark drive the shape of this function:
//   1. It retries any non-200 up to 10 times over ~10.5 hours, and a 403 stops
//      retries immediately. So refusals return 403 (don't retry, not our mail)
//      while genuine infrastructure failures return 500 (please do retry).
//   2. Its webhook has no documented timeout, and the Gemini parse can take up
//      to 130s. Parsing inline would risk a timeout being read as failure and
//      redelivering the same email. So we ack immediately and parse in a
//      background task.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const WEBHOOK_SECRET = Deno.env.get("BEO_WEBHOOK_SECRET") || "";

const ALLOWED_SENDER = "rhi@oldhawthorne.com";
const SUBJECT_KEYWORDS = ["beo", "addition"];
const PDF_BUCKET = "beo-emails";

// Headers that still carry the original sender when a forwarding rule rewrites
// From. Checked as a fallback so ingestion survives either mail-server behavior.
const ORIGINAL_SENDER_HEADERS = ["reply-to", "return-path", "x-forwarded-for", "x-original-from"];

interface PostmarkAttachment {
  Name?: string;
  Content?: string;
  ContentType?: string;
  ContentLength?: number;
}

interface PostmarkInbound {
  MessageID?: string;
  From?: string;
  FromFull?: { Email?: string };
  ReplyTo?: string;
  Subject?: string;
  Attachments?: PostmarkAttachment[];
  Headers?: { Name?: string; Value?: string }[];
}

// Optional, and unset by default. With no BEO_WEBHOOK_SECRET this returns true
// and the endpoint is a plain URL, exactly like process-sales-data and
// process-banquets. Setting the variable makes the check load-bearing again
// with no code change.
//
// Requiring it was a deliberate trade that turned out badly: the secret had to
// ride in the webhook URL as HTTP Basic credentials, which made setup fragile
// for no real gain. What actually protects live event data is the review queue —
// nothing reaches a real event without someone pressing Approve — backed by the
// sender, subject and PDF checks below.
//
// Plain equality when enabled: it travels over TLS and the realistic threat is
// guessing or spraying, not timing analysis.
function secretMatches(req: Request): boolean {
  if (!WEBHOOK_SECRET) return true;

  const header = req.headers.get("authorization") || "";
  if (!header.startsWith("Basic ")) return false;

  try {
    const decoded = atob(header.slice("Basic ".length));
    // Postmark sends user:pass; only the password half carries the secret.
    return decoded.slice(decoded.indexOf(":") + 1) === WEBHOOK_SECRET;
  } catch {
    return false;
  }
}

// With the secret optional and normally off, this is the gate that matters.
// The mail arrives through an Outlook *redirect* rule, which preserves the
// original sender, so the From check below is the branch that should fire.
// The header fallback covers a plain forward, which can rewrite From to the
// forwarding mailbox — if that is what fires, this check is weaker than it
// looks and this comment should say so. Confirm against a real message.
function senderAllowed(payload: PostmarkInbound): boolean {
  const from = (payload.FromFull?.Email || payload.From || "").toLowerCase();
  if (from.includes(ALLOWED_SENDER)) return true;

  if ((payload.ReplyTo || "").toLowerCase().includes(ALLOWED_SENDER)) return true;

  return (payload.Headers || []).some((h) =>
    ORIGINAL_SENDER_HEADERS.includes((h.Name || "").toLowerCase()) &&
    (h.Value || "").toLowerCase().includes(ALLOWED_SENDER)
  );
}

// Matches every subject variant in use ("BEO", "BEOs", "UPDATED BEO!",
// "ADDITION...", "ADDITIONS...") without an exact-string list that breaks the
// first time the wording shifts.
function subjectMatches(subject: string): boolean {
  const s = (subject || "").toLowerCase();
  return SUBJECT_KEYWORDS.some((keyword) => s.includes(keyword));
}

// ContentType is checked first but the filename is a necessary fallback: some
// mail clients send PDFs as application/octet-stream.
function findPdf(attachments: PostmarkAttachment[]): PostmarkAttachment | undefined {
  return attachments.find((a) =>
    (a.ContentType || "").toLowerCase().includes("pdf") ||
    (a.Name || "").toLowerCase().endsWith(".pdf")
  );
}

function refuse(reason: string): Response {
  // 403 specifically: it tells Postmark to stop retrying. Any other status would
  // make it redeliver this same message 10 times over the next ~10 hours.
  console.log(`Refused inbound message: ${reason}`);
  return new Response(JSON.stringify({ refused: reason }), {
    status: 403,
    headers: { "Content-Type": "application/json" },
  });
}

// Parses the PDF and resolves the queue row. Runs after the 200 has already been
// sent, so it must never throw out of the handler — every failure path has to
// land in the row as parse_failed, or the email disappears silently.
async function parseInBackground(
  db: ReturnType<typeof createClient>,
  rowId: string,
  pdfBase64: string,
  fromEmail: string,
  subject: string,
) {
  try {
    // Reuses process-beo's Gemini prompt via its parseOnly mode rather than
    // copying it, so the two call sites cannot drift apart.
    const res = await fetch(`${SUPABASE_URL}/functions/v1/process-beo`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ pdfBase64, parseOnly: true }),
    });

    if (!res.ok) throw new Error(`process-beo returned ${res.status}: ${await res.text()}`);

    const { parsedEvents } = await res.json();
    if (!Array.isArray(parsedEvents) || parsedEvents.length === 0) {
      throw new Error("Parser returned no events");
    }

    // A Supabase update resolves with { error } instead of throwing, and a write
    // that matches no rows is not an error at all. Both have to count as failure
    // here, or the row sits at 'processing' forever while the notification below
    // still announces the BEO as received and waiting.
    const { data: updated, error: updateErr } = await db
      .from("pending_beo_imports")
      .update({ status: "pending", parsed_events: parsedEvents })
      .eq("id", rowId)
      .select("id");

    if (updateErr) throw updateErr;
    if (!updated?.length) throw new Error(`Status update matched no rows for ${rowId}`);

    const names = parsedEvents
      .map((e: { event_name?: string }) => e.event_name)
      .filter(Boolean)
      .join(", ");

    const { error: notifyErr } = await db.from("office_notifications").insert({
      kind: "beo_email_received",
      actor_name: fromEmail,
      summary: names || subject || "Emailed BEO awaiting review",
      link: "/office/events",
    });

    // Not fatal — the row is already 'pending', so the queue panel and the
    // Events badge still surface it. Only the bell missed it.
    if (notifyErr) console.error(`No notification written for queued row ${rowId}:`, notifyErr);

    console.log(`Queued ${parsedEvents.length} event(s) from row ${rowId}`);
  } catch (err) {
    console.error(`Parse failed for row ${rowId}:`, err);

    // A failed parse must stay visible. An email that vanishes silently is worse
    // than one that visibly failed, and it is the harder failure to ever notice.
    const { data: failed, error: failErr } = await db
      .from("pending_beo_imports")
      .update({ status: "parse_failed", error_text: String(err) })
      .eq("id", rowId)
      .select("id");

    // There is nothing left to escalate to if this write is the one that fails,
    // so the log has to be unmissable — the row would otherwise read as still
    // processing with no indication it never will.
    if (failErr || !failed?.length) {
      console.error(`STUCK: row ${rowId} could not be marked parse_failed:`, failErr);
    }

    const { error: notifyErr } = await db.from("office_notifications").insert({
      kind: "beo_email_failed",
      actor_name: fromEmail,
      summary: subject || "Emailed BEO could not be read",
      link: "/office/events",
    });

    // On this path the bell is the only signal a human ever sees — a failed row
    // renders no queue card to notice.
    if (notifyErr) console.error(`STUCK: no failure notification for row ${rowId}:`, notifyErr);
  }
}

Deno.serve(async (req) => {
  if (!secretMatches(req)) return refuse("bad or missing secret");

  let payload: PostmarkInbound;
  try {
    payload = await req.json();
  } catch {
    return refuse("body is not JSON");
  }

  if (!senderAllowed(payload)) return refuse(`sender not allowed: ${payload.From || "unknown"}`);
  if (!subjectMatches(payload.Subject || "")) return refuse(`subject not matched: ${payload.Subject || ""}`);

  const pdf = findPdf(payload.Attachments || []);
  if (!pdf?.Content) return refuse("no PDF attachment");

  const messageId = payload.MessageID;
  if (!messageId) return refuse("no MessageID");

  const fromEmail = payload.FromFull?.Email || payload.From || "unknown";
  const subject = payload.Subject || "";

  // Everything past this point is our own infrastructure. Failures here return
  // 500 so Postmark retries — the opposite of the refusals above.
  try {
    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: row, error: insertErr } = await db
      .from("pending_beo_imports")
      .insert({
        postmark_message_id: messageId,
        from_email: fromEmail,
        subject,
        status: "processing",
      })
      .select("id")
      .single();

    if (insertErr) {
      // 23505 = the unique index on postmark_message_id. This is a Postmark
      // retry of a message already accepted, so ack it rather than queueing a
      // second copy or letting it retry again.
      if (insertErr.code === "23505") {
        console.log(`Duplicate delivery of ${messageId} — already queued.`);
        return new Response(JSON.stringify({ duplicate: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      throw insertErr;
    }

    // Postmark truncates stored messages over 1MB and never hosts attachments,
    // so this upload is the only lasting copy of the original.
    const safeName = messageId.replace(/[^a-zA-Z0-9._-]/g, "_");
    const pdfPath = `${safeName}.pdf`;
    const bytes = Uint8Array.from(atob(pdf.Content), (c) => c.charCodeAt(0));

    const { error: uploadErr } = await db.storage
      .from(PDF_BUCKET)
      .upload(pdfPath, bytes, { contentType: "application/pdf", upsert: true });

    // A missing original is not worth discarding a real BEO over — record the
    // row without it and let the parse continue.
    if (uploadErr) {
      console.error(`Failed to store original PDF for ${messageId}:`, uploadErr);
    } else {
      await db.from("pending_beo_imports").update({ pdf_path: pdfPath }).eq("id", row.id);
    }

    EdgeRuntime.waitUntil(
      parseInBackground(db, row.id, pdf.Content, fromEmail, subject)
    );

    return new Response(JSON.stringify({ queued: true, id: row.id }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Failed to accept inbound BEO:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

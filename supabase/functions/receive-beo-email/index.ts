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
// ReserveCloud sends a daily packet of every BEO, including the recurring club
// events the kitchen does not cook for. Those are dropped here so the review
// queue only ever shows work that matters.
//
// The WHOLE name must match. Deliberately strict: a name that merely starts with
// or contains one of these ("Bridgewater Wedding") is a different event, and
// wrongly dropping a real BEO is far worse than leaving one extra card to
// discard. If ReserveCloud ever starts appending dates or suffixes, widen this
// rather than guessing here.
const EXCLUDED_EVENT_NAMES = new Set([
  "bridge",
  "canasta",
  "ladies' league",
  "mahjong monday club",
  "midday mahjong",
  "pops golf",
  "pops poker",
  "stag night",
].map(normalizeEventName));

// Case, padding and apostrophes are all noise. Apostrophes are dropped rather
// than standardised because the parser does not reliably return one at all:
// a test BEO reading "Ladies’ League" came back as "Ladies League", so matching
// on any single spelling would silently miss the event. Removing them makes
// "Ladies' League", "Ladies’ League" and "Ladies League" the same key.
//
// This does not widen matching — the whole name must still match end to end.
function normalizeEventName(name: string): string {
  return name
    .replace(/['‘’ʼ´`]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function shouldImportEvent(event: { event_name?: unknown }): boolean {
  // A nameless event is never silently dropped — it goes to review, where a
  // human can see whatever the parser did produce.
  if (typeof event.event_name !== "string") return true;

  return !EXCLUDED_EVENT_NAMES.has(normalizeEventName(event.event_name));
}

function eventNameOf(event: { event_name?: unknown }): string {
  return typeof event.event_name === "string" ? event.event_name : "(unnamed)";
}
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const WEBHOOK_SECRET = Deno.env.get("BEO_WEBHOOK_SECRET") || "";

const PDF_BUCKET = "beo-emails";

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
  Subject?: string;
  Attachments?: PostmarkAttachment[];
  TextBody?: string;
  HtmlBody?: string;
}

// ReserveCloud's scheduled task does not attach the packet, it emails a link to
// it, so the PDF has to be fetched in two hops:
//
//   1. the emailed link          /web/token/process/<a>/<b>
//      303s to a landing page    /pub/selfService/viewBatchDocumentResults/<c>/<d>
//   2. that page carries exactly one download href, differing from its own URL
//      only by view -> download  /pub/selfService/downloadBatchDocumentResults/<c>/<d>
//      which returns application/pdf
//
// Neither hop needs a login. Attachments are still preferred when present: if
// ReserveCloud's "attach" option ever starts saving, this path stops being used
// without a code change.
const RESERVECLOUD_HOST = /^https?:\/\/(?:www\.)?reservecloud\.com\//i;
const DOWNLOAD_HREF = /href="([^"]*downloadBatchDocumentResults[^"]*)"/i;

// Trailing punctuation is stripped because the URL is being pulled out of prose
// or markup, where it is commonly followed by a quote, bracket or full stop.
function findDocumentLink(payload: PostmarkInbound): string | undefined {
  const body = `${payload.TextBody || ""}\n${payload.HtmlBody || ""}`
    .replace(/&amp;/gi, "&");

  const urls = (body.match(/https?:\/\/[^\s"'<>]+/gi) || [])
    .map((u) => u.replace(/[.,;:)\]}>"']+$/, ""))
    .filter((u) => RESERVECLOUD_HOST.test(u));

  // The token link is the one the scheduled task sends; anything else on
  // reservecloud.com is footer chrome, so only fall back to it if no token
  // link is present.
  return urls.find((u) => /\/web\/token\/process\//i.test(u)) || urls[0];
}

// btoa needs a binary string, and spreading a 270KB packet into
// String.fromCharCode blows the call stack, so convert in chunks.
function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

async function fetchPdfFromLink(link: string): Promise<Uint8Array> {
  const landing = await fetch(link, { redirect: "follow" });
  if (!landing.ok) throw new Error(`ReserveCloud link returned ${landing.status}`);

  // If they ever serve the PDF directly, take it and skip the second hop.
  const contentType = landing.headers.get("content-type") || "";
  if (contentType.toLowerCase().includes("pdf")) {
    return new Uint8Array(await landing.arrayBuffer());
  }

  const html = await landing.text();
  const match = html.match(DOWNLOAD_HREF);
  if (!match) {
    // Most likely the link expired and this is an error page, which would
    // otherwise reach Gemini as a "PDF" and fail confusingly further along.
    throw new Error("No download link on the ReserveCloud page (expired link, or the page changed)");
  }

  const pdfUrl = new URL(match[1], landing.url).toString();
  const res = await fetch(pdfUrl, { redirect: "follow" });
  if (!res.ok) throw new Error(`ReserveCloud download returned ${res.status}`);

  const bytes = new Uint8Array(await res.arrayBuffer());
  // Verify it really is a PDF rather than an HTML error page with a 200.
  if (bytes.length < 5 || String.fromCharCode(...bytes.subarray(0, 5)) !== "%PDF-") {
    throw new Error(`ReserveCloud download was not a PDF (${bytes.length} bytes)`);
  }

  console.log(`Fetched ${bytes.length} byte packet from ${pdfUrl}`);
  return bytes;
}

// Optional, and unset by default. With no BEO_WEBHOOK_SECRET this returns true
// and the endpoint is a plain URL, exactly like process-sales-data and
// process-banquets. Setting the variable makes the check load-bearing again
// with no code change.
//
// Requiring it was a deliberate trade that turned out badly: the secret had to
// ride in the webhook URL as HTTP Basic credentials, which made setup fragile
// for no real gain. What actually protects live event data is the review queue —
// nothing reaches a real event without someone pressing Approve.
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

// ContentType is checked first but the filename is a necessary fallback: some
// mail clients send PDFs as application/octet-stream.
function findPdf(attachments: PostmarkAttachment[]): PostmarkAttachment | undefined {
  return attachments.find((a) =>
    (a.ContentType || "").toLowerCase().includes("pdf") ||
    (a.Name || "").toLowerCase().endsWith(".pdf")
  );
}

// Postmark truncates stored messages over 1MB and never hosts attachments, and
// a ReserveCloud link expires, so this upload is the only lasting copy of the
// original. A missing original is not worth discarding a real BEO over, so a
// failure here is logged and the parse continues.
async function storePdf(
  db: ReturnType<typeof createClient>,
  rowId: string,
  messageId: string,
  bytes: Uint8Array,
) {
  const pdfPath = `${messageId.replace(/[^a-zA-Z0-9._-]/g, "_")}.pdf`;

  const { error: uploadErr } = await db.storage
    .from(PDF_BUCKET)
    .upload(pdfPath, bytes, { contentType: "application/pdf", upsert: true });

  if (uploadErr) {
    console.error(`Failed to store original PDF for ${messageId}:`, uploadErr);
    return;
  }

  await db.from("pending_beo_imports").update({ pdf_path: pdfPath }).eq("id", rowId);
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
  messageId: string,
  attachmentBase64: string | undefined,
  documentLink: string | undefined,
  fromEmail: string,
  subject: string,
) {
  try {
    // Resolving the link happens here rather than in the handler so a dead or
    // expired link fails the same visible way a bad parse does, instead of
    // holding the webhook open or vanishing.
    let pdfBase64 = attachmentBase64;
    if (!pdfBase64) {
      const bytes = await fetchPdfFromLink(documentLink!);
      await storePdf(db, rowId, messageId, bytes);
      pdfBase64 = toBase64(bytes);
    }

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

    const { parsedEvents: allParsedEvents } = await res.json();

    if (!Array.isArray(allParsedEvents) || allParsedEvents.length === 0) {
      throw new Error("Parser returned no events");
    }

    // Drop the recurring club events before anything reaches the review queue.
    const parsedEvents = allParsedEvents.filter(shouldImportEvent);
    const excludedNames = allParsedEvents.filter((e) => !shouldImportEvent(e)).map(eventNameOf);

    // Named, not just counted. The excluded events are about to be discarded, so
    // if the list ever matches a real BEO this line and the excluded_events
    // column are the only way anyone finds out which one went missing.
    console.log(
      `BEO filtering: ${allParsedEvents.length} parsed, ${parsedEvents.length} kept, ` +
      `${excludedNames.length} excluded${excludedNames.length ? ` — ${excludedNames.join(", ")}` : ""}`,
    );

    if (parsedEvents.length === 0) {
      // Every event in the packet was excluded, so there is nothing to review.
      // The original PDF and the excluded names both stay on the row.
      const { data: discarded, error: discardErr } = await db
        .from("pending_beo_imports")
        .update({ status: "discarded", parsed_events: [], excluded_events: excludedNames })
        .eq("id", rowId)
        .select("id");

      if (discardErr) throw discardErr;
      if (!discarded?.length) throw new Error(`Discard update matched no rows for ${rowId}`);

      console.log(`Row ${rowId} discarded — all ${excludedNames.length} event(s) excluded.`);
      return;
    }

    // A Supabase update resolves with { error } instead of throwing, and a write
    // that matches no rows is not an error at all. Both have to count as failure
    // here, or the row sits at 'processing' forever while the notification below
    // still announces the BEO as received and waiting.
    const { data: updated, error: updateErr } = await db
      .from("pending_beo_imports")
      .update({ status: "pending", parsed_events: parsedEvents, excluded_events: excludedNames })
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

  // No sender allowlist and no subject filter, deliberately. Mail can only get
  // here by being redirected to a Postmark inbound address that is a random
  // hash and is known only to the one person who redirects to it, so filtering
  // by sender was checking a property of mail that is already ours. Anything
  // that is not a BEO parses to nothing and lands as parse_failed, which is
  // visible and discardable rather than damaging. from_email is still recorded
  // and shown on the review card — visibility without a gate.
  // An attachment is preferred; the link is the fallback ReserveCloud forces on
  // us. Refusing only when neither is present keeps genuine junk out while
  // still accepting both shapes of real BEO mail.
  const pdf = findPdf(payload.Attachments || []);
  const documentLink = pdf?.Content ? undefined : findDocumentLink(payload);
  if (!pdf?.Content && !documentLink) return refuse("no PDF attachment and no ReserveCloud link");

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

    // An attached PDF is already in hand, so store it before acking. A linked
    // one is fetched in the background task instead, which is what keeps the
    // webhook response fast.
    if (pdf?.Content) {
      await storePdf(db, row.id, messageId, Uint8Array.from(atob(pdf.Content), (c) => c.charCodeAt(0)));
    } else {
      console.log(`No attachment; will fetch packet from ${documentLink}`);
    }

    EdgeRuntime.waitUntil(
      parseInBackground(db, row.id, messageId, pdf?.Content, documentLink, fromEmail, subject)
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

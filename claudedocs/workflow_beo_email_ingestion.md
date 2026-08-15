# Workflow — BEO Email Ingestion via Postmark

**Status:** Phases 1, 2 and 3 built and deployed. Verified end to end against
synthetic mail (2026-08-12/15). Awaiting the first real BEO.
**Created:** 2026-08-10
**Branch:** `main`

**Mail path, as actually configured:** an Outlook **redirect** rule sends Rhi's BEOs
to the Upcoming Banquets Postmark server, whose webhook is the plain URL
`https://<ref>.supabase.co/functions/v1/receive-beo-email` — no credentials. The
endpoint accepts any message carrying a PDF attachment.

Updated BEOs emailed by Rhi land in DailyBrief as a *reviewable queue item*, never as a
silent overwrite of an event the crew is already working from.

---

## Locked decisions

| Decision | Choice |
|---|---|
| Mail routing | Outlook **redirect** rule on `ryan@oldhawthorne.com` → `e6bb2a95fb0aa62b5279e162083bdcea@inbound.postmarkapp.com` |
| Update policy | Queue for review; approve applies it |
| Filtering | PDF attachment required, nothing else — **revised 2026-08-15**, see below |
| ~~Allowlist~~ | ~~`Rhi@oldhawthorne.com`~~ — **removed.** The inbound address is a random hash known only to the one person redirecting mail to it, so the check only ever confirmed mail was already ours. `from_email` is still stored and shown on the review card: visibility without a gate. |
| ~~Subject rule~~ | ~~contains `beo` or `addition`~~ — **removed** with the allowlist. A non-BEO PDF parses to nothing and lands as `parse_failed`, which is visible and discardable rather than damaging. |
| Original PDF | Stored in Supabase Storage |
| Queue UI | "Pending from email" panel atop `/office/events` |
| Review depth | Diff vs. the current BEO |
| Badge | Events sidebar link, via `useOfficeApprovalCounts` pattern |
| Notify | Existing `office_notifications` bell |

## This is the third Postmark inbound pipeline, not the first

A Postmark server's inbound stream has exactly **one** webhook URL, so each pipeline
needs its own server. Existing consumers, both of which predate this work:

| Function | Purpose | State |
|---|---|---|
| `process-sales-data` | Daily item sales reports | **Live.** Newest row 2026-08-11; 198 rows in the trailing 3 days. Do not touch its server. |
| `process-banquets` | Banquet emails, ReserveCloud link fallback | **Dormant.** `upcoming_banquets` last received a row 2026-05-25; all 231 rows are past-dated, so the Events page section already renders empty. |

`e6bb2a95…@inbound.postmarkapp.com` is the **process-banquets** server, deliberately
repurposed for BEOs. Safe because that pipeline is dormant — verified against the data,
not assumed.

**Consequence:** `process-banquets` becomes fully orphaned — no mail source, and its
output table feeds a UI section that shows nothing. Flagged for the owner to decide on;
not deleted as part of this work.

**Consistent with house style, after a detour:** the two existing handlers accept raw
Postmark payloads with no shared secret and no sender allowlist. `receive-beo-email`
briefly required both; both were reversed (2026-08-15) and it now behaves exactly like
them, requiring only a PDF attachment. All three functions being unauthenticated is a
pre-existing exposure worth its own pass — and one the review queue mitigates here in a
way it does not for the other two, since nothing this function accepts reaches a live
event without an explicit Approve.

## Verified constraints

- Postmark inbound accepts **35 MB** of attachments. The widely-quoted 1 MB is Postmark's
  own retention/UI truncation — it does not limit delivery, but it does mean **Postmark is
  not a copy of record**. If we don't store the PDF, it's gone.
- Postmark retries **10 times over ~10.5 hours** on any non-200. A **403 halts retries
  immediately** — this is the correct response for mail we deliberately refuse.
- Attachments arrive **base64 inline** in the webhook JSON as `Attachments[].Content`,
  which matches the `pdfBase64` path `process-beo` already accepts.
- `EdgeRuntime.waitUntil(promise)` is the supported way to respond before work finishes.
- Supabase Edge Functions: **400s wall clock on Pro** (this org is Pro), 2s CPU per request.
  Background tasks run inside the worker's wall-clock window. The Gemini call's own 130s
  timeout fits.

---

## Phase 0 — Recon — **obsolete, never run**

This phase existed to answer one question: does the forwarding hop preserve
`From: Rhi@oldhawthorne.com`, or rewrite it to `ryan@oldhawthorne.com`? The answer
mattered only because the sender allowlist depended on it.

The allowlist is gone, so the question is moot and the phase was dropped without ever
being carried out. Kept here rather than deleted because it records a real cost: two
sessions of design — a header-fallback branch, a "verify which branch fires" caveat, and
a blocked Phase 4 item — spent on a check that turned out not to be worth having.

One thing it would have told us is still unconfirmed and still worth a glance at the
first real message: the actual `Attachments[].ContentType`. `findPdf` accepts anything
containing `pdf` **or** a `.pdf` filename, so an `application/octet-stream` attachment
still matches — but seeing the real value once is cheap.

---

## Phase 1 — Data layer

**Migration** `supabase/migrations/2026081000000_create_pending_beo_imports.sql`

```sql
create table public.pending_beo_imports (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  -- Idempotency guard: Postmark retries up to 10x. Unique so a retry collides
  -- instead of creating a second queue row for the same email.
  postmark_message_id text not null unique,
  from_email          text not null,
  subject             text,
  pdf_path            text,
  status              text not null default 'processing'
    check (status in ('processing','pending','parse_failed','approved','discarded')),
  parsed_events       jsonb,
  error_text          text,
  resolved_at         timestamptz
);
```

- Index on `(status, created_at desc)`.
- RLS allow-all, mirroring `office_notifications` / `time_off_requests`.
- Add to the `supabase_realtime` publication.

**Storage:** private bucket `beo-emails`. Follow the existing upload pattern in
`WorkbookUpload.jsx:69` / `SchedulePage.jsx:705`.

**Migration** — extend the `office_notifications.kind` CHECK with `beo_email_received`
and `beo_email_failed`. Mirror in `NOTIFICATION_KINDS` (`lib/notifications.js:13`) and in
whatever icon/label map `NotificationBell.jsx` uses — the constraint and the client list
must move together.

**Verify:** insert a row by hand, confirm it appears over realtime, confirm a duplicate
`postmark_message_id` is rejected.

---

## Phase 2 — Edge function `receive-beo-email`

`config.toml`: `enabled = true`, `verify_jwt = false` (Postmark can't send a Supabase JWT).

**Auth: none, deliberately — reversed on 2026-08-15.**

This originally required HTTP Basic credentials against a `BEO_WEBHOOK_SECRET`
Supabase secret. That was dropped. The reasoning, recorded because it reverses a
locked decision:

- The secret could only reach the endpoint inside the webhook URL, as
  `https://user:SECRET@host`. Written the natural way, `https://SECRET@host`, the
  secret lands in the *username* half and the password is empty — so every message
  was refused with `bad or missing secret`. That cost a full debugging cycle and
  made setup materially harder than the two existing Postmark pipelines.
- It bought little. `process-sales-data` and `process-banquets` have no secret and
  never have. What actually protects live event data here is the **review queue**:
  a forged submission queues a card for someone to discard, and reaches no real
  event without an explicit Approve.

`secretMatches` is kept but returns `true` when the variable is unset, so the check
can be switched back on by setting `BEO_WEBHOOK_SECRET` — no code change, but the
URL gotcha above comes back with it.

**Gate order and responses** — status codes are load-bearing here:

| Condition | Response | Why |
|---|---|---|
| Bad/missing secret | 403 | Only when `BEO_WEBHOOK_SECRET` is set; unset by default, so normally skipped |
| No PDF attachment | 403 | Nothing to parse; retrying won't help |
| No `MessageID` | 403 | Same — no idempotency key to dedupe on |
| Duplicate `MessageID` | 200 | Already handled — ack cleanly |
| DB or storage failure | **500** | Transient; *let* Postmark retry |

Sender and subject gates were here and were removed on 2026-08-15; see the Locked
decisions table. Verified after removal: a message from an arbitrary address with an
unrelated subject now falls straight through to the PDF check.

Then: insert the row as `processing` → upload the PDF to `beo-emails` →
`EdgeRuntime.waitUntil(parse(...))` → **return 200 immediately**.

**Background task:** call Gemini, then set the row to `pending` with `parsed_events`, or
to `parse_failed` with `error_text`. Write the `office_notifications` row on both paths.
A failed parse must be *visible*, not a dropped email — the same silent-failure trap the
RLS bug set last session.

**Sharing the parse with `process-beo`:** the 50-line Gemini prompt must not be
duplicated, or the two copies will drift. Recommended: add a `parseOnly: true` early
return to `process-beo` (a few lines, no extraction, no behavior change to existing
callers) and have the webhook call it. Alternative if that turns awkward: extract the
prompt and Gemini call into `supabase/functions/_shared/beo-parse.ts` consumed by both.

**Verify:** `curl` each gate and confirm the exact status codes; confirm a real forwarded
email produces one `pending` row with populated `parsed_events` and a retrievable PDF.

---

## Phase 3 — Review UI

- `lib/usePendingBeoImports.js` — rows in `processing` / `pending` / `parse_failed`,
  refetched on realtime changes. Same shape as `useOfficeApprovalCounts`.
- `lib/beoDiff.js` — compare a parsed event against its `banquet_event_orders` row matched
  on `(event_name, event_date)`. Cover `guest_count`, `start_time`, `location`,
  `notes_text`, and section/category item add-remove-change. Pure function, no Supabase.
- `components/PendingBeoPanel.jsx` — panel above the BEO list on `EventsBanquetsPage`,
  rendering the diff with **Approve** and **Discard**.
  - Approve → `supabase.functions.invoke('process-beo', { parsedEvents, overwrite: true })`
    — Mode B already updates in place and preserves `event_tasks`, `event_order_items`,
    and `crew_notes` — then set the row `approved`.
  - Discard → set `discarded`.
  - Both must `.select()` and treat **zero returned rows as failure**. The August 6 RLS
    bug returned no error on a no-op write; checking `error` alone is not enough.
- Extend `useOfficeApprovalCounts` with a `beoImports` count + a realtime listener on the
  new table; render the badge on the Events `NavLink` (`OfficeLayout.jsx:85`).
- **Supersede rule:** a second email for the same `(event_name, event_date)` while one is
  still `pending` replaces the older queue row rather than stacking two.

**Verify:** `npm run build` clean; panel renders against a real queued row; diff matches
the actual PDF; approve preserves crew notes and tasks on the target event.

---

## Phase 4 — End-to-end verification

Live, against production, mirroring the August 6 approach:

Done except item 1, which needs a real message:

1. ⬜ Real BEO redirected from Rhi → panel appears without a refresh; bell increments;
   Events badge increments. **The only step left.** Also note the observed
   `Attachments[].ContentType` while looking (see Phase 0).
2. ✅ Diff matches the source. Verified 2026-08-15 against a planted match: field
   changes, added line, removed line and quantity change all render.
3. ⬜ Two emails naming the same event — **rule changed**: both are kept and the overlap
   is flagged, rather than the older being auto-discarded. Untested; needs two real emails.
4. ✅ Rejections. Now only "no PDF" and "no MessageID" — sender and subject gates were
   removed. Verified an arbitrary sender with an unrelated subject falls through to the
   PDF check.
5. ✅ **Dedupe:** duplicate `MessageID` acked with 200 and no second row.
6. ✅ Parse failure: a non-BEO PDF produced a `parse_failed` row plus a bell
   notification, in 17s.
7. ✅ Bucket confirmed private — signed URL returns the file byte-identical, unsigned
   public access returns 400. Two test PDFs remain in the bucket to delete by hand.

---

## Risks

- **~~From-header rewrite on the forward hop~~** — gone with the allowlist. Nothing now
  depends on which address the redirect presents.
- **The endpoint accepts anything with a PDF** — this is the deliberate trade for a setup
  as simple as `process-sales-data`. The realistic cost of a stray or forged POST is a junk
  card to discard and one wasted Gemini call, not damaged event data, because the review
  queue stands between every submission and any live event. If junk ever actually arrives,
  the cheapest fix is to set `BEO_WEBHOOK_SECRET` — the check is still in the code.
- **`process-beo` is already `verify_jwt = false`** — publicly callable *today*, before this
  feature. Pre-existing, not introduced here. Worth fixing while we're in the file.
- **2s CPU limit** — base64-decoding a multi-MB PDF is real CPU work, and it applies to
  background tasks too. If large BEOs trip it, stream the attachment to Storage rather than
  buffering. Watch item, not a blocker.
- **Prompt drift** between two Gemini call sites — mitigated by `parseOnly`.
- **No test runner on `main`** — the gate is `npm run build` plus the live checks above.
  `beoDiff.js` is pure and would be the one genuinely unit-testable piece if a runner
  ever lands.

---

## Not doing

- Sending mail *out* through Postmark (inbound only).
- Auto-applying updates without review — explicitly rejected.
- Retrofitting a version/history table for BEO rollback.

# Workflow — BEO Email Ingestion via Postmark

**Status:** Phases 1 + 2 built, deployed and verified (2026-08-12). Phase 3 not started.
**Created:** 2026-08-10
**Branch:** `main`

**Blocking before real mail flows:** the Postmark webhook URL must carry the secret
in the *password* half — `https://postmark:SECRET@<ref>.supabase.co/functions/v1/receive-beo-email`.
See Phase 2's auth note.

Updated BEOs emailed by Rhi land in DailyBrief as a *reviewable queue item*, never as a
silent overwrite of an event the crew is already working from.

---

## Locked decisions

| Decision | Choice |
|---|---|
| Mail routing | Conditional forward rule on `ryan@oldhawthorne.com` → `e6bb2a95fb0aa62b5279e162083bdcea@inbound.postmarkapp.com` |
| Update policy | Queue for review; approve applies it |
| Filtering | Sender allowlist + subject keyword + PDF attachment required |
| Allowlist | `Rhi@oldhawthorne.com` — Rhi originates the mail; checked on `FromFull.Email` with an original-sender header fallback |
| Subject rule | Case-insensitive: contains `beo` **or** contains `addition` |
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

**Divergence from house style, deliberate:** the two existing handlers accept raw Postmark
payloads with no shared secret and no sender allowlist. `receive-beo-email` gates on both,
because an emailed BEO overwrites live event data the crew is working from. Those two
functions being unauthenticated is a pre-existing exposure worth its own pass.

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

## Phase 0 — Recon (confirms Phase 2's allowlist; run before deploying)

Rhi originates the mail, so the message landing in Ryan's inbox is
`From: Rhi@oldhawthorne.com`. The open question is the **second** hop — whether Ryan's
forward rule preserves that `From` or replaces it with `ryan@oldhawthorne.com`. That is a
property of the mail server, not of the sender.

Expected: preserved. Google Workspace and Microsoft 365 both leave the `From` header
intact on server-side forwarding rules and rewrite only the envelope sender
(`Return-Path`) for SPF. Expected, not verified — hence this phase.

1. Ryan creates the conditional forward rule (subject contains `BEO` or `ADDITION`) to the
   Postmark inbound address.
2. One real BEO goes through it.
3. Read the message in Postmark's Activity view and record: `From`, `FromFull.Email`,
   `Subject`, `Attachments[].ContentType` / `.Name` / `.ContentLength`, and the raw
   `Headers` array.

**The allowlist is written to tolerate both outcomes**, so this does not block Phase 2:

- Primary — `FromFull.Email` equals `Rhi@oldhawthorne.com` (the expected case).
- Fallback — Rhi's address appears in the original-sender headers (`Reply-To`,
  `X-Forwarded-For`, `Return-Path`) when the server rewrote `From`.

If the fallback is what fires, **say so in the code comment**: with `From` rewritten to
Ryan's own address, the real gate is the forward rule plus the endpoint secret, and the
allowlist should not be described as if it were doing more than it is.

**Output:** confirmation of which branch fires, plus the observed attachment `ContentType`
(so the PDF check matches reality rather than an assumed `application/pdf`).

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

**Auth:** HTTP Basic credentials on the Postmark webhook URL, compared against a
`BEO_WEBHOOK_SECRET` Supabase secret. Preferred over a `?secret=` query param — query
strings land in logs more readily than an `Authorization` header.

**The URL must name a user before the secret.** `secretMatches` reads the half *after*
the first colon, so `https://SECRET@host` — which sends the secret as the username and
an empty password — is refused with `bad or missing secret`. Verified empirically both
ways on 2026-08-12; write it as `https://postmark:SECRET@host`.

**Gate order and responses** — status codes are load-bearing here:

| Condition | Response | Why |
|---|---|---|
| Bad/missing secret | 403 | Retrying won't help; log loudly |
| Sender not allowlisted | 403 | Not our mail; stop retries |
| Subject doesn't match | 403 | Same |
| No PDF attachment | 403 | Same |
| Duplicate `MessageID` | 200 | Already handled — ack cleanly |
| DB or storage failure | **500** | Transient; *let* Postmark retry |

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

1. Real BEO forwarded from Rhi → panel appears without a refresh; bell increments; Events badge increments.
2. Diff matches the PDF. Approve → event updates; tasks/notes/order items survive; badge clears.
3. Second email for the same event supersedes rather than stacks.
4. Rejections: wrong sender, no PDF, junk subject → 403, no queue row, no notification.
5. **Dedupe:** manually retry a delivered message from the Postmark UI → no second row.
6. Parse failure: forward a non-BEO PDF from the allowlisted sender → `parse_failed` row, visible, not silent.
7. Clean up every test row and confirm the `beo-emails` bucket is not public.

---

## Risks

- **From-header rewrite on the forward hop** — handled in code by checking `FromFull.Email`
  first and the original-sender headers second, so either behavior works. Phase 0 confirms
  which one fires; if it's the fallback, the allowlist is weaker than it looks and the
  comment must say so.
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

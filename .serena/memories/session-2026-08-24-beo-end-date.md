# Session 2026-08-24 — BEO single-day end date

Shipped, deployed, committed and pushed. `main` == `origin/main` at `695e03b`.
`process-beo` v16 → **v17**.

## The fix

Ryan had left two uncommitted prompt lines in `process-beo/index.ts` telling Gemini
to null `event_end_date` for single-day events. **They had never been deployed** —
live was still v16 from 2026-08-11, verified by pulling the deployed source.

The bug was real and visible in prod data: the 2026-08-22 packet returned
`event_end_date == event_date` on 11 of 12 events. The 08-21/08-23/08-24 packets
did not, so it looked intermittent.

**It was not model drift.** Ryan corrected my diagnosis by adding
`BEOs/Event-documents (56).pdf`, a real packet. A BEO's `Event Date(s)` row ALWAYS
prints a range — a one-day event reads `08/21/2026 - 08/21/2026`. I extracted the
row from all 27 pages: 24 same-date, 3 multi-day (The Eliminator, one event).
So the old prompt comment (`last day if multi-day, else null`) was asking Gemini to
contradict the page on 24 of 27 pages; it complied on some packets and not others.

Fix = prompt rule rewritten to name the row and its format, PLUS a deterministic
guard after `JSON.parse(rawOutput)`, before the mode split, so Mode A (insert),
Mode B (approve-replay) and Mode C (`parseOnly`) all agree.

`parseOnly` was the load-bearing one: it returns `parsedEvents` raw, so
`pending_beo_imports` stored the same-day date and `beoDiff.js` — which diffs
`event_end_date` as a scalar — reported a phantom "End date" change on every
otherwise-unchanged event. That fed straight into the daily-review-noise problem.

No user-visible damage in the events list: `EventsBanquetsPage.jsx:714` and `:962`
already guard with `event_end_date !== event_date`. `banquet_event_orders` was also
clean (12 rows, 11 null, 1 genuine range) because the daily re-send healed 08-22 via
Mode B in-place updates.

## Verification

Real 27-page/289KB packet through deployed v17 with `parseOnly` (writes nothing):
HTTP 200 in 87.8s, 23 events, 22 null, 1 genuine range, **zero `end === start`**.
Cross-checked event-for-event against a direct pdfjs extraction of the PDF.

`npm run build` deliberately NOT run — no frontend file changed and it does not
compile Deno functions. The production parse against real data is the stronger gate.

## Gotchas worth keeping

- **`supabase functions deploy` returns 401** — the CLI at `/c/tools/supabase` is not
  logged in. Deployed via the Supabase MCP `deploy_edge_function` instead, passing
  `verify_jwt: false` to match `config.toml`. `supabase login` would fix the CLI.
- **`app/read_beo.mjs` is dead** — imports `pdfjs-dist/legacy/build/pdf.js`, but the
  installed package only has `pdf.mjs`. Flagged, not deleted.
- Reading PDFs here: no poppler, so the Read tool cannot render them. Use pdfjs from
  `app/node_modules` via an absolute `file:///` import (a scratchpad script cannot
  resolve `pdfjs-dist` by bare name).

## PII

`BEOs/` is now gitignored — the packet had been staged for commit and page 1 alone
carries a member's home address, personal email, two phone numbers and member number.
**Still open:** `app/sample-data/test_beos/Event-documents (1.pdf` is already tracked
and in git history with the same class of data. Scrubbing needs a history rewrite —
owner's call, not done.

## Still open from prior sessions

ReserveCloud's broken "attach" option (fixing it retires the link-fetch path),
unknown link expiry, per-event dedup on the daily packet, orphaned `process-banquets`,
`claude-test-*.pdf` files in the `beo-emails` bucket (no DELETE policy — dashboard).
Today's pending import `bf3d4b40` holds a pre-fix parse; safe to approve as-is since
its only end-dated event (The Eliminator) is genuinely multi-day.

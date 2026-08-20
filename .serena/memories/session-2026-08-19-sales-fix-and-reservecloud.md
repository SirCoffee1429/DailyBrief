# Session 2026-08-19 — Kitchen assistant sales fix + ReserveCloud BEO packets

Two shipped, pushed, and verified in production. `main` == `origin/main` at `0407eb9`.

## 1. Kitchen assistant sales path — dead since April (`11c9712`, fn v34→v39)

User reported "Sorry, I couldn't complete the calculation." on every sales question.
Root cause: the query selected `total_revenue`, a column replaced by
`total_net_sales`/`net_sales` in `a201c19` on **2026-04-11** — two days after PR #6
shipped the sales path. PostgREST 400'd every request. **Broken for four months.**

Fixing it exposed three more, all of which returned *wrong numbers* rather than errors:
- `error` destructured but never checked → 400 surfaced as "no data".
- Only one tool round served; when a day has no rows Gemini asks again and that
  follow-up came back as a `functionCall`, not text → fell to the error string.
  Now a bounded loop (`MAX_TOOL_ROUNDS = 4`).
- **PostgREST caps responses at 1000 rows.** A month query returned 13 of 25 days
  silently; totals from that slice were reported as the whole month (~50% light).
  `fetchAllSales()` pages until a short page arrives.
- Gemini's arithmetic over ~100 rows/day was consistently wrong (a week came back
  1,718.00 light) while unit counts were exact. `summariseSales()` now computes
  totals by day/category/item in code and marks them authoritative.
- `maxOutputTokens` 2048 → 8192 (thinking budget spans every tool round).

Verified by cross-checking every figure with SQL: July 58,993.50 / 7,360 / 25 days
and Aug-to-18 35,526.00 / 4,163 / 15 all matched exactly. See `mem:` note in the
file memory `reference-supabase-silent-wrong-data`.

Left alone by owner's call: the `toISOString()` "Today is" line (UTC).

## 2. ReserveCloud daily BEO packets (`66b898c`, `0407eb9`, fn v5→v8)

Owner switched the source: ReserveCloud emails a **daily packet as a LINK, not an
attachment**, and added an exclusion list for recurring club events. His filter was
correct but **had never been deployed** — live was still v5 with no filtering.

- Two-hop fetch traced against the real link (mechanics recorded in `CLAUDE.md`).
- Apostrophes are **stripped, not standardised**: the parser returns `Ladies League`
  when the glyph fails and `Ladies' League` when it does not.
- New `excluded_events jsonb` column — dropped events were vanishing with only a
  count in logs, and edge logs expire in days.
- Exact whole-name matching kept deliberately. The real packet holds `Ladies' League`
  (excluded) beside `Ladies' Night League` and `Ladies Night Out` (both real, kept) —
  a fuzzy matcher would have eaten a live event.

Proven end to end: 24-page/274KB packet, webhook acks 1.8s, resolved 42s, 22 events
→ 11 kept / 11 excluded → owner approved → **2 created, 9 updated in place**.

## 3. Codex quarantine (`d2fe8db`)

Repo is also connected to Codex/ChatGPT, which added `AGENTS.md`, `.codex/` and
`.agents/skills/` (188 files / 3.4MB of the bundle disabled on 07-31). None were ever
committed. Removed the bundle and `.codex/`, gitignored all three. **`AGENTS.md` kept
on purpose** — it carries the "make no changes" instruction, so deleting it would
remove the only restraint on Codex. Its `~/.Codex/...` paths are a bad find-and-replace.

## Housekeeping done
- CHANGES.md condensed 642 → 476 lines (07-19…08-04 detail folded into Archive).
- CLAUDE.md at exactly 200/200 with the ReserveCloud + exclusion rules added.

## Open for next session
- ReserveCloud "attach" option won't save (their bug) — fixing it retires the
  link-fetch path entirely. Worth a support ticket.
- Link expiry unknown; `pdf_path` preserves the original but a dead link can't be re-fetched.
- Daily packet re-sends every event (dedup is per MessageID, not per event) → ~11
  cards/day mostly unchanged. Watch a few days before adding per-event dedup.
- `process-banquets` fully orphaned.
- Storage bucket has no DELETE policy; cleanup needs the dashboard.
  Keep `claude-test-LINK-1787148447863.pdf` — misnamed but it is a real approved import.

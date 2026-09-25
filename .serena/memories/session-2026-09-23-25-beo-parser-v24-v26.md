# Session 2026-09-23 → 09-25 — BEO parser: three silent losses fixed (process-beo v23 → v26)

## Trigger
Owner reported "Gemini API timeout 500" on process-beo. Logs one line earlier:
`Geometric parse rejected (24 table line(s) dropped, first: "$26/Doz.")` → Gemini fallback
→ 130s abort on a 42-page packet. **A Gemini timeout here means the gate rejected the packet.**

## Shipped (all deployed via Supabase MCP, verify_jwt=false; commits on main, UNPUSHED)
- **v24 `9b2168b`** — orphan centre line (no label, no qty, no open item) opens an item.
  Case: `SUMMARY: Homecoming Take Out` p41 priced dozen-menu. One block, print order.
- **v25 `3fc2286`** — continuation pages. Page 2+ continues the table with NO section
  header; state now carries per event. Fresh page = has `Event Headcount`/`Start Date`/
  `Primary Contact`. Body starts after `Club Contact:`, `E:` line filtered, first row gap=99.
  Recovered 16 items/packet (Eurofins dinner, Kid's Culinary bev station, ESS bar/desserts).
- **v26 `9f37624`** — gate consumes each printed line once (multiset per event); category
  names keep containment. Continuation page lacking `Club Contact:` → refused.
  Mutation test: misses 278→13 lines /1508, 33→3 items /596; 0 false alarms on 7 packets.

## Data repair
- 09-23 queue row 85edea02 re-parsed (v24) → pending → owner approved.
- New row 4af45801 with Eurofins/Kid's Culinary/ESS (v25) → approved 09-24 04:33 UTC;
  verified live 15/6/41 items.

## Verification recipe (reuse)
Scratchpad Deno with `{"nodeModulesDir":"auto"}`; `git show HEAD:<parser>` = old; diff
flattened items old vs new over all packets; POST to deployed fn `parseOnly:true` (anon key
ok) and compare byte-for-byte. Probe internals by copying the shipped .ts and appending
`export { loadRows, assemble, droppedLines, isFreshPage, bodyStart }` — never retype.
PDFs: private bucket `beo-emails`, anon SELECT policy; local copies in gitignored `BEOs/`.

## Open
1. Events approved from pre-v25 packets may still lack page 2+ → re-parse bucket PDFs, diff live.
2. Gemini fallback can't do a full packet in 130s (any gate rejection = 500).
3. Gate blind to misgrouping; 3 residual misses (line text == a category name).
4. Owner's menu WIP (PDFs, menuDrafts.js, process-menu, spring/summer migration) uncommitted, untouched.

Docs updated: CHANGES.md (09-17 Menu Dishes entry moved to docs/changelog/2026-09.md),
CLAUDE.md BEO parser notes (still 200 lines), auto-memory project-beo-geometric-parser +
feedback-commit-only-session-work.

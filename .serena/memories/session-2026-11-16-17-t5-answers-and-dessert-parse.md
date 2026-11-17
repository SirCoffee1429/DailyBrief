# Session 2026-11-16 → 11-17 — Task 5 passed on real answers; BEO parser loses last dishes

Follows `mem:session-2026-11-16-open-threads-and-t5-box`. Local `main`, NOT pushed (98 ahead before this save's commit).

## Task 5 — DONE (all 4 criteria)
Ryan answered on the dev server (live DB). Verified by SQL, `function_edge_logs` (POST count for
generate-order-items), and the shipped `classifyBeoLines` imported read-only in the dev page
(`await import('/src/lib/beoLines.js')` + `beoOrderData.js` + `supabase.js`).
- Club Car Wash (for deleted Celebration of Life): 7 spec groups incl. near miss "Chopped Ceasar Salad" → Caesar
  Salad; Becca's rolls = Not on a menu → AI (no rolls dish exists). 1 AI call. 0 lines left to ask.
- Screaming Eagle (for deleted Walton Heath): 2 AI groups; description ingredients prove descriptions reached the AI.
- Rusty Drewing: all Not food → no AI call, "No food items found" alert (true). Ryan counted it as criterion 4.
- 21 rows in `beo_dish_matches`, all Ryan's real answers — keep.
- `tasks/todo.md` Task 5 updated with all results.

## Street Dinners
New menu every month (Ryan) → always AI. Build list unanswered = same request as Not on a menu + Describes.

## Dessert lost — process-beo parser (NOT FIXED, awaiting Ryan's go)
`isCategoryHeader`: own row (gap ≥14) + next new row has a left label → heading. A LAST dish (blank line above,
"Allergies!!" below) matches → category → never on the order list. Gate passes (category names vouch by containment).
Survey of 10 packets: Oct + Nov Street Dinner desserts, "Cookies Platter", "3 bottles Meiomi", "Corkage Fees".
Headings share the `Qty` cell's `fontName`; dish lines use another (08-30 note was wrong — fontFamily is all sans-serif).
Proposed plan: heading requires Qty font → test from this page → old-vs-new diff on all 10 packets in `BEOs/`
(only the misreads may change) → deploy process-beo (ASK) → re-import Screaming Eagle (ASK).
Unexamined: ~30 heading-font lines inside descriptions ("Themed Buffets") — maybe the reverse misread.

## Method notes
- Packets: `supabase storage cp --experimental --linked ss:///beo-emails/<pdf_path> BEOs/<name>.pdf` (RELATIVE dst
  on Windows). 8 bucket packets + 11-16 packet now in gitignored `BEOs/` (PII) — Ryan to say whether to delete.
- Local parser run: `deno run --node-modules-dir=none --allow-read --allow-env --allow-net=registry.npmjs.org` from
  the scratchpad; import via `file:///C:/Old%20Hawthorne%20Projects/...`. Font per run: `getTextContent()` item.fontName.

## Also open (Open Threads)
Quantity lines ("Quart", "Dozen", "Serves 6-8") asked in the box; two "Cheesecake" dishes on From the Bakery.
Then T6 Part of / Its own dish, T7, Checkpoint C, T8.

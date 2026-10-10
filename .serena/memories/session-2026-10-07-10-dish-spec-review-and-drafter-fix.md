# Session 2026-10-07 → 10-10 — dish spec review, drafter stops swapping foods (v8 → v13)

## Data (owner's instructions, live DB)
- Reviewed 27 confirmed drafts + 13 Quick Lunch Bites. Fixed: wings 12→1 each per piece; burrata added
  (0.5 oz, #355554 — my estimate); whole fruit = 12 apples/dozen; `sourdough` → `sourdough slices`;
  stale AI spec_notes cleared/trimmed; buy-outs named + mapped (`1st&10th tee bars` not-bought-here,
  trail mix #438899, chips #1073982, `havarti slice` #207141, `tortilla wrap 12"` #245761).
- Owner: coconut shrimp + beef en croute ARE pre-made buy-outs (not only scallops). Peach cobbler IS the
  Southern BBQ dessert (menu text stale). Dijon ≠ grain mustard. Beef Tenderloin → `beef tenderloin`
  (NOT shoulder tender) — product not yet picked (#853301 or #1025223 whole tenderloins).
- Status 10-10: 82 confirmed / 12 drafts / 270 none; 41 ingredient names unmapped.

## Drafter (draft-dish-specs)
- Bug: EXISTING NAMES list read as CLOSED → lamb→pork, halibut→salmon, tenderloin→shoulder tender.
  v8 bad runs coined 0 new names. Rules 11-12 (v10+), Dijon example (v12), retry malformed JSON once (v13).
- v9 lesson: telling the model "never report a substitution" made swaps SILENT — removed.
- Batch size matters: page `DRAFT_BATCH` 8 → 4 (Dijon kept 12/12 at 4 vs 4/6 at 8).
- `drafter_check.ts` (live, parseOnly, exits 1 on swap) + `retry_test.ts` (sliced real code, mutation-checked).
- Open: ribeye drafted as `prime rib` 1/4 runs — asked owner if ribeyes are cut from the rib roast.

## Unit bug folded into P4 (owner)
`orderUnits.js` unitFit counts inner packs as pieces (coconut shrimp 4/3 LB → 4/case, ~54x over);
81/382 lines cross-class gaps. Design doc §7 + P4 row.

## Not done
Nothing pushed; main far ahead of origin (owner's call). CHANGES.md archived 7 entries → docs/changelog/2026-09.md.

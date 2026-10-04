# Session 2026-10-01 → 10-03 — product matcher gets dish context; miscopied numbers caught

## Agreed task (from 09-30 session)
Pass each ingredient's dishes to the AI matcher (`draft-dish-specs`, products mode).

## Built (draft-dish-specs v3 → v8, all deployed via CLI, `env -u SUPABASE_ACCESS_TOKEN`)
- Prompt rule 2: each ingredient line lists ≤8 dishes (name — menu, season — qty unit per basis)
  plus `with:` = the dish's OTHER ingredients (≤12). Rules renumbered 1-7.
- Migration `20261001000001_ingredient_usage_dish_companions` (applied as 20261001152538):
  `with` added INSIDE `ingredient_usage.dishes` jsonb (no new column); security_invoker kept.
  Verified 305/305 entries vs independent count (re-checked after the data edits: 0 mismatches).
- Model returns `product_description` too; `describesProduct(said, product)`: ≥60% of its words on
  the product AND every digit-bearing word present, else product_id null + note naming both.
  `match_test.ts` slices words()/describesProduct() from index.ts (5 tests, RED first, mutation-checked).

## Findings
- Dish names alone → model picked pre-made bacon-wrapped scallop appetizer for "scallops" 2/3;
  wording rule 1/3; with `with:` 4/5. BUT owner: kitchen BUYS them pre-made → the SPEC was wrong.
  Bacon-Wrapped Scallops respecced to 1 line `bacon-wrapped scallops` 1 each/piece → #256278;
  orphan `scallops` mapping deleted. **Only pre-made item** (owner, 10-02).
- Model miscopies product numbers: invented (#256251 for smoked salmon #256125, 8/8 runs) AND onto
  REAL wrong products (#52167 PEACH, #522183 BUTTERNUT SQUASH for watermelon #52193). After asking for
  the description: 25/25 correct; the rejection path has never fired live.
- Review found sibling sizes (#252175 SCALLOP 30-40 / #252182 60-80) passed the 60% share → digit rule (v8).
- Local old-vs-new A/B blocked (copied keys into scratch); stray deno server on 0.0.0.0:8000 stopped by PID.

## Data (owner's instruction)
Confirmed 6 ingredient drafts + Bacon-Wrapped Scallops spec. Smoked salmon's stored draft was the v3
EMPTY result, re-drafted through v7 first (→ #256125). Now 122/122 matches confirmed; specs 15
confirmed / 27 drafts / 322 unspecced of 364.

## Open
- Not exercised live since v8 (nothing unconfirmed). 40-batch timing with the longer prompt untimed.
- Ingredient Products selects `*` → downloads unused `with` lists (small now).
- wonton wrappers #182393 sold by weight (6/5 LB) but used by "each" → costing gap later.
- schema_baseline.sql stale since 09-30 (3 view changes).
- Owner: review the 27 draft specs; draft more menus, then "Match products".

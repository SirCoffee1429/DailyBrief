# Session 2026-07-17 — Prep List Portion Scaling: built, scrapped, perf kept

## What happened
- Explored an **AI-inferred portion/quantity scaling** feature for event prep tasks
  (`/sc:research` → `/sc:workflow` → `/sc:implement`). Added `event_tasks.portion jsonb`,
  a portion-aware `generate-prep-tasks` prompt (basis-aware: pieces/each/serves × Qty,
  finished + raw via yield), client persistence, and Events-page badges.
- Hit prod 500s on real BEOs → diagnosed via `/sc:troubleshoot`: root cause was the slow
  `gemini-3.1-pro-preview` model (~28s even trivial) + output truncation past 4096 tokens.
- **Owner scrapped the whole feature** ("too much to get it to work correctly").

## Final state (all reverted, prod clean)
- `event_tasks.portion` column **dropped** from prod; table back to original 9 columns.
- `generate-prep-tasks` restored to original plain-tasks behavior (subtasks = `string[]`).
- **Only surviving change:** model `gemini-3.1-pro-preview` → `gemini-3-flash-preview` +
  `maxOutputTokens` 8192 (perf: ~28s → ~8.5s). Committed `23332a2`, **pushed to main**.
- Kept for reference: `claudedocs/research_prep_list_portion_scaling_2026-07-17.md`.

## Not built (idea for later)
- Moving quantity calc to the **Event Order List** (`event_order_items` has `item_name,
  source_dish, is_ordered, note` — NO quantity field; `generate-order-items` lists
  ingredients without amounts). Open Qs: per-ingredient vs per-dish, aggregate across
  dishes, as-purchased vs pack/case rounding.

## Reusable knowledge
- BEO order basis: item text encodes basis, Qty column multiplies — `N pieces × Qty`,
  `each + Qty = count`, `Serves N × Qty = people`.
- Prefer `gemini-3-flash-preview` for edge fns; pro-preview is ~28s-slow.

## Housekeeping
- CHANGES.md condensed 680 → 216 lines (June auto-scheduler/availability block → Archive).

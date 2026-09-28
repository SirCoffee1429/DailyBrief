# Session 2026-09-27 — context load + production drift audit (read-only)

## What happened
- /sc:load found ~3am P3 work in the tree that no log recorded: DishSpecs.jsx,
  IngredientProducts.jsx, lib/orderUnits.js, lib/useKeyboardReview.js, draft-dish-specs fn,
  migration 20260927000000_create_dish_specs.sql + edits to App.jsx, OfficeLayout.jsx,
  index.css, MenuDishes.jsx, config.toml. ALL UNCOMMITTED.
- Verified it equals live: draft-dish-specs v2 == local; the one migration file holds both
  applied migrations (create_dish_specs + dish_ingredient_names) — 5 function bodies
  hash-equal (md5 of comment/whitespace-normalised prosrc vs local $$ bodies). Data: 364
  orderable, all spec_status none, 0 dish_ingredients, 0 ingredient_products. Build passes.
- /sc:recommend → owner approved steps 2 + 3:
  - Step 2: all 15 deployed edge fns diffed vs repo. 12 identical, 2 cosmetic,
    generate-schedule v17 = auto-scheduler 7dfe506 (16318f6 fix + 86045f5 pins undeployed),
    parse-recipe orphan (no source, no caller). generate-schedule/llm.ts on main is dead.
  - Step 3 (/sc:analyze --focus security): handle_new_user trigger on auth.users writes to
    nonexistent public.profiles (latent sign-up breaker); ensure_rls event trigger
    (rls_auto_enable) auto-enables RLS on new public tables; orderable_menu_dishes SECURITY
    DEFINER since 09-19 (no real exposure); trigger fns not RPC-callable; 3/54 migrations
    match repo; config.toml missing get-weather + generate-order-items.
- Vercel prod = origin/main 04d8396, 28 behind main; doesn't touch menu_dishes.
- A parallel session re-dated the 09-28 schedule (logged in CHANGES.md, CLAUDE.md tweak).

## Docs written at save
- CHANGES.md: moved 09-19 .docx entry verbatim to docs/changelog/2026-09.md (+ one-liner),
  appended audit entry → 475 lines. CLAUDE.md: corrected "auto-scheduler edge fn not
  deployed" (false), added RLS/migration gotcha, handle_new_user note on Real auth, P3
  status; condensed 4 bullets → 200 lines. NOT committed.
- Auto-memory: new project-drift-audit-2026-09-27.md; corrected scheduler v15→v17,
  branch 17→77 behind, P3 status, deploy-audit method.

## Owner decisions
DONE same evening (owner: "do those three first then I'll review"):
1 P3 + docs committed (3 commits, staged by path) · 2 handle_new_user trigger + function
DROPPED (migration 20260927010000, dropped SQL kept in its comments) · 3
orderable_menu_dishes → security_invoker (20260927010001; anon still sees 364; linter
ERROR gone). CHANGES.md: P3 entry logged late + DB-fix entry; 09-21 entry archived.
4 DONE: config.toml + get-weather/generate-order-items (all 16 deployed fns match),
llm.ts deleted. 09-28 DECISIONS: 6 = do NOT deploy 16318f6; generate-schedule v17 LEFT AS IS
(owner; no live page calls it). Pre-branch scheduler pieces on main (Availability — daily
use — Roster, Rules, Coverage) stay. 7 = parse-recipe DELETED by owner in dashboard (verified gone; archived 05d1fe7). STILL OPEN: 5 schema baseline
(needs `! supabase login`) · 6 deploy 16318f6 after re-test · 7 keep/delete parse-recipe.
Proven in a rolled-back txn: CREATE OR REPLACE VIEW without WITH resets security_invoker.

## Method lessons
- Supabase CLI 401s even with SUPABASE_ACCESS_TOKEN set → only MCP get_edge_function.
- Transcribing deployed source drops trailing whitespace → diff with it stripped.
- Oversized MCP results persist as JSON in tool-results/ → extract by script, don't retype.
- git show of CHANGES.md is LF, working file CRLF → compare with tr -d '\r'.
- The migration-history name match can't see UNTRACKED migration files (git ls-tree).

## Final state (09-28)
Commits this session: dd66a62 (P3) · cc24a9b (trigger drop + view invoker) · e07a3ea
(docs) · 1aa8e29 (config.toml + llm.ts) · 05d1fe7 (parse-recipe archive) · f7fde13
(decisions). main 34 ahead of origin, NOT pushed (owner's call). Tree clean except the
parallel session's session-2026-09-27-schedule-week-redate.md (not ours, left out).
Only item 5 (schema baseline) open. Lesson saved to auto-memory:
feedback-not-live-is-not-delete ("I don't want to delete it, I just don't want it live").

## Next
Decide the open items; then P3's first real drafting batch on one small menu, checking
the saved rows, not the success counts.

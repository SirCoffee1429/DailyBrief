# Session 2026-11-04 → 11-05 — Station Prep Sheets, T1–T5

Feature: paper station prep sheets → live in-app sheets (spec `spec/prep-sheets.md`, plan/todo in `tasks/`), built on
branch `prep-sheets` (worktree `C:\Old Hawthorne Projects\DailyBrief-prep-sheets`, off `origin/main` `7ac0e01`).
Ships ALONE: `git push origin prep-sheets:main` (Ryan's OK) then MERGE back into main. Nothing pushed yet.

## Done
- T1 `bad3fd0` lib/prepSheets.js math (parsePar/colorFor/toPrep/quickValues/stationScore) + Vitest 5.1.0 on the branch.
- T2 `dddb1fd` lib/prepSheetUpload.js (sheet → preview lines, typo fixes, section-vs-item rule + office toggle).
- T3 `a3d07cd` migration 20261105174946_prep_sheets APPLIED to prod (4 tables, 8 policies, realtime x3, RPCs
  prep_record / prep_finish_count / prep_replace_station). Smoke test `supabase/tests/prep_sheets_smoke.sql` always raises.
- T4 `1ee44a8` + `188818b` /office/prep/setup upload preview → confirm; five Fall 26 sheets loaded into prod (172 items).
- T5 `7ce378b` /kitchen/prep?station=<id> kitchen sheet: name dropdown (localStorage `prepSheets.employeeId`), Have box
  (save on blur/Enter) + quick buttons, color chip, "prep N unit". Helpers unitSuffix/formatAmount/lineStatus/
  groupBySection/parseHaveInput. 144 tests. Browser-checked on ZZ Test incl. 375px (iframe; window resize didn't apply).

## Open
- Checkpoint B: Ryan eyeballs one real station on the kitchen sheet (local dev 5174).
- Next: /build Task 6 (Done/Partial/note/Finish count), then T7 live (plan text says prep_item_state — wrong, state is
  on prep_items), T8 overview, T9 tile, T10 setup editing, T11 review + ship + merge back + retire ZZ Test + remove worktree.
- Main tree: CHANGES.md entry "(in progress) Station Prep Sheets" (main has untracked prepsheets/ — move aside at merge).

## Gotchas
- App.jsx is `-text` in git (CRLF + lone CR) → edit byte-level.
- Stopping a background Vite leaves node on the port → kill by PID, verify free.

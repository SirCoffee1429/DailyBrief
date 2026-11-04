# Session 2026-11-04: spec save location aligned with CLAUDE.md

## Done
- Answered "what skills / what's the new-feature process": 25 agent-skills + `supabase` in `.claude/skills/`, 9 commands,
  4 vendored agents + `feature-prioritizer`; flow `/spec` → `/plan-tasks` → `/build` (one task) → `/test` → `/review-change` → `/ship`.
- `7010efc` chore: `/spec`, `/plan-tasks` and `spec-driven-development` saved specs as root `SPEC.md` / `SPEC-<module>.md`;
  now `spec/<feature>.md` / `spec/<module>.md` per CLAUDE.md. Ryan's condition: paths only, no lost function. Checked first:
  nothing in `.claude/` reads a spec by path; `/build` reads `tasks/todo.md` (unchanged). Recorded in `VENDORED_SKILLS.md`.
- Corrected myself: I had flagged CHANGES.md as missing the 11-02 entry; `3775fa6` (11-04 session save) added it between turns.

## Open / next
- Unchanged from the 11-02 → 11-04 save: main ahead of origin (push = Ryan's call); FOH/Kitchen header date mismatch
  uninvestigated; product work B next.
- Left out on purpose: `Vendor Data/Purchase History_Worksheet_9_30_2026 1_28 AM.xlsx`.

# Session 2026-11-21 → 11-23 — prompt audit of C:\Old Hawthorne Projects

## Done (local main, NOT pushed; 108 ahead of origin/main after the save commit)
- `/doctor prompt-audit`: report + proposed diff (H1–H4, M5–M11, F12–F15). Target Opus 5.5 for config files; app
  edge functions call Gemini, so not audited against Claude rules.
- `2ae71ff`: H1 CLAUDE.md start-up path (`.agents`+newline+`ules` → `.agents/rules/`); H4 changes-made.md "never
  delete; moving to docs/changelog + rewriting Open Threads allowed"; M5 up-to-speed.md reads Open Threads first.
- `fad2a23`: H2 prep-sheets branch line; H3 feature-prioritizer product list; 11-09 entry archived.
- `92dfb27`: F12 — Claude Code reads `.claude/settings.json` from the START folder. Sessions started in `app/` never
  loaded the root ask rules / superpowers-off. Removed Supabase write allows from `app/.claude/settings.local.json`
  (gitignored); CLAUDE.md line says start at the repo root.
- Output style "Proactive" removed from `app/.claude/settings.local.json` (Ryan: CLAUDE.md wins); user-level
  "Concise" applies.
- Save: Open Threads rewritten; 11-10 entry archived to docs/changelog/2026-11.md; CHANGES.md ~478 lines.

## Next
- Ryan restarts Claude Code in `DailyBrief/` (not `app/`) and checks superpowers is gone.
- Order guide B Task 6 (Part of / Its own dish), `tasks/todo.md`.
- Audit leftovers in Open Threads: M6–M11, items 7–8 vs global Surgical Changes, AGENTS.md.

# Session 2026-10-31 → 11-01: bundle removed, vendored skills + live-safety settings

## Done
- `2968f78` chore: remove old skill bundle and leftover files. These were Ryan's 256 already-staged deletions (ECC commands/skills,
  SuperClaude Guides, root package.json = only `fallow`, app/sample-data, supabase/.temp untracked). Vercel builds from `app/`, so the live site is unaffected.
- Applied `_skills-setup/APPLY.md`: step 1 SHA-256 check passed, all 13 files copied, step 4 = 0 mismatches. Then the folder was deleted.
- `.claude/settings.json` (Ryan's exact content): 13 ask rules (Supabase writes/branches/projects, git push) + bypass disabled.
- `.gitignore` += `.claude/settings.local.json`.
- `dcfd7e6` chore: add vendored skills, live-safety rule and project permission settings (my message; Ryan named no message).

## Open / next
- UNCOMMITTED: changelog recovery from 10-27 (`CHANGES.md`, `docs/changelog/2026-08.md`, untracked `docs/changelog/2026-07.md`)
  + this save's CHANGES.md/CLAUDE.md edits. Committing CHANGES.md picks up the 10-27 recovery too, so ask Ryan.
- Still left out on purpose: Vendor Data worksheet, `.serena/memories/session-2026-09-27-schedule-week-redate.md`.
- main 66 ahead of origin. Pushing is Ryan's call (and now prompts).
- Product work unchanged: B next (BEO line → confirmed dish → spec → product), prep-word traps, phone width, parked yields.
- Stale docs Ryan hasn't asked to fix: `~/.claude/rules/common/agents.md` table; CLAUDE.md Behavior #13 still points at SuperClaude_Framework (the folder still exists).

# DailyBrief: vendored skills and live-app safety

DailyBrief is live and used every day at Old Hawthorne. These rules load every
session. `CLAUDE.md` still wins on any conflict.

## Vendored skills

`.claude/skills/` holds 5 skills copied by hand from pinned commits and edited
for DailyBrief: `supabase`, `debugging-and-error-recovery`,
`code-review-and-quality`, `deprecation-and-migration`, `security-and-hardening`.
Sources and commits are listed in `.claude/skills/VENDORED_SKILLS.md`.

- Never install skills with `npx skills add` or a plugin marketplace.
- Never update a vendored skill without reviewing the upstream diff first.

## Live-app safety

Ask Ryan first, every time, before you:

- run SQL that changes data or schema, or apply a migration, on the live
  Supabase project `chajwmoohmiugdgvqjyo` (read-only `SELECT` queries are fine)
- deploy an Edge Function or change Supabase secrets
- `git push` (`main` is Vercel's production branch), push tags, force-push, or
  rewrite history
- install, upgrade, or remove any package or tool, or add an MCP server or hook

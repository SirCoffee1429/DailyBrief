# DailyBrief: vendored skills and live-app safety

DailyBrief is live and used every day at Old Hawthorne. These rules load every
session. `CLAUDE.md` still wins on any conflict.

## Vendored skills

`.claude/` holds the `addyosmani/agent-skills` pack, copied by hand from a
pinned commit and edited for DailyBrief: 25 skills in `.claude/skills/`, 4 agents
in `.claude/agents/`, 9 commands in `.claude/commands/`, and the shared
checklists in `.claude/references/`. The `supabase` skill comes from
`supabase/agent-skills`. Sources, commits and local edits are listed in
`.claude/skills/VENDORED_SKILLS.md`.

- Never install skills with `npx skills add` or a plugin marketplace.
- Never update a vendored file without reviewing the upstream diff first.

## Live-app safety

Ask Ryan first, every time, before you:

- run SQL that changes data or schema, or apply a migration, on the live
  Supabase project `chajwmoohmiugdgvqjyo` (read-only `SELECT` queries are fine)
- deploy an Edge Function or change Supabase secrets
- `git push` (`main` is Vercel's production branch), push tags, force-push, or
  rewrite history
- install, upgrade, or remove any package or tool, or add an MCP server or hook

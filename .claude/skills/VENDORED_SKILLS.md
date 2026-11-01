# Vendored skills (DailyBrief)

Copied by hand on 2026-10-29. Not installed with `npx skills add` or a plugin.
Each skill has a "DailyBrief local rules" block at the top and small local edits.

| Skill | Source repo | Commit | License |
|---|---|---|---|
| supabase | https://github.com/supabase/agent-skills | c9be0e931b7930f7d02126d04774d904c381e7d7 | MIT |
| debugging-and-error-recovery | https://github.com/addyosmani/agent-skills | aeac41d4d005999432bb7312f7ff06383a91d59d | MIT |
| code-review-and-quality | https://github.com/addyosmani/agent-skills | aeac41d4d005999432bb7312f7ff06383a91d59d | MIT |
| deprecation-and-migration | https://github.com/addyosmani/agent-skills | aeac41d4d005999432bb7312f7ff06383a91d59d | MIT |
| security-and-hardening | https://github.com/addyosmani/agent-skills | aeac41d4d005999432bb7312f7ff06383a91d59d | MIT |

## Local edits
- Shared checklists from Addy's `references/` copied into each skill's own `references/` folder; links fixed.
- supabase: removed the GitHub-issue feedback flow; never creates `.mcp.json`; schema changes go through reviewed migrations, never ad-hoc `execute_sql` on live.
- security-and-hardening: Express/helmet examples marked as not applicable; Supabase Auth only.
- debugging / deprecation: ask before `npm install`; removed a made-up `npx` command.

## Updating
1. Clone the source repo and diff: `git diff <old commit>..<new commit> -- skills/<name>`
2. Read the diff. Re-copy only after review, re-apply the local edits, update this table.

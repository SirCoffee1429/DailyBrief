# Vendored skills (DailyBrief)

Copied by hand. Not installed with `npx skills add` or a plugin.
Each vendored skill has a "DailyBrief local rules" block at the top and small local edits.

| What | Source repo | Commit | License |
|---|---|---|---|
| `supabase` skill | https://github.com/supabase/agent-skills | c9be0e931b7930f7d02126d04774d904c381e7d7 (copied 2026-10-29) | MIT |
| Everything else: 25 skills in `.claude/skills/`, 4 agents in `.claude/agents/` (`code-reviewer`, `security-auditor`, `test-engineer`, `web-performance-auditor`), 9 commands in `.claude/commands/`, 7 checklists in `.claude/references/` | https://github.com/addyosmani/agent-skills | 301b02b12bff98e4688e6984af6556802322bbde (copied 2026-11-02; plugin version 0.6.15) | MIT |

`feature-prioritizer` in `.claude/agents/` is DailyBrief's own, not vendored.

Not copied from agent-skills: `hooks/` (upstream says not to wire its session-start hook in Claude Code), `evals/`, `scripts/`, `docs/`, other-tool adapters, and the repo's own `CLAUDE.md`/`AGENTS.md`.

## Local edits (agent-skills)
- Every SKILL.md: the "DailyBrief local rules" block (CLAUDE.md wins; ask-first list; test/build commands; sub-agents only via `/ship` or when Ryan asks; plain words).
- Commands: `plan.md` → `plan-tasks.md` and `review.md` → `review-change.md` (`/plan` and `/review` are Claude Code built-ins); the plugin's `agent-skills:` prefix stripped from skill names; `build.md` keeps only one-task mode (no `/build auto`, owner 2026-11-02); `test.md` points at Claude in Chrome.
- Agents: links to the uncopied `docs/agents.md` point at `../references/orchestration-patterns.md`.
- browser-testing-with-devtools: use Claude in Chrome; no Chrome DevTools MCP is installed.
- shipping-and-launch, ci-cd-and-automation: note that a push to `main` is the deploy (Vercel), with no staging, flags or CI yet.
- security-and-hardening: no real user auth yet (office password is client-side by design); headers live in `app/vercel.json` and each Edge Function; Express/helmet examples in `references/hardening-patterns.md` marked as not applicable.
- debugging-and-error-recovery: ask before `npm install`. deprecation-and-migration: removed a made-up `npx migrate-check` command.

## Updating
1. Clone the source repo and diff: `git diff <old commit>..<new commit> -- skills/ agents/ references/ .claude/commands/`
2. Read the diff. Re-copy only after review, re-apply the local edits above, update this table.

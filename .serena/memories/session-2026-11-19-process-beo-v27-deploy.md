# Session 2026-11-19/20 — process-beo v27 deployed

## Done
- Deployed the 11-17 heading-font fix (`cc7f844`) as `process-beo` **v27** with Ryan's OK.
  Command: `env -u SUPABASE_ACCESS_TOKEN supabase functions deploy process-beo --project-ref chajwmoohmiugdgvqjyo --use-api`
  (server-side bundle, no Docker; keeps TS source; verify_jwt=false from config.toml). Verified with `get_edge_function`.
- Post-deploy check (read-only): all 10 packets in `BEOs/` POSTed to the deployed fn with `parseOnly: true`
  vs the repo parser run locally → 10/10 geometric, 10/10 byte-identical, dessert/cannoli/cheesecake/Meiomi
  are items, never categories. Script was throwaway in the scratchpad; needs `deno run --no-config` run from
  the function folder (else "Could not find a matching package for 'npm:unpdf'").
- Screaming Eagle 11/17 NOT re-imported: event is over (Ryan) — dropped from Open Threads.

## State
- Local main 104 ahead of origin/main (another session shipped To prep notes `7d51971` alone on 11-19).
- Next: order guide B Task 6 (Part of / Its own dish), see `tasks/todo.md`.
- Untracked, not mine: `.claude/launch.json` (Ryan to keep/delete), `Vendor Data/` xlsx.

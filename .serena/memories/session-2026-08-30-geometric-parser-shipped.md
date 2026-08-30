# Session 2026-08-30 — Geometric parser SHIPPED into process-beo

`process-beo` **v22** live. `main` at `30e3334`, **3 commits ahead of origin — NOT pushed.**
Supersedes [[session-2026-08-29-geometric-parser]], which said "not wired in".

## What is live now

The BEO table is parsed from the PDF's own coordinates
(`supabase/functions/process-beo/beoGeometricParser.ts`). Gemini is the **fallback**,
taken only when the geometric result fails to reconcile, throws, or finds no BEO footer.

**The reconciliation gate is the load-bearing piece — do not remove it.** `parseGeometric`
returns `{ok, reason, events, items, qtyRows}`; `ok` is false unless parsed item count
equals an independent count of qty-bearing rows taken straight from the coordinates. That
counter deliberately shares no logic with the assembler, which is what makes it a check
rather than a restatement. Without it an unfamiliar layout would silently write a wrong
order list instead of degrading to the old behaviour.

`engine` ("geometric" | "gemini") is returned on every Mode A response and logged, so
which path ran is visible rather than inferred.

## Verified against deployed v22

All 5 packets: `engine=geometric`, hashes **matching the local Deno output exactly**, in
**397-1010ms** vs roughly 90s for Gemini. Fallback exercised separately with an invalid
PDF — the geometric parse threw, the request reached Gemini, Gemini rejected it.
`deno check`: 11 errors before and after, **zero from the new file** (the 11 are the
pre-existing `SupabaseClient` generic mismatch in index.ts).

## Two corrections to earlier claims in this project

1. **"5 packets, all the same ReserveCloud template" was wrong.** It is 4 daily packets
   plus one 92-page **EVENT CONTRACT** bundle (`test_beos (46)`, "2026 MFA Oil Concert &
   Outing") with BEO pages embedded at 39-53, 65-69, 84-87. Found only because the new
   reconciliation gate flagged it (40 items vs 75 rows) — the earlier per-event audit had
   passed it. `countQtyRows` therefore counts ONLY pages carrying a BEO footer; counting
   the contract pages would push every good parse to the model.
2. The earlier "verified deterministic" claim for v21 was too weak a test — see
   [[feedback-verify-the-test-not-just-the-code]].

## Defects found while typing the parser (both real)

- `getTextContent()` returns `TextItem | TextMarkedContent`; marked-content items have no
  `.str`, so an unguarded `.trim()` could throw. Now guarded with an `in` check.
- `midText(row)` was called with one argument against a two-argument signature. Worked by
  accident (undefined is falsy); now has an explicit `= null` default.

Both were surfaced by `deno check`, not by review. Type-checking a new edge-function file
against the pre-existing baseline error count is worth doing every time.

## Open / needs the owner

- **`main` is 3 ahead, unpushed** (`44865a3`, `81cabe2`, `30e3334`).
- **PII, untracked:** 3 packets in `app/sample-data/test_beos/` and the
  `process-beo upload diff/` screenshots. `BEOs/` is gitignored for this; these are not.
  `test_beos/Event-documents (1.pdf` is tracked and in git history already.
- **Duplication:** `prototypes/beoGeometricParser.mjs` (Node) duplicates the shipped
  `.ts` (Deno-only, imports `npm:unpdf`). Kept because `prototypes/auditParser.mjs` only
  runs under Node and is still the tool for validating new packets. Worth revisiting.
- `$30/Person` still parses as an item because the BEO prints it as a real row with its
  own qty. Faithful to the document; filtering belongs downstream.

## Watch next

Tomorrow's packet is the first real one through v22. Expect `engine=geometric` in ~1s and
far fewer "changed" cards in the review queue. **If the logs say `engine=gemini`, the
reconciliation rejected that packet** — capture it, it is the interesting case.

## Local tooling notes

- Deno 2.7.5 at `~/.deno/bin/deno`; needs `{"nodeModulesDir":"auto"}` in `deno.json` for
  `npm:` specifiers. `unpdf` 1.8.1 works and gives `transform` + `width`.
- Validate a packet: `node prototypes/auditParser.mjs "<packet.pdf>"`.
- Supabase MCP deploys edge functions but **cannot delete them**; the CLI is not logged in
  (401). See [[reference-supabase-deploy-via-mcp]].

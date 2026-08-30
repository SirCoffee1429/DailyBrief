# Session 2026-08-25→29 — BEO parse churn, and the geometric parser prototype

`process-beo` **v21** live. `main` at `44865a3`, **1 commit ahead of origin — NOT pushed.**

## Where this stands

The Gemini BEO parse still churns. v21 (`temperature: 0` + explicit row/label rules)
killed the worst of it but did **not** make it stable across days. The geometric parser
in `prototypes/` is built, validated and proven to run on Supabase edge — but is **not
wired in**. That is the open decision.

## What happened, in order

**08-25 — parse non-determinism.** Owner reported the morning packet "changed the
format/layout again." ReserveCloud had changed nothing; the same PDF was re-grouping
every day, 43→91 items for the same dozen events. Cause: `generationConfig` set only
`response_mime_type`, so temperature defaulted to 1.0. Fixed in v18→v21 with
`temperature: 0` plus rules describing the real page. Also repaired 8 live rows via
Mode B (0 inserts, tasks/notes preserved) before that night's Club Car Wash dinner.

**I over-claimed the fix.** I reported it "verified deterministic" on two back-to-back
runs producing an identical fingerprint. That test only proves stability within minutes.
Two days later: The Eliminator returned **11 items on 08-26 and 28 items on 08-27**,
same function, same prompt, temperature 0. See
[[feedback-verify-the-test-not-just-the-code]].

**08-27→29 — geometric parser prototype.** Committed `44865a3`, `prototypes/`.

## The parser — the part worth remembering

The PDF states the table structure explicitly; the model was being asked to infer it.

- Columns: label `x<=60`, centre `60-500` (always centred at c=322), qty `~538`
  **anchored per page** off the `Qty` cell in each section header. A global `x>=500`
  rule picks up junk (`Member #`, wrapped location names).
- **Line spacing is the key signal, and was the breakthrough:** gap ~11-12pt = a
  wrapped line INSIDE the cell above (continuation); ~16-17pt = a new table row;
  ~25-26pt = a section header. Neither font nor centring separates a category header
  from a continuation line — both are lone centre cells at c=322 in the same font.
- Multi-page events merge on the footer's `Name/#1234-1`.

**Validated: 5 packets / 71 events / 264 items.** Parsed item count *and* qty sum equal
the qty-bearing rows counted straight off the coordinates without using the parser, on
71/71. Zero blank labels, blank descriptions, missing qty or missing dates. Where it
disagrees with the LLM (MU Golf Fundraiser 17 vs 15 items) the parser is right.

**Edge test passed.** `unpdf` under Deno → byte-identical to Node/pdfjs (same SHA on all
5 packets, `diff` zero lines). Deployed throwaway `beo-geom-test`: all 5 packets returned
hashes matching local at **210-640ms vs ~90s for Gemini**. Garbage input fails cleanly.
Memory unmeasurable — `Deno.memoryUsage().rss` returns 0 in the Supabase sandbox.

## Immediate next step

Wire the table path into `process-beo`: **geometry for the table** (items, labels,
quantities, sections, dates, timeline), **model retained for the fuzzy parts**
(`meal_type` on odd headers, notes, free text). Not all-or-nothing.

## Open / needs the owner

- **`beo-geom-test` is deployed and inert — delete from the dashboard.** The Supabase
  MCP can deploy edge functions but cannot delete them.
- **`main` is 1 ahead, unpushed** (`44865a3`).
- **PII, untracked:** 3 BEO packets added to `app/sample-data/test_beos/` and the
  `app/sample-data/process-beo upload diff/` screenshots. `BEOs/` is already gitignored
  for this reason. `app/sample-data/test_beos/Event-documents (1.pdf` is still tracked
  and in git history — needs a history rewrite, owner's call.
- `$30/Person` parses as an item because the BEO prints it as a real row with its own
  qty. Faithful to the document; filtering belongs downstream, not in the parser.

## Gotchas worth keeping

- One packet can hold two BEOs with the **same event name** (`State Farm/#4163-1` 07/30
  and `#4164-1` 07/31). `beo_number` from the footer is the stronger key; production
  dedups on (event_name, event_date), which survives only because the dates differ.
- Local PDF work: no poppler, so the Read tool cannot render PDFs. Use pdfjs from
  `app/node_modules` via an absolute `file:///` import.
- Deno 2.7.5 is installed locally at `~/.deno/bin/deno`; needs
  `{"nodeModulesDir":"auto"}` in `deno.json` for `npm:` specifiers.

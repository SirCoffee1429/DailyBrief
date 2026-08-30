# Geometric BEO parser — prototype

Not wired into anything. `process-beo` still parses with Gemini.

## Why

The LLM parse is not stable. The same PDF re-grouped differently on different days —
between 43 and 91 items for the same dozen events — because table structure is being
inferred rather than read. `temperature: 0` (v21) held across back-to-back runs but not
across days: The Eliminator came back as 11 items on 08-26 and 28 items on 08-27.

The PDF states the structure explicitly. This reads it instead of guessing.

## How

Columns, verified on all 27 pages of a real packet:

| region | x | meaning |
|---|---|---|
| left | <= 60 | row label (`Custom Buffets`, `Services`) or a time range |
| centre | 60-500 | the description column, always centred at c = 322 |
| qty | ~538 | anchored per page off the `Qty` cell in each section header |

Line spacing is the signal that makes the rest work:

| gap | meaning |
|---|---|
| ~11-12 | wrapped line **inside** the cell above -> continuation |
| ~16-17 | a new table row -> item or category header |
| ~25-26 | a section header |

Neither font nor centring separates a category header from a continuation line — both
are lone centre cells at c=322 in the same font. Gap plus a forward scan does.

## Results — 5 packets, 71 events, 264 items

| packet | events | qty-row match | deterministic |
|---|---|---|---|
| test_beos (1 | 12 | 12/12 | yes |
| test_beos (36) | 26 | 26/26 | yes |
| test_beos (44) | 9 | 9/9 | yes |
| test_beos (46) | 1 | 1/1 | yes |
| BEOs (56) | 23 | 23/23 | yes |

"qty-row match" = the parsed item count **and** the qty sum equal the qty-bearing rows
counted straight off the text coordinates, without using the parser. Output is
byte-identical across runs on every packet.

Across all 264 items: **0 blank labels, 0 blank descriptions, 0 missing quantities,
0 missing dates.** Labels come out as the intended vocabulary — `A La Carte Ordering`
(48), `Services` (43), `Beverages` (28), `Custom Buffets` (20), `Plated` (18),
`Buffet` (17). 8 events have no food table at all (recurring club events); that is
correct, not a miss. 4 events are genuinely multi-day.

Where it disagrees with the LLM (MU Golf Fundraiser, 17 items vs 15) the parser is
right: the LLM dropped two qty rows.

### Found while testing

One packet holds two different BEOs with the **same event name** — `State Farm/#4163-1`
(07/30) and `State Farm/#4164-1` (07/31). The parser keys on the footer's BEO number and
separates them; anything keyed on name alone merges them. Production dedups on
(event_name, event_date), which survives this case because the dates differ — no
name+date collision occurs in any of the 5 packets — but `beo_number` is the stronger
key and is now in the output.

## Run it

```
node prototypes/auditParser.mjs "BEOs/Event-documents (56).pdf"
```

Needs `app/node_modules/pdfjs-dist` (already a dependency).

## Edge-runtime test (2026-08-29) — PASSED

The open question was whether this can run where `process-beo` runs, not just on a
laptop. Answered in two stages.

**Local Deno + `unpdf` 1.8.1.** Loads fine, exposes text items with `transform` and
`width` (the coordinates the parser depends on). Output is **byte-identical** to the
Node/pdfjs version — same SHA on all 5 packets, and `diff` of the full JSON reports
zero lines.

**Deployed to Supabase edge** as a throwaway function `beo-geom-test` (delete from the
dashboard; nothing calls it and it writes nothing).

| packet | events | items | parse | hash vs local |
|---|---|---|---|---|
| test_beos (1 | 12 | 43 | 266ms | match |
| test_beos (36) | 26 | 74 | 332ms | match |
| test_beos (44) | 9 | 37 | 210ms | match |
| test_beos (46) | 1 | 40 | 381ms | match |
| BEOs (56) | 23 | 70 | 228ms | match |

The largest packet (685KB) run 4 times consecutively: identical hash each time,
380-640ms. Garbage input fails cleanly with `InvalidPDFException`, no hang.

**~200-640ms versus roughly 90 seconds for the Gemini parse**, and no model call for
the table at all.

Not measured: memory. `Deno.memoryUsage().rss` returns 0 inside the Supabase sandbox.
Nothing OOM'd across 9 invocations, but that is absence of failure, not a number.

## Before this could replace the Gemini parse

- **5 packets, all the same ReserveCloud template.** Thresholds held without retuning,
  but every packet came from one generator; an unusual layout is still untested.
- **Memory is unmeasured** in the hosted runtime (see above).
- **Assumes a text layer.** A scanned or image-only PDF yields nothing. Current
  ReserveCloud packets are text; that is not guaranteed forever.
- `meal_type` comes from splitting the section header on ` - `; unusual headers may
  need the model.
- `NEW_ROW_GAP = 14` and the column thresholds are tuned to this template. A
  ReserveCloud redesign would need them re-derived — worth asserting on, so it fails
  loudly instead of silently mis-parsing.
- A sensible shape would be geometry for the table, model for the fuzzy parts
  (`meal_type`, notes, anything free-text), rather than all-or-nothing.

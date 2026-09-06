# Session 2026-08-31 → 09-06 — parser v23 (shipped) + Qty chip (uncommitted)

`main` at `7b576f7`, **in sync with origin**. `process-beo` **v23** live.
Working tree has **uncommitted** Qty-chip work; see below.

## 1. process-beo v22 → v23 — SHIPPED, pushed

Supersedes `mem:session-2026-08-30-geometric-parser-shipped`, which said the qty-row
reconciliation gate was load-bearing and must never be removed. **That was wrong and
the gate is gone.**

**The bug Ryan caught:** approving the 08-31 packet would have wiped the menus off
Linkside Dinner Club, Rivalry Run 5k and Lewis and Clark. An item was only created by a
row bearing a number in the Qty column — but ReserveCloud prints the Qty **once per
section**, on that section's first row, and **omits it entirely at headcount 0**. Every
qty-less row was appended to the previous item's description or dropped outright.
Linkside and Vistas print the SAME three dishes; Vistas had one qty and survived as 1
item, Linkside had none and came through with 0.

**The gate was the real failure.** `countQtyRows()` counted qty-bearing rows — the
assembler's own definition of a row. No shared code, same premise, so they agreed by
construction: 17 = 17, `ok=true`, three menus lost. **Sharing no logic was the wrong
safety property; what matters is sharing no premise.** The 08-29 "71 of 71 events match"
validation was measuring the parser against a restatement of its own assumption; re-run
on the 08-31 packet the same harness said "22 of 22 match" on a parse that lost three
menus.

**Now:** a row starts an item on a qty **OR** a left-column label at new-row spacing;
a wrapped label line ("Hot Grab-n-Go" / "Breakfast", gap 12-13 vs 15-26) continues the
row above instead of starting one. The gate is a **conservation check** — every
centre-column line printed in a section must survive into the output — indexed **per
event, not pooled** (Linkside and Vistas print identical menus; a pooled index let the
survivor vouch for the lost one and masked the bug during testing).

**Two more data-loss defects the new gate found, both fixed:** `isCategoryHeader()`
walked past intervening rows to find a label further down, so free text became a header
and everything under it was discarded (a whole custom dinner menu vanished this way);
and a two-line category header's second line was swallowed and thrown away.

**Verified:** 5 packets, 0 dropped lines, no event loses items, **211 → 224 items
recovered** (including allergy rows that were vanishing). Negative test — reintroducing
the qty-only rule makes the gate fail with 15 named missing lines including all of
Linkside's menu. Deployed v23 output hashes identical to local, 2.1s. The 08-31 queue
row was regenerated in place from the v23 parse and left `pending`.

**`prototypes/` deleted** — it held the old logic and the old self-confirming metric, so
that harness would have blessed a broken parse. Recoverable from `44865a3`. There is now
**no offline packet-validation harness**; write one against the shipped `.ts` under Deno
if needed (`~/.deno/bin/deno`, needs `{"nodeModulesDir":"auto"}`).

## 2. BEO Qty chip — BUILT, NOT COMMITTED

Full detail in `mem:project-beo-qty-emphasis`. Short version: Ryan missed the Qty column
during service; it now renders as a small filled blue chip **centred** against its row on
desktop. `align-self: center` is the actual fix (the grid cell used to stretch, stranding
the number at the top of a 200px row). `.beo-item-qty:empty` is required or blank-qty
rows draw an empty pill. **Ryan has not seen the final size on his own screen — do not
commit on his behalf.** Mobile deliberately untouched and never actually viewed.

## 3. Process notes worth keeping

- A request arrived here that belonged to **CADOR** (`docs/handoff/HANDOFF.md`, commits
  `bcf8282`/`91fabd6`, invariant PROC-101). Verify hashes and paths resolve in THIS repo
  before acting. See `mem:feedback-never-mix-cador-and-dailybrief`.
- I described a file's contents from `ls` output and commit subjects without opening it,
  and was caught. See `mem:reference-dont-narrate-log-inferences`.
- Ryan pushed back on my asking permission to fix a `CLAUDE.md` line my own change had
  falsified. Completing agreed work, docs included, is not a thing to ask about. See
  `mem:feedback-finish-what-your-change-falsified`.
- **For visual decisions, build the options and show them.** Written option labels
  confused him ("whats the difference in these"); he picked instantly from screenshots
  of four treatments behind a temporary toggle.

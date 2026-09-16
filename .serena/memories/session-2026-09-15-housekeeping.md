# Session 2026-09-15 — Load + Housekeeping (no feature work)

`/sc:load` → `/sc:save`. **Chore only: no feature code, no schema, nothing deployed.**

## What the load turned up
The 09-15 design session had ended without a save. Three defects in its CHANGES.md entry:

1. **Inserted mid-entry** — it landed before the last two paragraphs of the 09-07 entry,
   so "Also flagged" and "State" read as part of 09-15. Moved back, unedited.
2. **Inherited state paragraph was wrong** — claimed `main` at `a3313c1`, in sync.
   Real state: `ed6dcfd`, one commit ahead, unpushed. Rewritten.
3. **535 lines, over the 500 cap.** Moved 08-25 (47 lines) and 08-29 (51 lines) verbatim
   into `docs/changelog/2026-08.md` with `→ [full]` pointers. 474 after.

## Shipped (3 commits, all pushed)
- `a5b8b9d` docs: design doc + CHANGES.md repair + 08-25 archive
- `8f4c8b8` chore: track the 13 PFG exports, drop dead ignore rule + stale permissions
- plus this save commit. `ed6dcfd` (owner's 09-14 menus commit) left the machine for
  the first time in the first push.

## Decisions
- **Vendor data is tracked in-repo** at `Vendor Data/Order Guides/`. Owner chose this
  after being told supplier pricing then lives in GitHub history permanently. I asked
  because `.gitignore` carried `Vendor Data/PFG_Master_Item_List_09-06-26` — a rule that
  never matched the real filename (missing `20` and `.xlsx`), so `ed6dcfd` had committed
  the master list despite it. Owner deleted that line himself.
- **The master item list existed twice with DIFFERENT contents** — 167,232 bytes at
  `Vendor Data/`, 164,054 at `Vendor Data/Order Guides/`. Owner deleted the former.
  **The design's 1,381-product baseline predates finding the duplicate — P1 must
  re-measure against the surviving copy, not trust the figure in the design doc.**

## Process note worth keeping
Mid-session the root `.gitignore` disagreed with itself between two of my own reads:
`git show HEAD:.gitignore` had the Vendor line, the working copy did not, and an earlier
`Get-Content` had shown it. The owner had edited the file himself between my calls. I
stopped and diffed HEAD against the working tree rather than assuming my earlier read was
wrong. **When a file's content changes under you, the user editing it in their IDE is the
likeliest explanation — verify with `git diff`, don't retract a correct earlier report.**

## Next
P0 Gemini upgrade off `gemini-3-flash-preview` (11 sites), as its own change before any
order-guide code. Verify current model IDs from Google, not memory. Then P1 catalog
ingestion, which passes only when the re-measured product count is confirmed.

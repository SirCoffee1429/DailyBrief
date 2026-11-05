# Tasks: Station Prep Sheets

Spec `spec/prep-sheets.md` · Plan `tasks/plan.md` · All work on branch `prep-sheets` (off `origin/main`) in worktree
`../DailyBrief-prep-sheets`. `/build` does ONE task, then stops.

Verification shorthand: **T** = `npm test` (Vitest, see plan OQ1) · **B** = `npm run build` in the worktree's `app/` ·
**C** = browser check with Claude in Chrome.

## Phase 1: Foundation

## Task 1: Prep math in `lib/prepSheets.js` (test first) ✅ DONE

**Description:** The pure functions every screen uses: `parsePar(text)` → `{ qty, unit }` or `null`;
`colorFor(have, parQty)`; `toPrep(have, parQty)`; `quickValues(parQty)` (Out/¼/½/¾/Full); `stationScore(items)` →
`{ red, yellow, green, uncounted, score }`.

**Acceptance criteria:**
- [x] `parsePar` reads every par form in the five files: `20 ea`, `1cs`, `4bags`, `2 G`, `8 #` (→ lb), `1/3 pan` (→ 1 ×
      `1/3 pan`), `(2) 1/3 pans` and `2 1/3 pans` (→ 2 × `1/3 pan`), `2 qts/ea.` (→ 2 qt), `1 wedge`, `14 orders`; blank → null.
- [x] `colorFor`: <50% red, 50% to <75% yellow, ≥75% green (par 20: 4 R, 9.99 R, 10 Y, 14.99 Y, 15 G, 25 G); no par or
      not counted → null. `toPrep` never below 0.
- [x] `stationScore` = 2 × red + yellow, ignoring items with no par or not counted.

**Verification:** T (new `prepSheets.test.js`) · B

**Dependencies:** worktree set up (plan OQ1–3 answered)

**Files likely touched:** `app/src/lib/prepSheets.js`, `app/src/lib/prepSheets.test.js` (+ `app/package.json` /
lockfile if OQ1 = add Vitest)

**Estimated scope:** S

## Task 2: Sheet parser + typo fixes (test first) ✅ DONE

**Description:** `lib/prepSheetUpload.js` (separate from `prepSheets.js` so SheetJS loads only on the upload page):
`readPrepFile` (first sheet with content, displayed text), `parsePrepRows` → preview lines, `setLineKind` (the
Section/Item toggle), `toSections`, `stationNameFromFile`, `fixTypos`. Rows up to and including the `Par` header are
skipped.

**As built, two changes from the first draft:**
- The **station name comes from the FILE name** ("Fry fall 26.xls" → Fry), and the office can edit it. The title row
  can't be used: "Grill- Dinner" and "LUNCH PREP" don't name the station cleanly.
- **A blank-par row is a section only if the next line has a par.** A section needs something under it, so Peppernata
  and Roasted Shallot come in as items automatically. Only **Citrus Vinaigrette** still needs the office's flip: it sits
  exactly like `Garnish`. Every blank-par line stays flippable.

**Acceptance criteria:**
- [x] Five real files: Fry [unnamed 27]; Grill Protein 8 / Sauces 2 / Garnish 2; Lunch 17/19/9/8/8/2; Salad 3/23/13/9/3
      (after the one flip); Sautee 7/3/3/6. 172 items, matching a hand count, 0 unparsed.
- [x] Fry (no section rows) lands as one unnamed section.
- [x] Typos fixed (whole words only); unparsed par text is flagged, never dropped; a file with no `Par` header throws a
      clear error.

**Verification:** T 112/112 (mutation-checked: section rule → 5 fail, typo fix → 13 fail) · B passes

**Dependencies:** T1

**Files:** `app/src/lib/prepSheetUpload.js`, `app/src/lib/prepSheetUpload.test.js`, `prepsheets/*` (the five sheets,
committed as test fixtures)

## Task 3: Migration: tables, RLS, realtime, RPCs

**Description:** `supabase/migrations/20261105000000_prep_sheets.sql`: `prep_stations`, `prep_items`,
`prep_item_state`, `prep_entries`, `prep_counts`; anon + authenticated policies in the SAME migration (the `ensure_rls`
trigger switches RLS on); `prep_item_state` and `prep_counts` added to `supabase_realtime`; RPCs `prep_record`,
`prep_finish_count` and `prep_replace_station`, `security invoker`, each one transaction. Partial adds to the
current value, and Done sets have to par.

**Acceptance criteria:**
- [ ] The migration is additive only (no existing object changed), and the SQL has been reviewed with Ryan.
- [ ] **Applied to prod only with Ryan's OK.** Then checked by `SELECT`: tables exist, policies exist, publication lists
      both tables, RPCs callable as anon.
- [ ] A smoke test on a `ZZ Test` station: replace → record count/done/partial/note → finish count gives the expected
      state and entries. Retired after.

**Verification:** SQL `SELECT` checks above · B

**Dependencies:** none (can be written alongside T1–T2)

**Files likely touched:** `supabase/migrations/20261105000000_prep_sheets.sql`

**Estimated scope:** S

### Checkpoint A: Foundation
- [ ] T passes, B passes, the migration is live, and the smoke test is clean. Review with Ryan.

## Phase 2: Data in

## Task 4: Office Prep Setup: upload, preview, confirm; load Fall 26

**Description:** `/office/prep/setup` (office nav entry "Prep Sheets"). Pick a file, then a preview shows the station (name suggested from the file name, editable),
sections, items, par text and parsed par, with unparsed ones flagged. Confirm calls `prep_replace_station`. New station
if the name is new.

**Acceptance criteria:**
- [ ] The preview writes nothing; only Confirm writes. Each blank-par row has a Section/Item toggle.
- [ ] **On Ryan's OK,** the five Fall 26 sheets are loaded into prod through this page, and a `SELECT` shows item counts
      matching T2.
- [ ] Re-uploading the same file keeps every item's id and state (a no-op).

**Verification:** B · C (`ZZ Test` upload first, then the real five)

**Dependencies:** T2, T3

**Files likely touched:** `app/src/pages/PrepSetup.jsx`, `app/src/prepSheets.css`, `app/src/App.jsx`,
`app/src/components/OfficeLayout.jsx`

**Estimated scope:** M

### Checkpoint B: Data in
- [ ] All five stations are in prod and match the paper sheets. Ryan eyeballs one station.

## Phase 3: Crew flow

## Task 5: Kitchen station sheet: count, quick buttons, color, to-prep, name

**Description:** `/kitchen/prep` (Kitchen nav entry "Prep Sheets"). Station picker, then sections and item lines: par,
a Have box with Out/¼/½/¾/Full, a color chip, and "prep N unit". A name dropdown (active `employees`) is remembered in
`localStorage`. Each change calls `prep_record('count')` at once. A save needs a name picked; otherwise the dropdown is
highlighted.

**Acceptance criteria:**
- [ ] Salmon par 20: Have 4 shows Red "prep 16 ea"; 12 shows Yellow; 15 shows Green. Quick ½ on a `1/3 pan` par shows
      "0.5 of a 1/3 pan", Yellow.
- [ ] A change survives a reload. The name is remembered after a reload. No-par items show grey and still save.
- [ ] Usable at phone width (375px): no sideways scroll, and buttons are thumb-sized.

**Verification:** T (any new logic) · B · C at 375px on `ZZ Test`

**Dependencies:** T1, T3, T4

**Files likely touched:** `app/src/pages/PrepSheets.jsx`, `app/src/prepSheets.css`, `app/src/App.jsx`,
`app/src/components/KitchenLayout.jsx`

**Estimated scope:** M

## Task 6: Done, Partial, note, Finish count

**Description:** On each line: **Done** (have = par), **Partial** (enter amount made, have += amount), and a note
(add/edit/clear). On the station: **Finish count**, which picks End of Night / Morning / Night Start, and the station
header shows the last count "End of Night, Jake, 10:42pm". The line shows the last change's name and time.

**Acceptance criteria:**
- [ ] Done from 4 gives 20, Green; Partial +5 from 4 gives 9, still Red; each makes one `prep_entries` row with the name.
- [ ] Notes persist and clear. Finish count makes a `prep_counts` row, and the header shows it.

**Verification:** B · C on `ZZ Test` + `SELECT` on `prep_entries`/`prep_counts`

**Dependencies:** T5

**Files likely touched:** `app/src/pages/PrepSheets.jsx`, `app/src/prepSheets.css`

**Estimated scope:** S

## Task 7: Live updates on the station sheet

**Description:** Subscribe to `prep_item_state` and `prep_counts` and reload the open station on change. Unsubscribe on
leave and on station switch. A Have box being typed in is not overwritten mid-edit.

**Acceptance criteria:**
- [ ] With two tabs on the same station, a change in one shows in the other without a reload, within a few seconds.
- [ ] Focused input isn't clobbered; no duplicate channels after switching stations (checked in the console).

**Verification:** B · C with two tabs

**Dependencies:** T6

**Files likely touched:** `app/src/pages/PrepSheets.jsx`

**Estimated scope:** S

### Checkpoint C: Crew flow
- [ ] The full cook cycle at 375px on `ZZ Test`: pick a name → count → Done → Partial → note → Finish count, live in a
      second tab. Review with Ryan.

## Phase 4: Manager view + polish

## Task 8: Office Prep Overview (ranked, live)

**Description:** `/office/prep`: one card per active station, sorted by score (2 × R + Y) highest first. Shows R/Y/G and
not-counted counts, the last Finish count (label, name, time) and the last update time. Tap a card for that station's
sheet (read and write, same component as T5). Live via the same subscriptions.

**Acceptance criteria:**
- [ ] The ranking matches `stationScore` on the current data (spot-checked by SQL), and ties sort by name.
- [ ] A change on a kitchen tab re-ranks the overview live.

**Verification:** T (sorting helper if added) · B · C

**Dependencies:** T7

**Files likely touched:** `app/src/pages/PrepOverview.jsx`, `app/src/prepSheets.css`, `app/src/App.jsx`,
`app/src/components/OfficeLayout.jsx`

**Estimated scope:** M

## Task 9: Kitchen dashboard tile (live)

**Description:** A small tile on the Kitchen dashboard: each station's Red and Yellow counts, with tap-through to
`/kitchen/prep?station=…`. Live.

**Acceptance criteria:**
- [ ] The counts match the overview; tap opens that station; nothing else on the dashboard moves or breaks.

**Verification:** B · C (dashboard at desktop and 375px)

**Dependencies:** T8

**Files likely touched:** `app/src/components/PrepStationTile.jsx`, `app/src/pages/Dashboard.jsx`,
`app/src/prepSheets.css`

**Estimated scope:** S

## Task 10: Office Setup item editing

**Description:** On `/office/prep/setup`: add, rename, retire and reorder items and sections, change pars (re-parsed with
`parsePar`, unparsed flagged), and add, rename and retire stations. Retire, never delete.

**Acceptance criteria:**
- [ ] A par edit shows on an open kitchen sheet live; a retired item disappears from the sheet but keeps its history rows.
- [ ] Reorder persists.

**Verification:** B · C on `ZZ Test`

**Dependencies:** T4, T7

**Files likely touched:** `app/src/pages/PrepSetup.jsx`, `app/src/prepSheets.css` (+ an RPC or plain updates; plain
updates are fine here)

**Estimated scope:** M

### Checkpoint D: Complete
- [ ] Every spec Success Criterion is ticked; T, B and C pass; `ZZ Test` station retired; review with Ryan.

## Phase 5: Ship

## Task 11: Review, push alone, merge back

**Description:** `/review-change`, then `/ship` (agents run there). On Ryan's OK: `git push origin prep-sheets:main`, then
confirm Vercel deployed it and the live site works. Then in local `main`: `git merge prep-sheets` (not rebase), resolve
`App.jsx`/`OfficeLayout.jsx` by hand if needed, and `npm test` + B there. Log CHANGES.md on `main`, remove the worktree.

**Acceptance criteria:**
- [ ] `origin/main` = old `origin/main` + only the prep-sheets commits (`git log origin/main@{1}..origin/main`).
- [ ] The live site shows Prep Sheets (kitchen, office, tile) and not FOH, with no console errors.
- [ ] Local `main` contains both histories and builds; the 74 commits are still unpushed.

**Verification:** `git log` checks · live browser check · B on `main`

**Dependencies:** Checkpoint D

**Estimated scope:** S

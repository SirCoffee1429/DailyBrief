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

## Task 3: Migration: tables, RLS, realtime, RPCs ✅ DONE (applied to prod 2026-11-05, version `20261105174946`)

**Description:** `supabase/migrations/20261105174946_prep_sheets.sql`: `prep_stations`, `prep_items`,
`prep_item_state`, `prep_entries`, `prep_counts`; anon + authenticated policies in the SAME migration (the `ensure_rls`
trigger switches RLS on); `prep_item_state` and `prep_counts` added to `supabase_realtime`; RPCs `prep_record`,
`prep_finish_count` and `prep_replace_station`, `security invoker`, each one transaction. Partial adds to the
current value, and Done sets have to par.

**Acceptance criteria:**
- [x] The migration is additive only (no existing object changed), and the SQL has been reviewed with Ryan.
- [x] **Applied to prod only with Ryan's OK.** Then checked by `SELECT`: tables exist, policies exist, publication lists
      both tables, RPCs callable as anon.
- [x] A smoke test on a `ZZ Test` station: replace → record count/done/partial/note → finish count gives the expected
      state and entries. Retired after.

**As built:** the current count lives ON `prep_items` (`have`, `note`, `changed_at`, `changed_by`), with no separate
state table. That's one fewer table and one fewer realtime subscription; the history is still in `prep_entries`. The
replace RPC finds the station by NAME, and a helper `prep_upload_rows(jsonb)` parses the upload. A par UNIT change
clears the count. Realtime is on `prep_stations`, `prep_items` and `prep_counts`.

**Verification:** `supabase/tests/prep_sheets_smoke.sql`, ~30 checks, which always ends in an exception, so nothing is
kept. It ran clean before applying (inside the same transaction as the migration) and after (`set local role anon`,
proving kitchen access). Afterwards a `SELECT` showed 0 rows in all four tables; RLS on, 8 policies, 3 tables in
realtime, anon can execute all 4 functions.

**Dependencies:** none (can be written alongside T1–T2)

**Files likely touched:** `supabase/migrations/20261105174946_prep_sheets.sql`

**Estimated scope:** S

### Checkpoint A: Foundation
- [ ] T passes, B passes, the migration is live, and the smoke test is clean. Review with Ryan.

## Phase 2: Data in

## Task 4: Office Prep Setup: upload, preview, confirm; load Fall 26 ✅ DONE

**Description:** `/office/prep/setup` (office nav entry "Prep Sheets"). Pick a file, then a preview shows the station (name suggested from the file name, editable),
sections, items, par text and parsed par, with unparsed ones flagged. Confirm calls `prep_replace_station`. New station
if the name is new.

**Acceptance criteria:**
- [x] The preview writes nothing; only Confirm writes. Each blank-par row has a Section/Item toggle.
- [x] **On Ryan's OK (11-05),** the five Fall 26 sheets were loaded into prod through this page, with Citrus Vinaigrette
      flipped to Item. A `SELECT` shows Fry 27 / Grill 12 / Lunch 63 / Salad 51 / Sautee 19 = 172, sections 0/3/6/5/4, no-par
      items only Peppernata, Roasted Shallot and Citrus Vinaigrette, and 0 typos left.
- [x] Re-uploading the same file keeps every item's id and state (a no-op). Checked on `ZZ Test`: "0 added, 7 updated, 0 removed", same 7 ids.

**As built (code done, `ZZ Test` checked):** `PrepSetup.jsx` lists the stations with item counts, then file → preview
(summary, station name from the file and editable, a "Replaces X's list" or "new station" note, a Make section/item
switch on blank-par rows, unreadable pars flagged) → Confirm → `prep_replace_station` → "N added, N updated, N removed".
`toUploadPayload` is tested (115 tests). Office nav "Prep Sheets" sits before Communication, and the route is added
after `/office/roster-coverage`, both away from local main's unpushed edits to those files. `App.jsx` is stored with
CRLF in git, so it was edited at the byte level to keep the diff to 2 lines.

**Verification:** T 115 · B · C on `ZZ Test` (upload, flip, save, re-upload = no-op, 0 console errors). The real five are
loaded (see above).

**Dependencies:** T2, T3

**Files likely touched:** `app/src/pages/PrepSetup.jsx`, `app/src/prepSheets.css`, `app/src/App.jsx`,
`app/src/components/OfficeLayout.jsx`

**Estimated scope:** M

### Checkpoint B: Data in
- [x] All five stations are in prod and match the paper sheets (SQL counts above).
- [x] Ryan eyeballs one station (on the kitchen sheet once T5 is built). Ryan checked it himself, 11-06: all good.

## Phase 3: Crew flow

## Task 5: Kitchen station sheet: count, quick buttons, color, to-prep, name ✅ DONE

**Description:** `/kitchen/prep` (Kitchen nav entry "Prep Sheets"). Station picker, then sections and item lines: par,
a Have box with Out/¼/½/¾/Full, a color chip, and "prep N unit". A name dropdown (active `employees`) is remembered in
`localStorage`. Each change calls `prep_record('count')` at once. A save needs a name picked; otherwise the dropdown is
highlighted.

**Acceptance criteria:**
- [x] Salmon par 20: Have 4 shows Red "prep 16 ea"; 12 shows Yellow; 15 shows Green. Quick ½ on a `1/3 pan` par shows
      "0.5 of a 1/3 pan", Yellow.
- [x] A change survives a reload. The name is remembered after a reload. No-par items show grey and still save.
- [x] Usable at phone width (375px): no sideways scroll, and buttons are thumb-sized.

**As built (code done, `ZZ Test` checked):** `PrepSheets.jsx` at `/kitchen/prep?station=<id>` (the station is in the
URL, so a reload or the T9 tile lands on it). Kitchen nav "Prep Sheets" sits between Sales and Time Off. A name dropdown
(active `employees`) is remembered under `localStorage['prepSheets.employeeId']`, and a name that left the roster is
forgotten. The Have box saves on blur or Enter (blank or unchanged saves nothing); quick buttons save on tap, and the one
matching the current count is highlighted. With no name, nothing saves: the line says so and the name box is
highlighted. New tested helpers in `lib/prepSheets.js`: `unitSuffix`, `formatAmount` (pans read "0.5 of a 1/3 pan" under
one pan, "1.5 × 1/3 pan" from one up), `lineStatus`, `groupBySection`, `parseHaveInput` (144 tests).

**Verification:** T 144 · B · C on `ZZ Test`: Salmon 4 Red "prep 16 ea" / 12 Yellow / 15 Green, Broccoli 0.5 "of a
1/3 pan" Red, Peppernata (no par) saves 3, −1 refused, no-name save refused; reload keeps counts and name; 6 history
rows, all Ryan Coffee; at 375px no sideways scroll and every button 44px tall; 0 console errors.

**Dependencies:** T1, T3, T4

**Files likely touched:** `app/src/pages/PrepSheets.jsx`, `app/src/prepSheets.css`, `app/src/App.jsx`,
`app/src/components/KitchenLayout.jsx`

**Estimated scope:** M

## Task 6: Done, Partial, note, Finish count ✅ DONE

**Description:** On each line: **Done** (have = par), **Partial** (enter amount made, have += amount), and a note
(add/edit/clear). On the station: **Finish count**, which picks End of Night / Morning / Night Start, and the station
header shows the last count "End of Night, Jake, 10:42pm". The line shows the last change's name and time.

**Acceptance criteria:**
- [x] Done from 4 gives 20, Green; Partial +5 from 4 gives 9, still Red; each makes one `prep_entries` row with the name.
- [x] Notes persist and clear. Finish count makes a `prep_counts` row, and the header shows it.

**As built (code done, `ZZ Test` checked):** each line has Done (off when there's no par) / Partial ("Made N" box,
added on Enter) / Note (Save, and Clear when a note exists); boxes close only once the save went through. The note shows
under the line, then "Ryan Coffee, 10:35pm" for the last change. The station header shows "Last count: End of Night,
Ryan Coffee, 10:36pm" and a Finish count button opening End of Night / Morning / Night Start. Every save goes through one
`record(item, kind, …)`; with no name nothing saves and the name box is highlighted. The line moved to
`components/PrepLine.jsx` (page ~230 lines). New tested helpers: `parseMadeInput`, `COUNT_LABELS`, `formatStamp`
("10:42pm" today, "Nov 4, 10:42pm" otherwise), `lastCountText` (157 tests, RED checked by stashing the code: 13 fail).

**Verification:** T 157 · B · C on `ZZ Test`: 4 → Done = 20 Green "at par"; 4 → Partial 5 = 9 Red "prep 11 ea"; note
kept over a reload, then cleared; End of Night count shown in the header after a reload. `SELECT`: one `prep_entries`
row per action (count/done/count/partial/note/note-cleared), all Ryan Coffee, and one `prep_counts` row. 375px: no
sideways scroll with Partial and the picker open, all buttons 44px; 0 console errors.

**Dependencies:** T5

**Files likely touched:** `app/src/pages/PrepSheets.jsx`, `app/src/prepSheets.css`

**Estimated scope:** S

## Task 7: Live updates on the station sheet ✅ DONE

**Description:** Subscribe to `prep_items` (where the counts live) and `prep_counts` and reload the open station on change. Unsubscribe on
leave and on station switch. A Have box being typed in is not overwritten mid-edit.

**Acceptance criteria:**
- [x] With two tabs on the same station, a change in one shows in the other without a reload, within a few seconds.
- [x] Focused input isn't clobbered; no duplicate channels after switching stations (checked in the console).

**As built:** one channel per open station (`prep_station_<id>`, filtered on `station_id`), removed on station switch
and on leaving the page. A `prep_items` change is merged straight into the open list (`applyItemChange`: replace the
line, drop it if retired, insert at `sort_order`); no reload, so open Partial/Note boxes stay open. A new `prep_counts`
row updates the header (`newerCount` keeps the latest). The Have box holds its key while focused, so a remote change
can't wipe what's being typed; the remote value shows once the cook leaves the box (if they typed something else, theirs
saves: last one wins). Both tables were already in the realtime publication: no migration. Known small gap: a change
landing in the ~1 round trip while a station first loads isn't applied (the next change or a reload shows it).

**Verification:** T 162 (RED: the 6 new tests failed first) · B · C with two tabs on `ZZ Test`: Salmon 12 saved in A
showed in B as 12 / Yellow / "Ryan Coffee, 9:57am" with no reload; B was mid-typing "5" in Marinara while A saved 2: B's
box kept "5", same element, still focused; B leaving the box saved 5, which showed in A. Morning Finish count in B showed
in A's header; Done on Broccoli in B showed in A after switching all 6 stations and back. Console: 1 `prep_station_`
channel after every switch, 0 after leaving to /kitchen; 0 console errors. `SELECT`: one `prep_entries` row per action
and one `prep_counts` row (morning). No new UI, so no 375px check.

**Dependencies:** T6

**Files likely touched:** `app/src/pages/PrepSheets.jsx`

**Estimated scope:** S

### Checkpoint C: Crew flow
- [x] The full cook cycle at 375px on `ZZ Test`: pick a name → count → Done → Partial → note → Finish count, live in a
      second tab. Review with Ryan. Ryan ran it himself, 11-06: everything worked, passes.

## Phase 4: Manager view + polish

## Task 8: Office Prep Overview (ranked, live) ✅ DONE

**Description:** `/office/prep`: one card per active station, sorted by score (2 × R + Y) highest first. Shows R/Y/G and
not-counted counts, the last Finish count (label, name, time) and the last update time. Tap a card for that station's
sheet (read and write, same component as T5). Live via the same subscriptions.

**Acceptance criteria:**
- [x] The ranking matches `stationScore` on the current data (spot-checked by SQL), and ties sort by name.
- [x] A change on a kitchen tab re-ranks the overview live.

**As built:** `PrepOverview.jsx` at `/office/prep`; the office nav "Prep Sheets" now opens it (a Setup button leads to
`/office/prep/setup`). One card per active station: score, red / yellow / green chips, "N not counted" when any, "Last
count: …" and "Last update: …". Ranking is the tested `rankStations` (uses `stationScore`; ties by name). A card opens
`/office/prep/sheet?station=<id>`: the T5 sheet component inside the office shell. Live on one `prep_overview` channel:
item changes merge in (`applyItemChange`), Finish counts via `newerCount`, a station change (Setup) reloads. Last counts
load in the same query as the stations (embedded `prep_counts`, newest 1).

**Verification:** T 166 (RED: `rankStations is not a function`) · B · C: all six cards match SQL exactly (Salad 50,
Lunch 43, Sautee 18, Fry 15, Grill 11, ZZ Test 1, with the same R/Y/G/not-counted counts), and every "Last count" matches
the latest `prep_counts` row. Kitchen tab on `ZZ Test`: Spicy Mayo and Salmon Out + Night Start → the overview went
from score 1 to 4 with the new last count and update time, no reload. ZZ Test can't pass Grill without touching a real
station, so the re-sort is covered by the unit test. Card → office sheet with 7 lines, overview channel removed.
375px: no sideways scroll; 0 console errors. Those 3 test saves went in as Alex Heger (the name remembered in that
browser), not Ryan; flagged to Ryan.

**Dependencies:** T7

**Files likely touched:** `app/src/pages/PrepOverview.jsx`, `app/src/prepSheets.css`, `app/src/App.jsx`,
`app/src/components/OfficeLayout.jsx`

**Estimated scope:** M

## Task 9: Kitchen dashboard tile (live) ✅ DONE

**Description:** A small tile on the Kitchen dashboard: each station's Red and Yellow counts, with tap-through to
`/kitchen/prep?station=…`. Live.

**Acceptance criteria:**
- [x] The counts match the overview; tap opens that station; nothing else on the dashboard moves or breaks.

**As built:** `PrepStationTile.jsx`, added LAST on the Kitchen dashboard (below Briefing/Tasks, so nothing above moves):
each station in sheet order with "N red" / "N yellow", a row taps to `/kitchen/prep?station=<id>`. The overview's load +
live code moved into `lib/usePrepBoard.js` (one channel per caller), shared by the overview and the tile; the counts come
from the tested `stationCounts` (`rankStations` = `stationCounts` + sort), so both screens count the same way.

**Verification:** T 168 (RED: `stationCounts is not a function`) · B · C: tile = SQL for all six (ZZ 2/0, Fry 5/5,
Grill 4/3, Lunch 11/21, Salad 18/14, Sautee 5/8); Broccoli Out on `ZZ Test` (as Ryan Coffee) → tile 2 → 3 red, no reload;
tap opens ZZ Test's sheet; 375px no sideways scroll, rows 44px (only the existing weather strip overflows, inside its own
scroller). Overview re-checked after the hook move: same ranking, and Broccoli Full live → ZZ score 6 → 4. 0 console errors.

**Dependencies:** T8

**Files likely touched:** `app/src/components/PrepStationTile.jsx`, `app/src/pages/Dashboard.jsx`,
`app/src/prepSheets.css`

**Estimated scope:** S

## Task 10: Office Setup item editing ✅ DONE

**Description:** On `/office/prep/setup`: add, rename, retire and reorder items and sections, change pars (re-parsed with
`parsePar`, unparsed flagged), and add, rename and retire stations. Retire, never delete.

**Acceptance criteria:**
- [x] A par edit shows on an open kitchen sheet live; a retired item disappears from the sheet but keeps its history rows.
- [x] Reorder persists.

**As built:** an "Edit a station" card (`PrepStationEditor.jsx`) on Setup, above the upload. Pick a station: rename or
retire it (Retire asks once more); rename and move sections; per item rename, re-par, move within its section, retire;
"Add item" per section, "Add section" (needs its first item), "Add station". Boxes save when you leave them (Enter too);
a required name left blank goes back. Next to each par: how the app reads it ("24 × ea", "No par", "Not understood: no
color"). Plain updates; reorder = one `upsert` of only the renumbered rows. The rules live in tested `lib/prepEdit.js`
(`moveItem`, `moveSection`, `insertItem`, `orderUpdates`, `parPatch`: a par in a new unit clears `have`, like an upload).
A failed save (a repeated name → "That name is already used here") remounts the boxes so they show the saved text again.

**Verification:** T 179 (RED: `prepEdit.js` missing) · B · C on `ZZ Test`, kitchen sheet open beside Setup: Salmon par
20 → 24 ea → kitchen "Par 24 ea / prep 24 ea" with no reload; Peppernata up + Sauces above Protein → kitchen order live,
same after a Setup reload, SQL sort_order 0–6 matches; section renamed "Sauces Test"; "ZZ Temp Item" (3 qt) and section
"ZZ New Section" added and live on the kitchen sheet; ZZ Temp Item counted once (as Ryan Coffee) then retired → gone
from the sheet, SQL `active=false` with its 1 `prep_entries` row kept; rename Mystery → Marinara refused with the
message and the box went back to "Mystery" (bug found here, fixed); "ZZ Temp Station" added then retired (tab gone,
editor closed); ZZ Test renamed and back. 375px no sideways scroll; 0 console errors. Not live on an open kitchen sheet:
a station rename/retire (it shows on reload; the sheet listens to items and counts only; not in this task's criteria).

**Dependencies:** T4, T7

**Files likely touched:** `app/src/pages/PrepSetup.jsx`, `app/src/prepSheets.css` (+ an RPC or plain updates; plain
updates are fine here)

**Estimated scope:** M

### Checkpoint D: Complete
- [ ] Every spec Success Criterion is ticked; T, B and C pass; `ZZ Test` station retired; review with Ryan.

**Fixes from Ryan's Checkpoint D review (11-07):**
- [x] Office sheet's "Your name" lists managers only: roster station "Manager" (Anthony Schmidt, Keelin Anderson, Matt
  Cone, Tyler Kemry) plus Ryan Coffee by name (his station stays Banquet; the scheduler reads it). Kitchen keeps the full
  roster. The office side remembers its own name (`prepSheets.officeEmployeeId`), so a shared tablet's cook name is never
  cleared. Tested `officeNames` (T 181, RED: not a function) · B · C: office list = those 5, pick survives a reload, kitchen
  still 26 names and its remembered name untouched, 0 console errors.
- [x] Notes larger: `.prep-note` 14px → 18px semi-bold (item names are 16px). B · C: Salad → Romaine's note reads 18px/600.
- [x] Finish count choices in the order of the day: Morning, Night Start, End of Night (UI order only; the database
  keys are unchanged). Spec updated. T 181 (RED: old order) · B · C: picker lists Morning / Night Start / End of Night.
- [x] Red stands out on the sheet: solid red chip (white text), red-tinted card with a 10px red edge, "prep N" larger in
  red; yellow gets an 8px edge and an outlined chip; green unchanged. Sheet lines only (overview/tile chips unchanged).
  B · C: Salad sheet screenshot; 375px no sideways scroll.
- [x] Notes larger: 14px → 18px semi-bold (item names are 16px). B · C: Salad → Romaine's note checked on screen.

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

# Spec: Station Prep Sheets

Status: **APPROVED** by the owner 2026-11-04. Source sheets: `prepsheets/*.xls[x]` (Fall 26).

## Objective

Put the five paper station prep sheets (Fry, Grill, Lunch, Salad, Sautee) into the app, so crew can count what they
have against par. The app colors each item by how short it is and shows how much to prep, and crew mark items prepped.
Managers get a bird's-eye view that ranks stations by how much prep they have left, so they know where to send help.
The Fry station, for example, might have time to clean or help elsewhere.

**Users:** kitchen crew (no login, pick their name), the office/manager (behind the existing office gate).

**The daily cycle it serves.** One running list per station, never reset:
1. **End of Night**: night crew counts everything, and that count tells the morning crew where they stand.
2. **Morning**: morning crew preps from it and updates as they go.
3. **Night Start**: night crew checks what morning got done and updates.
4. Then the next End of Night count, and the cycle repeats.

Completely separate from the BEO order list and everything else in the app. **It ships to production ON ITS OWN**
(see Shipping), without the 74 unpushed commits on local `main`.

### Behaviour

- **One line per item, exactly as the paper sheets.** Same stations, sections (Protein, Sauces, Garnish …), items and
  order. Each line shows the item, its par, what the crew has, the color, and how much to prep.
- **Par = number + unit.** "20 ea" → 20 `ea`; "1/3 pan" → 1 × `1/3 pan`; "(2) 1/3 pans" → 2 × `1/3 pan`; "2 G" → 2 `G`;
  "8 #" → 8 `lb`. The original text is kept for display. An item with no par (today: Peppernata, Roasted Shallott,
  Citrus Vinnegrette) can still be counted but gets no color and doesn't count toward the score.
- **Have (on hand)** is typed as a number in the par's unit, or set with quick buttons **Out / ¼ / ½ / ¾ / Full**
  (= 0, 0.25, 0.5, 0.75, 1 × par). For a `1/3 pan` par the box reads "0.5 of a 1/3 pan".
- **Color is automatic** from have ÷ par: **Red < 50%**, **Yellow 50% up to < 75%**, **Green ≥ 75%**. Exactly 50% is
  Yellow. Examples at par 20: 4 = Red, 10 = Yellow, 12 = Yellow, 15 = Green. An item not counted yet shows grey "not
  counted".
- **To prep** = par − have, never below 0 ("prep 16 ea").
- **Marking it prepped**, two ways:
  - **Done**: have becomes the full par, so the item turns Green.
  - **Partial**: enter how much was made, and have goes up by that amount. Used when product ran out or the cook got
    pulled away; the item stays Red or Yellow if still short.
- **Optional note** per item (e.g. "only 12 salmon in the walk-in"). It stays with the item until changed or cleared.
- **Who:** a name dropdown from the active crew roster (`employees`, the same list Crew Availability uses). The last
  pick is remembered on that device. No typing.
- **Saving is instant.** Every number, Done, Partial or note saves the moment it's entered, stamped with the name and
  time, so nothing is lost if a phone dies.
- **Finish count** button per station: the cook picks **Morning / Night Start / End of Night**, and the station is
  stamped e.g. "Sautee: End of Night count, Jake, 10:42pm". It never blocks: items left alone keep their last value.
- **History is kept.** Every entry and every Finish count is stored. A page to browse history is NOT in v1.

### Screens

1. **Kitchen → Prep Sheets** (`/kitchen/prep`): pick a station, then work its sheet as above. A new Kitchen nav entry.
2. **Kitchen dashboard tile**: each station's red and yellow counts. Tap a station to open its sheet.
3. **Office → Prep Overview** (`/office/prep`): every station's **score = 2 × Red + 1 × Yellow** (Green 0) is taken as
   a share of the most it could score (2 × its counted items), so stations of any size compare fairly and the maximum
   follows items added or retired. Stations rank furthest behind first (ties by name, nothing counted last), and the
   whole card is **Red ≥ 50 %, Yellow ≥ 25 %, Green below** (grey when nothing is counted) (owner, 11-09). Shows the
   % behind, the Red / Yellow / Green counts, the last Finish count (label, name, time) and the last update time. Tap
   a station to see its sheet.
4. **Office → Prep Setup** (`/office/prep/setup`): add, rename, reorder and remove stations, sections and items, and
   change pars. **Upload a spreadsheet** for a station (same layout as the files in `prepsheets/`): a preview shows
   every parsed item and par, and par text the parser can't read is flagged. A named row with a blank par could be a section header or an item (Garnish vs Peppernata), so each one gets a Section/Item toggle. Nothing saves until the office confirms,
   and then the upload **replaces** that station's list. An item whose name is kept also keeps its current count.

### Initial load

The five Fall 26 sheets are loaded once through the upload path, so the first load also tests the uploader. Obvious
typos are fixed on load: Brussles → Brussels, Sticy Rice → Sticky Rice, Seasame → Sesame, Carmel → Caramel,
Vinegrette / Vinnegrette → Vinaigrette, Shallott → Shallot, Piccatta → Piccata, Seaweed Salad "1 tyb" → "1 tub".

## Tech Stack

Existing app only: React 19 + Vite + react-router, Supabase (Postgres + PostgREST via `supabase-js`), SheetJS (already
installed) to read `.xls`/`.xlsx` in the browser. **No new packages.** No edge function, no AI: parsing is plain code.
On the ship branch SheetJS is still the old npm `0.18.5`, the version local `main` replaced for two advisories. The live
recipe upload already runs it, and only the office uploads these files, so the risk is low but real.

## Commands

```
Dev:   cd app && npm run dev        (port 5173, talks to the LIVE database)
Build: cd app && npm run build
Test:  cd app && npm test           (Vitest; exists on local main only, see Testing Strategy)
```

## Project Structure

```
app/src/lib/prepSheets.js          → pure logic: parsePar, colorFor, toPrep, stationScore, parsePrepWorkbook rows
app/src/lib/prepSheets.test.js     → Vitest for the above
app/src/pages/PrepSheets.jsx       → kitchen station sheet
app/src/pages/PrepOverview.jsx     → office bird's-eye view
app/src/pages/PrepSetup.jsx        → office items/pars editing + spreadsheet upload
app/src/components/PrepStationTile.jsx → kitchen dashboard tile
app/src/prepSheets.css             → all styles for the feature (NOT index.css, see Shipping)
supabase/migrations/2026110x_prep_sheets.sql → tables + RLS policies
```

Data model (sketch; final shape in the plan): `prep_stations`, `prep_items` (station, section, name, sort order,
`par_qty`, `par_unit`, `par_text`), `prep_item_state` (current have, note, last name/time per item), `prep_entries`
(every change: kind count/done/partial/note, amount, employee, time), and `prep_counts` (every Finish count: station,
label, employee, time).

## Code Style

Match the existing pages: function components with hooks, `supabase` from `lib/supabase.js`, check every `error`, a
`//` comment above each function or block (CLAUDE.md rule 10), local dates via `lib/dates.js`, never `toISOString()`.

```js
// Color for one item: share of par on hand. No par → no color; not counted → null.
export function colorFor(have, parQty) {
    if (parQty == null || parQty <= 0 || have == null) return null
    const ratio = have / parQty
    if (ratio < 0.5) return 'red'
    if (ratio < 0.75) return 'yellow'
    return 'green'
}
```

## Testing Strategy

- **Vitest, test first,** for `lib/prepSheets.js`: par parsing on every par in the five real files (incl. `1cs`,
  `4bags`, `(2) 1/3 pans`, `2 1/3 pans`, `2 qts/ea.`, `8 #`, blank), the color cutoffs at their edges (49.9 / 50 / 74.9 /
  75 %), to-prep, score, and the workbook parser against the real files (item and section counts).
- **Browser check** (Claude in Chrome): a cook flow on a phone width (pick a name, count, Done, Partial, note, Finish
  count), the overview ranking, and setup + upload preview. The local app writes to the LIVE database, so use a
  throwaway test station and delete it after.
- `npm run build` passes.
- Vitest isn't on the live branch yet. The plan decides how the tests run on the ship branch, without dragging the
  unpushed `package.json`/lockfile changes along.

## Boundaries

- **Always:** keep the feature in its own files; check `error` on every Supabase call; create RLS policies in the same
  migration as the tables (RLS is switched on automatically); keep pure logic in `lib/` with tests.
- **Ask first:** applying the migration to prod; loading the five sheets into prod; `git push`; any new package.
- **Never:** touch the BEO order list or other features; edit `index.css` or shared classes like `.wb-act-btn`; push local
  `main`'s other commits; let a model parse or do math.

## Shipping (ships alone)

1. Build on a branch off **`origin/main`** in a separate worktree, so local `main` and `prepsheets/` stay untouched.
2. Unpushed `main` also changes `App.jsx`, `OfficeLayout.jsx` and `index.css`. To keep the merge back simple, styles go
   in `prepSheets.css` and the route/nav edits are kept to a few added lines.
3. The migration is additive (new tables only). It's applied to prod with Ryan's OK before the push, and the live site
   ignores the tables until the code lands.
4. Push `<branch>:main` (Ryan's OK). Vercel deploys only this feature. Then **merge** (not rebase) back into local
   `main` and log CHANGES.md there.

## Success Criteria

- [x] All five Fall 26 sheets are loaded: every item, section and par matches the paper file, and typos are fixed.
- [x] Salmon at par 20: have 4 shows Red "prep 16", have 12 shows Yellow, have 15 shows Green. Done sets 20 (Green).
      Partial +5 from 4 sets 9 (still Red).
- [x] Quick buttons set 0 / ¼ / ½ / ¾ / full par in the par's unit, also for pan pars.
- [x] Every change saves instantly with the chosen name and time, survives a page reload, and appears on another open
      device's sheet, overview and tile without a reload.
- [x] The name dropdown lists active `employees` (on the office sheet: managers only, owner 11-08) and remembers the
      last pick on that device.
- [x] Finish count stamps the station with label, name and time, and the overview shows it.
- [x] The overview ranks and colors stations by 2 × Red + Yellow as a share of their maximum (11-09), and the kitchen
      tile shows red/yellow counts per station.
- [x] Office can edit an item's par and see it on the kitchen sheet. An upload previews first and only replaces the list
      on confirm. An item kept by name keeps its count.
- [ ] Tests pass, `npm run build` passes, the phone-width browser check passes, and only this feature reaches production.

## Decisions (owner, 2026-11-04)

1. **"2 1/3 pans"** (Lunch → Burger 4 oz) = **two 1/3 pans**, same as Sautee's "(2) 1/3 pans" → 2 × `1/3 pan`.
2. **"2 qts/ea."** (Salad → Fruit) stays **one line**, par 2 qt.
3. **Live updates:** the station sheet, the office overview and the kitchen tile update live when anyone changes an item
   or finishes a count (Supabase realtime, the same pattern as event tasks).
4. **FOH does not see prep sheets.** No `/foh` route or nav entry.
5. **Fry is open Mondays.** The paper sheet's missing Mon column was a mistake. The app has no day columns (one running
   list), so all five stations, Fry included, are used and shown every day of the week. If a printed sheet is ever
   wanted, it has Mon–Sun for every station.
6. **Week columns (revisit after v1).** The owner first pictured the paper layout, with Mon–Sun columns side by side.
   v1 stays the running list, and the owner will judge it once it's built. Every entry is stored with its time, so a week view
   (e.g. each day's End of Night count per item, in day columns) can be built later from the same data, with no
   migration.

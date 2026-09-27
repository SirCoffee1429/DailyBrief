# Requirements — Edit a Saved Schedule's Week Date (2026-09-26)

Source: `/sc:brainstorm` session with the owner. Requirements only — no design yet.

## Problem

`process-schedule` guesses the YEAR of a schedule week. The sheet shows month/day but
no year, and the model is told neither today's date nor the file name (the name is sent
in the payload but only logged). The owner reviews and edits the shifts, saves, and the
schedule lands under 2020 or 2024. The page auto-opens the week nearest today, so a
misdated schedule is effectively lost and gets re-uploaded.

Evidence (prod `schedules`, 2026-09-26): **7 of 25 rows misdated** — 2020-09-28 (today's
upload), 2024-09-21 (a Saturday) and 2024-10-21 (the same photos, uploaded twice), plus
four small 2024 rows that look like failed test uploads. No row exists for the current
week (2026-09-21) or next week (2026-09-28).

File names are a weak signal: `photo_2026-09-26_…` is the day the photo was taken, not
the week's Monday, and `IMG838936254009406389.jpg` has no date. Today's date is the
reliable signal — schedules are uploaded within days of their week.

## Decisions (owner)

| Question | Decision |
|---|---|
| Scope | Edit a saved schedule's date **and** prevent the bad guess |
| Target week already has a schedule | **Block** with a message; nothing is overwritten |
| Date must be a Monday? | **Snap** any picked date to that week's Monday |
| The 7 misdated rows | **Owner fixes them with the new button** (doubles as the real test) |

## Functional Requirements

**R1 — Change the week date on a saved schedule**
- Office mode only, in the schedule header beside the existing trash button.
- The owner picks a new date; it saves as that week's Monday.
- Every shift's `date` moves by the same number of days as `week_start`.
- If another schedule already has that `week_start`, refuse and say so. No change is made.
- After saving, the page shows the moved schedule under its new week.
- Nothing else about the schedule changes (shifts, colors, announcements, file).

**R2 — Stop the wrong-year guess at upload**
- The parser is given today's date and told to choose the schedule week closest to it.
- The review screen shows a clear warning when the detected week is more than about a
  month from today, so it is noticed BEFORE the save and not after.

## Acceptance Criteria

1. Moving 2020-09-28 → any day in the week of 2026-09-28 saves `week_start` 2026-09-28,
   and its shifts read 2026-09-28 … 2026-10-04.
2. On 2026-09-28 that schedule opens by default on the schedule page.
3. Moving a schedule onto a week that already has one is refused with a message, and
   both rows are unchanged in the database.
4. The edit control is not visible in kitchen (crew) mode.
5. A re-upload of the 09-26 photo parses to 2026-09-28 (or, if the model still misses,
   the review screen warns before save).
6. `npm run build` passes; verified in the browser.

## Out of Scope

- Reading dates from file names (unreliable, see above).
- Bulk-editing dates, or merging two schedules into one week.
- Deleting the four junk 2024 rows (owner will do it with the existing trash button).

## Resolved at Implementation (recommended defaults, owner did not object)

- The review screen's week picker also snaps to Monday.
- Warning threshold: 30 days (`WEEK_WARNING_DAYS`). Past uploads ran up to ~7 days ahead
  of their week.

**Status:** implemented 2026-09-26 — see the CHANGES.md entry of that date.

# Session 2026-09-27 — Week of 09-28 schedule re-dated from 2020

## What happened
- Ryan asked what Supabase held for "the week of the 27th" schedule.
- Found `schedules` row `5352d2bf-a8ed-4700-806a-21d1b76a2b21` (photo_2026-09-26_17-30-15.jpg,
  115 shifts, 29 people, 5 announcements: Mon golf 360, Thu 3 events, Fri/Sat homecoming,
  Sun homecoming brunch, bi-weekly cleaning).
- Broken two ways: `week_start` = 2026-09-27 (a SUNDAY) and every shift dated 2020-09-28 → 10-04.
  The grid builds days from `week_start` and matches shifts by exact date, so it rendered empty.
- Fixed by SQL at Ryan's instruction: `week_start` → 2026-09-28 (Monday), each shift
  `date + interval '6 years'` (weekday preserved — both years' 09-28 are Mondays).
- Verified: 115 shifts Mon→Sun = 9/13/16/20/21/20/16; announcements intact. Not browser-checked.

## Decisions
- Weeks run Monday → Sunday.
- Ryan does NOT want past misdated rows fixed (9/21 week filed as 2024-09-21, the 2024-10-21
  duplicate, 2024 test rows). Don't re-raise.

## Gotcha
- The Change Week button moves shifts by the gap between old and new `week_start`; it cannot
  repair a row whose shifts are years off. Use SQL and verify per-day counts.

## Other data seen for 9/28–10/4 (read only)
- 14 time-off requests (1 approved, 1 denied, 12 pending), 14 availability rows (2 people),
  1 active every-week pin, 4 active every-week quotas.

## Files touched
- CHANGES.md (entry), CLAUDE.md (Dates line now also records the Monday/exact-date rule),
  auto-memory `reference-schedule-week-dating.md` + MEMORY.md index. No code changed; nothing committed.

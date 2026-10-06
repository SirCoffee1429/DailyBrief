# Session 2026-10-06 — office time off: remove a request from the calendar (shipped alone)

## Ask
Owner: "the ability to remove user time off requests from the office/time-off page" — clicking a
name on the calendar opened the new-request form. A trash button already existed, but only in the
Upcoming list (end_date >= today; 72 of 239 rows). DB delete policy exists (time_off_delete_all /
time_off_requests_delete_all, duplicated pairs) — delete was never failing.

## Built (`app/src/pages/TimeOff.jsx` only)
- officeMode: calendar pill onClick → stopPropagation + deleteRequest(r); cursor pointer; title
  "· click to remove". Empty day area still opens the form. Kitchen calendar unchanged.
- deleteRequest: confirm names person + dates; `.delete().select()` and checks a row came back
  (same pattern as setRequestStatus), else alert and NO TIME_OFF_CANCELLED notification.
- No CSS change (index.css differs between origin/main and main → avoided a merge conflict).

## Shipped alone
Branch `time-off-remove` from origin/main → owner tested on dev server :5174 (5173 was occupied by
another server) → commit `461f12a` → `git push origin time-off-remove:main` (fast-forward) →
Vercel production READY → main merged origin/main (`caace3b`, merge not rebase) → merged build OK →
branch deleted. Docs commit `e6d0908` (CHANGES entry; 09-27 Menu Follow-ups archived).
Local main: 47 ahead of origin, 0 behind.

## Not done / noted
- CORRECTION (same day): past requests CAN be removed — the calendar shows every non-denied request
  in any month you page to; the owner removed Feb/Mar/Nov-Dec ones right after deploy. Only a
  DENIED request that has ended is unreachable (off the calendar, out of Upcoming).
- "+N more" names beyond 3 per day are not clickable (Upcoming list covers future ones).

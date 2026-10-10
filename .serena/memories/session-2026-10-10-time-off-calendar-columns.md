# Session 2026-10-10 — Time Off calendar column misalignment

**Report:** Time Off calendar showed October dates "pushed forward a day" (6th showed as the 7th).

**Diagnosis:** NOT a date/timezone bug. DB dates correct; `TimeOff.jsx` already uses local `isoDate()`;
in Chrome (America/Chicago) every request was in its correct cell. Cause was CSS: `.time-off-weekday-row`
and `.time-off-grid` are separate grids with `repeat(7, 1fr)`; bare `1fr` = `minmax(auto, 1fr)` so long
names (Bella Hammond, Katelyn Zeidler) widened their day columns and cells slid right of the headers
(28th under MON-TUE, Tue 6th under WED).

**Fix:** both grids `repeat(7, minmax(0, 1fr))` in `app/src/index.css` (pill ellipsis already existed).

**Shipped alone:** `21cee39` built in a worktree off `origin/main` (patch applied, node_modules junction for
the build), pushed `fix/time-off-columns:main`; merged back into local main `1061a58`. Live CSS bundle
`index-CmFflKu1.css` confirmed serving the rule. Local main still holds ~52 other unpushed commits.

**Verified:** injected CSS on live page → 7/7 header vs cell left positions equal, 0 overflow; build passes.
Not checked: mobile width separately.

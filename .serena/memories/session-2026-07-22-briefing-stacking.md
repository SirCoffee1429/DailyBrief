# Session 2026-07-22 — Same-Day Briefing Stacking + Date Bugs

## Shipped (all pushed to `main`, deployed via Vercel)
- **`9c18cad`** — housekeeping: condensed CHANGES.md, added session memories, deleted the scrapped portion-scaling research doc (owner request; was untracked, gone for good).
- **`bce3917`** — **same-day briefing stacking**. Multiple managers post per day; the dashboard showed them one at a time behind an unnoticed "Briefing 1 of N" cycler, so notes looked overwritten. Reality: nothing overwritten, all were loaded, cycler even showed OLDEST first. Fix: `.briefing-stack` renders every briefing for the day at once (newest first, author+time byline, own edit pencil); merged task list (group by newest briefing, then `sort_order` — sort_order is per-briefing, restarts at 0); new nullable `briefings.author` (70 legacy rows stay NULL -> time-only byline); new `lib/dates.js` fixing the UTC "today" bug; editor same-day notice. Cycler + CSS removed from Kitchen + FOH.
- **`491558c`** — `EventsBanquetsPage.jsx:99` `.gte('event_date', UTC today)` -> `localDateString()`. Was dropping the current day's banquets after 7pm.
- **`ceac97d`** — **date-default regression fix**. bce3917 changed the editor date DEFAULT from `toISOString()` (UTC) to `localDateString()` (local); evening posts had been *accidentally* defaulting to next-day (9pm CST = next day UTC), and the club's after-dinner "closing notes for tomorrow" workflow relied on it. New `defaultBriefingDate()`: today before 5pm local / tomorrow at/after 5pm (`NEXT_DAY_CUTOFF_HOUR=17`; owner: always posts after dinner service). On-site devices run Central so local-hour == CST/CDT hour.

## Verified
- Kitchen + FOH stacking, byline format, and **merged-task ordering** runtime-proven by seeding two same-day `destination:'both'` test briefings (deleted after). `defaultBriefingDate` boundary + rollover checked via node.
- Still code-only (blocked by office password gate — I do not type passwords): editor same-day notice, "Posted by" input, the pre-filled default date field.

## Data touched
- Re-dated "Banquet Tasks For The Slow Week" (`6b114b13...`) from 07-21 -> 07-22 at owner request. "Tuesday Closing" left on 07-21 (genuine Tue recap).

## Key facts / gotchas
- `briefings.date` = the day it displays on the dashboard. Nothing auto-deletes briefings.
- **Do NOT** revert `BriefingEditor` date default back to `localDateString()` — must stay `defaultBriefingDate()`.
- ~10 other `toISOString().split()` spots remain; owner reviewed `SchedulePage:216/984` + `WeeklyFeatures` and considers them fine (week-math, not "today"). Do not re-flag.
- Owner considers the `upcoming_banquets` section redundant (superseded by BEO list) — candidate for removal (UI + `process-banquets` fn + table + Postmark route); declined for now.
- Repo has no test runner — verify via `npm run build` + `npm run dev` + Chrome on `/kitchen` and `/foh` (no auth gate; `/office/*` is gated).

## Docs updated
CHANGES.md (317 lines, <500), project CLAUDE.md (200 lines, <=200 cap — trimmed RAG section), auto-memory `project_briefing_stacking` + `reference_utc_date_rollover`.

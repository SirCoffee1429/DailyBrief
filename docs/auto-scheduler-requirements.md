# Auto-Scheduler — Requirements Specification

> Status: **Design complete & approved** (Checkpoint 0 closed 2026-06-10).
> Requirements discovery via `/sc:brainstorm` 2026-06-05; design via `/sc:design` 2026-06-10.
> Schema + architecture live in `docs/auto-scheduler-design.md`. Next step: `/sc:implement` Phase 1.
> Updated 2026-06-10 to reflect owner decisions made during design review (see §3 and §9).

---

## 1. Goal

Replace the slow, manual weekly scheduling process for Old Hawthorne's ~30 kitchen
staff with a tool that can **generate a complete draft week schedule with one button
press**, respecting hours, time-off, availability, station/role training, and upcoming
events — then let the office review and adjust before publishing.

This is a fundamental inversion of today's flow. Currently a finished schedule is
**uploaded and parsed** (`process-schedule` Edge Function → `schedules.schedule_data.shifts[]`).
Going forward the app must **generate** the schedule from structured inputs that do not
exist in the app yet.

---

## 2. Users

- **Office / Management** — owns the roster, coverage template, and event staffing;
  presses "Generate," reviews the draft, edits, and publishes. (Gated by existing office password.)
- **Kitchen / FOH crew** — consumers of the published schedule; continue to submit
  time-off requests (existing `time_off_requests` flow). **New:** crew also enter and
  maintain their own availability from the kitchen side (name-select pattern, like
  Time Off), which reflects live to the office roster and the generator.

---

## 3. Confirmed Decisions (from discovery)

| Decision | Choice |
|---|---|
| Source of employee data | **Build a roster manager** — new structured employee records maintained in-app |
| Coverage model | **Fixed weekly staffing template** (per station per shift), with exceptions editable |
| Shift length / hours | **Set per station within the template** (Pastry may start earlier than Fry, etc.) |
| Event staffing | **Office sets required cook count per BEO**; generator must honor it |
| Recurring availability | **Mixed** — fully-open, students (specific days/time windows), parents (no nights on set days), strictly-part-time (locked set days) |
| Station policy | **Mostly consistent** — keep each person on their primary station; move only to cover gaps or balance hours |
| AI autonomy | **Draft → office approves** — generator fills the existing editable grid; nothing publishes automatically |
| Rollout | **Phased** — roster → coverage template → generation |
| Generator architecture | **Deterministic solver first, AI safety-net second** — solver builds the draft honoring all hard constraints; Gemini then reviews, cross-references candidates for unfilled slots, and writes plain-English explanations. AI-suggested fills are re-checked against hard constraints before landing. *(2026-06-10)* |
| Overtime | **Hard 40h cap by default; managers can override** via a per-run "Allow overtime" toggle. *(2026-06-10)* |
| Min/target hours | **Soft target only** — guides the generator toward full-timers' hours, never blocks. *(2026-06-10)* |
| Publish semantics | **`status` column on `schedules`** (`draft` \| `published`); office sees both, kitchen/FOH see published only; existing weeks backfill as published. *(2026-06-10)* |
| Labor cost | **Out of scope** — no pay data anywhere in v1. *(2026-06-10)* |
| Availability model | **Free-form, no rigid rule types** — per-day entries (status, optional time window, free-text note) + a free-text summary per employee; the AI interprets, the validator enforces. *(2026-06-10)* |
| Availability ownership | **Employees self-serve** — crew set their own default week + per-week overrides from the kitchen side; office can edit anyone's. *(2026-06-10)* |
| Roster seeding | **Seed from `Schedule Context Data/Roster Roles.txt`** (hand-curated 32-person roster), not from parsed history. *(2026-06-09)* |

---

## 4. Required Data Primitives (described, not designed)

These are the inputs the generator needs. Exact schema is deferred to `/sc:design`.

### 4.1 Employee Roster
Per employee:
- Name, active/inactive status.
- **Eligible shift types**: AM, Night, Banquet, The Turn, Pool (multi-select).
- **Stations/roles trained on**: Manager, Salad, Sautee, Char, Flat Top, Fry, Dish
  (multi-select; AM/Night kitchen stations). Plus role for Turn/Pool/Banquet as applicable.
- **Primary station** (for the "mostly consistent" policy) and optional secondary stations.
- **Max weekly hours** (hard cap, default 40; part-timers lower).
- Optional **target/min hours** (e.g., guarantee full-timers ~40).
- **Availability** — free-form model (decided 2026-06-10, replaces the earlier rigid
  four-shape rule system): per-day entries with a loose status, optional time window,
  and free-text notes, plus a free-text availability summary per employee. A default
  ("normal") week can be overridden for any specific week. No entry = fully available.
  This must still be expressive enough to cover all real worker shapes:
  - Fully open (no entries at all).
  - Students: only certain days/hours (entries with time windows).
  - Parents: no nights on set days (notes/time cutoffs the AI honors).
  - Standing recurring shifts (Becca pastry, Rico Wed Salad, Matthew Wed Pizza Wagon) —
    placed first every week.
  - Week-to-week variers (Christian Aaron, Jyanelli Rosas): sparse default week +
    per-week entries before generation; generator warns when a target week has none.

### 4.2 Coverage Template (Fixed Weekly)
- Required headcount **per station, per shift type, per day of week**.
- **Shift hours per station/slot** (start/end) so weekly-hour totals are exact.
- Editable per-week exceptions (holidays, slow days, closures).

### 4.3 Event / BEO Staffing
- Per-BEO **required cook count** (and shift type, e.g., Banquet) entered by office on
  the existing `banquet_event_orders` records.
- Generator pulls upcoming BEOs for the target week and adds those slots as hard demand.

### 4.4 Time Off
- Existing `time_off_requests` (full/am/pm/custom) consumed as hard blocks.

---

## 5. Functional Requirements (by phase)

### Phase 1 — Roster Manager + Crew Availability
- FR1.1 Office can create/edit/deactivate employees with all fields in §4.1.
- FR1.2 Office can set each employee's eligible shift types, trained stations, primary
  station, and max/target hours.
- FR1.3 Office can view/edit any employee's availability (default week + per-week
  overrides + notes) in the free-form model of §4.1.
- FR1.4 Roster is the single source of truth; the existing "names parsed from upload"
  behavior is superseded. Seeded from `Roster Roles.txt` (32 employees); unknowns left
  blank for staff/office to fill in the UI.
- FR1.5 **Crew availability page** (`/kitchen/availability`): an employee picks their
  name (Time Off pattern, no auth in v1) and sets their default week and per-week
  overrides; changes reflect live on the office side and feed the generator.

### Phase 2 — Coverage Template + Shift Definitions
- FR2.1 Office can define the fixed weekly staffing template: headcount per station per
  shift type per day of week.
- FR2.2 Office can set shift hours (start/end) per station/slot.
- FR2.3 Office can apply per-week exceptions to the template before generating.
- FR2.4 Office can set required cook count per upcoming BEO.

### Phase 3 — AI Generation ("Build Schedule" button)
- FR3.1 Office selects a target week and presses Generate.
- FR3.2 Generator produces a full draft `schedule_data.shifts[]` for that week that:
  - Fills every template slot and every BEO-required slot where possible.
  - Assigns only employees eligible + trained for that station/shift.
  - Honors all hard constraints (§6.1).
  - Applies soft preferences (§6.2), favoring station consistency.
- FR3.3 Draft loads into the **existing editable schedule grid** for review/adjustment.
- FR3.4 Generator reports **unfilled slots** and **why** (e.g., "Sat Night Sautee — no
  eligible staff under 40h"), so the office can resolve manually.
- FR3.5 Nothing publishes automatically; office explicitly saves/publishes the week.
- FR3.6 Generation accepts a small set of **parameters** at button press (confirmed:
  target week + "Allow overtime" toggle; other knobs per Open Q6).
- FR3.7 **"Who can cover this shift?"** — office can click any open/unfilled slot and
  get an AI-ranked list of eligible candidates with reasons (trained, available, under
  hours). This is the core manual-work-elimination use case (added 2026-06-10).

---

## 6. Constraints

### 6.1 Hard (must never be violated in a published schedule)
- No employee scheduled **over their max weekly hours** (default 40).
- No employee scheduled during an approved/active **time-off** block.
- No employee scheduled against their **recurring availability** (wrong day/time/shift type).
- No employee assigned to a **station/shift they are not eligible/trained** for.
- No **double-booking** (overlapping shifts same person/day).
- All **BEO-required** cook counts met (or flagged as unfilled).

### 6.2 Soft (optimize, but may yield)
- Keep each person on their **primary station** all week (consistency).
- Distribute hours **fairly**; get full-timers near their target hours.
- Honor **locked recurring shifts** first, then fill around them.
- (Possible future) seniority / preference weighting.

> **RESOLVED 2026-06-10:** deterministic solver enforces §6.1 while building the draft;
> Gemini runs afterward as the safety net — reviewing the week, cross-referencing
> candidates for unfilled slots, and writing plain-English reasons. AI suggestions are
> re-validated against §6.1 before entering the draft. See `docs/auto-scheduler-design.md` §1/§6.

---

## 7. Non-Functional Requirements
- Generation should feel "one press" — target a few seconds, with a progress state.
- Output must be **deterministic enough to trust**: same inputs → no hard-constraint violations.
- Draft must be fully editable in the current grid (no regression to existing edit/delete/color flows).
- Reuses existing stack: Supabase tables + realtime, React grid, office password gate.
- Must scale to ~30 employees × 5 shift types × 8 stations × 7 days without timeouts.

---

## 8. User Stories / Acceptance Criteria

- **US1** — *As an office manager, I add a new student cook and mark them "nights only, Tue/Thu/Sat,"*
  so that the generator never schedules them otherwise.
  - AC: Generated drafts never place that employee outside Tue/Thu/Sat nights.

- **US2** — *As an office manager, the template guarantees "PM kitchen Mon–Thu = 1 Fry, 1 Flat Top,
  1 Salad, 1 Grill, 1 Sautee, plus a manager on every shift,"* so coverage is guaranteed.
  - AC: Every PM weekday in the draft fills those 5 stations + a manager, or flags unfilled with a reason.
  - Note: **AM is station-less** — it just needs N hot line cooks + Salad (see Appendix A).

- **US3** — *As an office manager, I mark a Saturday BEO as needing 3 banquet cooks,* so the
  draft staffs the event.
  - AC: Draft includes 3 eligible banquet cooks Saturday, none over 40h, or flags the shortfall.

- **US4** — *As an office manager, I press Generate for next week and get a full draft in seconds,*
  then tweak two cells and publish.
  - AC: Draft loads in the existing grid; my edits persist; publish writes the week's `schedule_data`.

- **US5** — *As an office manager, I see a clear list of slots the AI could not fill and why,*
  so I can fix them fast.
  - AC: Unfilled slots listed with station/shift/day and a plain-English reason.

---

## 9. Open Questions
1. ~~Exact coverage numbers~~ — **RESOLVED, see Appendix A** (Book2.xlsx, confirmed 2026-06-09).
2. ~~The Turn & Pool~~ — **RESOLVED**: Turn = 1/day 7 days; Pool = 3/day, **summer only**. See Appendix A.
3. ~~Operating days~~ — **RESOLVED**: 7 days; no standing closed day; a **manager is always on duty AM & PM**.
4. ~~Overtime~~ — **RESOLVED 2026-06-10**: hard cap 40; managers override via per-run "Allow overtime" toggle.
5. ~~Min/guaranteed hours~~ — **RESOLVED 2026-06-10**: soft target only; never blocks generation.
6. **Generation parameters** — confirmed so far: target week + OT toggle. Other knobs (consistency-vs-fairness weight, events-first priority) decided during Phase 3 build.
7. ~~Labor cost~~ — **RESOLVED 2026-06-10**: out of scope; no pay data in v1.
8. ~~Generator approach~~ — **RESOLVED 2026-06-10**: deterministic solver first, AI safety-net review second (see §6 note).
9. ~~Roster seeding~~ — **RESOLVED 2026-06-09**: seed from hand-curated `Roster Roles.txt` (32 people), not parsed history.
10. ~~Publish semantics~~ — **RESOLVED 2026-06-10**: `draft`/`published` status on `schedules`; kitchen/FOH see published only.
11. ~~Pastry person~~ — **RESOLVED 2026-06-09**: Becca Liptak; self-scheduled ~3 days/wk within Tue–Fri 6:00a–3:00p; modeled as a standing/self-managed assignment.
12. ~~Live Music staffing~~ — **RESOLVED 2026-06-10**: manual office entry, not event-section
    driven. Office adds the +2 PM cooks as a per-week exception during final review before
    publishing; the review/draft UI must show a visible "Live Music tonight" warning badge
    on that day so it isn't missed.
13. **Exact days for 3-day/week workers** (Etta, Germinator, Kenessa, etc.) — collected via the new availability UIs after Phase 1 ships.
14. **Crew availability identity** — name-select with no auth in v1 (matches Time Off); revisit when real auth lands.

---

## Appendix A — Confirmed Coverage Template
> Source: `Schedule Context Data/Book2.xlsx`, confirmed by owner 2026-06-09. This is the official
> coverage spec. Headcounts are per day unless noted. Banquet is **not** here — it is per-BEO (§4.3).

### AM Kitchen — *no stations* (2 hot line cooks cover all AM stations; AM menu is distinct from PM)
| Days | Staff | Hours |
|---|---|---|
| Mon–Sat | 2 hot line cooks + 1 Salad | 8:00a–3:30p |
| Sun | 3 brunch cooks | 8:00a–3:00p |

### PM Kitchen — fixed stations: **Fry, Flat Top, Salad, Grill (= Char), Sautee**
| Days | Staff | Hours |
|---|---|---|
| Mon–Thu | 1 each of the 5 stations | 2:00p–9:30p |
| Fri–Sat | 5 stations **+ 2 additional cooks** | 2:00p–10:30p |
| Any day w/ **Live Music** | **+2 cooks** (dates from events section) | PM |

### Pastry — standing role (NOT in headcount template)
- Becca Liptak; schedule is consistent week-to-week (treat as a **locked recurring** assignment).

### Pizza Wagon — **year-round (weather permitting)**
| Days | Staff | Hours |
|---|---|---|
| Wed only | 2 people — Matthew Biebel (always) + usually Everett Dobbs | 1:30p–9:30p |

### Managers — **HARD CONSTRAINT: exactly 1 on duty every shift, AM & PM, 7 days/week**
| Shift | Days | Hours |
|---|---|---|
| AM | Mon–Sat | 9:00a–5:00p |
| AM | Sun | 8:00a–3:30p |
| PM | Mon–Thu | 1:30p–9:30p |
| PM | Fri–Sat | 2:30p–10:30p |

### The Turn — 7 days, 2 people Dewinston Blanton 5 days and Mel Winfert the other 2 days, 8:00a–3:00p

### The Pool — **SUMMER ONLY**, 3/day
| Role | Count | Hours |
|---|---|---|
| Manager | 1 | 9:30a–7:30p |
| Cooks | 2 | 10:30a–7:30p |

### Dish — 7 days
| Shift | Days | Hours |
|---|---|---|
| AM | 7 days | 9:00a–4:00p |
| PM | Mon–Thu, Sun | 4:00p–9:30p |
| PM | Fri–Sat | 4:00p–10:30p |

### Variable / event-driven coverage (not fixed)
- **Live Music** → +2 PM cooks (event-section driven).
- **Fri/Sat** → +2 PM cooks (already in PM table).
- **Banquets** → per-BEO cook count (§4.3), additive.

### Seasonality
- **Pool**: summer only.
- **Pizza Wagon**: year-round, weather permitting.

### Reconciliation note (template vs. May 2026 actuals)
The 4-week import (May 18 – Jun 8) showed Pool at ~0.5/day and no clear Pizza Wagon lane —
because Pool hadn't fully ramped and those staff parsed as generic "Kitchen." **The template
above is the source of truth for *intended* coverage; the import reflects *what actually ran*.**

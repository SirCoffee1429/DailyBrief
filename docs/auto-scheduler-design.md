# Auto-Scheduler — Phase 0 Design: Roster Schema & Architecture

> Status: **APPROVED with owner revisions, 2026-06-10** (Checkpoint 0).
> Owner direction: deterministic solver builds the draft, AI reviews afterward as the
> safety net (gap-filling reasoning + explanations); availability is free-form with no
> rigid rule types; employees set their own availability from the crew side.
> Sources: `docs/auto-scheduler-requirements.md` (Appendix A), `claudedocs/workflow_auto-scheduler.md`,
> `Schedule Context Data/Roster Roles.txt` (32-person seed roster).

---

## 1. Phase 0 Decisions (owner-confirmed 2026-06-10)

| # | Question | Decision |
|---|---|---|
| T0.1 | Generator architecture (Q8) | **Deterministic solver first, AI safety-net second.** A deterministic solver builds the draft — placing standing shifts, then filling every slot while respecting the non-negotiables (time-off, hours cap, double-booking, eligibility, availability). Gemini then reviews the finished draft: it does the human cross-referencing for anything the solver couldn't fill (who is trained, available, and under hours for each gap), sanity-checks the week, and writes plain-English explanations. Any AI-suggested fill is re-checked against the hard constraints before it lands in the draft. |
| T0.2 | Overtime (Q4) | **40-hour cap by default; managers can override.** Per-run "Allow overtime" toggle raises the cap for that generation run. |
| T0.3 | Min/target hours (Q5) | **Soft target only.** `target_weekly_hours` guides the AI toward full-timers' hours; never blocks. |
| T0.4 | Publish semantics (Q10) | **`status` column on `schedules`** (`draft` \| `published`). Office sees both; Kitchen/FOH filter to `published`. Existing weeks backfill as `published`. |
| T0.5 | Labor cost (Q7) | **Out of scope.** No pay columns anywhere. |
| NEW | Availability ownership | **Employees set their own availability** from the crew side (kitchen dashboard, name-select pattern like Time Off). It reflects live to the office roster and the generator. Office can also edit any employee's availability. |
| NEW | Availability shape | **Free-form, no rule types, no DB-enforced shapes.** Structured-but-loose per-day entries plus free-text notes; the AI interprets them. |

---

## 2. Canonical Vocabularies

Used for dropdowns and AI context; stored as plain text (no hard DB enforcement per owner
direction, except basic structural sanity like day-of-week range).

**Shift types**: `AM`, `PM`, `Banquet`, `Turn`, `Pool`
*(Requirements doc's "Night" = `PM` — matches existing app nomenclature.)*

**Stations**: `Manager`, `Hot Line`, `Salad`, `Sautee`, `Char`, `Flat Top`,
`Fry`, `Dish`, `Pastry`, `Turn`, `Pool Manager`, `Pool Cook`, `Banquet`, `Pizza Wagon`

Notes:
- AM kitchen is station-less → AM cooks are `Hot Line` (+ `Salad`).
- `Grill` in Appendix A = `Char` (one canonical name: `Char`).
- `Manager` as a station = "can be the manager on duty" (Anthony, Benjamin, Keelin, Tyler;
  Kevin/John for Pool via `Pool Manager`).

---

## 3. Roster Schema (Phase 1 tables)

### 3.1 `employees`

```sql
CREATE TABLE public.employees (
    id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    name                text        NOT NULL,
    active              boolean     NOT NULL DEFAULT true,

    -- What shifts this person may be placed into (§4.1) — dropdown-fed text[]
    eligible_shift_types text[]     NOT NULL DEFAULT '{}',

    -- Stations they are trained on; primary drives the consistency policy (§6.2)
    trained_stations    text[]      NOT NULL DEFAULT '{}',
    primary_station     text,

    -- Hours policy (T0.2 / T0.3)
    max_weekly_hours    numeric     NOT NULL DEFAULT 40 CHECK (max_weekly_hours > 0),
    target_weekly_hours numeric,

    -- Typical days/week (informational; AI uses it as a fairness hint)
    typical_days_per_week int       CHECK (typical_days_per_week BETWEEN 1 AND 7),

    -- Free-form availability summary the AI reads alongside the per-day grid
    -- (e.g. "No nights Tue/Thu — kids", "Makes her own schedule, Tue–Fri 6a–3p")
    availability_notes  text,

    notes               text
);

CREATE UNIQUE INDEX employees_name_unique ON public.employees (lower(name));
```

Design notes:
- **No `secondary_stations` column** — secondaries = `trained_stations` minus
  `primary_station`. One source of truth.
- **No `varies_weekly` flag needed anymore** — with the week-override model in §3.2,
  anyone can adjust any week; people like Christian Aaron and Jyanelli Rosas simply
  keep a sparse default week and enter each week as it firms up.
- `name` unique (case-insensitive) because the grid keys shifts by `employee_name`
  string (§5).
- RLS: app-standard open `allow_all` policy (matches `schedules`, `time_off_requests`).
  Real-time replication ON so crew availability edits appear live on the office side.

### 3.2 `employee_availability` — one flexible table, employee-editable

No rule types. Each row is a day entry; `week_start` decides whether it's the recurring
default or a specific-week override.

```sql
CREATE TABLE public.employee_availability (
    id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),
    employee_id  uuid        NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,

    -- NULL = recurring default week ("my normal availability")
    -- a Monday date = override for that specific week only
    week_start   date,

    -- Monday = 0 … Sunday = 6 (matches the app's Monday-start week convention)
    day_of_week  int         NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),

    -- Loose status label fed by UI buttons but not DB-enforced:
    -- 'available' | 'unavailable' | 'partial' (or anything future UIs need)
    status       text        NOT NULL DEFAULT 'available',

    -- Optional time window for partial days
    start_time   time,
    end_time     time,

    -- Free text the AI reads ("after 4pm only", "school until 3", "AM only",
    -- "Pizza Wagon 1:30–9:30", "prefers Sautee")
    note         text,

    UNIQUE (employee_id, week_start, day_of_week)
);

CREATE INDEX employee_availability_emp  ON public.employee_availability (employee_id);
CREATE INDEX employee_availability_week ON public.employee_availability (week_start);
```

**Resolution order at generation time** (for employee E, day D of target week W):
1. Row with `week_start = W` for that day → use it (override wins).
2. Else row with `week_start IS NULL` for that day → use the recurring default.
3. Else **no row = fully available** that day (keeps fully-open workers zero-maintenance).

**How the worker shapes map now** (interpreted by the AI, checked by the validator):

| Worker shape | Representation |
|---|---|
| Fully open | No rows at all |
| Student (set days/hours) | Recurring rows: available days with time windows, `unavailable` on the rest |
| Parent (no nights Tue/Thu) | Recurring rows Tue/Thu with `note: "no nights"` or end_time cutoff |
| Locked recurring (Becca pastry, Rico Wed Salad, Matthew Wed Pizza Wagon) | Recurring row with note describing the standing shift; seeded into `employees.availability_notes` too. The AI places these first; roster `notes` carry the full story |
| Varies weekly (Christian, Jyanelli) | Sparse/empty default week + per-week override rows entered before generation. Generator warns if a target week has no info |

### 3.3 Time off (existing, unchanged)

`time_off_requests` stays as-is — consumed as hard blocks by the validator (§4.4).

---

## 4. Downstream Tables (sketch — finalized in Phases 2–3)

- **`coverage_slots`** (Phase 2): `day_of_week`, `shift_type`, `station` (nullable for
  station-less AM), `headcount`, `start_time`, `end_time`, `seasonal` (`NULL`|`'summer'`),
  `active`. Seeded verbatim from Appendix A.
- **`coverage_exceptions`** (Phase 2): `week_start`, headcount deltas / closures —
  holidays, Pool on/off, Live Music +2.
- **`banquet_event_orders.required_cooks int`** (+ shift window) (Phase 2, FR2.4).
- **`generation_runs`** (Phase 3): `week_start`, `params jsonb` (incl. OT toggle),
  `unfilled jsonb` (slot + AI reason), `validator_report jsonb`, `duration_ms`,
  `schedule_id`.
- **`schedules.status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published'))`**
  (Phase 3, per T0.4 — default backfills existing rows correctly).

---

## 5. Compatibility with the Existing Schedule Grid (FR1.4, FR3.3)

The current grid (`SchedulePage.jsx`) renders `schedules.schedule_data.shifts[]` keyed by
`employee_name` (string), with `date`, `start_time`, `end_time`, `role`, `color`, `note`.

- The generator emits shifts in **exactly that shape** — grid rendering, colors,
  edit/delete, and the employee detail modal work on drafts with zero changes.
- Each generated shift additionally carries `employee_id` (ignored by today's grid,
  enables future joins). Roster stays the source of truth (FR1.4).
- Old uploaded weeks keep rendering as-is; nothing migrates.

---

## 6. Architecture Overview

```
   CREW (kitchen side)                      OFFICE (password gate)
┌──────────────────────────┐   ┌─────────────────────────────────────────┐
│ /kitchen/availability NEW│   │ /office/roster  NEW (Phase 1)           │
│  pick your name (TimeOff │   │  ├─ Employee list + editor              │
│  pattern) → set default  │   │  ├─ Availability view/edit (any emp)    │
│  week + per-week         │   │  └─ "Missing this week" indicator for   │
│  overrides + notes       │   │      sparse-default employees           │
└────────────┬─────────────┘   └────────────────┬────────────────────────┘
             │ supabase-js (+ realtime both ways)│
┌────────────▼─────────────────────────────────▼─────────────────────────┐
│ Postgres: employees · employee_availability · time_off_requests (exist)│
│           coverage_* (Phase 2) · generation_runs (Phase 3)             │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │ context pack at generation time
┌────────────────────────────────▼────────────────────────────────────────┐
│ Edge Fn generate-schedule (Phase 3) — solver first, AI safety net       │
│  1. Build context pack: roster, availability (default + overrides),     │
│     time-off, coverage template, BEO demand, hours ledger               │
│  2. Deterministic solver: place standing shifts, then fill every slot   │
│     honoring time-off, hours cap (unless OT), eligibility, no doubles   │
│  3. Gemini review pass: cross-references candidates for unfilled slots, │
│     sanity-checks the week, writes plain-English reasons/suggestions    │
│  4. AI-suggested fills re-checked vs hard constraints before landing;   │
│     residual issues → warnings panel, never silent                      │
│  → writes schedules row (status='draft') + generation_runs              │
└──────────────────────────────────────────────────────────────────────────┘
```

**"Who can cover this shift?"** — the same context pack powers a Phase 3 office feature:
click any open/unfilled slot and ask the AI for ranked candidates with reasons
("Carson — trained Fry, off that day, at 32h"). This is the owner's core use case
(cutting the manual search/cross-reference work) and falls out of the architecture
for free.

Phase 1 ships the top row + tables. UI follows existing patterns: routes in `App.jsx`,
`OfficeLayout` sidebar link, TimeOff name-select pattern for the crew page,
SchedulePage/EventsBanquets styling, styles in `index.css`.

### Seed strategy (T1.4)
A seed migration inserts the 32 employees from `Roster Roles.txt` with everything the
file states (shift types, stations, primary station, days/week, availability notes
verbatim). Per-day availability rows seeded only where the file is explicit (Rico Wed,
Matthew no-Mondays + Wed Pizza Wagon, Becca Tue–Fri 6a–3p window). Unknowns left empty
for staff/office to fill via the new UIs (Checkpoint 1).

---

## 7. Open Items Riding Into Phase 1 (do not block schema)

1. Crew availability page identity: name-select with no auth (TimeOff pattern) is the
   v1 plan — acceptable until real auth lands (already a known app-wide gap).
2. Live Music date source (Q12) — Phase 2 concern.
3. Exact days for 3-day/week workers — collected via the new availability UIs.
4. Validator repair loop depth (how many AI repair rounds before surfacing warnings) —
   tune in Phase 3.

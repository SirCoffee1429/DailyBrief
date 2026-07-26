// ── LLM provider boundary for the AI auto-scheduler ──────────────────────────
// The ONLY place that talks to the model. Swapping providers means rewriting
// only this file (design AD2/NFR4). Provider: Anthropic Claude (Messages API).
// Uses Structured Outputs so the model returns schema-valid JSON (no truncation/
// parse-failure class), and adaptive thinking for constraint reasoning.

import type { ProposedShift, ViolationReport, TemplateDemand } from './_shared/constraints.ts';
import { addDaysISO, DAY_SHORT } from './_shared/constraints.ts';

const ANTHROPIC_KEY = Deno.env.get('DailyBrief_Claude_AutoScheduler') || '';
const MODEL = 'claude-sonnet-4-6';
const ENDPOINT = 'https://api.anthropic.com/v1/messages';
const EFFORT = 'medium'; // medium balances quality/latency for the loop; raise to 'high' for max rigor

export const LLM_MODEL = MODEL;

// Structured-output schema — Claude is constrained to return exactly this shape.
const SCHEDULE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    shifts: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          employee_name: { type: 'string' },
          date: { type: 'string' },
          start_time: { type: 'string' },
          end_time: { type: 'string' },
          station: { type: 'string' },
          shift_type: { type: 'string' },
          purpose: { type: 'string', enum: ['template', 'event', 'live_music'] },
        },
        required: ['employee_name', 'date', 'start_time', 'end_time', 'station', 'shift_type', 'purpose'],
      },
    },
    notes: { type: 'string' },
    event_rationale: { type: 'string' },
  },
  required: ['shifts', 'notes', 'event_rationale'],
};

export interface BuildContext {
  week_start: string;
  allow_overtime: boolean;
  employees: any[];
  availability: any[];
  templateDemands: TemplateDemand[];
  noteExceptions: any[];
  timeOff: any[];
  events: any[];
  beos: any[];
  rules: any[];
}

export interface AiScheduleOutput {
  shifts: ProposedShift[];
  findings?: { notes?: string; event_rationale?: string };
}

function rosterLines(employees: any[]): string {
  return JSON.stringify(employees.map(e => ({
    name: e.name,
    shift_types: e.eligible_shift_types,
    stations: e.trained_stations,
    primary: e.primary_station,
    ratings: e.station_ratings, // 0-5 fit; 0 = never
    max_hours: e.max_weekly_hours,
    target_hours: e.target_weekly_hours,
    typical_days: e.typical_days_per_week,
    notes: [e.availability_notes, e.notes].filter(Boolean).join(' | ') || null,
  })));
}

function availabilityLines(employees: any[], availability: any[]): string {
  const byEmp = new Map<string, any>(employees.map(e => [e.id, e.name]));
  const out: Record<string, Record<string, string>> = {};
  for (const a of availability) {
    const name = byEmp.get(a.employee_id);
    if (!name) continue;
    if (a.status === 'available' && !a.start_time && !a.end_time) continue;
    const scope = a.week_start ? 'this-week' : 'usual';
    const day = DAY_SHORT[a.day_of_week];
    const desc = a.status === 'unavailable' ? 'OFF' : `${a.start_time || 'open'}-${a.end_time || 'open'}`;
    out[name] = out[name] || {};
    out[name][`${day}(${scope})`] = desc;
  }
  return JSON.stringify(out);
}

function demandLines(demands: TemplateDemand[]): string {
  return JSON.stringify(demands.map(d => ({
    date: d.date, day: DAY_SHORT[d.day_of_week], shift: d.shift_type,
    station: d.station || '(any)', need: d.headcount,
    time: d.start_raw && d.end_raw ? `${d.start_raw}-${d.end_raw}` : 'flex',
  })));
}

function eventLines(events: any[], beos: any[]): string {
  const beoByKey = new Map(beos.map(b => [`${b.event_date}|${(b.event_name || '').toLowerCase()}`, b]));
  return JSON.stringify(events.map(ev => {
    const beo = beoByKey.get(`${ev.event_date}|${(ev.event_name || '').toLowerCase()}`);
    const menu = beo?.food_items?.length
      ? beo.food_items.slice(0, 12).map((f: any) => f.item || f).join(', ')
      : null;
    return {
      name: ev.event_name, date: ev.event_date, time: ev.start_time,
      guests: ev.guest_count, type: ev.event_type, location: ev.location, menu,
    };
  }));
}

const SYSTEM_PROMPT =
  'You are an expert Back-of-House kitchen scheduler for a country club. You build complete, ' +
  'constraint-correct weekly schedules. The inviolable rules are absolute — never break them, ' +
  'even if it means leaving a coverage slot unfilled. Return ONLY the structured schedule.';

// Build / repair the full schedule. On repair passes prevReport is supplied and the
// model is told to fix only those problems while preserving valid placements.
export async function buildScheduleWithAI(
  ctx: BuildContext, prevReport: ViolationReport | null,
): Promise<AiScheduleOutput> {
  if (!ANTHROPIC_KEY) throw new Error('ANTHROPIC_API_KEY not configured');

  const weekDates = Array.from({ length: 7 }, (_, i) => `${DAY_SHORT[i]} ${addDaysISO(ctx.week_start, i)}`).join(', ');
  const ruleLines = ctx.rules.map(r => `- ${r.rule_text}${r.week_start ? ' (THIS WEEK ONLY)' : ''}`).join('\n') || '(none)';
  const noteLines = ctx.noteExceptions.map(e => `- ${e.note}`).join('\n') || '(none)';

  const repairBlock = prevReport ? `
YOUR PREVIOUS ATTEMPT HAD PROBLEMS. Fix these; keep every valid placement intact:
INVIOLABLE-RULE violations (MUST all be removed — REMOVE or REASSIGN each offending shift; if no legal person exists, LEAVE THAT SLOT UNFILLED rather than keep the violation):
${JSON.stringify(prevReport.hard)}
COVERAGE gaps (fill only the ones a legal person can take; over-staffing the template is also wrong):
${JSON.stringify(prevReport.coverage)}
UNSTAFFED events:
${JSON.stringify(prevReport.events.unstaffed)}
` : '';

  const prompt = `Build the COMPLETE weekly Back-of-House schedule. Week starts MONDAY ${ctx.week_start}. The 7 days are: ${weekDates}.

== INVIOLABLE RULES (NEVER break these — they always win over coverage) ==
A. Only schedule a person on a station they are TRAINED on AND whose rating is NOT 0. (rating 0 = never; absent rating on a trained station = 3.)
B. Only schedule a person for a shift type in their shift_types.
C. Never schedule a person when they are unavailable or on time-off.
D. No person works two overlapping shifts at once.
E. No person exceeds their max_hours${ctx.allow_overtime ? ' (OVERTIME ALLOWED this run — cap relaxed)' : ''}.

== COVERAGE GOAL (subordinate to the inviolable rules above) ==
1. Fill every required head in the template — no more, no fewer. Events/live-music are EXTRA on top (purpose:"event"/"live_music").
2. If a required head CANNOT be filled without breaking an inviolable rule (A-E), LEAVE IT UNFILLED. Never invent a placement, double-book, exceed hours, or use an unavailable/untrained person just to hit the count. An honest gap is correct; a rule-breaking placement is WRONG.

== RANKING (when choosing among valid people) ==
- Station rating is PRIMARY: prefer the highest-rated available person for each station (5 first).
- Then prefer people under their target_hours, then those with fewer days assigned, then least total hours.
- Keep each person near their typical_days (soft).

== EVENTS / BANQUETS / LIVE MUSIC ==
- For each event, INFER how many cooks and what hours from guests + menu complexity + start time; add them ON TOP of the template.
- Staff events with banquet-capable, highly-rated people first. Follow the Source-of-Truth event-chef policy below.

== SOURCE OF TRUTH RULES (manager policy — obey) ==
${ruleLines}

== PER-WEEK NOTES ==
${noteLines}

== COVERAGE TEMPLATE (required heads — fill EXACTLY) ==
${demandLines(ctx.templateDemands)}

== ROSTER (name, shift_types, trained stations, primary, station ratings 0-5, hours, days, notes) ==
${rosterLines(ctx.employees)}

== AVAILABILITY EXCEPTIONS (only non-open entries shown; anyone absent here is open all week) ==
${availabilityLines(ctx.employees, ctx.availability)}

== TIME-OFF (approved) ==
${JSON.stringify(ctx.timeOff.map(t => ({ name: t.employee_name, from: t.start_date, to: t.end_date, type: t.time_type })))}

== EVENTS THIS WEEK (staff on top of template) ==
${eventLines(ctx.events, ctx.beos)}
${repairBlock}
Return the full schedule: one entry per shift, plus brief notes and event_rationale.`;

  // Bound a single slow generation so it can't blow the loop's wall-clock budget.
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 150000);
  let resp: Response;
  try {
    resp = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 16000,
        thinking: { type: 'adaptive' },
        output_config: {
          effort: EFFORT,
          format: { type: 'json_schema', schema: SCHEDULE_SCHEMA },
        },
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
  if (!resp.ok) throw new Error(`Anthropic ${resp.status}: ${(await resp.text()).slice(0, 300)}`);
  const data = await resp.json();

  if (data.stop_reason === 'refusal') throw new Error('Model refused the request.');
  if (data.stop_reason === 'max_tokens') throw new Error('Response truncated (max_tokens).');

  // Structured outputs put the JSON in the text block(s); concatenate and parse.
  const text = (data.content || [])
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('');
  const parsed = JSON.parse(text);

  const shifts: ProposedShift[] = (Array.isArray(parsed.shifts) ? parsed.shifts : [])
    .filter((s: any) => s && s.employee_name)
    .map((s: any) => ({
      employee_name: s.employee_name, date: s.date, start_time: s.start_time,
      end_time: s.end_time, station: s.station, shift_type: s.shift_type,
      purpose: s.purpose || 'template',
    }));
  return {
    shifts,
    findings: { notes: parsed.notes, event_rationale: parsed.event_rationale },
  };
}

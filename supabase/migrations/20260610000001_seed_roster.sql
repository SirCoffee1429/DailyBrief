-- Seed: Auto-Scheduler Phase 1 — 32-person roster from Schedule Context Data/Roster Roles.txt
-- Applied to production 2026-06-10 via MCP execute_sql. Kept here as the repo record.
-- Unknowns (exact days for 3-day/week workers) intentionally left blank for the
-- office/crew to fill via the roster and availability UIs (Checkpoint 1).

INSERT INTO public.employees
  (name, eligible_shift_types, trained_stations, primary_station, typical_days_per_week, availability_notes, notes)
VALUES
  ('Alex Heger',         '{AM}',                    '{"Hot Line"}',                                                'Hot Line',     NULL, NULL, 'AM HOT LINE only'),
  ('Anthony Schmidt',    '{AM,PM,Banquet,Turn,Pool}','{Manager,"Hot Line",Salad,Sautee,Char,"Flat Top",Fry,Banquet}','Manager',     5,    'Usually works AM but can work any role anytime', 'Executive Chef'),
  ('Becca Liptak',       '{AM}',                    '{Pastry}',                                                    'Pastry',       3,    'Self-scheduled — ~3 days/week within Tue–Fri 6:00am–3:00pm', 'Pastry chef, part time. Really she makes her own schedule.'),
  ('Beck Labrie',        '{PM}',                    '{Salad}',                                                     'Salad',        NULL, NULL, 'PM Salad'),
  ('Benjamin Franklin',  '{AM,PM,Banquet}',         '{Manager,"Hot Line",Salad,Sautee,Char,"Flat Top",Fry}',       'Manager',      5,    NULL, 'Manager / Sous Chef, AM/PM'),
  ('Bradyn Jenkins',     '{Pool}',                  '{"Pool Cook"}',                                               'Pool Cook',    NULL, NULL, 'Pool staff'),
  ('Carson Evans',       '{PM}',                    '{Salad,Fry}',                                                 'Salad',        NULL, NULL, 'PM Salad/Fry'),
  ('Christian Aaron',    '{AM,PM}',                 '{}',                                                          NULL,           3,    'Varies weekly — availability must be entered each week', 'AM/PM mixed few days a week. Will change every week.'),
  ('Christopher Jackson','{PM}',                    '{Sautee}',                                                    'Sautee',       NULL, NULL, 'PM Sautee'),
  ('Darnell Crawford',   '{Pool}',                  '{"Pool Cook"}',                                               'Pool Cook',    NULL, NULL, 'Pool'),
  ('Darryl Darling',     '{AM}',                    '{Dish}',                                                      'Dish',         5,    NULL, 'AM Dish 5 days a week'),
  ('Dennis Cummings',    '{PM}',                    '{Fry,"Flat Top"}',                                            'Fry',          5,    NULL, 'PM Fry/Flat Top 5 days a week'),
  ('Dewinston Blanton',  '{AM,Turn,Pool}',          '{Turn,Salad,"Hot Line","Pool Cook"}',                         'Turn',         5,    'The Turn 5 days a week; Mel Winfert covers his 2 off days', 'AM. Takes care of The Turn but can work Salad/Hot Line/Pool'),
  ('Etain Oh',           '{AM,PM,Banquet}',         '{Banquet,Salad}',                                             'Banquet',      5,    NULL, 'AM/PM Banquet and Salad 5 days a week'),
  ('Etta Bybee',         '{PM}',                    '{Char}',                                                      'Char',         3,    NULL, 'PM 3 days a week Char'),
  ('Everett Dobbs',      '{PM,Banquet}',            '{Fry,Char,"Flat Top",Sautee,"Pizza Wagon",Banquet}',          NULL,           NULL, 'Pizza Wagon Wednesdays with Matthew Biebel; banquets every now and then', 'PM utility — Fry, Char, Flat Top, Sautee'),
  ('Germinator',         '{AM,PM}',                 '{Dish}',                                                      'Dish',         3,    'Mondays always (depending on event/banquet times); Sunday mornings', 'AM/PM Dish 3 days a week'),
  ('John Whalen',        '{Pool}',                  '{"Pool Manager","Pool Cook"}',                                'Pool Cook',    4,    'Covers the pool manager spot the 2 days Kevin McGee is off', 'Pool 2nd in command under Kevin McGee'),
  ('Jonathan Blanton',   '{PM}',                    '{Dish}',                                                      'Dish',         5,    NULL, 'PM Dish 5 days a week'),
  ('Jyanelli Rosas',     '{AM,PM}',                 '{}',                                                          NULL,           3,    'Varies weekly — availability must be entered each week (same situation as Christian Aaron)', 'AM/PM mix 3 days a week'),
  ('Keelin Anderson',    '{AM,PM,Banquet}',         '{Manager,"Hot Line",Salad,Sautee,Char,"Flat Top",Fry}',       'Manager',      5,    'Runs Sunday Brunch', 'Manager / Sous Chef, AM/PM 5 days a week'),
  ('Kenessa Marshall',   '{Pool}',                  '{"Pool Cook"}',                                               'Pool Cook',    3,    NULL, 'Pool 3 days a week'),
  ('Kevin McGee',        '{Pool}',                  '{"Pool Manager"}',                                            'Pool Manager', 4,    NULL, 'Pool main manager — runs pool operations 4 days a week'),
  ('Lamondre Cummings',  '{PM}',                    '{Sautee}',                                                    'Sautee',       5,    NULL, 'PM Sautee 5 days a week'),
  ('Matt Cone',          '{AM,PM,Banquet}',         '{Banquet,"Hot Line",Salad}',                                  'Banquet',      5,    'Mostly banquets; works Hot Line and/or Salad 1 morning', 'AM/PM Banquet mostly, 5 days a week'),
  ('Matthew Biebel',     '{AM,PM,Banquet}',         '{Banquet,"Pizza Wagon"}',                                     'Banquet',      5,    'No Mondays; Pizza Wagon Wednesdays 1:30pm–9:30pm', 'AM/PM Banquets and Pizza Wagon, 5 days a week'),
  ('Matthew Luce',       '{Pool}',                  '{"Pool Cook"}',                                               'Pool Cook',    4,    NULL, 'Pool 4 days a week'),
  ('Mel Winfert',        '{AM,PM,Banquet,Turn}',    '{Salad,"Hot Line",Banquet,Turn}',                             'Salad',        5,    'Covers The Turn the 2 days Dewinston Blanton is off; banquets when needed', 'AM/PM Salad and Hot Line'),
  ('Rico Struckoff',     '{AM}',                    '{Salad}',                                                     'Salad',        1,    'Wednesdays only', 'AM Salad Wednesdays only'),
  ('Ryan Coffee',        '{Banquet}',               '{Manager,Banquet}',                                           'Banquet',      5,    'Strictly banquets; Mondays only when there is an event', 'Banquet and Events Chef/Manager'),
  ('Scott Gestring',     '{AM}',                    '{"Hot Line"}',                                                'Hot Line',     5,    NULL, 'AM Hotline 5 days a week'),
  ('Tyler Kemry',        '{AM,PM,Banquet}',         '{Manager,"Hot Line",Salad,Sautee,Char,"Flat Top",Fry}',       'Manager',      5,    NULL, 'Chef De Cuisine / Manager, AM/PM 5 days a week')
ON CONFLICT ((lower(name))) DO NOTHING;

-- Recurring default-week availability where the roster file is explicit
-- (week_start NULL = default week; Monday=0..Sunday=6)
INSERT INTO public.employee_availability (employee_id, week_start, day_of_week, status, start_time, end_time, note)
SELECT id, NULL::date, d, 'available', '06:00'::time, '15:00'::time, 'Self-scheduled — picks ~3 of these days'
FROM public.employees, unnest(ARRAY[1,2,3,4]) AS d WHERE name = 'Becca Liptak'
UNION ALL
SELECT id, NULL::date, d, 'unavailable', NULL::time, NULL::time, NULL
FROM public.employees, unnest(ARRAY[0,5,6]) AS d WHERE name = 'Becca Liptak'
UNION ALL
SELECT id, NULL::date, 2, 'available', NULL::time, NULL::time, 'Wednesdays only — AM Salad'
FROM public.employees WHERE name = 'Rico Struckoff'
UNION ALL
SELECT id, NULL::date, d, 'unavailable', NULL::time, NULL::time, NULL
FROM public.employees, unnest(ARRAY[0,1,3,4,5,6]) AS d WHERE name = 'Rico Struckoff'
UNION ALL
SELECT id, NULL::date, 0, 'unavailable', NULL::time, NULL::time, 'No Mondays'
FROM public.employees WHERE name = 'Matthew Biebel'
UNION ALL
SELECT id, NULL::date, 2, 'available', '13:30'::time, '21:30'::time, 'Pizza Wagon with Everett Dobbs'
FROM public.employees WHERE name = 'Matthew Biebel'
ON CONFLICT DO NOTHING;

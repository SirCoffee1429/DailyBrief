// Compares an event parsed out of an emailed BEO against the
// banquet_event_orders row it would overwrite, so the office can see what
// approving would actually change before committing to it.
//
// Pure — no Supabase, no React. The panel already holds both sides in memory,
// and keeping this side-effect free makes it the one piece of this feature that
// could be unit tested if a test runner ever lands on main.

// Scalar fields worth showing as a plain before/after. timeline and food_items
// are deliberately absent: process-beo derives both from sections, so diffing
// them too would report the same edit two or three times over.
const FIELDS = [
    { key: 'guest_count', label: 'Guests' },
    { key: 'start_time', label: 'Start time' },
    { key: 'location', label: 'Location' },
    { key: 'event_end_date', label: 'End date' },
    { key: 'notes_text', label: 'Notes' },
]

// null, undefined and '' all mean "not set", and the two sides disagree about
// which to use — Gemini emits null where the column holds ''. Numbers arrive as
// numbers from the parser and strings from Postgres. Without this every event
// would read as changed.
function normalize(value) {
    if (value === null || value === undefined) return ''
    return String(value).trim()
}

// A readable name for the meal block an item sits in.
function sectionLabel(section) {
    return [section?.day_label, section?.meal_type].filter(Boolean).join(' · ') || 'Section'
}

// Items carry no id, so identity has to be built from their own text. Section
// and category belong in the key because the same dish legitimately appears in
// more than one meal of the same event, and those are not the same line item.
function itemKey(section, category, item) {
    return [section, category, normalize(item?.label), normalize(item?.description)].join('||')
}

// Flattens section → category → item into a single keyed map, so comparing two
// events is a map lookup rather than walking three levels of nesting twice.
function flattenItems(event) {
    const out = new Map()
    for (const section of event?.sections || []) {
        const sLabel = sectionLabel(section)
        for (const category of section?.categories || []) {
            const cName = normalize(category?.name)
            for (const item of category?.items || []) {
                out.set(itemKey(sLabel, cName, item), {
                    section: sLabel,
                    category: cName,
                    label: normalize(item?.label),
                    description: normalize(item?.description),
                    qty: normalize(item?.qty),
                })
            }
        }
    }
    return out
}

// incoming — one entry from pending_beo_imports.parsed_events
// existing — the banquet_event_orders row with the same (event_name, event_date),
//            or null when the email introduces an event we do not have yet.
export function diffBeoEvent(incoming, existing) {
    if (!existing) {
        return { status: 'new', fields: [], added: [], removed: [], changed: [] }
    }

    const fields = FIELDS
        .map(({ key, label }) => ({
            key,
            label,
            from: normalize(existing[key]),
            to: normalize(incoming[key]),
        }))
        .filter(field => field.from !== field.to)

    const before = flattenItems(existing)
    const after = flattenItems(incoming)

    const added = []
    const removed = []
    const changed = []

    for (const [key, item] of after) {
        const previous = before.get(key)
        if (!previous) {
            added.push(item)
        } else if (previous.qty !== item.qty) {
            changed.push({ ...item, from: previous.qty, to: item.qty })
        }
    }

    for (const [key, item] of before) {
        if (!after.has(key)) removed.push(item)
    }

    const touched = fields.length + added.length + removed.length + changed.length
    return { status: touched > 0 ? 'changed' : 'unchanged', fields, added, removed, changed }
}

// The key process-beo itself matches on. Kept here so the panel's preview and
// the edge function's actual write can never disagree about what counts as the
// same event.
export function eventKey(event) {
    return `${event?.event_name}||${event?.event_date}`
}

// Pairs every event in a queue row with the live BEO it would overwrite.
export function diffBeoImport(parsedEvents, beos) {
    const byKey = new Map((beos || []).map(beo => [eventKey(beo), beo]))
    return (parsedEvents || []).map(event => ({
        event,
        diff: diffBeoEvent(event, byKey.get(eventKey(event))),
    }))
}

// Headline counts for the panel's one-line summary.
export function summarizeDiffs(entries) {
    return entries.reduce(
        (totals, entry) => ({ ...totals, [entry.diff.status]: totals[entry.diff.status] + 1 }),
        { new: 0, changed: 0, unchanged: 0 }
    )
}

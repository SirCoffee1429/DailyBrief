// Station prep sheets: the pure math every prep screen uses (spec/prep-sheets.md).
// Components only call these, so what the crew sees is exactly what the tests check.

// Color cutoffs as a share of par: red below half, yellow from half up to three quarters, green from there.
const RED_BELOW = 0.5
const YELLOW_BELOW = 0.75

// Score weights for the manager's ranking: red counts double, green counts nothing.
const SCORE_WEIGHT = { red: 2, yellow: 1, green: 0 }

// Unit words as the kitchen writes them → one name per unit, used in "prep 16 ea".
const UNIT_ALIASES = {
    ea: 'ea', each: 'ea',
    cs: 'cs', case: 'cs', cases: 'cs',
    bag: 'bag', bags: 'bag', bgs: 'bag',
    order: 'order', orders: 'order',
    qt: 'qt', qts: 'qt', quart: 'qt', quarts: 'qt',
    btl: 'btl', btls: 'btl', bottle: 'btl', bottles: 'btl',
    squezzy: 'squeeze btl', squeezy: 'squeeze btl',
    cup: 'cup', cups: 'cup',
    g: 'gal', gal: 'gal', gallon: 'gal', gallons: 'gal',
    '#': 'lb', lb: 'lb', lbs: 'lb',
    pack: 'pack', packs: 'pack',
    box: 'box', boxes: 'box',
    tub: 'tub', tubs: 'tub',
    wedge: 'wedge', wedges: 'wedge',
}

// Pan pars: "1/3 pan", "(2) 1/3 pans" and "2 1/3 pans" (= two 1/3 pans, owner 2026-11-04).
const PAN_PAR = /^(?:\((\d+)\)\s*|(\d+)\s+)?(\d+\/\d+)\s*pans?$/i

// Every other par: an amount, then an optional unit word ("20 ea", "4bags", "8 #", "40").
const AMOUNT_PAR = /^(\d+(?:\.\d+)?)\s*(.*)$/

// Rounds to 2 decimals so subtraction never shows float noise like 7.699999.
function round2(n) {
    return Math.round(n * 100) / 100
}

// Par text → { qty, unit }, or null when there is no usable par (blank, no amount, or zero).
// An unknown unit word is kept as typed rather than losing the par.
export function parsePar(text) {
    const s = String(text ?? '').trim()
    if (!s) return null

    const pan = s.match(PAN_PAR)
    if (pan) {
        const qty = Number(pan[1] ?? pan[2] ?? 1)
        return qty > 0 ? { qty, unit: `${pan[3]} pan` } : null
    }

    const m = s.match(AMOUNT_PAR)
    if (!m) return null
    const qty = Number(m[1])
    if (!(qty > 0)) return null

    // "2 qts/ea." (one per fruit) is still 2 qt on one line (owner, 2026-11-04).
    const word = m[2].replace(/\/\s*ea\.?$/i, '').trim().toLowerCase()
    return { qty, unit: word ? (UNIT_ALIASES[word] ?? word) : 'ea' }
}

// Color from how much is on hand vs par. No par, or not counted yet → null (shown grey).
export function colorFor(have, parQty) {
    if (parQty == null || !(parQty > 0) || have == null) return null
    const ratio = have / parQty
    if (ratio < RED_BELOW) return 'red'
    if (ratio < YELLOW_BELOW) return 'yellow'
    return 'green'
}

// How much to prep to get back to par, never below zero. Null when there is nothing to compare.
export function toPrep(have, parQty) {
    if (parQty == null || !(parQty > 0) || have == null) return null
    return Math.max(round2(parQty - have), 0)
}

// The quick buttons under the Have box: Out, ¼, ½, ¾ and Full of par. None without a par.
export function quickValues(parQty) {
    if (parQty == null || !(parQty > 0)) return []
    return [
        { label: 'Out', value: 0 },
        { label: '¼', value: round2(parQty * 0.25) },
        { label: '½', value: round2(parQty * 0.5) },
        { label: '¾', value: round2(parQty * 0.75) },
        { label: 'Full', value: parQty },
    ]
}

// One station's color counts and ranking score (2 × red + yellow).
// Items with no par are left out; items with a par but no count yet are "uncounted".
export function stationScore(items) {
    const counts = { red: 0, yellow: 0, green: 0, uncounted: 0 }
    for (const { have, parQty } of items) {
        if (parQty == null || !(parQty > 0)) continue
        const color = colorFor(have, parQty)
        counts[color ?? 'uncounted'] += 1
    }
    const score = counts.red * SCORE_WEIGHT.red + counts.yellow * SCORE_WEIGHT.yellow + counts.green * SCORE_WEIGHT.green
    return { ...counts, score }
}

// A pan par's unit, e.g. "1/3 pan". Pans read differently: "0.5 of a 1/3 pan", "2 × 1/3 pan".
const PAN_UNIT = /pan$/

// The words after an amount. Under one pan: "of a 1/3 pan"; otherwise "× 1/3 pan"; other units as is.
export function unitSuffix(qty, unit) {
    if (!unit) return ''
    if (!PAN_UNIT.test(unit)) return unit
    return qty != null && qty > 0 && qty < 1 ? `of a ${unit}` : `× ${unit}`
}

// An amount with its unit, as the crew reads it: "16 ea", "0.5 of a 1/3 pan".
export function formatAmount(qty, unit) {
    const n = round2(Number(qty))
    return `${n} ${unitSuffix(n, unit)}`.trim()
}

// What one line shows: its color, the chip label, and how much to prep.
// The database sends numerics as strings, so they are read as numbers here.
export function lineStatus({ have, par_qty, par_unit }) {
    const parQty = par_qty == null ? null : Number(par_qty)
    const haveQty = have == null ? null : Number(have)
    if (parQty == null || !(parQty > 0)) return { color: null, label: 'No par', prep: null }
    const color = colorFor(haveQty, parQty)
    if (!color) return { color: null, label: 'Not counted', prep: null }
    const need = toPrep(haveQty, parQty)
    return {
        color,
        label: color[0].toUpperCase() + color.slice(1),
        prep: need > 0 ? `prep ${formatAmount(need, par_unit)}` : 'at par',
    }
}

// Items (already in sheet order) → [{ section, items }], one group per run of the same section.
export function groupBySection(items) {
    const groups = []
    for (const item of items) {
        const last = groups.at(-1)
        if (last && last.section === item.section) {
            last.items.push(item)
        } else {
            groups.push({ section: item.section, items: [item] })
        }
    }
    return groups
}

// A typed Have amount → { value, error }. Blank is "no change" (value null), not zero.
export function parseHaveInput(text) {
    const s = String(text ?? '').trim()
    if (!s) return { value: null, error: null }
    const n = Number(s)
    if (!Number.isFinite(n) || n < 0) return { value: null, error: 'Enter how much you have (0 or more).' }
    return { value: round2(n), error: null }
}

// A Partial's "how much I made" → { value, error }. It must add something, so 0 and blank are refused.
export function parseMadeInput(text) {
    const { value } = parseHaveInput(text)
    if (value == null || value <= 0) return { value: null, error: 'Enter how much you made (more than 0).' }
    return { value, error: null }
}

// The Finish count choices: the database keys and how the kitchen says them, in the order of the day (owner, 11-08).
export const COUNT_LABELS = [
    { key: 'morning', label: 'Morning' },
    { key: 'night_start', label: 'Night Start' },
    { key: 'end_of_night', label: 'End of Night' },
]

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// A saved time in local time: "10:42pm" today, "Nov 4, 10:42pm" another day, with the year if it isn't this year.
export function formatStamp(iso, now = new Date()) {
    const d = new Date(iso)
    const hour = d.getHours() % 12 || 12
    const time = `${hour}:${String(d.getMinutes()).padStart(2, '0')}${d.getHours() < 12 ? 'am' : 'pm'}`
    if (d.toDateString() === now.toDateString()) return time
    const year = d.getFullYear() === now.getFullYear() ? '' : ` ${d.getFullYear()}`
    return `${MONTHS[d.getMonth()]} ${d.getDate()}${year}, ${time}`
}

// The station header's last Finish count: "End of Night, Jake, 10:42pm".
export function lastCountText(count, now = new Date()) {
    if (!count) return 'No count finished yet'
    const label = COUNT_LABELS.find(c => c.key === count.label)?.label ?? count.label
    return `${label}, ${count.employee_name}, ${formatStamp(count.created_at, now)}`
}

// A live change to one prep_items row (a Supabase realtime INSERT/UPDATE) applied to the open station's lines, in
// sheet order. A line taken off the sheet (active false) drops out; a new one goes in at its sort_order. Rows are
// never deleted (retired instead), so DELETEs aren't handled. Returns a new list. Before the lines have loaded (null)
// it stays null: the load brings the latest anyway.
export function applyItemChange(items, { new: row }) {
    if (!items) return items
    const rest = items.filter(i => i.id !== row.id)
    if (!row.active) return rest
    return [...rest, row].sort((x, y) => x.sort_order - y.sort_order)
}

// The station header shows the latest Finish count, whichever arrives first.
export function newerCount(current, incoming) {
    if (!current) return incoming
    return new Date(incoming.created_at) > new Date(current.created_at) ? incoming : current
}

// Every station, in the order given, with its color counts and score, its last Finish count and its latest change.
// `items` are all active lines (any station); `latestCounts` maps a station id to its last Finish count.
export function stationCounts(stations, items, latestCounts) {
    return stations.map(station => {
        const lines = items.filter(i => i.station_id === station.id)
        const counts = stationScore(lines.map(i => ({ have: i.have, parQty: i.par_qty })))
        const lastUpdate = lines.reduce((latest, i) =>
            (i.changed_at && (!latest || new Date(i.changed_at) > new Date(latest)) ? i.changed_at : latest), null)
        return { ...station, ...counts, lastCount: latestCounts[station.id] ?? null, lastUpdate }
    })
}

// The office overview: the same, most work first (score = 2 x red + yellow), ties by name.
export function rankStations(stations, items, latestCounts) {
    return stationCounts(stations, items, latestCounts)
        .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
}

// The office sheet's name dropdown: the roster's managers (station "Manager") plus the extra names the owner listed.
// The roster has no manager flag, and Ryan's station stays Banquet because the scheduler reads it (owner, 2026-11-07).
const OFFICE_EXTRA_NAMES = ['Ryan Coffee']
export function officeNames(employees) {
    return employees.filter(e => e.primary_station === 'Manager' || OFFICE_EXTRA_NAMES.includes(e.name))
}

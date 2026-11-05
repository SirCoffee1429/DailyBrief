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

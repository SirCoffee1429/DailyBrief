// Pure helpers for the menu draft/confirm flow.
//
// Kept out of the components (same reason as catalogParse.js) so the rules can be run
// and checked headlessly against the real filenames rather than only through the UI.

// 'spring' | 'summer' | 'fall' | 'winter' are the seasonal menus; everything else is year-round.
// Underscores are word characters, so \b does NOT fire between "_" and "Fall" —
// 'Old_Hawthorne_Fall_Menu.docx' would silently come through with no season. The
// separator class is spelled out instead of relying on \b.
const SEP = '(?:^|[^A-Za-z0-9])'
const SEASON_PATTERNS = ['spring', 'summer', 'fall', 'winter'].map(season => ({
    season,
    re: new RegExp(`${SEP}${season}(?![A-Za-z0-9])`, 'i'),
}))

// A file's name IS its menu identity, so this has to be deterministic — the model is
// never asked which menu it is reading. 'Seasonal - Fall.pdf' is the Fall menu, not a
// menu called "Seasonal - Fall", because the season is a separate dimension of identity
// and the two seasonal files both hold a plated dinner and a buffet.
export function menuSourceFromFilename(filename) {
    const stem = filename.replace(/\.(pdf|docx)$/i, '').trim()

    const match = SEASON_PATTERNS.find(p => p.re.test(stem))
    if (match) return { menuSource: 'Seasonal', season: match.season }

    return { menuSource: stem, season: null }
}

export function isDocx(filename) {
    return /\.docx$/i.test(filename)
}

// The fields a reviewer can correct before confirming. Anything not listed here is
// either identity (name, menu_source, season) or provenance (source_page) and is not
// editable from the review list.
export const EDITABLE_FIELDS = ['menu_section', 'description', 'upcharge', 'base_price', 'price_unit', 'price_qty', 'serves', 'min_order']

// Money and counts arrive from text inputs as strings; '' has to become null rather
// than 0, or an unpriced dish silently claims to cost nothing.
export function normaliseDishEdits(dish) {
    const num = (v) => {
        if (v === null || v === undefined || String(v).trim() === '') return null
        const n = Number(String(v).replace(/[^0-9.]/g, ''))
        return isFinite(n) ? n : null
    }
    const int = (v) => {
        const n = num(v)
        return n === null ? null : Math.round(n)
    }
    const str = (v) => {
        const s = (v ?? '').toString().trim()
        return s === '' ? null : s
    }

    return {
        menu_section: str(dish.menu_section),
        description: str(dish.description),
        upcharge: num(dish.upcharge),
        base_price: num(dish.base_price),
        price_unit: dish.price_unit || null,
        // NOT NULL in the table, and a 0 would make any per-unit division explode.
        price_qty: num(dish.price_qty) > 0 ? num(dish.price_qty) : 1,
        serves: int(dish.serves),
        min_order: int(dish.min_order),
    }
}

// How a dish's price reads on one line. upcharge and base_price mean different things
// (a supplement on a package vs. the dish's own price) and are never added together.
export function priceLabel(dish) {
    if (dish.base_price !== null && dish.base_price !== undefined) {
        // The quantity has to be visible. "$115" beside a 20-glass price reads as the
        // price of one, which is how the hors d'oeuvres menu came out 20x too dear.
        const qty = Number(dish.price_qty ?? 1)
        if (dish.price_unit && qty > 1) {
            return `$${Number(dish.base_price).toFixed(2)} / ${qty} ${dish.price_unit}`
        }
        const unit = dish.price_unit ? `/${dish.price_unit}` : ''
        return `$${Number(dish.base_price).toFixed(2)}${unit}`
    }
    if (dish.upcharge !== null && dish.upcharge !== undefined) {
        return `+$${Number(dish.upcharge).toFixed(2)}`
    }
    return 'included'
}

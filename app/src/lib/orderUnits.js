// Portion -> catalog pack arithmetic for the BEO order guide.
//
// Pure functions, no React and no network, so the P4 order list can reuse exactly this
// code rather than a retyped copy of it (a retyped harness had already drifted from the
// shipped logic once — feedback-verification-must-share-the-shipped-code).
//
// Design §7: three unit classes, exact conversion INSIDE a class, and NO conversion
// across classes. A mismatch is a gap with a reason, never a density guess.

// A portion unit's class and its size in the catalog's base unit for that class
// (catalogParse.js stores every pack in lb, gal or ct).
const PORTION_UNITS = {
    oz: { unitClass: 'weight', base: 'lb', factor: 1 / 16 },
    lb: { unitClass: 'weight', base: 'lb', factor: 1 },
    floz: { unitClass: 'volume', base: 'gal', factor: 1 / 128 },
    each: { unitClass: 'count', base: 'ct', factor: 1 },
}

export const PORTION_UNIT_NAMES = Object.keys(PORTION_UNITS)

// Why a line cannot be costed, in words a reviewer can act on.
export const GAP_REASONS = {
    unmapped: 'No product mapped yet',
    no_product: 'Not bought from this catalog',
    no_pack_total: 'Pack size has no usable total (e.g. a #10 can)',
    no_conversion: 'Portion unit and pack unit are different kinds (weight / volume / count)',
    unpriced: 'Product has no price',
}

// How much of ONE CASE a portion unit is measured against, or why it cannot be.
//
// The one allowance beyond same-class arithmetic: a portion counted by the piece
// ("1 each" bun) against a pack the catalog stores by WEIGHT ("72/2.6 OZ") uses the
// pack COUNT — 72 buns — which is exact, not a density. Only when there is more than
// one item in the pack: "1/40 LB" has a count of 1 and that one item is a 40 lb bag,
// not a bun. `viaPackCount` is returned so the UI can show the reviewer that it
// happened.
export function unitFit(portionUnit, product) {
    const portion = PORTION_UNITS[portionUnit]
    if (!portion) return { ok: false, reason: 'no_conversion' }
    if (!product) return { ok: false, reason: 'unmapped' }

    const total = Number(product.pack_total_base)
    if (product.base_unit === portion.base && total > 0) {
        return { ok: true, perCase: total, baseUnit: portion.base, viaPackCount: false }
    }
    if (portion.unitClass === 'count' && Number(product.pack_count) > 1) {
        return { ok: true, perCase: Number(product.pack_count), baseUnit: 'ct', viaPackCount: true }
    }
    if (!product.base_unit || !(total > 0)) return { ok: false, reason: 'no_pack_total' }
    return { ok: false, reason: 'no_conversion' }
}

// A portion in the base unit its fit is measured in: 6 oz -> 0.375 lb.
export function portionInBase(qty, portionUnit) {
    const portion = PORTION_UNITS[portionUnit]
    return portion ? Number(qty) * portion.factor : null
}

// Food cost of one spec basis unit (one guest, one piece, one tray) from its lines.
//
// Lines is the dish_ingredient_lines view's shape. Returns the cost of the lines that
// CAN be costed plus the ones that cannot, and why — so an estimate built from 18 of 23
// ingredients says so instead of passing itself off as the whole dish.
export function specCost(lines) {
    let cost = 0
    const gaps = []
    for (const line of lines) {
        const reason = lineGap(line)
        if (reason) {
            gaps.push({ ingredient_name: line.ingredient_name, reason })
            continue
        }
        const fit = unitFit(line.portion_unit, line)
        cost += (portionInBase(line.portion_qty, line.portion_unit) / fit.perCase) * Number(line.case_price)
    }
    return { cost, costed: lines.length - gaps.length, gaps }
}

// The gap reason for one line, or null when it can be costed. A confirmed mapping
// with no product is a real answer ("not bought here"), distinct from no mapping yet.
export function lineGap(line) {
    if (!line.mapping_status) return 'unmapped'
    if (!line.product_id) return 'no_product'
    const fit = unitFit(line.portion_unit, line)
    if (!fit.ok) return fit.reason
    if (!(Number(line.case_price) > 0)) return 'unpriced'
    return null
}

// "72 each per case", "40 lb per case" — what the reviewer is agreeing to.
export function fitLabel(fit) {
    if (!fit.ok) return GAP_REASONS[fit.reason]
    const unit = fit.baseUnit === 'ct' ? 'each' : fit.baseUnit
    const n = Math.round(fit.perCase * 100) / 100
    return `${n} ${unit} per case${fit.viaPackCount ? ' (by pack count)' : ''}`
}

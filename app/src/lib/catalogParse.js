// Deterministic parsing and merging of Performance Foodservice order-guide exports.
// No AI, no network, no React — pure functions so the same code can be run headless
// against the reference files to prove the product counts.
//
// Every export shares one shape: sheet `Product List Report`, the shelf/list name in
// row 2, the column header in row 7, data from row 8 down.

export const SHEET_NAME = 'Product List Report'
const LIST_NAME_ROW = 1   // row 2
const HEADER_ROW = 6      // row 7

// Three unit classes that never convert into each other (design §7). Crossing them
// would need a density per ingredient, which exists nowhere in this system.
const UNIT_CLASSES = {
    weight: { base: 'lb', units: { LB: 1, OZ: 1 / 16, GM: 1 / 453.59237, G: 1 / 453.59237, KG: 2.20462262 } },
    volume: { base: 'gal', units: { GA: 1, GAL: 1, QT: 1 / 4, PT: 1 / 8, LT: 1 / 3.785411784, L: 1 / 3.785411784, ML: 1 / 3785.411784, FLOZ: 1 / 128 } },
    count: { base: 'ct', units: { CT: 1, EA: 1, SL: 1, BX: 1, PC: 1, DZ: 12, SERV: 1 } },
}

// Units we deliberately refuse to convert. CN (#10 cans) is nominal, not a fixed
// measure, so those 25 products get a pack_total_base filled in by hand instead of a
// number invented here.
const UNCONVERTIBLE = ['CN', 'CS', 'FT']

function lookupUnit(unit) {
    const u = String(unit || '').toUpperCase().replace(/[\s.]/g, '')
    if (!u) return null
    for (const [className, { base, units }] of Object.entries(UNIT_CLASSES)) {
        if (u in units) return { unitClass: className, baseUnit: base, factor: units[u] }
    }
    return null
}

// "14/4 LB" -> 14 packs of 4 LB = 56 lb. Ranges ("8/6-7 LB") keep both ends but the
// LOW end drives pack_total_base, so an order never under-buys.
export function parsePackSize(raw) {
    const empty = {
        pack_count: null, pack_unit_size: null, pack_unit_size_max: null,
        pack_unit: null, pack_total_base: null, base_unit: null,
    }
    const text = String(raw || '').trim()
    if (!text) return empty

    // `#` appears mid-string on can packs ("6/#10 CN"), so it has to be allowed inside
    // the numeric part and stripped before the split, not treated as part of the unit.
    const match = text.match(/^([\d.\/#]+?)(?:-([\d.]+))?\s*([A-Za-z]+)?$/)
    if (!match) return empty

    const numbers = match[1].replace(/#/g, '').split('/')
        .map((n) => parseFloat(n)).filter((n) => !Number.isNaN(n))
    if (numbers.length === 0) return empty

    const maxSize = match[2] ? parseFloat(match[2]) : null
    const rawUnit = (match[3] || '').toUpperCase()

    // The last number is the size of one unit; everything before it multiplies up.
    const unitSize = numbers.length > 1 ? numbers[numbers.length - 1] : null
    const count = numbers.length > 1
        ? numbers.slice(0, -1).reduce((a, b) => a * b, 1)
        : numbers[0]

    const resolved = UNCONVERTIBLE.includes(rawUnit) ? null : lookupUnit(rawUnit)
    const totalBase = resolved && unitSize !== null
        ? count * unitSize * resolved.factor
        : null

    return {
        pack_count: count,
        pack_unit_size: unitSize,
        pack_unit_size_max: maxSize,
        pack_unit: rawUnit || null,
        pack_total_base: totalBase === null ? null : round(totalBase, 6),
        base_unit: resolved ? resolved.baseUnit : null,
    }
}

// Price carries its own basis in the string: "$54.46" is per case, "$6.1199/lb" is
// catch weight. Parsed from the text, never inferred from the product.
export function parsePrice(raw) {
    const text = String(raw ?? '').trim()
    if (!text) return { price: null, price_basis: null }
    const match = text.match(/\$?\s*([\d,]+(?:\.\d+)?)\s*(\/\s*([A-Za-z]+))?/)
    if (!match) return { price: null, price_basis: null }
    const price = parseFloat(match[1].replace(/,/g, ''))
    if (Number.isNaN(price)) return { price: null, price_basis: null }
    return {
        price,
        price_basis: match[3] ? match[3].toLowerCase() : 'case',
    }
}

// case_price is derived ONCE, here, rather than branched on at every read. A catch-weight
// item priced per pound is otherwise ~50x too cheap wherever a call site forgets the rule.
export function deriveCasePrice({ price, price_basis, pack_total_base, base_unit }) {
    if (price === null) return null
    if (price_basis === 'case') return round(price, 4)
    if (pack_total_base && base_unit === price_basis) return round(price * pack_total_base, 4)
    return null
}

function round(n, places) {
    const f = 10 ** places
    return Math.round(n * f) / f
}

// Reads one export workbook into flat rows. `sheetToRows` is injected so this module
// never imports the xlsx library — the caller (browser or node) supplies it.
export function parseExportWorkbook(sheetToRows, fileName) {
    const grid = sheetToRows(SHEET_NAME)
    if (!grid || grid.length <= HEADER_ROW) {
        throw new Error(`${fileName}: no "${SHEET_NAME}" sheet, or it is too short to hold a header`)
    }

    const header = (grid[HEADER_ROW] || []).map((h) => String(h ?? '').trim())
    const col = (name) => header.indexOf(name)
    const iProductNumber = col('Product Number')
    if (iProductNumber === -1) {
        throw new Error(`${fileName}: row ${HEADER_ROW + 1} is not the expected header (no "Product Number" column)`)
    }

    const listName = String((grid[LIST_NAME_ROW] || [])[0] ?? '').trim() || fileName
    const indexes = {
        custom_description: col('Custom Product Description'),
        description: col('Product Description'),
        brand: col('Brand'),
        pack_size: col('Pack Size'),
        uom: col('UOM'),
        price: col('Price'),
    }

    const rows = []
    for (const row of grid.slice(HEADER_ROW + 1)) {
        const productNumber = String((row || [])[iProductNumber] ?? '').trim()
        if (!productNumber) continue
        const cell = (key) => {
            const i = indexes[key]
            return i === -1 ? '' : String((row || [])[i] ?? '').trim()
        }
        rows.push({
            product_number: productNumber,
            description: cell('description'),
            brand: cell('brand') || null,
            custom_description: cell('custom_description') || null,
            pack_size: cell('pack_size'),
            uom: cell('uom') || null,
            price_text: cell('price'),
            source_list: listName,
        })
    }
    return { listName, rows }
}

// Merges every row of one upload batch into unique products.
//
// Highest price wins WITHIN THE BATCH only. Carried across uploads it becomes a ratchet:
// an item that was $80 on one list and $101 on another would stay at $101 forever, even
// after both dropped to $70.
export function mergeBatch(files) {
    const byProductNumber = new Map()

    for (const { rows } of files) {
        for (const row of rows) {
            const { price, price_basis } = parsePrice(row.price_text)
            const existing = byProductNumber.get(row.product_number)

            if (!existing) {
                byProductNumber.set(row.product_number, {
                    ...row,
                    price,
                    price_basis,
                    source_lists: [row.source_list],
                    seen_prices: price === null ? [] : [price],
                })
                continue
            }

            const sourceLists = existing.source_lists.includes(row.source_list)
                ? existing.source_lists
                : [...existing.source_lists, row.source_list]
            const seenPrices = price === null ? existing.seen_prices : [...existing.seen_prices, price]
            const winsOnPrice = price !== null && (existing.price === null || price > existing.price)

            byProductNumber.set(row.product_number, {
                ...existing,
                // The winning row's own pack and description travel with its price.
                ...(winsOnPrice ? { ...row, price, price_basis } : {}),
                source_lists: sourceLists,
                seen_prices: seenPrices,
            })
        }
    }

    const products = [...byProductNumber.values()].map((p) => {
        const pack = parsePackSize(p.pack_size)
        const distinctPrices = new Set(p.seen_prices)
        return {
            product_number: p.product_number,
            description: p.description,
            brand: p.brand,
            custom_description: p.custom_description,
            pack_size: p.pack_size,
            ...pack,
            uom: p.uom,
            price: p.price,
            price_basis: p.price_basis,
            case_price: deriveCasePrice({ ...pack, price: p.price, price_basis: p.price_basis }),
            price_varies: distinctPrices.size > 1,
            source_lists: p.source_lists,
        }
    })

    return {
        products,
        stats: {
            files: files.length,
            raw_rows: files.reduce((n, f) => n + f.rows.length, 0),
            products: products.length,
            price_varies: products.filter((p) => p.price_varies).length,
            unpriced: products.filter((p) => p.price === null).length,
            no_pack_base: products.filter((p) => p.pack_total_base === null).length,
        },
    }
}

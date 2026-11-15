// Turns a BEO's classified lines (beoLines.js) into order-list rows built from confirmed
// dish specs, plus the lines that still need the AI (spec/beo-order-from-specs.md, rules
// 4-5). Pure: the page fetches the specs and products and writes the rows.

// Spacing of sort_order between dish groups, as the page has always used (dish * 100 + line).
const GROUP_STEP = 100

// The dish ids whose specs a BEO needs, once each, in BEO order.
export function matchedDishIds(items) {
    const ids = []
    for (const item of items) {
        for (const line of item.lines) {
            if (line.kind === 'dish' && !ids.includes(line.dishId)) ids.push(line.dishId)
        }
    }
    return ids
}

// Spec lines per dish, in spec order (name breaks a tie, so arrival order never matters).
function specLinesByDish(specLines) {
    const byDish = new Map()
    for (const line of specLines || []) {
        byDish.set(line.dish_id, [...(byDish.get(line.dish_id) || []), line])
    }
    for (const lines of byDish.values()) {
        lines.sort((a, b) => a.sort_order - b.sort_order || a.ingredient_name.localeCompare(b.ingredient_name))
    }
    return byDish
}

// Where one line goes: a dish id, 'ai', or null (not ordered: notes, Not food).
// "Describes the line above" follows the line it hangs on.
function lineOwner(line, lines) {
    switch (line.kind) {
        case 'dish':
        case 'description': return line.dishId
        case 'ask_part_of': return line.underDishId // unanswered: part of the dish this time
        case 'not_on_menu':
        case 'to_match': return 'ai' // unanswered: not on a menu this time
        case 'describes_above': return lineOwner(lines[line.aboveIndex], lines) === 'ai' ? 'ai' : null
        default: return null
    }
}

// Adds a text to a list unless it is already there.
function withText(texts, text) {
    return texts.includes(text) ? texts : [...texts, text]
}

// Synthetic BEO sections for generate-order-items: only the AI lines, each BEO item kept
// with its category; items in the same category in a row share it. Null when none.
function aiSectionsFor(aiItems) {
    if (aiItems.length === 0) return null
    const categories = []
    for (const { category, label, texts } of aiItems) {
        const item = { label, description: texts.join('\n') }
        const last = categories[categories.length - 1]
        if (last && last.name === category) last.items.push(item)
        else categories.push({ name: category, items: [item] })
    }
    return [{ categories }]
}

// The order list for one BEO. `items` from classifyBeoLines; `dishes` the orderable dishes
// ({ id, name, spec_status }); `specLines` their dish_ingredients rows; `products` maps an
// ingredient name to its confirmed product id (productsForItemNames).
// Returns { specRows, aiSections }: rows built from confirmed specs (one group per dish,
// even if the BEO has it twice), and the sections to send to the AI (or null).
export function buildOrderList(items, dishes, specLines, products) {
    const dishById = new Map((dishes || []).map(d => [d.id, d]))
    const linesByDish = specLinesByDish(specLines)
    // Built from its spec only if the dish is orderable, confirmed, and has lines to order.
    const buildable = id => dishById.get(id)?.spec_status === 'confirmed' && (linesByDish.get(id)?.length ?? 0) > 0

    const groups = new Map() // dish id -> the BEO lines shown in grey under it
    const aiItems = []
    for (const item of items) {
        let aiTexts = []
        for (const line of item.lines) {
            const owner = lineOwner(line, item.lines)
            if (owner === null) continue
            if (owner !== 'ai' && buildable(owner)) groups.set(owner, withText(groups.get(owner) || [], line.text))
            else aiTexts = [...aiTexts, line.text]
        }
        if (aiTexts.length) aiItems.push({ category: item.category, label: item.label, texts: aiTexts })
    }

    const specRows = [...groups].flatMap(([dishId, texts], groupIdx) =>
        linesByDish.get(dishId).map((spec, lineIdx) => ({
            item_name: spec.ingredient_name,
            source_dish: dishById.get(dishId).name,
            product_id: products.get(spec.ingredient_name) ?? null,
            beo_text: texts.join('\n'),
            ai_guess: false,
            sort_order: groupIdx * GROUP_STEP + lineIdx,
        })),
    )
    return { specRows, aiSections: aiSectionsFor(aiItems) }
}

// Every row Generate saves for one BEO: the spec rows, then the AI's dishes
// ({ source_dish, ingredients } from generate-order-items) numbered after the spec groups
// and labeled ai_guess. `aiProducts` maps an AI ingredient name to its product id.
export function generatedRows(beoId, specRows, aiDishes, aiProducts) {
    const saved = { beo_id: beoId, is_ordered: false, is_manual: false }
    const specGroups = specRows.length ? Math.floor(specRows[specRows.length - 1].sort_order / GROUP_STEP) + 1 : 0
    const aiRows = aiDishes.flatMap((dish, dishIdx) =>
        (dish.ingredients || []).map((ingredient, lineIdx) => ({
            ...saved,
            item_name: ingredient,
            source_dish: dish.source_dish,
            product_id: aiProducts.get(ingredient) ?? null,
            beo_text: null,
            ai_guess: true,
            sort_order: (specGroups + dishIdx) * GROUP_STEP + lineIdx,
        })),
    )
    return [...specRows.map(row => ({ ...saved, ...row })), ...aiRows]
}

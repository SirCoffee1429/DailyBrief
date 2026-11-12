// What each line of a BEO is, for building the order list from confirmed dish specs
// (spec/beo-order-from-specs.md, rules 1-2). Pure: no database, no AI.
//
// A BEO item's description is split into lines. Each line becomes one of:
//   dish            a confirmed menu dish (by a saved answer, or its exact name)
//   description     grey text under a dish (the lines under an item's first-line dish)
//   ask_part_of     an exact dish name typed under another dish: "Part of" or "Its own dish"?
//   note            "20 pieces", "Serves 20", "$20": skipped
//   not_food        answered Not food
//   not_on_menu     answered Not on a menu: goes to the AI
//   describes_above answered Describes the line above: goes wherever that line goes
//   to_match        not decided yet: the person is asked

// Category names that mean drinks, copied from generate-order-items. Matched as WHOLE
// words here: the function's substring check drops "Steak Dinner" ("tea") and
// "Barbecue Buffet" ("bar"). The Edge Function itself is left as it is.
const BEVERAGE_KEYWORDS = [
    'beverage', 'beverages', 'bar', 'drink', 'drinks',
    'cocktail', 'cocktails', 'wine', 'beer', 'spirits',
    'alcohol', 'juice', 'coffee', 'tea', 'soda',
    'lemonade', 'iced tea', 'water', 'sparkling water', 'club soda', 'tonic water',
    'bartending', 'open bar', 'consumption tab', 'regular', 'decaf', 'sugars/sweeteners',
    'beverage cart', 'na beverages', 'standard beverage station', 'mimosa bar',
]

// One pattern for the whole list: a keyword with no letter or digit touching either end.
const BEVERAGE_PATTERN = new RegExp(
    `(?:^|[^a-z0-9])(?:${BEVERAGE_KEYWORDS.map(k => k.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')).join('|')})(?:[^a-z0-9]|$)`,
)

// Lines that only state an amount or a price. Anchored at both ends, so a real order line
// like "4 orders of wings in bowls for table" is NOT a note.
const NOTE_PATTERNS = [/^\d+ (?:pieces?|each|orders?)$/, /^serves \d+$/, /^\$\d/]

// A line as it is compared and saved: lowercase, spaces collapsed, ends trimmed.
export function normaliseLine(text) {
    return String(text ?? '').toLowerCase().replace(/\s+/g, ' ').trim()
}

// True for a drinks category, which is left off the food order list.
export function isBeverageCategory(name) {
    return BEVERAGE_PATTERN.test(String(name ?? '').toLowerCase())
}

// True for a plain amount/price line. Takes a normalised line.
export function isPlainNote(key) {
    return NOTE_PATTERNS.some(p => p.test(key))
}

// Normalised dish name -> the ids of the orderable dishes with that name.
function dishIdsByName(dishes) {
    const byName = new Map()
    for (const dish of dishes || []) {
        const key = normaliseLine(dish.name)
        byName.set(key, [...(byName.get(key) || []), dish.id])
    }
    return byName
}

// Saved answers keyed by line + the dish it sits under ('' for a line on its own).
function decisionsByKey(decisions) {
    return new Map((decisions || []).map(d => [`${d.source_text}\u0000${d.under_dish_id ?? ''}`, d]))
}

// Every food item of the BEO with its non-empty lines, beverage categories left out.
function foodItems(sections) {
    const items = []
    for (const section of sections || []) {
        for (const category of section?.categories || []) {
            if (isBeverageCategory(category?.name)) continue
            for (const item of category?.items || []) {
                const texts = String(item?.description ?? '').split('\n').map(t => t.trim()).filter(Boolean)
                if (texts.length) items.push({ category: category.name ?? '', label: item.label ?? '', texts })
            }
        }
    }
    return items
}

// Rule 2a: the item's first line is a dish, so the whole item is that dish. Its other
// lines are grey description, except an exact dish name, which is asked once per pair.
function classifyDishItem(texts, firstDish, ctx) {
    return texts.map((text, i) => {
        const key = normaliseLine(text)
        if (i === 0) return { text, key, kind: 'dish', dishId: firstDish.id, by: firstDish.by }
        const exactId = ctx.exactDishId(key)
        if (!exactId || exactId === firstDish.id) return { text, key, kind: 'description', dishId: firstDish.id }
        const pair = ctx.decision(key, firstDish.id)
        if (!pair) return { text, key, kind: 'ask_part_of', dishId: exactId, underDishId: firstDish.id }
        if (pair.kind === 'dish') return { text, key, kind: 'dish', dishId: pair.dish_id, by: 'saved', underDishId: firstDish.id }
        return { text, key, kind: 'description', dishId: firstDish.id }
    })
}

// "Describes the line above": find the line it hangs on, skipping notes. Under a dish it
// becomes that dish's grey description; otherwise it follows its line (to the AI, or
// nowhere for Not food). With no line above, it goes to the AI on its own.
function resolveDescribesAbove(text, key, done) {
    let j = done.length - 1
    while (j >= 0 && done[j].kind === 'note') j--
    if (j < 0) return { text, key, kind: 'not_on_menu' }
    const above = done[j]
    if (above.kind === 'dish' || above.kind === 'description') return { text, key, kind: 'description', dishId: above.dishId }
    const root = above.kind === 'describes_above' ? above.aboveIndex : j
    return { text, key, kind: 'describes_above', aboveIndex: root }
}

// Rule 2b: each line on its own. Saved answer, then plain note, then exact name.
function classifyLineByLine(texts, ctx) {
    const done = []
    for (const text of texts) {
        const key = normaliseLine(text)
        const saved = ctx.decision(key, null)
        if (saved?.kind === 'dish') done.push({ text, key, kind: 'dish', dishId: saved.dish_id, by: 'saved' })
        else if (saved?.kind === 'describes_above') done.push(resolveDescribesAbove(text, key, done))
        else if (saved) done.push({ text, key, kind: saved.kind })
        else if (isPlainNote(key)) done.push({ text, key, kind: 'note' })
        else if (ctx.exactDishId(key)) done.push({ text, key, kind: 'dish', dishId: ctx.exactDishId(key), by: 'exact' })
        else done.push({ text, key, kind: 'to_match' })
    }
    return done
}

// The first line's dish, if it is one: a saved standalone answer wins over the exact name.
function firstLineDish(key, ctx) {
    const saved = ctx.decision(key, null)
    if (saved) return saved.kind === 'dish' ? { id: saved.dish_id, by: 'saved' } : null
    const exactId = ctx.exactDishId(key)
    return exactId ? { id: exactId, by: 'exact' } : null
}

// Every food item of a BEO, each line classified. `dishes` are the orderable dishes
// ({ id, name }); `decisions` are the saved beo_dish_matches rows for these lines.
export function classifyBeoLines(sections, dishes, decisions) {
    const idsByName = dishIdsByName(dishes)
    const savedByKey = decisionsByKey(decisions)
    const ctx = {
        // An exact name counts only when exactly ONE orderable dish has it.
        exactDishId: key => (idsByName.get(key)?.length === 1 ? idsByName.get(key)[0] : null),
        decision: (key, underDishId) => savedByKey.get(`${key}\u0000${underDishId ?? ''}`),
    }
    return foodItems(sections).map(({ category, label, texts }) => {
        const firstDish = firstLineDish(normaliseLine(texts[0]), ctx)
        const lines = firstDish ? classifyDishItem(texts, firstDish, ctx) : classifyLineByLine(texts, ctx)
        return { category, label, lines }
    })
}

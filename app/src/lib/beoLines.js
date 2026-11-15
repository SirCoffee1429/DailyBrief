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

// Every food line of a BEO once, normalised: the wordings whose saved answers apply.
export function beoLineKeys(sections) {
    const keys = foodItems(sections).flatMap(item => item.texts.map(normaliseLine))
    return [...new Set(keys)]
}

// Words that never make two names alike ("&" is dropped as punctuation).
const STOP_WORDS = new Set(['and', 'with', 'of', 'the', 'a', 'on', 'in', 'or'])

// A word without its plain plural: "tacos" -> "taco", "tomatoes" -> "tomato". Light on
// purpose: only to catch the near misses typed on BEOs.
function singular(word) {
    let w = word
    if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) w = w.slice(0, -1)
    if (w.endsWith('oe')) w = w.slice(0, -1)
    return w
}

// A name's words: lowercase, accents and apostrophes dropped, split on anything that is
// not a letter or digit.
function words(text) {
    return normaliseLine(text)
        .normalize('NFD').replace(/\p{M}/gu, '')
        .replace(/['’]/g, '')
        .split(/[^\p{L}\p{N}]+/u)
        .filter(Boolean)
}

// The comparable words of a name, stop words left out, plurals made singular.
function wordSet(text) {
    return new Set(words(text).filter(w => !STOP_WORDS.has(w)).map(singular))
}

// How many words two word sets share.
function overlap(a, b) {
    let shared = 0
    for (const w of a) if (b.has(w)) shared++
    return shared
}

// Dish order for lists: by name, then menu, then section (the same name sits on two menus).
function byNameThenMenu(a, b) {
    return a.name.localeCompare(b.name)
        || (a.menu_source ?? '').localeCompare(b.menu_source ?? '')
        || (a.menu_section ?? '').localeCompare(b.menu_section ?? '')
}

// The dishes a BEO line could be, best first: most shared words, ties by name.
// Plain code, not AI: the near misses on real BEOs are all word overlaps
// ("tiny tinga taco" vs "tiny tinga tacos").
export function suggestDishes(line, dishes, limit = 3) {
    const lineWords = wordSet(line)
    return (dishes || [])
        .map(dish => ({ dish, shared: overlap(lineWords, wordSet(dish.name)) }))
        .filter(s => s.shared > 0)
        .sort((a, b) => b.shared - a.shared || byNameThenMenu(a.dish, b.dish))
        .slice(0, limit)
        .map(s => s.dish)
}

// "Pick another dish": every dish whose name has a word starting with each typed word,
// in name then menu order. Nothing typed, nothing shown.
export function searchDishes(query, dishes) {
    const typed = words(query)
    if (typed.length === 0) return []
    return (dishes || [])
        .filter(dish => {
            const nameWords = words(dish.name)
            return typed.every(t => nameWords.some(w => w.startsWith(t)))
        })
        .sort(byNameThenMenu)
}

// Checks how draft-dish-specs turns a house-recipe answer (whole batches + one share per
// recipe, prompt rule 13) into per-portion amounts, against the REAL source file.
// Run: deno test --allow-read supabase/functions/draft-dish-specs/house_recipe_test.ts
//
// It slices cleanSpec()/flattenHouseRecipes()/fromHouseRecipe() out of index.ts and
// evaluates them instead of retyping them — a retyped copy proves the copy, not what ships
// (same approach as match_test.ts). Amounts are the fall book's own (Shaved Brussels
// Sprout salad and its two sub-recipes). Not bundled on deploy: only what index.ts imports ships.

const src = await Deno.readTextFile(new URL('./index.ts', import.meta.url))
const start = src.indexOf('const BASES')
const end = src.indexOf('// end of house recipe helpers')
if (start < 0 || end < 0) throw new Error('could not find the house recipe helpers in index.ts')

const { cleanSpec, flattenHouseRecipes, fromHouseRecipe, shareOf } = await import('data:application/typescript,' + encodeURIComponent(
    src.slice(start, end) + '\nexport { cleanSpec, flattenHouseRecipes, fromHouseRecipe, shareOf }'))

const SALAD = 'Shaved Brussels Sprout & Honeycrisp Apple Salad'
const VINAIGRETTE = 'Maple Cider Vinaigrette'
const PECANS = 'Candied Missouri Pecans'
// As dish_house_recipes returns them: depth 0 is the dish itself; the text is the book's.
const RECIPES = [
    { title: SALAD, depth: 0, recipe_text: `${SALAD}\nYIELD\n25 portions, about 4 oz each\nINGREDIENTS\n5 lb Brussels sprouts\nDressing glaze\n2 Tbsp honey` },
    { title: VINAIGRETTE, depth: 1, recipe_text: `${VINAIGRETTE}\nYIELD\nAbout 3 1/2 cups\nINGREDIENTS\n2 cups canola oil` },
    { title: PECANS, depth: 1, recipe_text: `${PECANS}\nYIELD\nAbout 1 lb 12 oz (about 7 cups)\nINGREDIENTS\n1 lb 8 oz pecan halves` },
]
const STARTER = { id: 'd1', season: 'fall', menu_section: 'Starter Course', price_unit: null, serves: null }
const BUFFET = { id: 'd2', season: 'fall', menu_section: 'Buffet Entrées', price_unit: 'person', serves: null }

// What the model is asked for: each recipe's whole batch, and two numbers copied off the
// page saying how much of it one guest uses. The salad is 1 of 25 portions; its batch
// takes 3 cups of a 3 1/2 cup vinaigrette and 12 oz of a 28 oz (1 lb 12 oz) pecan batch.
const ANSWER = {
    dish_id: 'd1',
    note: null,
    recipes: [
        { title: SALAD, called: 1, yield: 25, within: null, ingredients: [
            { name: 'brussels sprouts', qty: 80, unit: 'oz' },
            { name: 'honeycrisp apples', qty: 5, unit: 'each' },
        ] },
        { title: VINAIGRETTE, called: 3, yield: 3.5, within: SALAD, ingredients: [
            { name: 'maple syrup', qty: 2.667, unit: 'floz' },
            { name: 'canola oil', qty: 16, unit: 'floz' },
        ] },
        { title: PECANS, called: 12, yield: 28, within: SALAD, ingredients: [
            { name: 'pecan halves', qty: 24, unit: 'oz' },
            { name: 'maple syrup', qty: 4, unit: 'floz' },
        ] },
    ],
}

function draft(answer: any, dish: any, recipes = RECIPES) {
    return fromHouseRecipe(cleanSpec(flattenHouseRecipes(answer, recipes), dish), dish, answer, recipes)
}
const qtyOf = (spec: any, name: string) => spec.ingredients.find((i: any) => i.name === name)?.qty

function expect(ok: boolean, message: string) {
    if (!ok) throw new Error(message)
}

Deno.test('each batch is scaled by the share worked out from its numbers, and shared names are summed', () => {
    const spec = draft(ANSWER, STARTER)
    expect(qtyOf(spec, 'brussels sprouts') === 3.2, `sprouts: 80 oz / 25 = 3.2, got ${qtyOf(spec, 'brussels sprouts')}`)
    expect(qtyOf(spec, 'honeycrisp apples') === 0.2, `apples: 5 / 25 = 0.2, got ${qtyOf(spec, 'honeycrisp apples')}`)
    // A sub-recipe's share is called / yield TIMES the share of the recipe it goes into.
    expect(qtyOf(spec, 'pecan halves') === 0.4114, `pecans: 24 x 12/28 / 25 = 0.4114, got ${qtyOf(spec, 'pecan halves')}`)
    // 2.667 x 3/3.5/25 (vinaigrette) + 4 x 12/28/25 (pecans) = 0.0914 + 0.0686
    expect(qtyOf(spec, 'maple syrup') === 0.16, `maple syrup summed across both sub-recipes: 0.16, got ${qtyOf(spec, 'maple syrup')}`)
    expect(spec.ingredients.length === 5, `5 distinct ingredients, got ${spec.ingredients.length}`)
    expect(/Per portion, from the recipe book: .*Candied Missouri Pecans 1\.7%/.test(spec.note), `note names each share: ${spec.note}`)
})

Deno.test('a buffet entrée gets 65% of the book portion, a starter gets the book portion', () => {
    const buffet = draft(ANSWER, BUFFET)
    expect(qtyOf(buffet, 'brussels sprouts') === 2.08, `buffet: 3.2 x 0.65 = 2.08, got ${qtyOf(buffet, 'brussels sprouts')}`)
    expect(/Buffet entrée: 65%/.test(buffet.note), `buffet note says 65%: ${buffet.note}`)
    expect(!/Buffet entrée/.test(draft(ANSWER, STARTER).note), 'a starter is not scaled')
})

Deno.test('numbers that make no fraction, an unknown or looping parent, or a stray recipe are left out and named', () => {
    const answer = {
        ...ANSWER,
        recipes: [
            ANSWER.recipes[0],
            { ...ANSWER.recipes[1], called: 3.5, yield: 3 },          // more than the whole batch
            { ...ANSWER.recipes[2], within: 'Herb Croutons' },        // parent not in the answer
            { title: 'House Marinara', called: 1, yield: 25, within: null, ingredients: [{ name: 'crushed tomatoes', qty: 106, unit: 'oz' }] },
        ],
    }
    const spec = draft(answer, STARTER)
    expect(qtyOf(spec, 'canola oil') === undefined, 'a vinaigrette at 3.5 of 3 must not reach the spec')
    expect(qtyOf(spec, 'pecan halves') === undefined, 'pecans inside an unknown recipe must not reach the spec')
    expect(qtyOf(spec, 'crushed tomatoes') === undefined, 'a recipe not given with the dish must not reach the spec')
    expect(qtyOf(spec, 'brussels sprouts') === 3.2, 'the good recipe still counts')
    expect(/unusable share: .*Maple Cider Vinaigrette \(3\.5 of 3 within/.test(spec.note), `bad numbers named: ${spec.note}`)
    expect(/Candied Missouri Pecans \(12 of 28 within Herb Croutons\)/.test(spec.note), `unknown parent named: ${spec.note}`)
    expect(/"House Marinara" is not one of this dish's recipes/.test(spec.note), `stray recipe named: ${spec.note}`)

    const loop = { ...ANSWER, recipes: [
        { ...ANSWER.recipes[1], within: PECANS },
        { ...ANSWER.recipes[2], within: VINAIGRETTE },
    ] }
    const looped = draft(loop, STARTER)
    expect(looped.ingredients.length === 0, `two recipes inside each other must not count, got ${looped.ingredients.length}`)
    expect(/Model skipped: Shaved Brussels/.test(looped.note), `the missing salad is named: ${looped.note}`)
})

// The 2026-10-14 dry run: every dish listed its sub-recipes as lines of the parent batch
// ("0.96 floz maple cider vinaigrette") beside the vinaigrette's own ingredients.
Deno.test('a batch line that IS one of the given recipes is dropped, however it is spelled', () => {
    const PUDDING = 'Savory Leek & Gruyère Bread Pudding'
    const PUDDING_RECIPE = { title: PUDDING, depth: 1, recipe_text: `${PUDDING}\nYIELD\n25 portions, about 4 1/2 oz each` }
    const answer = {
        ...ANSWER,
        recipes: [
            { ...ANSWER.recipes[0], ingredients: [
                ...ANSWER.recipes[0].ingredients,
                { name: 'maple cider vinaigrette', qty: 24, unit: 'floz' },
                { name: 'Candied Missouri Pecans', qty: 12, unit: 'oz' },
                { name: 'savory leek and gruyere bread pudding', qty: 1, unit: 'each' },
            ] },
            ANSWER.recipes[1],
            ANSWER.recipes[2],
            { title: PUDDING, called: 1, yield: 25, within: null, ingredients: [{ name: 'leeks', qty: 32, unit: 'oz' }] },
        ],
    }
    const spec = draft(answer, STARTER, [...RECIPES, PUDDING_RECIPE])
    expect(qtyOf(spec, 'maple cider vinaigrette') === undefined, 'the vinaigrette line must not be ordered on top of its ingredients')
    expect(qtyOf(spec, 'candied missouri pecans') === undefined, 'the pecan line must not be ordered on top of its ingredients')
    expect(!spec.ingredients.some((i: any) => i.name.includes('pudding')), 'an accent-free spelling of a recipe is still that recipe')
    expect(qtyOf(spec, 'leeks') === 1.28, `the pudding's own ingredients still count: 32 / 25 = 1.28, got ${qtyOf(spec, 'leeks')}`)
    expect(qtyOf(spec, 'pecan halves') === 0.4114, 'the sub-recipe ingredients are untouched')
})

Deno.test('every weight comes out in oz, so lb from one recipe and oz from another still sum', () => {
    const answer = {
        ...ANSWER,
        recipes: [
            { ...ANSWER.recipes[0], ingredients: [{ name: 'carrot', qty: 3, unit: 'lb' }] },   // 48 oz
            { ...ANSWER.recipes[1], called: 1, yield: 25, within: null, ingredients: [{ name: 'carrot', qty: 8, unit: 'oz' }] },
        ],
    }
    const spec = draft(answer, STARTER, RECIPES.slice(0, 2))
    const carrot = spec.ingredients.find((i: any) => i.name === 'carrot')
    expect(carrot?.unit === 'oz', `carrot in oz, got ${carrot?.unit}`)
    expect(carrot?.qty === 2.24, `48/25 + 8/25 = 2.24 oz, got ${carrot?.qty}`)
})

// The 2026-10-14 drafts: the Short Rib came back titled with its subtitle and lost its beef;
// the salmon's glaze and the pork loin's jus came back as recipes of their own and were lost.
Deno.test('a title with its subtitle is that recipe, and a split-off section counts with its recipe', () => {
    const answer = { ...ANSWER, recipes: [
        { ...ANSWER.recipes[0], title: `${SALAD} with Maple Cider Vinaigrette and Pecans` },
        { title: 'Dressing Glaze', called: 1, yield: 1, within: null, ingredients: [{ name: 'honey', qty: 1, unit: 'floz' }] },
        ANSWER.recipes[1],
        ANSWER.recipes[2],
    ] }
    const spec = draft(answer, STARTER)
    expect(qtyOf(spec, 'brussels sprouts') === 3.2, `the subtitled salad still counts: 3.2, got ${qtyOf(spec, 'brussels sprouts')}`)
    expect(qtyOf(spec, 'pecan halves') === 0.4114, 'a sub-recipe inside the subtitled salad still finds its parent')
    // A section takes its recipe's share (1/25), never the numbers the model put on it.
    expect(qtyOf(spec, 'honey') === 0.04, `the glaze section at the salad's share: 1/25 = 0.04, got ${qtyOf(spec, 'honey')}`)
    expect(/Counted as part of their recipe: Dressing Glaze \(with Shaved Brussels/.test(spec.note), `folded section named: ${spec.note}`)
    expect(!/Model skipped/.test(spec.note), `nothing was skipped: ${spec.note}`)
})

// The soup came back as 6 of 160 oz (3.75%) instead of 1 of its 25 portions.
Deno.test('the dish\'s own recipe takes its share from its "25 portions" yield, not the model', () => {
    const answer = { ...ANSWER, recipes: [{ ...ANSWER.recipes[0], called: 6, yield: 160 }, ANSWER.recipes[1], ANSWER.recipes[2]] }
    const spec = draft(answer, STARTER)
    expect(qtyOf(spec, 'brussels sprouts') === 3.2, `80 oz / 25 = 3.2 whatever the model said, got ${qtyOf(spec, 'brussels sprouts')}`)
    expect(qtyOf(spec, 'pecan halves') === 0.4114, 'and the sub-recipes inside it follow')
})

// Shares read off the book's own lines, on the fall book's real text (cut to the lines that
// matter). The model's numbers for these were wrong on 2026-10-14: the Short Rib's sides
// at 0.2% (put INSIDE the rib) and the horseradish at 0.5% (cups against fl oz).
const book = (title: string, depth: number, lines: string[]) => ({ title, depth, recipe_text: [title, ...lines].join('\n') })
const SHORT_RIB = [
    book('Boneless Braised Beef Short Rib (7 oz)', 0, ['with Red Wine Pan Reduction', 'Slow-braised. Paired with Roasted Acorn Squash Purée and Sautéed Brussels', 'Sprouts with Pancetta.',
        'YIELD', '25 portions, 7 oz cooked beef + 2 oz sauce', 'USED ON', 'Plated entrée ($46.00)', 'ON THE PLATE', '7 oz braised short rib (this recipe)',
        '2 oz red wine pan reduction (this recipe)', '3 oz Roasted Acorn Squash Purée', '3 oz Sautéed Brussels Sprouts with Pancetta', 'INGREDIENTS', '19 lb boneless beef chuck short ribs']),
    book('Roasted Acorn Squash Purée', 1, ['Side for the Braised Short Rib.', 'YIELD', '25 portions at 3 oz (about 5 lb). Add 2 oz', 'per vegetarian plate if both are on the', 'event', 'USED ON', 'Plated side', 'INGREDIENTS', '8 lb acorn squash']),
    book('Sautéed Brussels Sprouts with Pancetta', 1, ['Side for the Braised Short Rib.', 'YIELD', '25 portions, 3 oz each', 'USED ON', 'Plated side (Short Rib)', 'INGREDIENTS', '6 lb Brussels sprouts']),
]
const PRIME_RIB = [
    book('Slow-Roasted Prime Rib', 0, ['YIELD', '25 portions, about 8 oz carved beef + 2 oz', 'jus + 1 oz horseradish sauce', 'USED ON', 'Buffet entrée (upgrade)', 'INGREDIENTS', '1 each whole boneless ribeye roll', 'Sauce', '3 cups Horseradish Sauce (sub-recipe)']),
    book('Horseradish Sauce', 1, ['Used with the Slow-Roasted Prime Rib (1 oz per guest).', 'YIELD', 'About 3 1/4 cups', 'USED ON', 'Prime rib', 'INGREDIENTS', '2 cups sour cream']),
]
const OTHERS = [
    book('Shaved Brussels Sprout & Honeycrisp Apple Salad', 0, ['YIELD', '25 portions, about 4 oz each', 'USED ON', 'Plated starter', 'INGREDIENTS', '5 lb Brussels sprouts',
        '12 oz Candied Missouri Pecans (sub-recipe), rough chopped (about 3 cups)', '3 cups Maple Cider Vinaigrette (sub-recipe)']),
    book('Candied Missouri Pecans', 1, ['Used in the Shaved Brussels Sprout Salad (12 oz).', 'YIELD', 'About 1 lb 12 oz (about 7 cups)', 'USED ON', 'Brussels salad', 'INGREDIENTS', '1 lb 8 oz Missouri pecan halves']),
    book('Maple Cider Vinaigrette', 1, ['YIELD', 'About 3 1/2 cups', 'USED ON', 'Brussels salad', 'INGREDIENTS', '2 cups canola or grapeseed oil']),
]
const share = (recipes: any[], title: string) => {
    const n = shareOf(title, new Map(), recipes)
    return n && { share: Math.round(n.share * 100000) / 100000, from: n.from }
}

Deno.test('shares come from the book: plate sides per portion, sub-recipes per batch, units matched', () => {
    const rib = share(SHORT_RIB, 'Roasted Acorn Squash Purée')
    expect(rib?.share === 0.04 && rib.from === 'book', `3 oz of 25 x 3 oz = 4%, per portion: ${JSON.stringify(rib)}`)
    expect(share(SHORT_RIB, 'Sautéed Brussels Sprouts with Pancetta')?.share === 0.04, 'the other plate side: 4%')
    expect(share(SHORT_RIB, 'Boneless Braised Beef Short Rib (7 oz)')?.share === 0.04, 'the dish itself: 1 of 25')
    // 3 cups of 3 1/4 cups, inside a 1-of-25 batch
    expect(share(PRIME_RIB, 'Horseradish Sauce')?.share === 0.03692, `3/3.25/25 = 3.692%: ${JSON.stringify(share(PRIME_RIB, 'Horseradish Sauce'))}`)
    // 12 oz of "1 lb 12 oz" (adjacent amounts are one) — the cups in brackets are not the batch
    expect(share(OTHERS, 'Candied Missouri Pecans')?.share === 0.01714, `12/28/25 = 1.714%: ${JSON.stringify(share(OTHERS, 'Candied Missouri Pecans'))}`)
    expect(share(OTHERS, 'Maple Cider Vinaigrette')?.share === 0.03429, '3/3.5/25 = 3.429%')
})

Deno.test('book shares across units: quarts of a gallon, a weight in brackets, a square of 25, 2 oz of a 3 oz side', () => {
    const lasagna = [
        book('Baked Italian Sausage Lasagna', 0, ['YIELD', '25 portions, about 12 oz each. 1 full hotel', 'pan, 4 inch deep, cut 5 x 5', 'USED ON', 'Buffet entrée', 'INGREDIENTS', '3 qt House Marinara (sub-recipe), divided (plus 1 qt for serving, optional)']),
        book('House Marinara', 1, ['YIELD', 'About 1 gallon', 'USED ON', 'Sausage lasagna', 'INGREDIENTS', '1/2 cup olive oil']),
    ]
    expect(share(lasagna, 'House Marinara')?.share === 0.03, `3 qt of 1 gallon in 1 of 25 = 3%: ${JSON.stringify(share(lasagna, 'House Marinara'))}`)
    const chicken = [
        book('Prosciutto-Wrapped Airline Chicken', 0, ['YIELD', '25 portions, one 8 to 9 oz airline breast +', '1 1/2 oz jus', 'USED ON', 'Plated entrée', 'ON THE PLATE', '4 oz Wild Rice & Toasted Walnut Pilaf', 'INGREDIENTS', '25 each airline chicken breasts']),
        book('Wild Rice & Toasted Walnut Pilaf', 1, ['YIELD', '25 portions, about 3/4 cup (4 oz) each', 'USED ON', 'Plated side', 'INGREDIENTS', '4 cups true wild rice']),
    ]
    expect(share(chicken, 'Wild Rice & Toasted Walnut Pilaf')?.share === 0.04, `4 oz of 25 x (4 oz) = 4%: ${JSON.stringify(share(chicken, 'Wild Rice & Toasted Walnut Pilaf'))}`)
    const pork = [
        book('Herb-Crusted Pork Tenderloin', 0, ['YIELD', '25 portions', 'USED ON', 'Plated entrée', 'ON THE PLATE', '1 square Savory Leek & Gruyère Bread Pudding', 'INGREDIENTS', '13 lb pork tenderloin']),
        book('Savory Leek & Gruyère Bread Pudding', 1, ['YIELD', '25 portions, about 4 1/2 oz each. 1 full', 'hotel pan, 2 1/2 inch deep', 'USED ON', 'Plated side', 'INGREDIENTS', '2 lb day-old brioche']),
    ]
    expect(share(pork, 'Savory Leek & Gruyère Bread Pudding')?.share === 0.04, '1 square of 25 = 4%')
    const veg = [
        book('Savory Wild Mushroom & Leek Bread Pudding', 0, ['YIELD', '25 portions, about 8 oz each.', 'USED ON', 'Plated vegetarian entrée', 'ON THE PLATE', '2 oz Roasted Acorn Squash Purée, as the sauce under the bread pudding', 'INGREDIENTS', '3 lb brioche']),
        SHORT_RIB[1],
    ]
    expect(share(veg, 'Roasted Acorn Squash Purée')?.share === 0.02667, `2 oz of 25 x 3 oz (not "about 5 lb") = 2.667%: ${JSON.stringify(share(veg, 'Roasted Acorn Squash Purée'))}`)
})

Deno.test('with no line naming it in the book, a recipe falls back to the model numbers, and the note says so', () => {
    const answer = { ...ANSWER, recipes: [ANSWER.recipes[0], { ...ANSWER.recipes[1], called: 3, yield: 3.5, within: SALAD }] }
    const spec = draft(answer, STARTER, RECIPES.slice(0, 2))   // fixture salad text names no vinaigrette line
    expect(qtyOf(spec, 'canola oil') === 0.5486, `16 x 3/3.5/25 = 0.5486, got ${qtyOf(spec, 'canola oil')}`)
    expect(/Maple Cider Vinaigrette 3\.4% \(not in the book's lines: the model's numbers\)/.test(spec.note), `fallback named: ${spec.note}`)
    expect(!/Shaved Brussels Sprout & Honeycrisp Apple Salad 4% \(not/.test(spec.note), 'the dish itself is from the book')
})

// The Short Rib plate's purée nutmeg rounded to 0 and the CHECK took its whole batch down.
Deno.test('an amount too small to keep at 4 places is named, never saved as 0', () => {
    const answer = { ...ANSWER, recipes: [
        { ...ANSWER.recipes[0], ingredients: [
            { name: 'brussels sprouts', qty: 80, unit: 'oz' },
            { name: 'nutmeg', qty: 0.001, unit: 'oz' },          // 0.001 / 25 = 0.00004
        ] },
    ] }
    const spec = draft(answer, STARTER, RECIPES.slice(0, 1))
    expect(spec.ingredients.every((i: any) => i.qty > 0), `no zero amounts: ${JSON.stringify(spec.ingredients)}`)
    expect(qtyOf(spec, 'nutmeg') === undefined, 'the nutmeg is left out')
    expect(/Too small to order per portion: nutmeg/.test(spec.note), `and named: ${spec.note}`)
})

Deno.test('a house-recipe dish answered as one flat list is flagged; a dish with no recipe is untouched', () => {
    const flat = { dish_id: 'd1', note: null, ingredients: [{ name: 'brussels sprouts', qty: 3, unit: 'oz' }] }
    const flagged = draft(flat, STARTER)
    expect(qtyOf(flagged, 'brussels sprouts') === 3, 'a flat list is kept as the model gave it')
    expect(/did not split it by recipe/.test(flagged.note), `flat answer flagged: ${flagged.note}`)
    const plain = draft(flat, STARTER, [])
    expect(plain.note === null, `no recipe, no note added: ${plain.note}`)
})

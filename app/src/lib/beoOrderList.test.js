import { describe, it, expect } from 'vitest'
import { classifyBeoLines } from './beoLines.js'
import { matchedDishIds, buildOrderList } from './beoOrderList.js'

// Orderable dishes (ids are readable stand-ins). "Old Spec Dish" has a spec that is not confirmed.
const DISHES = [
    { id: 'pasta', name: 'Build Your Pasta Bar', spec_status: 'confirmed' },
    { id: 'scallops', name: 'Bacon-Wrapped Scallops', spec_status: 'confirmed' },
    { id: 'mashed', name: 'Garlic Mashed Potatoes', spec_status: 'confirmed' },
    { id: 'caesar', name: 'Caesar Salad', spec_status: 'confirmed' },
    { id: 'old', name: 'Old Spec Dish', spec_status: 'draft' },
    { id: 'empty', name: 'Empty Spec Dish', spec_status: 'confirmed' },
]

// The confirmed spec lines (dish_ingredients) as in the live database, 11-15.
const PASTA_SPEC = [
    'cavatappi pasta', 'heavy cream', 'garlic', 'parmesan cheese', 'canned tomatoes', 'yellow onion', 'olive oil',
    'chicken breast', 'italian sausage', 'romaine lettuce', 'caesar dressing', 'breadsticks', 'cannoli shells',
    'cannoli creme', 'croutons',
].map((ingredient_name, sort_order) => ({ dish_id: 'pasta', ingredient_name, sort_order }))
const SPEC_LINES = [
    ...PASTA_SPEC,
    { dish_id: 'scallops', ingredient_name: 'bacon-wrapped scallops', sort_order: 0 },
    ...['russet potato', 'garlic', 'butter', 'heavy cream', 'milk', 'black pepper']
        .map((ingredient_name, sort_order) => ({ dish_id: 'mashed', ingredient_name, sort_order })),
    { dish_id: 'caesar', ingredient_name: 'romaine lettuce', sort_order: 0 },
    { dish_id: 'old', ingredient_name: 'something', sort_order: 0 },
]

// Confirmed products by ingredient name. Caesar dressing and croutons have none (true on 11-15).
const PRODUCTS = new Map(
    [...new Set(SPEC_LINES.map(l => l.ingredient_name))]
        .filter(n => n !== 'caesar dressing' && n !== 'croutons')
        .map(n => [n, `product:${n}`]),
)

// One BEO section holding the given categories: [categoryName, [description, ...]].
function beo(...categories) {
    return [{
        categories: categories.map(([name, descriptions]) => ({
            name,
            items: descriptions.map(description => ({ qty: '1', label: 'Buffet', description })),
        })),
    }]
}

// Classify with the shipped Task 1 code, then build.
function build(sections, decisions = []) {
    const items = classifyBeoLines(sections, DISHES, decisions)
    return buildOrderList(items, DISHES, SPEC_LINES, PRODUCTS)
}

const PASTA_TEXT = 'Build Your Pasta Bar\nCavatappi Pasta\nGarlic Alfredo\nHouse Marinara\nChopped Grilled Chicken\nItalian Sausage\nCaesar Salad\nParmesan\nBreadsticks\nItalian Cannolis'

describe('buildOrderList: spec rows', () => {
    it('Pasta Bar: its 15 spec ingredients in spec order, with products and the BEO lines', () => {
        const { specRows, aiSections } = build(beo(['Event Staffing Needs', [PASTA_TEXT]]))
        expect(specRows.map(r => r.item_name)).toEqual(PASTA_SPEC.map(l => l.ingredient_name))
        expect(specRows[0]).toEqual({
            item_name: 'cavatappi pasta',
            source_dish: 'Build Your Pasta Bar',
            product_id: 'product:cavatappi pasta',
            beo_text: PASTA_TEXT,
            ai_guess: false,
            sort_order: 0,
        })
        expect(specRows.find(r => r.item_name === 'croutons').product_id).toBeNull()
        expect(specRows.map(r => r.sort_order)).toEqual(PASTA_SPEC.map((_, i) => i))
        // Caesar Salad unanswered under the Pasta Bar counts as part of it this time.
        expect(aiSections).toBeNull()
    })

    it('Caesar Salad answered "Its own dish" under the Pasta Bar: its own group, and out of the Pasta Bar text', () => {
        const { specRows } = build(beo(['Buffet', [PASTA_TEXT]]), [
            { source_text: 'caesar salad', kind: 'dish', dish_id: 'caesar', under_dish_id: 'pasta' },
        ])
        expect([...new Set(specRows.map(r => r.source_dish))]).toEqual(['Build Your Pasta Bar', 'Caesar Salad'])
        expect(specRows.find(r => r.source_dish === 'Build Your Pasta Bar').beo_text).not.toContain('Caesar Salad')
        expect(specRows.find(r => r.source_dish === 'Caesar Salad')).toMatchObject({ beo_text: 'Caesar Salad', sort_order: 100 })
    })

    it('groups follow the BEO order, numbered 0, 100, 200...', () => {
        const { specRows } = build(beo(['Buffet', [
            'Bacon-Wrapped Scallops\nWith Herbed Parmesan, Red Pepper Coulis\n20 pieces',
            'Garlic Mashed Potatoes',
        ]]))
        expect(specRows.map(r => [r.source_dish, r.sort_order])).toEqual([
            ['Bacon-Wrapped Scallops', 0],
            ['Garlic Mashed Potatoes', 100], ['Garlic Mashed Potatoes', 101], ['Garlic Mashed Potatoes', 102],
            ['Garlic Mashed Potatoes', 103], ['Garlic Mashed Potatoes', 104], ['Garlic Mashed Potatoes', 105],
        ])
        expect(specRows[0].beo_text).toBe('Bacon-Wrapped Scallops\nWith Herbed Parmesan, Red Pepper Coulis\n20 pieces')
    })

    it('a dish twice in a BEO shows once, with the lines of both places', () => {
        const { specRows } = build(beo(
            ['Lunch', ['Garlic Mashed Potatoes\nExtra garlic']],
            ['Dinner', ['Garlic Mashed Potatoes\nNo pepper']],
        ))
        expect(specRows).toHaveLength(6)
        expect(specRows[0].beo_text).toBe('Garlic Mashed Potatoes\nExtra garlic\nNo pepper')
    })

    it('a dish matched mid-item gets only its own line (and a line describing it)', () => {
        const { specRows } = build(
            beo(['Buffet', ['Club Car Wash Buffet\nGarlic Mashed Potatoes\nExtra butter please\nOreo Cheesecake']]),
            [{ source_text: 'extra butter please', kind: 'describes_above', dish_id: null, under_dish_id: null }],
        )
        expect(specRows[0].beo_text).toBe('Garlic Mashed Potatoes\nExtra butter please')
    })
})

describe('buildOrderList: the AI payload', () => {
    const WALTON = beo(['Street Dinner', [[
        'Autumn Bitter Greens Salad',
        'Radicchio & Endive, Warm Bacon Vinaigrette, Candied Pecans, Shaved Pecorino',
        'Roasted Airline Chicken',
        'Wild Mushroom Cream, Wild Rice Pilaf, Roasted Broccolini',
    ].join('\n')]])

    it('Walton Heath: each dish line with its description, nothing spec-built', () => {
        const { specRows, aiSections } = build(WALTON, [
            { source_text: 'autumn bitter greens salad', kind: 'not_on_menu', dish_id: null, under_dish_id: null },
            { source_text: 'radicchio & endive, warm bacon vinaigrette, candied pecans, shaved pecorino', kind: 'describes_above', dish_id: null, under_dish_id: null },
        ])
        expect(specRows).toEqual([])
        expect(aiSections).toEqual([{
            categories: [{
                name: 'Street Dinner',
                items: [{
                    label: 'Buffet',
                    description: [
                        'Autumn Bitter Greens Salad',
                        'Radicchio & Endive, Warm Bacon Vinaigrette, Candied Pecans, Shaved Pecorino',
                        // Unanswered lines go to the AI this time.
                        'Roasted Airline Chicken',
                        'Wild Mushroom Cream, Wild Rice Pilaf, Roasted Broccolini',
                    ].join('\n'),
                }],
            }],
        }])
    })

    it('Not food lines, notes and spec-built dishes are not sent', () => {
        const { aiSections } = build(
            beo(['Buffet', ['Club Car Wash Buffet\nGarlic Mashed Potatoes\nOreo Cheesecake\n$48/person +25% grat']]),
            [{ source_text: 'club car wash buffet', kind: 'not_food', dish_id: null, under_dish_id: null }],
        )
        expect(aiSections).toEqual([{ categories: [{ name: 'Buffet', items: [{ label: 'Buffet', description: 'Oreo Cheesecake' }] }] }])
    })

    it('a line describing a Not food line is not sent either', () => {
        const { aiSections } = build(beo(['Buffet', ['BQT Staff\n2 Hours Prior to The Start of the Event']]), [
            { source_text: 'bqt staff', kind: 'not_food', dish_id: null, under_dish_id: null },
            { source_text: '2 hours prior to the start of the event', kind: 'describes_above', dish_id: null, under_dish_id: null },
        ])
        expect(aiSections).toBeNull()
    })

    it('a matched dish whose spec is not confirmed, or has no lines, goes to the AI with its lines', () => {
        const { specRows, aiSections } = build(beo(['Buffet', ['Old Spec Dish\nWith herbs', 'Empty Spec Dish']]))
        expect(specRows).toEqual([])
        expect(aiSections[0].categories[0].items.map(i => i.description)).toEqual(['Old Spec Dish\nWith herbs', 'Empty Spec Dish'])
    })

    it('a matched dish that is no longer orderable goes to the AI', () => {
        const { aiSections } = build(beo(['Buffet', ['Gone Dish']]), [
            { source_text: 'gone dish', kind: 'dish', dish_id: 'deleted-id', under_dish_id: null },
        ])
        expect(aiSections[0].categories[0].items[0].description).toBe('Gone Dish')
    })

    it('items in the same category in a row share one category', () => {
        const { aiSections } = build(beo(['Member Event', ['Vodka Rigatoni', 'Ricciarelli Cookies']], ['Plated', ['Course One']]))
        expect(aiSections).toEqual([{
            categories: [
                { name: 'Member Event', items: [{ label: 'Buffet', description: 'Vodka Rigatoni' }, { label: 'Buffet', description: 'Ricciarelli Cookies' }] },
                { name: 'Plated', items: [{ label: 'Buffet', description: 'Course One' }] },
            ],
        }])
    })

    it('a BEO fully on menus makes no AI payload', () => {
        expect(build(beo(['Buffet', ['Garlic Mashed Potatoes', 'Bacon-Wrapped Scallops\n20 pieces']])).aiSections).toBeNull()
    })
})

describe('buildOrderList: determinism', () => {
    it('the same BEO and answers give the same rows, whatever order the spec lines arrive in', () => {
        const sections = beo(['Buffet', [PASTA_TEXT, 'Club Car Wash Buffet\nGarlic Mashed Potatoes\nOreo Cheesecake']])
        const items = classifyBeoLines(sections, DISHES, [])
        const first = buildOrderList(items, DISHES, SPEC_LINES, PRODUCTS)
        const second = buildOrderList(items, DISHES, [...SPEC_LINES].reverse(), PRODUCTS)
        expect(second).toEqual(first)
        expect(JSON.stringify(second)).toBe(JSON.stringify(first))
    })
})

describe('matchedDishIds', () => {
    it('the dishes whose specs are needed, once each, in BEO order', () => {
        const items = classifyBeoLines(beo(['Buffet', [
            PASTA_TEXT,
            'Club Car Wash Buffet\nGarlic Mashed Potatoes',
            'Garlic Mashed Potatoes',
        ]]), DISHES, [{ source_text: 'caesar salad', kind: 'dish', dish_id: 'caesar', under_dish_id: 'pasta' }])
        expect(matchedDishIds(items)).toEqual(['pasta', 'caesar', 'mashed'])
    })
})

import { describe, it, expect } from 'vitest'
import { normaliseLine, isBeverageCategory, isPlainNote, classifyBeoLines, suggestDishes, searchDishes, beoLineKeys, linesToMatch, lineToChange, matchRow } from './beoLines.js'
import { ORDERABLE_DISH_NAMES } from './beoLines.dishNames.fixture.js'

// Orderable dishes, names exactly as in orderable_menu_dishes (11-12). Ids are readable
// stand-ins. Yogurt Parfait Bar is on two menus, so its name matches no single dish.
const DISHES = [
    { id: 'scallops', name: 'Bacon-Wrapped Scallops' },
    { id: 'caprese', name: 'Caprese Skewer' },
    { id: 'bruschetta', name: 'Bruschetta' },
    { id: 'deviled', name: 'Bloody Mary Deviled Eggs' },
    { id: 'wings', name: 'House Smoked Wings' },
    { id: 'sliders', name: 'Mini Cheese Burger Sliders' },
    { id: 'mushrooms', name: 'Sausage Stuffed Mushrooms' },
    { id: 'crostini', name: 'Blueberry & Goat Cheese Crostini' },
    { id: 'tinga', name: 'Tiny Tinga Tacos' },
    { id: 'brie', name: 'Raspberry & Baked Brie Bites' },
    { id: 'watermelon', name: 'Watermelon, Feta, & Tomato' },
    { id: 'bagels', name: 'Bagels Bar' },
    { id: 'pasta', name: 'Build Your Pasta Bar' },
    { id: 'caesar', name: 'Caesar Salad' },
    { id: 'mashed', name: 'Garlic Mashed Potatoes' },
    { id: 'fruit', name: 'Seasonal Chopped Fruit' },
    { id: 'parfait-a', name: 'Yogurt Parfait Bar' },
    { id: 'parfait-b', name: 'Yogurt Parfait Bar' },
]

// One BEO section holding the given categories: [categoryName, [description, ...]].
function beo(...categories) {
    return [{
        meal_type: 'Lunch',
        categories: categories.map(([name, descriptions]) => ({
            name,
            items: descriptions.map(description => ({ qty: '1', label: 'Displayed', description })),
        })),
    }]
}

// The kinds of one item's lines, in order.
function kinds(item) {
    return item.lines.map(l => l.kind)
}

// A saved beo_dish_matches row.
function saved(source_text, kind, dish_id = null, under_dish_id = null) {
    return { source_text, kind, dish_id, under_dish_id }
}

describe('normaliseLine', () => {
    it('lowercases, collapses spaces and trims', () => {
        expect(normaliseLine('  Tiny   Tinga\tTaco ')).toBe('tiny tinga taco')
    })
})

describe('isBeverageCategory (whole words)', () => {
    it.each([
        'Beverage Services',
        'Non-Alcoholic Beverages',
        'Bartending: Open Bar - Consumption Tab Allow guests to order anything from the bar and add to the total bill. Host may indicate',
        'Mimosa Bar',
    ])('skips %s', name => {
        expect(isBeverageCategory(name)).toBe(true)
    })

    // The Edge Function's substring check would drop these: "tea" is in "steak", "bar" in
    // "barbecue", "water" in "watermelon".
    it.each([
        'Steak Dinner',
        'Barbecue Buffet',
        'Watermelon Social',
        'Displayed Appetizers & Small Bites',
        'Please have GF noodles available - Rhi will follow up with guests that morning who will need those for lunch.',
        '',
    ])('keeps %s', name => {
        expect(isBeverageCategory(name)).toBe(false)
    })
})

describe('isPlainNote', () => {
    it.each(['20 pieces', '40 Pieces', '1 piece', '12 each', '6 orders', 'Serves 20', '$20', '$48/person +25% grat'])(
        '%s is a note', line => {
            expect(isPlainNote(normaliseLine(line))).toBe(true)
        })

    // A real order line and a course heading must NOT be skipped as notes.
    it.each(['4 orders of wings in bowls for table', 'Course One', '1 bartender per 75 guests included', 'Serves 20 with extra'])(
        '%s is not a note', line => {
            expect(isPlainNote(normaliseLine(line))).toBe(false)
        })
})

describe('classifyBeoLines: Celebration of Life', () => {
    const sections = beo(
        ['Beverage Services', ['Self-Serve Tea, Water, & Lemonade']],
        ['Displayed Appetizers & Small Bites', [
            'Bites displayed at a station or on a buffet spread',
            'Bacon-Wrapped Scallops\nWith Herbed Parmesan, Red Pepper Coulis\n20 pieces',
            'Tiny Tinga Taco\nPulled Chicken, Pico de Gallo, Pepper Jack Cheese, & Avocado Cream\n20 pieces',
        ]],
        ['Bartending: Open Bar - Consumption Tab Allow guests to order anything from the bar and add to the total bill. Host may indicate',
            ['restrictions such as beer & wine only, no top-shelf, or advertise a time frame.']],
    )

    it('skips beverage categories entirely', () => {
        const items = classifyBeoLines(sections, DISHES, [])
        expect(items.map(i => i.category)).toEqual([
            'Displayed Appetizers & Small Bites',
            'Displayed Appetizers & Small Bites',
            'Displayed Appetizers & Small Bites',
        ])
    })

    it('an exact dish name on the first line makes the item that dish; its other lines are grey description', () => {
        const scallops = classifyBeoLines(sections, DISHES, [])[1]
        expect(scallops.lines).toEqual([
            { text: 'Bacon-Wrapped Scallops', key: 'bacon-wrapped scallops', kind: 'dish', dishId: 'scallops', by: 'exact' },
            { text: 'With Herbed Parmesan, Red Pepper Coulis', key: 'with herbed parmesan, red pepper coulis', kind: 'description', dishId: 'scallops' },
            { text: '20 pieces', key: '20 pieces', kind: 'description', dishId: 'scallops' },
        ])
    })

    it('a near miss is asked, line by line, and "20 pieces" is a note', () => {
        const [heading, , tinga] = classifyBeoLines(sections, DISHES, [])
        expect(kinds(heading)).toEqual(['to_match'])
        expect(kinds(tinga)).toEqual(['to_match', 'to_match', 'note'])
    })

    it('once the near miss is matched, the item is that dish', () => {
        const tinga = classifyBeoLines(sections, DISHES, [saved('tiny tinga taco', 'dish', 'tinga')])[2]
        expect(tinga.lines[0]).toMatchObject({ kind: 'dish', dishId: 'tinga', by: 'saved' })
        expect(kinds(tinga)).toEqual(['dish', 'description', 'description'])
    })
})

describe('classifyBeoLines: Mid Mo Mahjong', () => {
    const sections = beo(
        ['Non-Alcoholic Beverages', ['Breakfast Beverage Station - ALL DAY\nSelf-Serve Coffee, HOT TEA, & water.']],
        ['Morning Kick Start', [
            'Bagels Bar\nToaster Station\nAssorted Bagels\nButter\nPreserves\nCream Cheese',
            'Seasonal Chopped Fruit Platter\nServes 20',
            'Yogurt Parfait Bar\nSelf-serve toppings bar: granola, fresh berries, & honey',
        ]],
        ['Event Staffing Needs', [
            'Themed Buffets',
            'Build Your Pasta Bar\nCavatappi Pasta\nGarlic Alfredo\nHouse Marinara\nChopped Grilled Chicken\nItalian Sausage\nCaesar Salad\nParmesan\nBreadsticks\nItalian Cannolis',
        ]],
    )

    it('Bagels Bar: the components are grey description, not matched', () => {
        const bagels = classifyBeoLines(sections, DISHES, [])[0]
        expect(kinds(bagels)).toEqual(['dish', 'description', 'description', 'description', 'description', 'description'])
        expect(bagels.lines.every(l => l.dishId === 'bagels')).toBe(true)
    })

    it('a near miss with "Serves 20" under it', () => {
        expect(kinds(classifyBeoLines(sections, DISHES, [])[1])).toEqual(['to_match', 'note'])
    })

    it('Yogurt Parfait Bar is asked: two dishes share the name', () => {
        expect(kinds(classifyBeoLines(sections, DISHES, [])[2])).toEqual(['to_match', 'to_match'])
    })

    it('a heading that is not a dish is asked', () => {
        expect(kinds(classifyBeoLines(sections, DISHES, [])[3])).toEqual(['to_match'])
    })

    it('Pasta Bar: components grey, Caesar Salad asked as Part of / Its own dish', () => {
        const pasta = classifyBeoLines(sections, DISHES, [])[4]
        expect(kinds(pasta)).toEqual([
            'dish', 'description', 'description', 'description', 'description', 'description',
            'ask_part_of', 'description', 'description', 'description',
        ])
        expect(pasta.lines[6]).toEqual({
            text: 'Caesar Salad', key: 'caesar salad', kind: 'ask_part_of', dishId: 'caesar', underDishId: 'pasta',
        })
    })

    it('Part of: the saved pair answer makes Caesar Salad grey description of the Pasta Bar', () => {
        const pasta = classifyBeoLines(sections, DISHES, [saved('caesar salad', 'part_of_dish', null, 'pasta')])[4]
        expect(pasta.lines[6]).toEqual({ text: 'Caesar Salad', key: 'caesar salad', kind: 'description', dishId: 'pasta' })
    })

    it('Its own dish: the saved pair answer makes Caesar Salad its own dish', () => {
        const pasta = classifyBeoLines(sections, DISHES, [saved('caesar salad', 'dish', 'caesar', 'pasta')])[4]
        expect(pasta.lines[6]).toEqual({
            text: 'Caesar Salad', key: 'caesar salad', kind: 'dish', dishId: 'caesar', by: 'saved', underDishId: 'pasta',
        })
    })

    it('a pair answer applies only under that dish', () => {
        const items = classifyBeoLines(
            beo(['Member Event - Buffets', ['Vodka Rigatoni\nCaesar Salad\n$20']]),
            DISHES,
            [saved('caesar salad', 'part_of_dish', null, 'pasta')],
        )
        expect(items[0].lines[1]).toMatchObject({ kind: 'dish', dishId: 'caesar', by: 'exact' })
    })
})

describe('classifyBeoLines: Club Car Wash (several dishes in one item)', () => {
    const sections = beo(['Buffet', [[
        'Club Car Wash Buffet',
        "Preset on Tables - Becca's House Baked Rolls with Honey Butter",
        'Sliced Tenderloin (cooked med-rare) with Mushroom Bordelaise Sauce',
        'Garlic Mashed Potatoes',
        'Traditional Mac n Cheese *no breading, no garnish*',
        'Seasonal Roasted Vegetables',
        'Chopped Ceasar Salad',
        'Oreo Cheesecake',
        '(brought out as a plated course at the end)',
        '$48/person +25% grat',
    ].join('\n')]])

    it('a heading that is not a dish: every line on its own, and a dish mid-item hides nothing after it', () => {
        expect(kinds(classifyBeoLines(sections, DISHES, [])[0])).toEqual([
            'to_match', 'to_match', 'to_match', 'dish', 'to_match', 'to_match', 'to_match', 'to_match', 'to_match', 'note',
        ])
    })

    it('a heading answered Not food is still read line by line', () => {
        const item = classifyBeoLines(sections, DISHES, [saved('club car wash buffet', 'not_food')])[0]
        expect(kinds(item).slice(0, 5)).toEqual(['not_food', 'to_match', 'to_match', 'dish', 'to_match'])
    })
})

describe('classifyBeoLines: Walton Heath Dinner Club (a custom menu)', () => {
    const sections = beo(['Street Dinner', [[
        'Autumn Bitter Greens Salad',
        'Radicchio & Endive, Warm Bacon Vinaigrette, Candied Pecans, Shaved Pecorino',
        'Roasted Airline Chicken',
        'Wild Mushroom Cream, Wild Rice Pilaf, Roasted Broccolini',
        'Pumpkin Pot de Creme',
        'Maple Chantilly, Candied Pecans',
    ].join('\n')]])

    it('nothing on a menu: every line is asked', () => {
        expect(kinds(classifyBeoLines(sections, DISHES, [])[0])).toEqual(Array(6).fill('to_match'))
    })

    it('Not on a menu + Describes the line above: each description hangs on its dish line', () => {
        const item = classifyBeoLines(sections, DISHES, [
            saved('autumn bitter greens salad', 'not_on_menu'),
            saved('radicchio & endive, warm bacon vinaigrette, candied pecans, shaved pecorino', 'describes_above'),
            saved('roasted airline chicken', 'not_on_menu'),
            saved('wild mushroom cream, wild rice pilaf, roasted broccolini', 'describes_above'),
            saved('pumpkin pot de creme', 'not_on_menu'),
            saved('maple chantilly, candied pecans', 'describes_above'),
        ])[0]
        expect(kinds(item)).toEqual(['not_on_menu', 'describes_above', 'not_on_menu', 'describes_above', 'not_on_menu', 'describes_above'])
        expect(item.lines.map(l => l.aboveIndex)).toEqual([undefined, 0, undefined, 2, undefined, 4])
    })

    it('a description of an unanswered line hangs on it too (it goes to the AI with it)', () => {
        const item = classifyBeoLines(sections, DISHES, [
            saved('radicchio & endive, warm bacon vinaigrette, candied pecans, shaved pecorino', 'describes_above'),
        ])[0]
        expect(item.lines[1]).toMatchObject({ kind: 'describes_above', aboveIndex: 0 })
    })
})

describe('classifyBeoLines: Describes the line above, edge cases', () => {
    it('under a dish matched mid-item, it becomes that dish\'s grey description', () => {
        const item = classifyBeoLines(
            beo(['Buffet', ['Club Car Wash Buffet\nGarlic Mashed Potatoes\nExtra butter please']]),
            DISHES,
            [saved('extra butter please', 'describes_above')],
        )[0]
        expect(item.lines[2]).toEqual({ text: 'Extra butter please', key: 'extra butter please', kind: 'description', dishId: 'mashed' })
    })

    it('skips over a note to the line it describes', () => {
        const item = classifyBeoLines(
            beo(['Buffet', ['Vodka Rigatoni\n$20\nPenne, vodka sauce']]),
            DISHES,
            [saved('vodka rigatoni', 'not_on_menu'), saved('penne, vodka sauce', 'describes_above')],
        )[0]
        expect(item.lines[2]).toMatchObject({ kind: 'describes_above', aboveIndex: 0 })
    })

    it('with no line above, it is treated as Not on a menu (nothing is lost)', () => {
        const item = classifyBeoLines(beo(['Buffet', ['Penne, vodka sauce']]), DISHES, [saved('penne, vodka sauce', 'describes_above')])[0]
        expect(kinds(item)).toEqual(['not_on_menu'])
    })

    it('a description chain hangs on the first real line', () => {
        const item = classifyBeoLines(
            beo(['Buffet', ['Vodka Rigatoni\nPenne\nVodka sauce']]),
            DISHES,
            [saved('vodka rigatoni', 'not_on_menu'), saved('penne', 'describes_above'), saved('vodka sauce', 'describes_above')],
        )[0]
        expect(item.lines.map(l => l.aboveIndex)).toEqual([undefined, 0, 0])
    })
})

describe('classifyBeoLines: other rules', () => {
    it('"Course One" with nothing under it is asked', () => {
        expect(kinds(classifyBeoLines(beo(['Member Events Plated', ['Course One']]), DISHES, [])[0])).toEqual(['to_match'])
    })

    it('exact names ignore case and extra spaces', () => {
        const item = classifyBeoLines(beo(['Buffet', ['caesar   SALAD ']]), DISHES, [])[0]
        expect(item.lines[0]).toMatchObject({ kind: 'dish', dishId: 'caesar', by: 'exact', text: 'caesar   SALAD' })
    })

    it('a saved answer beats an exact name', () => {
        const item = classifyBeoLines(beo(['Displayed', ['Bruschetta\n20 pieces']]), DISHES, [saved('bruschetta', 'not_on_menu')])[0]
        expect(kinds(item)).toEqual(['not_on_menu', 'note'])
    })

    it('a standalone answer is not used for a pair, and a pair answer not for a standalone line', () => {
        const items = classifyBeoLines(
            beo(['Buffet', ['Build Your Pasta Bar\nCaesar Salad', 'Caesar Salad']]),
            DISHES,
            [saved('caesar salad', 'not_food')],
        )
        expect(items[0].lines[1].kind).toBe('ask_part_of')
        expect(items[1].lines[0].kind).toBe('not_food')
    })

    it('blank lines and empty items are dropped; the item keeps its category and label', () => {
        const items = classifyBeoLines(beo(['Buffet', ['', '\n  \nCaesar Salad\n\n']]), DISHES, [])
        expect(items).toEqual([{
            category: 'Buffet', label: 'Displayed',
            lines: [{ text: 'Caesar Salad', key: 'caesar salad', kind: 'dish', dishId: 'caesar', by: 'exact' }],
        }])
    })

    it('handles missing sections, categories and descriptions', () => {
        expect(classifyBeoLines(null, DISHES, [])).toEqual([])
        expect(classifyBeoLines([{}, { categories: [{ name: 'Buffet' }, { name: 'Buffet', items: [{ label: 'x' }] }] }], DISHES, [])).toEqual([])
    })

    it('does not change its inputs', () => {
        const sections = beo(['Buffet', ['Build Your Pasta Bar\nCaesar Salad']])
        const before = JSON.stringify(sections)
        classifyBeoLines(sections, DISHES, [saved('caesar salad', 'part_of_dish', null, 'pasta')])
        expect(JSON.stringify(sections)).toBe(before)
    })
})

// The real 364 orderable dishes, as { id, name } with the index as id.
const REAL_DISHES = ORDERABLE_DISH_NAMES.map((name, i) => ({ id: i, name }))

// Names of the suggestions for a line, best first.
function suggested(line, dishes = REAL_DISHES) {
    return suggestDishes(line, dishes).map(d => d.name)
}

describe('suggestDishes: the near misses on real BEOs, against all 364 dishes', () => {
    it.each([
        ['Tiny Tinga Taco', 'Tiny Tinga Tacos'],
        ['Raspberry Baked Brie Bites', 'Raspberry & Baked Brie Bites'],
        ['Watermelon, Feta & Grape Tomato Skewer', 'Watermelon, Feta, & Tomato'],
        ['Seasonal Chopped Fruit Platter', 'Seasonal Chopped Fruit'],
    ])('%s -> %s first', (line, best) => {
        expect(suggested(line)[0]).toBe(best)
    })

    it('gives at most 3', () => {
        expect(suggested('Classic Caesar Salad with Croutons')).toHaveLength(3)
    })
})

describe('suggestDishes: word rules', () => {
    const dishes = [
        { id: 1, name: 'Salmon with Dill' },
        { id: 2, name: 'Pasta Salad' },
        { id: 3, name: 'Tomato Bisque Soup' },
        { id: 4, name: 'Burrata Crostini' },
        { id: 5, name: 'Pot de Crème' },
        { id: 6, name: 'Shrimp and Grits' },
    ]

    it('a line sharing no word gets no suggestions', () => {
        expect(suggested('Course One', dishes)).toEqual([])
    })

    it('"&", "with" and "and" are not shared words', () => {
        expect(suggested('Pasta with Sauce & Bread and Butter', dishes)).toEqual(['Pasta Salad'])
    })

    it("plural and singular match: tomatoes / tomato, crostini's / crostini", () => {
        expect(suggested('Roasted Tomatoes', dishes)).toEqual(['Tomato Bisque Soup'])
        expect(suggested("Cherry Tomato Italian Blend, Pesto, Fresh Mozzarella, & Crostini's", dishes))
            .toEqual(['Burrata Crostini', 'Tomato Bisque Soup'])
    })

    it('accents do not matter: Creme Brulee finds Crème Brûlée', () => {
        expect(suggested('Creme Brulee')).toEqual(['Gingerbread Crème Brûlée', 'Pot de Crème', 'Pot de Crème'])
    })

    it('more shared words first, then by name, then by menu', () => {
        const twins = [
            { id: 'b', name: 'Yogurt Parfait Bar', menu_source: 'Breakfast', menu_section: 'Fruit & Yogurt' },
            { id: 'a', name: 'Yogurt Parfait Bar', menu_source: 'Breakfast', menu_section: 'Custom Breakfast Buffet' },
            { id: 'c', name: 'Granola Bar' },
            { id: 'd', name: 'Berry Yogurt' },
        ]
        expect(suggestDishes('Yogurt Parfait Bar', twins).map(d => d.id)).toEqual(['a', 'b', 'd'])
    })
})

describe('searchDishes ("Pick another dish")', () => {
    const dishes = [
        { id: 1, name: 'House Caesar Salad', menu_source: 'Plated Dinners' },
        { id: 2, name: 'Caesar Salad', menu_source: 'Custom Buffets' },
        { id: 3, name: 'Classic Caesar Salad', menu_source: 'Seasonal', menu_section: 'Starter Course' },
        { id: 4, name: 'Classic Caesar Salad', menu_source: 'Seasonal', menu_section: 'Buffet Salad' },
        { id: 5, name: 'Tiramisu', menu_source: 'Plated Dinners' },
    ]

    it('finds every dish holding all the typed words, in name then menu order', () => {
        expect(searchDishes('caesar', dishes).map(d => d.id)).toEqual([2, 4, 3, 1])
        expect(searchDishes('  CLASSIC   caes ', dishes).map(d => d.id)).toEqual([4, 3])
    })

    it('matches the start of a word as you type', () => {
        expect(searchDishes('tira', dishes).map(d => d.id)).toEqual([5])
    })

    it('an empty search shows nothing', () => {
        expect(searchDishes('', dishes)).toEqual([])
        expect(searchDishes('   ', dishes)).toEqual([])
    })

    it('a search with no hits shows nothing', () => {
        expect(searchDishes('lobster', dishes)).toEqual([])
    })
})

describe('beoLineKeys (the wordings whose saved answers Generate fetches)', () => {
    it('every food line once, normalised, beverage categories left out', () => {
        const sections = [{
            categories: [
                { name: "Hors d'Oeuvres", items: [
                    { label: 'Passed', description: 'Tiny Tinga Taco\n20 pieces' },
                    { label: 'Passed', description: '  TINY   tinga taco ' },
                ] },
                { name: 'Beverages', items: [{ label: 'Bar', description: 'Iced Tea' }] },
                { name: 'Buffet', items: [{ label: 'Buffet', description: '' }, { label: 'Buffet', description: 'Caesar Salad' }] },
            ],
        }]
        expect(beoLineKeys(sections)).toEqual(['tiny tinga taco', '20 pieces', 'caesar salad'])
    })

    it('a BEO with no sections has no lines', () => {
        expect(beoLineKeys(null)).toEqual([])
    })
})

describe('linesToMatch (what the box asks)', () => {
    const WALTON = beo(['Street Dinner', [[
        'Autumn Bitter Greens Salad',
        'Radicchio & Endive, Warm Bacon Vinaigrette, Candied Pecans, Shaved Pecorino',
        'Roasted Airline Chicken',
    ].join('\n')]])

    it('each unanswered line with its BEO item, in BEO order', () => {
        const asked = linesToMatch(classifyBeoLines(WALTON, DISHES, []))
        expect(asked.map(l => l.key)).toEqual([
            'autumn bitter greens salad',
            'radicchio & endive, warm bacon vinaigrette, candied pecans, shaved pecorino',
            'roasted airline chicken',
        ])
        expect(asked[1]).toEqual({
            id: 'radicchio & endive, warm bacon vinaigrette, candied pecans, shaved pecorino\u0000',
            key: 'radicchio & endive, warm bacon vinaigrette, candied pecans, shaved pecorino',
            text: 'Radicchio & Endive, Warm Bacon Vinaigrette, Candied Pecans, Shaved Pecorino',
            category: 'Street Dinner',
            label: 'Displayed',
            itemTexts: [
                'Autumn Bitter Greens Salad',
                'Radicchio & Endive, Warm Bacon Vinaigrette, Candied Pecans, Shaved Pecorino',
                'Roasted Airline Chicken',
            ],
            lineIndex: 1,
            canDescribeAbove: true,
        })
    })

    it('"Describes the line above" is offered only to a line with a line above it', () => {
        const asked = linesToMatch(classifyBeoLines(WALTON, DISHES, []))
        expect(asked.map(l => l.canDescribeAbove)).toEqual([false, true, true])
    })

    it('answered lines, dishes, notes and Not food lines are not asked', () => {
        const asked = linesToMatch(classifyBeoLines(
            beo(['Buffet', ['Club Car Wash Buffet\nGarlic Mashed Potatoes\nOreo Cheesecake\n$48/person +25% grat']]),
            DISHES,
            [saved('club car wash buffet', 'not_food')],
        ))
        expect(asked.map(l => l.key)).toEqual(['oreo cheesecake'])
    })

    it('a wording on the BEO twice is asked once; a line above in either place offers "Describes"', () => {
        const asked = linesToMatch(classifyBeoLines(
            beo(['Lunch', ['Chef Choice Soup']], ['Dinner', ['Vodka Rigatoni\nChef Choice Soup']]),
            DISHES,
            [],
        ))
        expect(asked.map(l => l.key)).toEqual(['chef choice soup', 'vodka rigatoni'])
        expect(asked[0]).toMatchObject({ category: 'Lunch', lineIndex: 0, canDescribeAbove: true })
    })

    // Mid Mo Mahjong's Pasta Bar, with Caesar Salad typed under it (rule 2a).
    const PASTA = 'Build Your Pasta Bar\nCavatappi Pasta\nCaesar Salad\nBreadsticks'

    it('a dish name under another dish is asked as a pair: which dish it is, and the dish above it', () => {
        const asked = linesToMatch(classifyBeoLines(beo(['Themed Buffets', [PASTA]]), DISHES, []))
        expect(asked).toEqual([{
            id: 'caesar salad\u0000pasta',
            key: 'caesar salad',
            text: 'Caesar Salad',
            category: 'Themed Buffets',
            label: 'Displayed',
            itemTexts: ['Build Your Pasta Bar', 'Cavatappi Pasta', 'Caesar Salad', 'Breadsticks'],
            lineIndex: 2,
            canDescribeAbove: false,
            dishId: 'caesar',
            underDishId: 'pasta',
        }])
    })

    it('the same pair twice is asked once; under a different dish it is its own question', () => {
        const asked = linesToMatch(classifyBeoLines(
            beo(['Lunch', [PASTA, 'Bagels Bar\nCaesar Salad']], ['Dinner', [PASTA]]),
            DISHES,
            [],
        ))
        expect(asked.map(l => [l.key, l.underDishId])).toEqual([['caesar salad', 'pasta'], ['caesar salad', 'bagels']])
    })

    it('a pair answered once is not asked again; the same line under another dish still is', () => {
        const asked = linesToMatch(classifyBeoLines(
            beo(['Lunch', [PASTA, 'Bagels Bar\nCaesar Salad']]),
            DISHES,
            [saved('caesar salad', 'part_of_dish', null, 'pasta')],
        ))
        expect(asked.map(l => [l.key, l.underDishId])).toEqual([['caesar salad', 'bagels']])
    })
})

describe('lineToChange (Change match reopens a spec-built group\'s first BEO line)', () => {
    const CAR_WASH = beo(['Buffet', ['Club Car Wash Buffet\nGarlic Mashed Potatoes\nOreo Cheesecake']])

    it('an exact-name dish mid-item (no saved answer) can be reopened, with its BEO item', () => {
        const items = classifyBeoLines(CAR_WASH, DISHES, [])
        expect(lineToChange(items, 'Garlic Mashed Potatoes')).toEqual({
            id: 'garlic mashed potatoes\u0000',
            key: 'garlic mashed potatoes',
            text: 'Garlic Mashed Potatoes',
            category: 'Buffet',
            label: 'Displayed',
            itemTexts: ['Club Car Wash Buffet', 'Garlic Mashed Potatoes', 'Oreo Cheesecake'],
            lineIndex: 1,
            canDescribeAbove: true,
        })
    })

    it('reads the FIRST line of the group\'s BEO text (a first-line dish and its grey lines)', () => {
        const items = classifyBeoLines(beo(['Bites', ['Bacon-Wrapped Scallops\nWith Herbed Parmesan, Red Pepper Coulis\n20 pieces']]), DISHES, [])
        const line = lineToChange(items, 'Bacon-Wrapped Scallops\nWith Herbed Parmesan, Red Pepper Coulis\n20 pieces')
        expect(line).toMatchObject({ key: 'bacon-wrapped scallops', lineIndex: 0, canDescribeAbove: false })
    })

    it('a near miss matched by a saved answer can be reopened', () => {
        const items = classifyBeoLines(beo(['Bites', ['Tiny Tinga Taco\nPulled Chicken']]), DISHES, [saved('tiny tinga taco', 'dish', 'tinga')])
        expect(lineToChange(items, 'Tiny Tinga Taco\nPulled Chicken')).toMatchObject({ id: 'tiny tinga taco\u0000', lineIndex: 0 })
    })

    it('an "Its own dish" answer reopens as its pair question', () => {
        const items = classifyBeoLines(
            beo(['Themed Buffets', ['Build Your Pasta Bar\nCavatappi Pasta\nCaesar Salad']]),
            DISHES,
            [saved('caesar salad', 'dish', 'caesar', 'pasta')],
        )
        expect(lineToChange(items, 'Caesar Salad')).toMatchObject({
            id: 'caesar salad\u0000pasta', dishId: 'caesar', underDishId: 'pasta', canDescribeAbove: false,
        })
    })

    it('a line no longer on the BEO, or no longer a dish, gives null', () => {
        const items = classifyBeoLines(CAR_WASH, DISHES, [])
        expect(lineToChange(items, 'Bacon-Wrapped Scallops')).toBeNull()
        expect(lineToChange(items, 'Oreo Cheesecake')).toBeNull()
        expect(lineToChange(items, null)).toBeNull()
    })

    // The new answer, saved under the reopened line's key, is what classifyBeoLines uses next time.
    it('an exact-name match changed to another dish: the new answer wins', () => {
        const line = lineToChange(classifyBeoLines(CAR_WASH, DISHES, []), 'Garlic Mashed Potatoes')
        const row = matchRow(line.key, 'dish', 'fruit', line.underDishId)
        const regenerated = classifyBeoLines(CAR_WASH, DISHES, [row])
        expect(regenerated[0].lines[1]).toMatchObject({ kind: 'dish', dishId: 'fruit', by: 'saved' })
    })

    it('a saved match changed to Not on a menu: the line leaves its dish', () => {
        const before = classifyBeoLines(beo(['Bites', ['Tiny Tinga Taco']]), DISHES, [saved('tiny tinga taco', 'dish', 'tinga')])
        const line = lineToChange(before, 'Tiny Tinga Taco')
        const row = matchRow(line.key, 'not_on_menu', null, line.underDishId)
        expect(row).toEqual({ source_text: 'tiny tinga taco', under_dish_id: null, kind: 'not_on_menu', dish_id: null })
        expect(classifyBeoLines(beo(['Bites', ['Tiny Tinga Taco']]), DISHES, [row])[0].lines[0].kind).toBe('not_on_menu')
    })
})

describe('dish order across seasons (the Seasonal menu repeats a name in every season)', () => {
    // As in orderable_menu_dishes: Classic Caesar Salad, Seasonal, Starter Course, four seasons.
    const CAESARS = ['winter', 'fall', 'summer', 'spring'].map(season => ({
        id: `caesar-${season}`, name: 'Classic Caesar Salad', menu_source: 'Seasonal', menu_section: 'Starter Course', season,
    }))

    it('search lists them by season, whatever order the database returns', () => {
        expect(searchDishes('caesar', CAESARS).map(d => d.season)).toEqual(['fall', 'spring', 'summer', 'winter'])
        expect(searchDishes('caesar', [...CAESARS].reverse()).map(d => d.season)).toEqual(['fall', 'spring', 'summer', 'winter'])
    })

    it('suggestions too', () => {
        expect(suggestDishes('Caesar Salad', [...CAESARS].reverse()).map(d => d.season)).toEqual(['fall', 'spring', 'summer'])
    })
})

describe('matchRow (the saved answer)', () => {
    it('a dish answer names its dish; a line on its own has no dish above it', () => {
        expect(matchRow('tiny tinga taco', 'dish', 'tinga')).toEqual({
            source_text: 'tiny tinga taco', under_dish_id: null, kind: 'dish', dish_id: 'tinga',
        })
    })

    it('any other answer names no dish', () => {
        expect(matchRow('bqt staff', 'not_food', 'tinga')).toEqual({
            source_text: 'bqt staff', under_dish_id: null, kind: 'not_food', dish_id: null,
        })
    })

    it('"Part of" saves the dish it sits under and names no dish', () => {
        expect(matchRow('caesar salad', 'part_of_dish', 'caesar', 'pasta')).toEqual({
            source_text: 'caesar salad', under_dish_id: 'pasta', kind: 'part_of_dish', dish_id: null,
        })
    })

    it('"Its own dish" saves the dish and the dish it sits under', () => {
        expect(matchRow('caesar salad', 'dish', 'caesar', 'pasta')).toEqual({
            source_text: 'caesar salad', under_dish_id: 'pasta', kind: 'dish', dish_id: 'caesar',
        })
    })

    // The saved row read back by classifyBeoLines: the box and the classifier agree on the pair.
    it.each([
        ['part_of_dish', { kind: 'description', dishId: 'pasta' }],
        ['dish', { kind: 'dish', dishId: 'caesar', underDishId: 'pasta' }],
    ])('a saved %s pair answer is what classifyBeoLines reads back', (kind, expected) => {
        const sections = beo(['Themed Buffets', ['Build Your Pasta Bar\nCaesar Salad']])
        const [question] = linesToMatch(classifyBeoLines(sections, DISHES, []))
        const row = matchRow(question.key, kind, question.dishId, question.underDishId)
        const [pasta] = classifyBeoLines(sections, DISHES, [row])
        expect(pasta.lines[1]).toMatchObject(expected)
        expect(linesToMatch([pasta])).toEqual([])
    })
})

import { describe, it, expect } from 'vitest'
import {
    parsePar, colorFor, toPrep, quickValues, stationScore,
    unitSuffix, formatAmount, lineStatus, groupBySection, parseHaveInput,
    parseMadeInput, COUNT_LABELS, formatStamp, lastCountText, applyItemChange, newerCount, rankStations,
} from './prepSheets.js'

// Every distinct par string in the five Fall 26 sheets (prepsheets/), exactly as typed,
// with what it must parse to. "2 1/3 pans" = two 1/3 pans (owner, 2026-11-04).
const REAL_PARS = [
    ['1cs', 1, 'cs'],
    ['3 bags', 3, 'bag'],
    ['4bags', 4, 'bag'],
    ['2 bags', 2, 'bag'],
    ['2 Bags', 2, 'bag'],
    ['4 bgs', 4, 'bag'],
    ['1 bag', 1, 'bag'],
    ['14 orders', 14, 'order'],
    ['12 orders', 12, 'order'],
    ['9 orders', 9, 'order'],
    ['15 orders', 15, 'order'],
    ['2qts', 2, 'qt'],
    ['2 qt', 2, 'qt'],
    ['2qt', 2, 'qt'],
    ['1qt', 1, 'qt'],
    ['1 qt', 1, 'qt'],
    ['2 qts', 2, 'qt'],
    ['3 qts', 3, 'qt'],
    ['4 qts', 4, 'qt'],
    ['2 qts/ea.', 2, 'qt'],
    ['40', 40, 'ea'],
    ['12', 12, 'ea'],
    ['6', 6, 'ea'],
    ['8 ea', 8, 'ea'],
    ['12 ea', 12, 'ea'],
    ['10 ea', 10, 'ea'],
    ['20 ea', 20, 'ea'],
    ['3 ea', 3, 'ea'],
    ['16 ea', 16, 'ea'],
    ['24 ea', 24, 'ea'],
    ['6ea', 6, 'ea'],
    ['12ea', 12, 'ea'],
    ['2 bottles', 2, 'btl'],
    ['2 btl', 2, 'btl'],
    ['2 btls', 2, 'btl'],
    ['2 squezzy', 2, 'squeeze btl'],
    ['1/3 pan', 1, '1/3 pan'],
    ['1/6 pan', 1, '1/6 pan'],
    ['1/2 pan', 1, '1/2 pan'],
    ['2 1/3 pans', 2, '1/3 pan'],
    ['(2) 1/3 pans', 2, '1/3 pan'],
    ['2 cups', 2, 'cup'],
    ['1 cup', 1, 'cup'],
    ['2 G', 2, 'gal'],
    ['1 G', 1, 'gal'],
    ['4 G', 4, 'gal'],
    ['6 G', 6, 'gal'],
    ['4G', 4, 'gal'],
    ['2G', 2, 'gal'],
    ['8 #', 8, 'lb'],
    ['2 packs', 2, 'pack'],
    ['2 boxes', 2, 'box'],
    ['1 tub', 1, 'tub'],
    ['1 wedge', 1, 'wedge'],
]

describe('parsePar', () => {
    it.each(REAL_PARS)('reads %j as %d × %s', (text, qty, unit) => {
        expect(parsePar(text)).toEqual({ qty, unit })
    })

    it('ignores surrounding spaces', () => {
        expect(parsePar('  20 ea ')).toEqual({ qty: 20, unit: 'ea' })
    })

    it('returns null for a blank or missing par', () => {
        expect(parsePar('')).toBeNull()
        expect(parsePar('   ')).toBeNull()
        expect(parsePar(null)).toBeNull()
        expect(parsePar(undefined)).toBeNull()
    })

    it('returns null when there is no leading amount', () => {
        expect(parsePar('some')).toBeNull()
        expect(parsePar('pan')).toBeNull()
    })

    it('keeps an unknown unit word as typed (lowercased), rather than losing the par', () => {
        expect(parsePar('3 hotel pans')).toEqual({ qty: 3, unit: 'hotel pans' })
    })

    it('rejects a zero par', () => {
        expect(parsePar('0 ea')).toBeNull()
    })
})

describe('colorFor', () => {
    // Par 20: red under 50%, yellow 50% up to under 75%, green 75% and up.
    it.each([
        [0, 'red'],
        [4, 'red'],
        [9.99, 'red'],
        [10, 'yellow'],
        [12, 'yellow'],
        [14.99, 'yellow'],
        [15, 'green'],
        [20, 'green'],
        [25, 'green'],
    ])('have %d of 20 is %s', (have, color) => {
        expect(colorFor(have, 20)).toBe(color)
    })

    it('works on a single-container par (half a 1/3 pan is yellow)', () => {
        expect(colorFor(0.5, 1)).toBe('yellow')
        expect(colorFor(0.25, 1)).toBe('red')
        expect(colorFor(0.75, 1)).toBe('green')
    })

    it('gives no color without a par or before anything is counted', () => {
        expect(colorFor(4, null)).toBeNull()
        expect(colorFor(4, 0)).toBeNull()
        expect(colorFor(null, 20)).toBeNull()
        expect(colorFor(undefined, 20)).toBeNull()
    })
})

describe('toPrep', () => {
    it('is par minus have', () => {
        expect(toPrep(4, 20)).toBe(16)
        expect(toPrep(12, 20)).toBe(8)
    })

    it('never goes below zero', () => {
        expect(toPrep(20, 20)).toBe(0)
        expect(toPrep(25, 20)).toBe(0)
    })

    it('has no float noise', () => {
        expect(toPrep(12.3, 20)).toBe(7.7)
        expect(toPrep(0.1, 0.3)).toBe(0.2)
    })

    it('is null without a par or before anything is counted', () => {
        expect(toPrep(4, null)).toBeNull()
        expect(toPrep(null, 20)).toBeNull()
    })
})

describe('quickValues', () => {
    it('gives Out, quarters and Full of par', () => {
        expect(quickValues(20)).toEqual([
            { label: 'Out', value: 0 },
            { label: '¼', value: 5 },
            { label: '½', value: 10 },
            { label: '¾', value: 15 },
            { label: 'Full', value: 20 },
        ])
    })

    it('works for a single container', () => {
        expect(quickValues(1).map(q => q.value)).toEqual([0, 0.25, 0.5, 0.75, 1])
    })

    it('is empty without a par', () => {
        expect(quickValues(null)).toEqual([])
    })
})

describe('stationScore', () => {
    it('counts colors and scores 2 per red, 1 per yellow', () => {
        const items = [
            { have: 4, parQty: 20 },   // red
            { have: 0, parQty: 3 },    // red
            { have: 12, parQty: 20 },  // yellow
            { have: 20, parQty: 20 },  // green
            { have: null, parQty: 8 }, // not counted yet
            { have: 2, parQty: null }, // no par: left out entirely
        ]
        expect(stationScore(items)).toEqual({ red: 2, yellow: 1, green: 1, uncounted: 1, score: 5 })
    })

    it('is all zero for an empty station', () => {
        expect(stationScore([])).toEqual({ red: 0, yellow: 0, green: 0, uncounted: 0, score: 0 })
    })
})

describe('unitSuffix / formatAmount', () => {
    it.each([
        [16, 'ea', '16 ea'],
        [0, 'ea', '0 ea'],
        [2.5, 'bag', '2.5 bag'],
        [7.7, 'lb', '7.7 lb'],
        [0.5, '1/3 pan', '0.5 of a 1/3 pan'],
        [0.25, '1/6 pan', '0.25 of a 1/6 pan'],
        [1, '1/3 pan', '1 × 1/3 pan'],
        [1.5, '1/3 pan', '1.5 × 1/3 pan'],
        [0, '1/3 pan', '0 × 1/3 pan'],
    ])('%s %s → %s', (qty, unit, text) => {
        expect(formatAmount(qty, unit)).toBe(text)
    })

    it('rounds float noise away', () => {
        expect(formatAmount(20 - 12.3, 'ea')).toBe('7.7 ea')
        expect(formatAmount(1 / 3, 'qt')).toBe('0.33 qt')
    })

    it('the Have box suffix follows the same pan wording', () => {
        expect(unitSuffix(0.5, '1/3 pan')).toBe('of a 1/3 pan')
        expect(unitSuffix(2, '1/3 pan')).toBe('× 1/3 pan')
        expect(unitSuffix(null, '1/3 pan')).toBe('× 1/3 pan')
        expect(unitSuffix(4, 'ea')).toBe('ea')
        expect(unitSuffix(4, null)).toBe('')
    })
})

describe('lineStatus', () => {
    const salmon = have => ({ have, par_qty: 20, par_unit: 'ea' })

    it('Salmon par 20: 4 is Red "prep 16 ea", 12 Yellow, 15 Green (task 5 criteria)', () => {
        expect(lineStatus(salmon(4))).toEqual({ color: 'red', label: 'Red', prep: 'prep 16 ea' })
        expect(lineStatus(salmon(12))).toEqual({ color: 'yellow', label: 'Yellow', prep: 'prep 8 ea' })
        expect(lineStatus(salmon(15))).toEqual({ color: 'green', label: 'Green', prep: 'prep 5 ea' })
    })

    it('at or over par needs nothing', () => {
        expect(lineStatus(salmon(20)).prep).toBe('at par')
        expect(lineStatus(salmon(25)).prep).toBe('at par')
    })

    it('½ of a one-pan par is "0.5 of a 1/3 pan" and Yellow', () => {
        const [, , half] = quickValues(1)
        expect(half.value).toBe(0.5)
        expect(lineStatus({ have: half.value, par_qty: 1, par_unit: '1/3 pan' }))
            .toEqual({ color: 'yellow', label: 'Yellow', prep: 'prep 0.5 of a 1/3 pan' })
    })

    it('not counted yet is grey "Not counted"', () => {
        expect(lineStatus(salmon(null))).toEqual({ color: null, label: 'Not counted', prep: null })
    })

    it('an item with no par is grey "No par", counted or not', () => {
        expect(lineStatus({ have: null, par_qty: null, par_unit: null })).toEqual({ color: null, label: 'No par', prep: null })
        expect(lineStatus({ have: 3, par_qty: null, par_unit: null })).toEqual({ color: null, label: 'No par', prep: null })
    })

    it('reads numeric strings from the database as numbers', () => {
        expect(lineStatus({ have: '4', par_qty: '20', par_unit: 'ea' }).prep).toBe('prep 16 ea')
    })
})

describe('groupBySection', () => {
    it('groups items into their sections in sheet order, keeping runs together', () => {
        const items = [
            { id: 1, section: null }, { id: 2, section: 'Protein' }, { id: 3, section: 'Protein' },
            { id: 4, section: 'Sauces' },
        ]
        expect(groupBySection(items)).toEqual([
            { section: null, items: [items[0]] },
            { section: 'Protein', items: [items[1], items[2]] },
            { section: 'Sauces', items: [items[3]] },
        ])
    })

    it('an empty list has no sections', () => {
        expect(groupBySection([])).toEqual([])
    })
})

describe('parseHaveInput', () => {
    it.each([
        ['12', 12],
        [' 4.5 ', 4.5],
        ['0', 0],
        ['.5', 0.5],
        ['1.234', 1.23],
    ])('"%s" → %s', (text, value) => {
        expect(parseHaveInput(text)).toEqual({ value, error: null })
    })

    it('blank means "no change", not zero', () => {
        expect(parseHaveInput('')).toEqual({ value: null, error: null })
        expect(parseHaveInput('   ')).toEqual({ value: null, error: null })
    })

    it.each(['-1', 'abc', '1/2', '1e400'])('"%s" is refused with a message', text => {
        const result = parseHaveInput(text)
        expect(result.value).toBeNull()
        expect(result.error).toMatch(/0 or more/)
    })
})

describe('parseMadeInput (Partial)', () => {
    it('takes an amount over 0', () => {
        expect(parseMadeInput('5')).toEqual({ value: 5, error: null })
        expect(parseMadeInput(' 0.5 ')).toEqual({ value: 0.5, error: null })
    })

    it.each(['', '0', '-2', 'abc'])('"%s" is refused: a partial must add something', text => {
        expect(parseMadeInput(text)).toEqual({ value: null, error: 'Enter how much you made (more than 0).' })
    })
})

describe('COUNT_LABELS', () => {
    it("are the three counts the database accepts, in the kitchen's words", () => {
        expect(COUNT_LABELS).toEqual([
            { key: 'end_of_night', label: 'End of Night' },
            { key: 'morning', label: 'Morning' },
            { key: 'night_start', label: 'Night Start' },
        ])
    })
})

describe('formatStamp', () => {
    // Local times, so the test reads the same in any time zone.
    const now = new Date(2026, 10, 5, 23, 0)

    it.each([
        [new Date(2026, 10, 5, 22, 42), '10:42pm'],
        [new Date(2026, 10, 5, 0, 5), '12:05am'],
        [new Date(2026, 10, 5, 12, 0), '12:00pm'],
        [new Date(2026, 10, 5, 9, 7), '9:07am'],
    ])('today: %s → %s', (when, text) => {
        expect(formatStamp(when.toISOString(), now)).toBe(text)
    })

    it('another day also shows the date', () => {
        expect(formatStamp(new Date(2026, 10, 4, 22, 42).toISOString(), now)).toBe('Nov 4, 10:42pm')
        expect(formatStamp(new Date(2025, 10, 5, 8, 0).toISOString(), now)).toBe('Nov 5 2025, 8:00am')
    })
})

describe('lastCountText', () => {
    const now = new Date(2026, 10, 5, 23, 0)

    it('"End of Night, Jake, 10:42pm" (the spec example)', () => {
        const count = { label: 'end_of_night', employee_name: 'Jake', created_at: new Date(2026, 10, 5, 22, 42).toISOString() }
        expect(lastCountText(count, now)).toBe('End of Night, Jake, 10:42pm')
    })

    it('no count yet', () => {
        expect(lastCountText(null, now)).toBe('No count finished yet')
    })
})

describe('applyItemChange (a live change from another device)', () => {
    const a = { id: 'a', name: 'Salmon', have: 4, sort_order: 1 }
    const b = { id: 'b', name: 'Broccoli', have: 1, sort_order: 2 }
    const c = { id: 'c', name: 'Chives', have: null, sort_order: 3 }
    const items = [a, b, c]

    it('an update replaces that line and leaves the rest alone', () => {
        const out = applyItemChange(items, { eventType: 'UPDATE', new: { ...b, have: 2, active: true } })
        expect(out.map(i => i.have)).toEqual([4, 2, null])
        expect(out[0]).toBe(a)
        expect(items[1].have).toBe(1) // the old list is not changed
    })

    it('a line taken off the sheet (active false) disappears', () => {
        const out = applyItemChange(items, { eventType: 'UPDATE', new: { ...b, active: false } })
        expect(out.map(i => i.id)).toEqual(['a', 'c'])
    })

    it('a new or re-activated line goes in at its sheet position', () => {
        const d = { id: 'd', name: 'Dill', have: null, sort_order: 2.5, active: true }
        expect(applyItemChange(items, { eventType: 'INSERT', new: d }).map(i => i.id)).toEqual(['a', 'b', 'd', 'c'])
        const back = applyItemChange([a, c], { eventType: 'UPDATE', new: { ...b, active: true } })
        expect(back.map(i => i.id)).toEqual(['a', 'b', 'c'])
    })

    it('nothing loaded yet: stays not loaded', () => {
        expect(applyItemChange(null, { eventType: 'UPDATE', new: { ...a, active: true } })).toBeNull()
    })
})

describe('newerCount', () => {
    const older = { label: 'morning', employee_name: 'Jake', created_at: '2026-11-05T14:00:00+00:00' }
    const newer = { label: 'end_of_night', employee_name: 'Ryan', created_at: '2026-11-06T03:36:00+00:00' }

    it('keeps whichever Finish count is latest', () => {
        expect(newerCount(older, newer)).toBe(newer)
        expect(newerCount(newer, older)).toBe(newer)
        expect(newerCount(null, older)).toBe(older)
    })
})

describe('rankStations (office overview)', () => {
    const item = (station_id, have, par_qty, changed_at = null) => ({ station_id, have, par_qty, changed_at })
    const stations = [{ id: 'f', name: 'Fry' }, { id: 'g', name: 'Grill' }, { id: 's', name: 'Salad' }, { id: 'l', name: 'Lunch' }]
    const items = [
        // Grill: 1 red, 1 yellow, 1 green, 1 not counted, 1 no par -> score 3
        item('g', 4, 20, '2026-11-06T15:00:00Z'), item('g', 12, 20, '2026-11-06T16:30:00Z'), item('g', 15, 20),
        item('g', null, 20), item('g', 3, null, '2026-11-06T17:00:00Z'),
        // Salad: 2 yellow -> score 2. Fry: 1 red as numeric strings -> score 2 (ties Salad)
        item('s', 10, 20), item('s', 10, 20), item('f', '1', '20'),
        // Lunch: nothing counted -> score 0
        item('l', null, 8),
    ]
    const counts = { g: { label: 'end_of_night', employee_name: 'Jake', created_at: '2026-11-06T04:00:00Z' } }
    const ranked = rankStations(stations, items, counts)

    it('most work first (2 x red + yellow), ties by name', () => {
        expect(ranked.map(r => `${r.name} ${r.score}`)).toEqual(['Grill 3', 'Fry 2', 'Salad 2', 'Lunch 0'])
    })

    it('counts each color and the not-counted lines; no-par lines are left out', () => {
        expect(ranked[0]).toMatchObject({ red: 1, yellow: 1, green: 1, uncounted: 1 })
        expect(ranked[3]).toMatchObject({ red: 0, yellow: 0, green: 0, uncounted: 1 })
    })

    it('carries the last Finish count and the latest change on any line (no-par lines too)', () => {
        expect(ranked[0].lastCount).toBe(counts.g)
        expect(ranked[0].lastUpdate).toBe('2026-11-06T17:00:00Z')
        expect(ranked[3]).toMatchObject({ lastCount: null, lastUpdate: null })
    })

    it('a station with no items yet still shows, at score 0', () => {
        expect(rankStations([{ id: 'z', name: 'New' }], [], {})[0]).toMatchObject({ name: 'New', score: 0, uncounted: 0 })
    })
})

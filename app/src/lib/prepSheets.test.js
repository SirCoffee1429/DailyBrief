import { describe, it, expect } from 'vitest'
import { parsePar, colorFor, toPrep, quickValues, stationScore } from './prepSheets.js'

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

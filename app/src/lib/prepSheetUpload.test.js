import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
    readPrepFile, parsePrepRows, setLineKind, toSections, stationNameFromFile, fixTypos, toUploadPayload,
} from './prepSheetUpload.js'

// The five real Fall 26 sheets, read through the same function the upload page uses.
const SHEETS_DIR = fileURLToPath(new URL('../../../prepsheets/', import.meta.url))
const FILES = {
    Fry: 'Fry fall 26.xls',
    Grill: 'Grill Fall 26.xlsx',
    Lunch: 'Lunch Fall 26.xls',
    Salad: 'Salad Fall 26.xls',
    Sautee: 'Sautee Fall 26.xls',
}

// Parses one real file to its preview lines.
function linesOf(station) {
    return parsePrepRows(readPrepFile(readFileSync(SHEETS_DIR + FILES[station])))
}

// Flips the named lines to items, the way the office does in the preview.
function flipToItems(lines, names) {
    return names.reduce((acc, name) => setLineKind(acc, acc.findIndex(l => l.name === name), 'item'), lines)
}

// Section names and item counts per section.
function shape(sections) {
    return sections.map(s => [s.name, s.items.length])
}

describe('stationNameFromFile', () => {
    it.each([
        ['Fry fall 26.xls', 'Fry'],
        ['Grill Fall 26.xlsx', 'Grill'],
        ['Lunch Fall 26.xls', 'Lunch'],
        ['Salad Fall 26.xls', 'Salad'],
        ['Sautee Fall 26.xls', 'Sautee'],
        ['Pastry Spring 27.xlsx', 'Pastry'],
        ['Garde Manger.xls', 'Garde Manger'],
        ['fry.xlsx', 'Fry'],
    ])('%s → %s', (file, name) => {
        expect(stationNameFromFile(file)).toBe(name)
    })
})

describe('fixTypos', () => {
    it.each([
        ['Brussles', 'Brussels'],
        ['Sticy Rice', 'Sticky Rice'],
        ['Seasame Buns', 'Sesame Buns'],
        ['Carmel Apple Cake', 'Caramel Apple Cake'],
        ['Bacon Vinegrette', 'Bacon Vinaigrette'],
        ['Citrus Vinnegrette', 'Citrus Vinaigrette'],
        ['Roasted Shallott', 'Roasted Shallot'],
        ['Piccatta Sauce', 'Piccata Sauce'],
        ['1 tyb', '1 tub'],
    ])('%s → %s', (from, to) => {
        expect(fixTypos(from)).toBe(to)
    })

    it('leaves correct words and parts of words alone', () => {
        expect(fixTypos('Caramelized Onion')).toBe('Caramelized Onion')
        expect(fixTypos('Shallot Vinaigrette')).toBe('Shallot Vinaigrette')
    })
})

describe('parsePrepRows on the real Fall 26 sheets', () => {
    it('Fry has no section rows: one unnamed section of 27 items', () => {
        const sections = toSections(linesOf('Fry'))
        expect(shape(sections)).toEqual([[null, 27]])
        expect(sections[0].items[0]).toEqual({ name: 'Tempura Shrimp', parText: '1cs', qty: 1, unit: 'cs', unparsed: false })
        expect(sections[0].items.at(-1)).toMatchObject({ name: 'Bakers', qty: 12, unit: 'ea' })
    })

    it('Grill: 3 sections, 12 items once Peppernata reads as an item', () => {
        expect(shape(toSections(linesOf('Grill')))).toEqual([['Protein', 8], ['Sauces', 2], ['Garnish', 2]])
        const salmon = toSections(linesOf('Grill'))[0].items.find(i => i.name === '7 oz Faroe Salmon')
        expect(salmon).toEqual({ name: '7 oz Faroe Salmon', parText: '20 ea', qty: 20, unit: 'ea', unparsed: false })
    })

    it('Peppernata is read as an item because a section must have items under it', () => {
        const pepper = linesOf('Grill').find(l => l.name === 'Peppernata')
        expect(pepper).toMatchObject({ kind: 'item', blankPar: true, qty: null })
        expect(toSections(linesOf('Grill'))[1].items.map(i => i.name)).toEqual(['Olive Tapenade', 'Peppernata'])
    })

    it('Lunch: 6 sections, 63 items', () => {
        const sections = toSections(linesOf('Lunch'))
        expect(shape(sections)).toEqual([
            ['Cooler', 17], ['Sauces', 19], ['Bread', 9], ['Cheese', 8], ['Protein', 8], ['Soups', 2],
        ])
        const burger = sections[4].items.find(i => i.name === 'Burger 4 oz')
        expect(burger).toMatchObject({ parText: '2 1/3 pans', qty: 2, unit: '1/3 pan' })
        expect(sections[0].items.map(i => i.name)).toContain('Brussels')
    })

    it('Salad: Citrus Vinaigrette needs the office flip; then 5 sections, 51 items', () => {
        const lines = linesOf('Salad')
        // Default: it sits exactly like a section header (blank par, an item with a par right after it).
        expect(lines.find(l => l.name === 'Citrus Vinaigrette')).toMatchObject({ kind: 'section', blankPar: true })
        expect(lines.find(l => l.name === 'Roasted Shallot')).toMatchObject({ kind: 'item', blankPar: true })

        const sections = toSections(flipToItems(lines, ['Citrus Vinaigrette']))
        expect(shape(sections)).toEqual([
            ['Greens', 3], ['Refrigeration', 23], ['Dressings', 13], ['Dry', 9], ['Desserts', 3],
        ])
        const dressings = sections[2].items.map(i => i.name)
        expect(dressings.slice(-3)).toEqual(['Roasted Shallot', 'Citrus Vinaigrette', 'Spicy Mayo'])
        expect(sections[1].items.find(i => i.name === 'Seaweed Salad')).toMatchObject({ parText: '1 tub', qty: 1, unit: 'tub' })
        expect(sections[1].items.find(i => i.name === 'Fruit (Whatever we have in house)'))
            .toMatchObject({ parText: '2 qts/ea.', qty: 2, unit: 'qt' })
    })

    it('Sautee: 4 sections, 19 items', () => {
        const sections = toSections(linesOf('Sautee'))
        expect(shape(sections)).toEqual([
            ['Garnish and Grab', 7], ['Pasta Prep', 3], ['Veggies', 3], ['Sauce and Misc', 6],
        ])
        expect(sections[2].items.find(i => i.name === 'Broccoli')).toMatchObject({ qty: 2, unit: '1/3 pan' })
        expect(sections[3].items.map(i => i.name)).toContain('Piccata Sauce')
    })

    it('172 items across the five sheets, none unparsed', () => {
        const all = Object.keys(FILES).flatMap(station => {
            const lines = station === 'Salad' ? flipToItems(linesOf(station), ['Citrus Vinaigrette']) : linesOf(station)
            return toSections(lines).flatMap(s => s.items)
        })
        expect(all).toHaveLength(172)
        expect(all.filter(i => i.unparsed)).toEqual([])
        // The only three items with no par on paper.
        expect(all.filter(i => i.qty == null).map(i => i.name)).toEqual(['Peppernata', 'Roasted Shallot', 'Citrus Vinaigrette'])
    })
})

describe('parsePrepRows edge cases', () => {
    // A minimal sheet: title row, day row, header row, then lines.
    const HEADER = [['Test Station', '', 'Mon'], ['', '', 'Prep'], ['Item', 'Par', 'Prep']]

    it('skips everything up to and including the Par header row', () => {
        const lines = parsePrepRows([...HEADER, ['Salmon', '20 ea']])
        expect(lines).toEqual([
            { kind: 'item', name: 'Salmon', parText: '20 ea', qty: 20, unit: 'ea', blankPar: false, unparsed: false },
        ])
    })

    it('flags par text it cannot read, and keeps the line', () => {
        const [line] = parsePrepRows([...HEADER, ['Mystery', 'some']])
        expect(line).toMatchObject({ kind: 'item', name: 'Mystery', parText: 'some', qty: null, unparsed: true })
    })

    it('ignores rows with no name, trims names and drops a trailing colon on sections', () => {
        const lines = parsePrepRows([...HEADER, ['Desserts:', ''], ['', '3 ea'], ['  Blondie  ', '6']])
        expect(lines.map(l => [l.kind, l.name])).toEqual([['section', 'Desserts'], ['item', 'Blondie']])
    })

    it('a blank-par last row is an item, since nothing can follow a section there', () => {
        const lines = parsePrepRows([...HEADER, ['Sauces', ''], ['Marinara', '2 G'], ['Peppernata', '']])
        expect(lines.map(l => l.kind)).toEqual(['section', 'item', 'item'])
    })

    it('throws a clear error when the sheet has no Par header', () => {
        expect(() => parsePrepRows([['Salmon', '20 ea']])).toThrow(/Par/)
    })
})

describe('setLineKind / toSections', () => {
    const lines = [
        { kind: 'item', name: 'A', parText: '1 ea', qty: 1, unit: 'ea', blankPar: false, unparsed: false },
        { kind: 'section', name: 'S', parText: '', qty: null, unit: null, blankPar: true, unparsed: false },
        { kind: 'item', name: 'B', parText: '2 ea', qty: 2, unit: 'ea', blankPar: false, unparsed: false },
    ]

    it('returns a new array and leaves the original untouched', () => {
        const flipped = setLineKind(lines, 1, 'item')
        expect(flipped).not.toBe(lines)
        expect(lines[1].kind).toBe('section')
        expect(flipped[1].kind).toBe('item')
    })

    it('only blank-par rows can be flipped', () => {
        expect(setLineKind(lines, 0, 'section')).toBe(lines)
    })

    it('items before the first section go in an unnamed section; empty sections are dropped', () => {
        expect(shape(toSections(lines))).toEqual([[null, 1], ['S', 1]])
        expect(shape(toSections([...lines, { ...lines[1], name: 'Empty' }]))).toEqual([[null, 1], ['S', 1]])
    })
})

describe('toUploadPayload', () => {
    it('flattens sections into the rows prep_replace_station takes, in sheet order', () => {
        const payload = toUploadPayload(toSections(linesOf('Grill')))
        expect(payload).toHaveLength(12)
        expect(payload[0]).toEqual({
            section: 'Protein', name: '10 oz NY Strip Steak', par_text: '8 ea', par_qty: 8, par_unit: 'ea',
        })
        expect(payload.find(r => r.name === 'Peppernata')).toEqual({
            section: 'Sauces', name: 'Peppernata', par_text: '', par_qty: null, par_unit: null,
        })
        expect(payload.at(-1)).toMatchObject({ section: 'Garnish', name: 'Lemon Halves' })
    })

    it('items before any section have a null section (Fry)', () => {
        const payload = toUploadPayload(toSections(linesOf('Fry')))
        expect(payload).toHaveLength(27)
        expect(new Set(payload.map(r => r.section))).toEqual(new Set([null]))
    })

    it('an unreadable par is sent as text only, with no qty or unit', () => {
        const lines = parsePrepRows([['T'], ['Item', 'Par'], ['Mystery', 'some']])
        expect(toUploadPayload(toSections(lines))).toEqual([
            { section: null, name: 'Mystery', par_text: 'some', par_qty: null, par_unit: null },
        ])
    })
})

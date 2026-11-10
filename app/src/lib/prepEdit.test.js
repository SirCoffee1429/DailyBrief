import { describe, it, expect } from 'vitest'
import { moveItem, moveSection, insertItem, orderUpdates, parPatch } from './prepEdit.js'

// A station in sheet order: two items before any section, then Garnish (2), then Sauces (2).
const item = (id, section, sort_order) => ({ id, station_id: 'st', name: `Item ${id}`, section, sort_order })
const items = [
    item('a', null, 0), item('b', null, 1),
    item('c', 'Garnish', 2), item('d', 'Garnish', 3),
    item('e', 'Sauces', 4), item('f', 'Sauces', 5),
]
const ids = list => list.map(i => i.id).join('')

describe('moveItem', () => {
    it('swaps with its neighbour in the same section', () => {
        expect(ids(moveItem(items, 'd', -1))).toBe('abdcef')
        expect(ids(moveItem(items, 'e', 1))).toBe('abcdfe')
    })

    it('never crosses into another section', () => {
        expect(ids(moveItem(items, 'c', -1))).toBe('abcdef')
        expect(ids(moveItem(items, 'd', 1))).toBe('abcdef')
        expect(ids(moveItem(items, 'a', -1))).toBe('abcdef')
    })

    it('does not change the list it was given', () => {
        moveItem(items, 'd', -1)
        expect(ids(items)).toBe('abcdef')
    })
})

describe('moveSection', () => {
    it('moves a whole section past its neighbour', () => {
        expect(ids(moveSection(items, 2, -1))).toBe('abefcd')
        expect(ids(moveSection(items, 1, 1))).toBe('abefcd')
        expect(ids(moveSection(items, 0, 1))).toBe('cdabef')
    })

    it('stays put at either end', () => {
        expect(ids(moveSection(items, 0, -1))).toBe('abcdef')
        expect(ids(moveSection(items, 2, 1))).toBe('abcdef')
    })
})

describe('insertItem', () => {
    it('goes in at the end of its section', () => {
        expect(ids(insertItem(items, item('x', 'Garnish')))).toBe('abcdxef')
        expect(ids(insertItem(items, item('x', null)))).toBe('abxcdef')
    })

    it('a new section starts at the bottom', () => {
        expect(ids(insertItem(items, item('x', 'Dressings')))).toBe('abcdefx')
    })
})

describe('orderUpdates', () => {
    it('numbers the lines 0, 1, 2… and returns only the ones that changed', () => {
        const updates = orderUpdates(moveItem(items, 'd', -1))
        expect(updates).toEqual([
            { id: 'd', station_id: 'st', name: 'Item d', sort_order: 2 },
            { id: 'c', station_id: 'st', name: 'Item c', sort_order: 3 },
        ])
        expect(orderUpdates(items)).toEqual([])
    })
})

describe('parPatch', () => {
    const salmon = { par_unit: 'ea', have: 12 }

    it('a new amount in the same unit keeps the count', () => {
        expect(parPatch(salmon, '24 ea')).toEqual({ patch: { par_text: '24 ea', par_qty: 24, par_unit: 'ea' }, unparsed: false })
    })

    it('a different unit clears the count (it no longer means anything)', () => {
        expect(parPatch(salmon, '2 qts').patch).toEqual({ par_text: '2 qts', par_qty: 2, par_unit: 'qt', have: null })
    })

    it('blank means no par; text it cannot read is kept but flagged', () => {
        expect(parPatch(salmon, '  ')).toEqual({ patch: { par_text: '', par_qty: null, par_unit: null, have: null }, unparsed: false })
        expect(parPatch({ par_unit: null, have: 3 }, 'lots')).toEqual({
            patch: { par_text: 'lots', par_qty: null, par_unit: null }, unparsed: true,
        })
    })
})

// Office Setup editing: the pure rules for reordering a station's lines and changing a par (spec/prep-sheets.md).
// Every function takes one station's active items in sheet order and returns a new list; nothing is changed in place.
import { parsePar, groupBySection } from './prepSheets.js'

// Moves an item one place up (-1) or down (+1) within its own section. At a section's edge it stays put.
export function moveItem(items, id, dir) {
    const from = items.findIndex(i => i.id === id)
    const to = from + dir
    if (from < 0 || to < 0 || to >= items.length || items[to].section !== items[from].section) return items
    const next = [...items]
    ;[next[from], next[to]] = [next[to], next[from]]
    return next
}

// Moves a whole section (by its position among the station's sections) past its neighbour.
export function moveSection(items, groupIndex, dir) {
    const groups = groupBySection(items)
    const to = groupIndex + dir
    if (to < 0 || to >= groups.length) return items
    const next = [...groups]
    ;[next[groupIndex], next[to]] = [next[to], next[groupIndex]]
    return next.flatMap(g => g.items)
}

// A new item goes in at the end of its section; a section the station doesn't have yet starts at the bottom.
export function insertItem(items, item) {
    const last = items.findLastIndex(i => i.section === item.section)
    if (last < 0) return [...items, item]
    return [...items.slice(0, last + 1), item, ...items.slice(last + 1)]
}

// The rows to save after a reorder: lines numbered 0, 1, 2… in order, only those whose number changed. Each row
// carries station_id and name so it can be saved in one upsert (they are what the row already holds).
export function orderUpdates(items) {
    return items
        .map((i, index) => ({ id: i.id, station_id: i.station_id, name: i.name, sort_order: index, was: i.sort_order }))
        .filter(row => row.sort_order !== row.was)
        .map(({ was, ...row }) => row)
}

// A par edit → the columns to save, read the same way as an upload. If the par's unit changes, the count no longer
// means anything and is cleared (the upload does the same). `unparsed`: text was given but can't be read (no color).
export function parPatch(item, text) {
    const parText = String(text ?? '').trim()
    const par = parsePar(parText)
    const patch = { par_text: parText, par_qty: par?.qty ?? null, par_unit: par?.unit ?? null }
    if (patch.par_unit !== (item.par_unit ?? null)) patch.have = null
    return { patch, unparsed: parText !== '' && !par }
}

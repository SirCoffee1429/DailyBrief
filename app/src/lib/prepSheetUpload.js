// Station prep sheets: reading an uploaded .xls/.xlsx prep sheet into preview lines (spec/prep-sheets.md).
// Kept apart from lib/prepSheets.js so SheetJS loads only on the office upload page, never on the crew's sheet.
import * as XLSX from 'xlsx'
import { parsePar } from './prepSheets.js'

// Misspellings on the Fall 26 sheets, fixed on load (whole words only, first-letter case kept).
const TYPO_FIXES = {
    brussles: 'brussels',
    sticy: 'sticky',
    seasame: 'sesame',
    carmel: 'caramel',
    vinegrette: 'vinaigrette',
    vinnegrette: 'vinaigrette',
    shallott: 'shallot',
    piccatta: 'piccata',
    tyb: 'tub',
}
const TYPO_PATTERN = new RegExp(`\\b(${Object.keys(TYPO_FIXES).join('|')})\\b`, 'gi')

// A season (and optional year) at the end of a file name: "Fry fall 26" → "Fry".
const SEASON_SUFFIX = /\s+(spring|summer|fall|autumn|winter)(\s+\d+)?$/i

// Fixes the known misspellings in a name or par.
export function fixTypos(text) {
    return text.replace(TYPO_PATTERN, word => {
        const fixed = TYPO_FIXES[word.toLowerCase()]
        return word[0] === word[0].toUpperCase() ? fixed[0].toUpperCase() + fixed.slice(1) : fixed
    })
}

// Suggests the station name from the file name. The office can still change it before confirming.
export function stationNameFromFile(fileName) {
    const base = fileName.replace(/\.[^.]+$/, '').replace(SEASON_SUFFIX, '').trim()
    return base ? base[0].toUpperCase() + base.slice(1) : base
}

// File bytes → the rows of its first sheet that has anything on it, as displayed text.
export function readPrepFile(data) {
    const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data
    const workbook = XLSX.read(bytes, { type: 'array' })
    const sheetName = workbook.SheetNames.find(name => workbook.Sheets[name]['!ref'])
    if (!sheetName) throw new Error('This spreadsheet is empty.')
    return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '', blankrows: false, raw: false })
}

// Sheet rows → preview lines, one per named row after the "Par" header.
// A row with a par is an item. A row with a BLANK par is a section header only if the next line
// has a par (a section needs something under it); otherwise it is an item with no par.
// The sheets can't tell these apart for sure, so every blank-par line is flippable in the preview.
export function parsePrepRows(rows) {
    const headerIndex = rows.findIndex(row => cellText(row, 1).toLowerCase() === 'par')
    if (headerIndex === -1) throw new Error('No "Par" column header found. Is this a station prep sheet?')

    const named = rows.slice(headerIndex + 1)
        .map(row => ({ name: fixTypos(cellText(row, 0)), parText: fixTypos(cellText(row, 1)) }))
        .filter(row => row.name)

    return named.map((row, i) => {
        if (!row.parText) {
            const next = named[i + 1]
            const isSection = Boolean(next && next.parText)
            return {
                kind: isSection ? 'section' : 'item',
                name: isSection ? row.name.replace(/:$/, '').trim() : row.name,
                parText: '', qty: null, unit: null, blankPar: true, unparsed: false,
            }
        }
        const par = parsePar(row.parText)
        return {
            kind: 'item', name: row.name, parText: row.parText,
            qty: par?.qty ?? null, unit: par?.unit ?? null, blankPar: false, unparsed: !par,
        }
    })
}

// The office's Section/Item toggle: a new lines array with one blank-par line flipped.
export function setLineKind(lines, index, kind) {
    if (!lines[index]?.blankPar) return lines
    return lines.map((line, i) => (i === index ? { ...line, kind } : line))
}

// Preview lines → sections of items, in sheet order. Items before any section go in an unnamed
// section; a section with nothing under it is dropped (sections are only a label on their items).
export function toSections(lines) {
    const sections = []
    let current = { name: null, items: [] }
    for (const line of lines) {
        if (line.kind === 'section') {
            sections.push(current)
            current = { name: line.name, items: [] }
            continue
        }
        const { name, parText, qty, unit, unparsed } = line
        current.items.push({ name, parText, qty, unit, unparsed })
    }
    sections.push(current)
    return sections.filter(section => section.items.length > 0)
}

// One cell as trimmed text ('' when missing).
function cellText(row, col) {
    return String(row?.[col] ?? '').trim()
}

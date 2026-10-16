// Prints the SQL that loads one seasonal recipe book into public.house_recipes.
//
//   node scripts/recipe-book-sql.mjs "../seasonal-recipes/fall_recipe_book/Fall Banquet Recipe Book.pdf" fall > fall.sql
//
// Run it, read the SQL, then apply it to the database (re-running replaces each recipe's
// text). Written for the books' fixed layout: a Contents page with dot leaders lists
// every recipe title, each recipe starts on a line that is exactly its title, and its
// sections are letter-spaced labels (Y I E L D, I N G R E D I E N T S, M E T H O D).
// Each recipe is kept from its title up to its method — the part the dish drafter reads.
// A recipe with no ingredient list stops the script rather than loading half a recipe;
// a Contents entry it cannot find is named on stderr, so check that list.
import { readFileSync } from 'node:fs'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'

const SEASONS = ['spring', 'summer', 'fall', 'winter']
const [pdfPath, season] = process.argv.slice(2)
if (!pdfPath || !SEASONS.includes(season)) {
    console.error(`usage: node scripts/recipe-book-sql.mjs <book.pdf> <${SEASONS.join('|')}>`)
    process.exit(1)
}

// Every text line of the book, in reading order, with the running page header and the
// bare page numbers removed so an ingredient list that crosses a page stays one list.
async function bookLines(path) {
    const pdf = await getDocument({ data: new Uint8Array(readFileSync(path)) }).promise
    const lines = []
    for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p)
        const { items } = await page.getTextContent()
        let line = ''
        for (const item of items) {
            line += item.str
            if (item.hasEOL) { lines.push(line); line = '' }
        }
        if (line) lines.push(line)
    }
    return lines
        .map(l => l.replace(/\s+$/, ''))
        .filter(l => l.trim() && !letters(l).startsWith('OLDHAWTHORNE|') && !/^\d+$/.test(l.trim()))
}

// The books' letter-spaced labels ("O N  T H E  P L A T E"). pdfjs does not keep the
// wider gap between words, so a label is recognised by its letters alone and printed
// in its plain form.
const LABELS = ['YIELD', 'USED ON', 'ALLERGENS', 'ON THE PLATE', 'INGREDIENTS', 'METHOD', 'PREP-AHEAD TIMELINE', "CHEF'S NOTES"]
function letters(s) { return s.replace(/\s+/g, '') }
function unspace(line) {
    return LABELS.find(label => letters(label) === letters(line)) ?? line
}

const squash = s => s.replace(/\s+/g, ' ').trim()
const STOP_AT = ['METHOD', 'PREP-AHEAD TIMELINE', "CHEF'S NOTES"]

const lines = (await bookLines(pdfPath)).map(unspace)
const titles = lines.map(l => l.match(/^(.+?)\s*\.{5,}\s*\d+$/)).filter(Boolean).map(m => squash(m[1]))
if (titles.length === 0) throw new Error('No Contents page found (no dot-leader lines).')

// Where each Contents entry starts in the body: the first line, past the Contents page,
// that is exactly its title. Section entries ("Starters", "Allergen Chart") print as
// letter-spaced banners or not at all, so an entry with no such line is listed as not
// loaded — read that list: a recipe whose title wraps onto two lines would land there.
const contentsEnd = lines.findLastIndex(l => /\.{5,}\s*\d+$/.test(l))
const skipped = []
const starts = titles.map(title => {
    const at = lines.findIndex((l, i) => i > contentsEnd && squash(l) === title)
    if (at < 0) skipped.push(title)
    return { title, at }
}).filter(s => s.at >= 0).sort((a, b) => a.at - b.at)

const recipes = []
starts.forEach(({ title, at }, n) => {
    const block = lines.slice(at, n + 1 < starts.length ? starts[n + 1].at : lines.length)
    // Section openers in the Contents ("Starters", "Allergen Chart") have no yield.
    if (!block.some(l => squash(l) === 'YIELD')) { skipped.push(title); return }
    const stop = block.findIndex(l => STOP_AT.includes(squash(l)))
    const kept = stop > 0 ? block.slice(0, stop) : block
    if (!kept.some(l => squash(l) === 'INGREDIENTS')) throw new Error(`"${title}" has no INGREDIENTS before its method.`)
    recipes.push({ title, text: kept.join('\n') })
})

const sourceFile = pdfPath.replace(/\\/g, '/').replace(/^(\.\.\/)+/, '')
const quote = s => {
    if (s.includes('$recipe$')) throw new Error('Recipe text contains the SQL quote tag $recipe$.')
    return `$recipe$${s}$recipe$`
}

console.error(`${recipes.length} recipes loaded. Contents entries NOT loaded: ${skipped.join(' | ') || 'none'}`)
console.log('insert into public.house_recipes (season, title, recipe_text, source_file) values')
console.log(recipes.map(r => `(${quote(season)}, ${quote(r.title)}, ${quote(r.text)}, ${quote(sourceFile)})`).join(',\n'))
console.log('on conflict (season, title) do update set recipe_text = excluded.recipe_text, source_file = excluded.source_file;')

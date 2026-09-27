// Checks that process-menu's prompt assembles correctly, against the REAL source file.
// Run: deno test --allow-read supabase/functions/process-menu/prompt_test.ts
//
// It slices the prompt constants and assembled() out of index.ts and evaluates them
// instead of retyping them — a retyped copy proves the copy, not what ships. The
// function already throws at runtime if the anchor goes missing; this catches the
// quieter failures that would still assemble: a rule dropped, renumbered out of order,
// or a source-specific section spliced into the wrong place.
//
// Not bundled on deploy: only what index.ts imports is shipped.

const src = await Deno.readTextFile(new URL('./index.ts', import.meta.url))
const start = src.indexOf('const PROMPT_CORE')
const end = src.indexOf('// Coerce one model-emitted dish')
if (start < 0 || end < 0) throw new Error('could not find the prompt section in index.ts')

const mod = await import('data:application/typescript,' + encodeURIComponent(
    src.slice(start, end) + '\nexport { assembled, PROMPT_PDF_LAYOUT, PROMPT_DOCX_STRUCTURE }'))

function expect(ok: boolean, message: string) {
    if (!ok) throw new Error(message)
}

// Each rule's opening words, in the order they must appear. Rule 2 is the swapped-in
// source section, so it is checked separately per source.
const RULE_ORDER = [
    '1. UPCHARGE',
    '3. base_price BUYS',
    '4. A PER-ITEM MINIMUM',
    '5. "STARTING AT"',
    '6. DO NOT EMIT NON-DISHES',
    '7. DEDUPE ONLY WITHIN A SECTION',
    '8. "Specialty Cheesecake"',
    '9. Fix mangled ligatures',
    '10. A NAMED PACKAGE',
    '11. SPLIT "A OR B"',
    '12. Do not wrap',
]

for (const [source, rules] of [['PDF', mod.PROMPT_PDF_LAYOUT], ['Word', mod.PROMPT_DOCX_STRUCTURE]] as const) {
    Deno.test(`${source} prompt carries every rule, in order`, () => {
        const prompt: string = mod.assembled(rules)
        const at = RULE_ORDER.map(r => prompt.indexOf(r))
        RULE_ORDER.forEach((r, i) => expect(at[i] >= 0, `missing rule: ${r}`))
        at.forEach((pos, i) => expect(i === 0 || pos > at[i - 1], `out of order: ${RULE_ORDER[i]}`))
    })

    Deno.test(`${source} source rules land as rule 2, between rules 1 and 3`, () => {
        const prompt: string = mod.assembled(rules)
        const rule2 = prompt.indexOf(rules.trim().slice(0, 40))
        expect(rule2 > prompt.indexOf('1. UPCHARGE'), 'source rules come before rule 1')
        expect(rule2 < prompt.indexOf('3. base_price BUYS'), 'source rules come after rule 3')
    })

    Deno.test(`${source} prompt offers every price unit the table allows`, () => {
        const prompt: string = mod.assembled(rules)
        // Must match the menu_dishes_price_unit_check constraint.
        expect(prompt.includes('"each"|"person"|"dozen"|"tray"|"piece"|"lb"|null'), 'unit list drifted')
    })
}

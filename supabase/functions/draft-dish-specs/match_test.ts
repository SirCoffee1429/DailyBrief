// Checks the product-number cross-check in draft-dish-specs, against the REAL source file.
// Run: deno test --allow-read supabase/functions/draft-dish-specs/match_test.ts
//
// It slices words()/describesProduct() out of index.ts and evaluates them instead of
// retyping them — a retyped copy proves the copy, not what ships (same approach as
// process-menu/prompt_test.ts). Cases are real catalog rows and the real miscopies the
// model made on 2026-10-01. Not bundled on deploy: only what index.ts imports ships.

const src = await Deno.readTextFile(new URL('./index.ts', import.meta.url))
const start = src.indexOf('function words(')
const end = src.indexOf('// end of match helpers')
if (start < 0 || end < 0) throw new Error('could not find the match helpers in index.ts')

const { describesProduct } = await import('data:application/typescript,' + encodeURIComponent(
    src.slice(start, end) + '\nexport { describesProduct }'))

const WATERMELON = { description: 'WATERMELON SEEDLESS', brand: null, custom_description: null }
const PEACH = { description: 'PEACH TRAY-PACK', brand: null, custom_description: null }
const SQUASH = { description: 'SQUASH BUTTERNUT DICED 3/4 IN CUT', brand: null, custom_description: null }
const SALMON = {
    description: 'SALMON PORTION 6 OUNCE BONELESS_SKINLESS INDIVIDUAL VACUUM-PACKED FROZEN FAROE ISLAND FARM RAISED',
    brand: null, custom_description: null,
}

function expect(ok: boolean, message: string) {
    if (!ok) throw new Error(message)
}

Deno.test('a miscopied number landing on a real but different product is rejected', () => {
    expect(!describesProduct('WATERMELON SEEDLESS', PEACH), 'watermelon described, peach numbered: must reject')
    expect(!describesProduct('WATERMELON SEEDLESS', SQUASH), 'watermelon described, squash numbered: must reject')
})

Deno.test('a correct pick passes, copied exactly, truncated, or reworded in order', () => {
    expect(describesProduct('WATERMELON SEEDLESS', WATERMELON), 'exact copy must pass')
    expect(describesProduct('SALMON PORTION 6 OUNCE BONELESS_SKINLESS', SALMON), 'a truncated copy must pass')
    expect(describesProduct('Seedless watermelon', WATERMELON), 'case and word order must not matter')
})

// PFG numbers the sizes of one item next to each other (#252175 30-40, #252182 60-80), so
// the likeliest miscopy lands on a sibling that shares every word but its numbers — 10 of
// 12 words, which the word share alone passed (found by review, 2026-10-03).
Deno.test('a miscopy onto a sibling size of the same item is rejected', () => {
    const S3040 = { description: 'SCALLOP 30-40 INDIVIDUALLY_QUICK_FROZEN CHINA_ABBREV FARM RAISED PRODUCT OF CHINA', brand: null, custom_description: null }
    const S6080 = { description: 'SCALLOP 60-80 INDIVIDUALLY_QUICK_FROZEN CHINA_ABBREV FARM RAISED PRODUCT OF CHINA', brand: null, custom_description: null }
    expect(!describesProduct(S3040.description, S6080), '30-40 described, 60-80 numbered: must reject')
    expect(describesProduct(S3040.description, S3040), '30-40 described, 30-40 numbered: must pass')
    const WONTON = { description: 'WRAPPER WONTON  4X4" THICK FROZEN', brand: null, custom_description: null }
    expect(!describesProduct('WRAPPER WONTON 3X3" THICK FROZEN', WONTON), 'a different size code must reject')
    expect(describesProduct('WRAPPER WONTON 4X4" THICK FROZEN', WONTON), 'the same size code must pass')
})

Deno.test('a missing description fails closed', () => {
    expect(!describesProduct('', WATERMELON), 'empty description must reject')
    expect(!describesProduct('  |  ', WATERMELON), 'punctuation only must reject')
})

Deno.test('the custom description and brand count as the product', () => {
    const custom = { description: 'CHEESE PARMESAN SHREDDED', brand: 'BELGIOIOSO', custom_description: 'HOUSE PARM' }
    expect(describesProduct('HOUSE PARM / CHEESE PARMESAN SHREDDED', custom), 'the catalog line as printed must pass')
    expect(describesProduct('BELGIOIOSO PARMESAN', custom), 'brand words must count')
})

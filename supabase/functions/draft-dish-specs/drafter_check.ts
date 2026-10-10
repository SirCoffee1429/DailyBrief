// Measures the ingredient drafter (mode "ingredients") against the DEPLOYED function, so it
// scores what ships, not a copy. Run from the repo root:
//   deno run --allow-net --allow-read supabase/functions/draft-dish-specs/drafter_check.ts [runs=5] [batch=4]
//
// Why it exists: the drafter read its EXISTING NAMES list as the only foods allowed and
// swapped (lamb -> pork tenderloin, halibut -> salmon), coining 0 new names in the bad runs
// (v8, 2026-10-08). Every dish below names foods that were NOT on the list then, beside a
// tempting neighbour that WAS. One run proves nothing — the same input came back 0, 30 and 0
// of 36 — so it runs several. parseOnly writes nothing; it does call Gemini (~12s a batch).
//
// Scored per run: named foods kept, known swaps (any swap fails), existing names reused, and
// how many new names were coined (0 is the closed-list tell). Measured on set A: v8 0/30/0
// of 36 with 7-8 swaps; v10 32-35 of 36 with 0-2 swaps (pecans -> walnuts, said in the note).
//
// parseOnly SKIPS a confirmed dish, so as P3 goes on these dishes drop out — the check names
// them; replace each with an unspecced dish that names foods not yet on the list. Keep the
// prompt's own examples OUT of these dishes or this measures memorising (Dijon is in rule 11
// at the owner's word, so the lamb's Dijon is no longer a blind test).
// Not bundled on deploy: only what index.ts imports ships.

type Dish = { name: string, named: string[][], swaps?: string[], reuse?: string[] }

// Foods the description names (any spelling in the inner list passes), swaps seen in v8,
// and names already on the list that the same food must keep.
const SET_A: Record<string, Dish> = {
    '09250c19-dbcf-48ad-9b63-7ab8cec301a1': { name: 'Arugula Salad', named: [['arugula'], ['pecan'], ['mint'], ['parsley']], swaps: ['walnut'], reuse: ['goat cheese', 'grapes'] },
    '9fc91753-bca0-416a-97bb-1935bab791ba': { name: 'Chopped Cobb', named: [['blue cheese', 'bleu']], reuse: ['mixed greens', 'bacon', 'croutons', 'ranch dressing'] },
    'ce590085-0ff9-4aea-ac3d-6347ec78274e': { name: 'Peach & Burrata', named: [['arugula'], ['peach'], ['almond'], ['goddess']], swaps: ['peach cobbler'] },
    '5d2d2b84-837b-4855-bfe3-abf335c397d5': { name: 'Rack of Lamb', named: [['lamb'], ['breadcrumb', 'bread crumb', 'panko'], ['dijon']], swaps: ['pork', 'breadstick', 'grain mustard'] },
    'aae64237-8287-41ed-8e3f-88c9c0745db4': { name: 'Chicken Marsala', named: [['marsala'], ['polenta', 'cornmeal']], reuse: ['chicken breast', 'mushroom'] },
    'beab26a5-ad53-4fd1-a369-5dcadce9a589': { name: 'Halibut', named: [['halibut'], ['leek'], ['orange'], ['mint'], ['cayenne']], swaps: ['salmon'] },
    'df15137f-c255-4331-bfe3-c9007ebeb82f': { name: 'Caesar', named: [['pecorino']], reuse: ['romaine lettuce', 'caesar dressing'] },
    'd4654533-9077-4454-a92a-290daeb10dd7': { name: 'Brussel Sprout Salad', named: [['brussel'], ['cranberr'], ['red onion']], swaps: ['broccoli', 'raspberry', 'raspberries'], reuse: ['feta cheese', 'honey', 'balsamic vinegar'] },
    '5ab20b3d-85f8-47de-896d-715e34ed0e0d': { name: 'Wedge', named: [['iceberg'], ['blue cheese', 'bleu'], ['red onion']], reuse: ['bacon', 'ranch dressing'] },
    '7aa393b2-49af-4e98-9024-3bd443d92f9d': { name: 'Truffle Risotto', named: [['arborio'], ['pecorino'], ['leek']] },
    'd11d7d26-97af-471e-9bb7-fffb5959bd40': { name: 'Lobster Bisque', named: [['lobster'], ['sherry'], ['chive']] },
    'da839caf-96ae-437e-ad53-3e67c67bdb49': { name: 'Pecan Salmon', named: [['pecan'], ['maple'], ['sweet potato'], ['green bean']], swaps: ['potato chip', 'walnut'] },
}

// Beef cuts beside the existing shoulder tender / prime rib / sirloin — the swap that reached
// real drafts on 10-08 (tenderloin -> shoulder tender, prime rib -> roast beef).
const SET_B: Record<string, Dish> = {
    'd56dde71-fe89-484e-984b-d4bcdcbc0a0a': { name: 'Center-Cut Tenderloin', named: [['tenderloin'], ['fingerling'], ['carrot']], swaps: ['shoulder tender', 'pork'], reuse: ['mushroom'] },
    '1ae231de-38ec-4a13-a783-d4311b9eff54': { name: 'Prime Ribeye', named: [['ribeye', 'rib eye'], ['corn'], ['yukon']], swaps: ['prime rib', 'shoulder tender', 'strip', 'sirloin'] },
    'e71aee88-adda-40d7-87d4-b5bf39baf7df': { name: 'Braised Short Rib', named: [['short rib'], ['acorn squash'], ['brussel'], ['pancetta']], swaps: ['brisket', 'bacon', 'shoulder tender'], reuse: ['red wine'] },
    '917ad891-5354-4e23-b768-4d501f6d0e0d': { name: 'Tenderloin & Lobster', named: [['tenderloin', 'filet'], ['lobster'], ['asparagus'], ['boursin']], swaps: ['shoulder tender', 'shrimp', 'sirloin'], reuse: ['boursin'] },
    '40d008a7-c269-40ed-b08b-90cbdb397ca3': { name: 'Pork Tenderloin', named: [['pork tenderloin'], ['leek'], ['parsnip'], ['cider']], swaps: ['pork shoulder'], reuse: ['pork tenderloin'] },
}

const PROJECT = 'https://chajwmoohmiugdgvqjyo.supabase.co'
// The app's public anon key, read from where the app keeps it rather than copied here.
const client = await Deno.readTextFile(new URL('../../../app/src/lib/supabase.js', import.meta.url))
const KEY = client.match(/eyJ[\w.-]+/)?.[0]
if (!KEY) throw new Error('could not find the anon key in app/src/lib/supabase.js')
const HEADERS = { Authorization: `Bearer ${KEY}`, apikey: KEY, 'Content-Type': 'application/json' }

async function post(path: string, body: unknown) {
    const res = await fetch(`${PROJECT}${path}`, { method: 'POST', headers: HEADERS, body: JSON.stringify(body) })
    const json = await res.json()
    if (!res.ok) throw new Error(`${path} ${res.status}: ${json.error ?? json.message ?? JSON.stringify(json)}`)
    return json
}

// The list the drafter is shown, to count the names a run coins.
const vocab = new Set<string>((await post('/rest/v1/rpc/dish_ingredient_names', {})).map((r: any) => r.ingredient_name))

function score(set: Record<string, Dish>, result: any) {
    const specs = new Map<string, string[]>((result.specs ?? []).map((s: any) => [s.dish_id, s.ingredients.map((i: any) => i.name)]))
    let kept = 0, total = 0
    const missing: string[] = [], swaps: string[] = [], lost: string[] = [], coined = new Set<string>()
    for (const [id, dish] of Object.entries(set)) {
        const names = specs.get(id)
        if (!names) continue
        // Whole words (plural allowed): "prime rib" is a swap, "prime ribeye" is the ribeye.
        const isSwap = (n: string) => (dish.swaps ?? []).some(x => new RegExp(`\\b${x}(?:s|es)?\\b`).test(n))
        // A swapped name never counts as the food it replaced ("peach cobbler" is not peaches).
        const honest = names.filter(n => !isSwap(n))
        for (const spellings of dish.named) {
            total++
            if (spellings.some(s => honest.some(n => n.includes(s)))) kept++
            else missing.push(`${dish.name}: ${spellings[0]}`)
        }
        swaps.push(...names.filter(isSwap).map(n => `${dish.name}: ${n}`))
        lost.push(...(dish.reuse ?? []).filter(r => !names.includes(r)).map(r => `${dish.name}: ${r}`))
        names.filter(n => !vocab.has(n)).forEach(n => coined.add(n))
    }
    // Absent from the output: confirmed since (parseOnly skips it), or in a batch that failed.
    const skipped = Object.entries(set).filter(([id]) => !specs.has(id)).map(([, d]) => d.name)
    return { kept, total, missing, swaps, lost, coined: coined.size, skipped }
}

// One run drafts a set in batches the size the Dish Ingredients page sends (DRAFT_BATCH in
// app/src/pages/DishSpecs.jsx) — batch size moves the result: the lamb's Dijon survived alone
// 4 of 4 times; in batches of 12, 4 of 10; of 8, 4 of 6; of 4, 12 of 12.
async function draftSet(ids: string[], batch: number) {
    const batches = []
    for (let i = 0; i < ids.length; i += batch) batches.push(ids.slice(i, i + batch))
    // A failed batch (Gemini can return malformed JSON -> 500) is reported, not fatal.
    const results = await Promise.allSettled(batches.map(dishIds =>
        post('/functions/v1/draft-dish-specs', { mode: 'ingredients', parseOnly: true, dishIds })))
    return {
        specs: results.flatMap(r => r.status === 'fulfilled' ? r.value.specs ?? [] : []),
        errors: results.flatMap(r => r.status === 'rejected' ? [String(r.reason?.message ?? r.reason)] : []),
    }
}

const runs = Number(Deno.args[0] ?? 5)
const batch = Number(Deno.args[1] ?? 4)
console.log(`${runs} runs, batches of ${batch}`)
let failed = false
for (const [label, set] of [['A', SET_A], ['B', SET_B]] as const) {
    const results = await Promise.all(Array.from({ length: runs }, () => draftSet(Object.keys(set), batch)))
    results.forEach((result, i) => {
        const s = score(set, result)
        result.errors.forEach(e => console.log(`set ${label} run ${i + 1}: BATCH FAILED ${e.slice(0, 120)}`))
        failed ||= s.swaps.length > 0
        console.log(`set ${label} run ${i + 1}: named ${s.kept}/${s.total} | swaps ${s.swaps.length} | reuse lost ${s.lost.length} | new names ${s.coined}`)
        for (const [what, list] of [['swapped', s.swaps], ['missing', s.missing], ['reuse lost', s.lost], ['not drafted (confirmed since, or batch failed)', s.skipped]] as const) {
            if (list.length) console.log(`   ${what}: ${list.join(', ')}`)
        }
    })
}
if (failed) {
    console.log('\nFAIL: at least one run swapped a named food.')
    Deno.exit(1)
}
console.log('\nPASS: no run swapped a named food.')

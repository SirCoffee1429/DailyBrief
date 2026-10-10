// Checks the one-time retry on malformed Gemini JSON in draft-dish-specs, against the REAL
// source file. Run: deno test --allow-read supabase/functions/draft-dish-specs/retry_test.ts
//
// It slices callGemini()/callGeminiOnce() out of index.ts and evaluates them instead of
// retyping them (same approach as match_test.ts), with fetch replaced by canned Gemini
// responses. Not bundled on deploy: only what index.ts imports ships.

const src = await Deno.readTextFile(new URL('./index.ts', import.meta.url))
const start = src.indexOf('const GEMINI_BUDGET_MS')
const end = src.indexOf('// end of gemini call')
if (start < 0 || end < 0) throw new Error('could not find the Gemini call in index.ts')

const { callGemini } = await import('data:application/typescript,' + encodeURIComponent(
    'const GEMINI_ENDPOINT = "https://gemini.test"; const GEMINI_KEY = "test";\n' +
    src.slice(start, end) + '\nexport { callGemini }'))

// A Gemini reply whose answer text is `text`, or an HTTP error.
const reply = (text: string) => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }))
const MALFORMED = '[{"dish_id": "a", "ingredients": [}]'

// Replaces fetch with the given replies in order, and counts the calls.
function fakeGemini(...replies: Response[]) {
    const calls = { count: 0 }
    globalThis.fetch = () => Promise.resolve(replies[calls.count++] ?? reply('[]'))
    return calls
}

function expect(ok: boolean, message: string) {
    if (!ok) throw new Error(message)
}

const realFetch = globalThis.fetch

Deno.test('a good first answer is used as is', async () => {
    const calls = fakeGemini(reply('[{"dish_id":"a"}]'))
    try {
        const out = await callGemini('prompt')
        expect(out[0].dish_id === 'a', 'parsed answer returned')
        expect(calls.count === 1, `one call, not ${calls.count}`)
    } finally { globalThis.fetch = realFetch }
})

Deno.test('malformed JSON is retried once, and the retry is used', async () => {
    const calls = fakeGemini(reply(MALFORMED), reply('[{"dish_id":"b"}]'))
    try {
        const out = await callGemini('prompt')
        expect(out[0].dish_id === 'b', 'the retry answer returned')
        expect(calls.count === 2, `two calls, not ${calls.count}`)
    } finally { globalThis.fetch = realFetch }
})

Deno.test('malformed twice fails after ONE retry, not more', async () => {
    const calls = fakeGemini(reply(MALFORMED), reply(MALFORMED), reply('[{"dish_id":"c"}]'))
    try {
        let threw = false
        try { await callGemini('prompt') } catch (err) { threw = err instanceof SyntaxError }
        expect(threw, 'a SyntaxError reaches the caller')
        expect(calls.count === 2, `two calls, not ${calls.count}`)
    } finally { globalThis.fetch = realFetch }
})

Deno.test('an API error is not retried', async () => {
    const calls = fakeGemini(new Response('bad request', { status: 400 }), reply('[{"dish_id":"d"}]'))
    try {
        let message = ''
        try { await callGemini('prompt') } catch (err) { message = String((err as Error).message) }
        expect(message.startsWith('Gemini API Error'), `API error surfaced, got "${message}"`)
        expect(calls.count === 1, `one call, not ${calls.count}`)
    } finally { globalThis.fetch = realFetch }
})

import { describe, it, expect, vi, beforeEach } from 'vitest'

// A stand-in for the Supabase client: beo_dish_matches served in pages, as PostgREST does
// (at most 1000 rows a request). Only select / order / range exist, so a read that puts
// BEO wording into the request (.in, .eq...) fails the test.
const table = { rows: [], requests: [] }
vi.mock('./supabase.js', () => ({
    supabase: {
        from(name) {
            const request = { name, ranges: [] }
            table.requests.push(request)
            const query = {
                select: () => query,
                order: () => query,
                range: (from, to) => {
                    request.ranges.push([from, to])
                    return Promise.resolve({ data: table.rows.slice(from, Math.min(to + 1, from + 1000)), error: null })
                },
            }
            return query
        },
    },
}))

const { fetchSavedMatches } = await import('./beoOrderData.js')

// A saved answer for one wording.
function answer(source_text, under_dish_id = null) {
    return { source_text, under_dish_id, kind: 'not_food', dish_id: null }
}

describe('fetchSavedMatches', () => {
    beforeEach(() => {
        table.rows = []
        table.requests = []
    })

    it('finds a wording with an inch mark and a comma (it never rides in the request)', async () => {
        table.rows = [answer('assorted 9" pies, pecan & pumpkin'), answer('bqt staff')]
        const found = await fetchSavedMatches(['assorted 9" pies, pecan & pumpkin'])
        expect(found).toEqual([answer('assorted 9" pies, pecan & pumpkin')])
    })

    it('reads past the 1000-row cap: an answer on the second page is found', async () => {
        table.rows = Array.from({ length: 1500 }, (_, i) => answer(`line ${i}`))
        const found = await fetchSavedMatches(['line 3', 'line 1499'])
        expect(found.map(m => m.source_text)).toEqual(['line 3', 'line 1499'])
        expect(table.requests.flatMap(r => r.ranges)).toEqual([[0, 999], [1000, 1999]])
    })

    it('returns pair answers too (the same wording under a dish)', async () => {
        table.rows = [answer('caesar salad'), answer('caesar salad', 'pasta'), answer('garlic bread')]
        const found = await fetchSavedMatches(['caesar salad'])
        expect(found).toEqual([answer('caesar salad'), answer('caesar salad', 'pasta')])
    })

    it('no lines, no answers', async () => {
        table.rows = [answer('bqt staff')]
        expect(await fetchSavedMatches([])).toEqual([])
    })
})

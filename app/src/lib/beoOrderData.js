import { supabase } from './supabase.js'

// Database reads and writes for "Generate from BEO" (spec/beo-order-from-specs.md). The
// logic lives in beoLines.js and beoOrderList.js; this file only moves rows. Every read
// that could be cut short checks its count, because PostgREST stops at 1000 rows without
// an error and a short dish list would quietly send real dishes to the AI.

// Names per request: each one rides in the request URL.
const KEYS_PER_REQUEST = 100

// Throws unless every row came back.
function checkComplete(what, data, count) {
    if ((data || []).length !== count) throw new Error(`Read ${(data || []).length} of ${count} ${what}`)
}

// All dishes the order list can build from: { id, name, menu_source, menu_section, season, spec_status }.
export async function fetchOrderableDishes() {
    const { data, error, count } = await supabase
        .from('orderable_menu_dishes')
        .select('id, name, menu_source, menu_section, season, spec_status', { count: 'exact' })
    if (error) throw error
    checkComplete('orderable dishes', data, count)
    return data
}

// The saved answers for these line wordings (normalised), standalone and under a dish.
export async function fetchSavedMatches(keys) {
    const matches = []
    for (let i = 0; i < keys.length; i += KEYS_PER_REQUEST) {
        const { data, error } = await supabase
            .from('beo_dish_matches')
            .select('source_text, under_dish_id, kind, dish_id')
            .in('source_text', keys.slice(i, i + KEYS_PER_REQUEST))
        if (error) throw error
        matches.push(...(data || []))
    }
    return matches
}

// The confirmed spec lines (dish_ingredients) of these dishes.
export async function fetchSpecLines(dishIds) {
    if (dishIds.length === 0) return []
    const { data, error, count } = await supabase
        .from('dish_ingredients')
        .select('dish_id, ingredient_name, sort_order', { count: 'exact' })
        .in('dish_id', dishIds)
    if (error) throw error
    checkComplete('spec lines', data, count)
    return data
}

// Saves one answer for a BEO line (a row from matchRow). Answering the same line again
// replaces it: one row per wording (and dish above it).
export async function saveMatch(row) {
    const { error } = await supabase
        .from('beo_dish_matches')
        .upsert({ ...row, confirmed_at: new Date().toISOString() }, { onConflict: 'source_text,under_dish_id' })
    if (error) throw error
}

// Replaces a BEO's generated rows (spec and AI) with these; rows added by hand stay.
export async function replaceGeneratedRows(beoId, rows) {
    const { error: deleteError } = await supabase
        .from('event_order_items')
        .delete()
        .eq('beo_id', beoId)
        .eq('is_manual', false)
    if (deleteError) throw deleteError
    if (rows.length === 0) return
    const { error: insertError } = await supabase.from('event_order_items').insert(rows)
    if (insertError) throw insertError
}

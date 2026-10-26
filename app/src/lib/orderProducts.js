import { supabase } from './supabase.js'

// The catalog product for each order-list item name, from the confirmed ingredient
// matches (Ingredient Products). Used by "Generate from BEO" and by items added by hand.
//
// The AI writes its own ingredient names, so an exact match is tried first and then the
// plain singular/plural forms: "eggs" -> "egg", "tomatoes" -> "tomato". Only if the whole
// name misses are leading prep words dropped ("unsalted butter" -> "butter"), from the
// fixed list below. Nothing looser — "onions" finds no product because the kitchen buys
// yellow, red AND green onion, and the reviewer picks, rather than the code guessing.

const NAMES_PER_REQUEST = 100

// Words that describe prep or form, not a different product. "fresh" and "whole" stay
// OUT: fresh mozzarella and the shredded kind are different products (owner, 10-25).
const PREP_WORDS = new Set(['shredded', 'unsalted', 'granulated', 'semi-sweet', 'chopped', 'diced', 'sliced', 'minced', 'grated'])

// A name and its plain singular/plural forms.
function pluralForms(name) {
    const forms = [name]
    if (name.endsWith('es')) forms.push(name.slice(0, -2))
    if (name.endsWith('s')) forms.push(name.slice(0, -1))
    forms.push(`${name}s`, `${name}es`)
    return forms
}

// The names an item can match, best first: itself and its plural forms, then the same
// with the leading prep words dropped ("semi-sweet chocolate chips" -> "chocolate chips").
function nameCandidates(itemName) {
    const name = itemName.trim().toLowerCase().replace(/\s+/g, ' ')
    const words = name.split(' ')
    let firstKept = 0
    while (firstKept < words.length - 1 && PREP_WORDS.has(words[firstKept])) firstKept++
    const forms = pluralForms(name)
    if (firstKept > 0) forms.push(...pluralForms(words.slice(firstKept).join(' ')))
    return [...new Set(forms)]
}

// Map of item name -> product_id, for the names that have a confirmed product.
// Names with no product are left out, so the caller stores null for them.
export async function productsForItemNames(itemNames) {
    const candidates = itemNames.map(n => ({ name: n, forms: nameCandidates(n) }))
    const allForms = [...new Set(candidates.flatMap(c => c.forms))]
    if (allForms.length === 0) return new Map()

    // Chunked: every name rides in the request URL, and a big BEO gives ~100 items x 5 forms.
    const productByName = new Map()
    for (let i = 0; i < allForms.length; i += NAMES_PER_REQUEST) {
        const { data, error } = await supabase
            .from('ingredient_products')
            .select('ingredient_name, product_id')
            .eq('status', 'confirmed')
            .not('product_id', 'is', null)
            .in('ingredient_name', allForms.slice(i, i + NAMES_PER_REQUEST))
        if (error) throw error
        for (const r of data || []) productByName.set(r.ingredient_name, r.product_id)
    }

    const result = new Map()
    for (const { name, forms } of candidates) {
        const hit = forms.find(f => productByName.has(f))
        if (hit) result.set(name, productByName.get(hit))
    }
    return result
}

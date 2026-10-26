import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { formatDateOnly } from '../lib/dates.js'

// Search the catalog and pick any product, including one the model never suggested
// (FR-13). Every word must match somewhere, so "breast chicken" finds "CHICKEN BREAST"
// the way a person would expect. Shared by Ingredient Products and the BEO order list.
export default function ProductPicker({ initial, busy, onPick, onCancel }) {
    const [query, setQuery] = useState(initial)
    const [results, setResults] = useState([])
    const [searching, setSearching] = useState(false)
    const [searchError, setSearchError] = useState(null)

    useEffect(() => {
        const words = query.trim().split(/\s+/).filter(Boolean).map(w => w.replace(/[%,()]/g, ' ').trim()).filter(Boolean)
        if (words.length === 0) { setResults([]); return }
        const timer = setTimeout(async () => {
            setSearching(true)
            let request = supabase
                .from('supplier_products')
                .select('id, product_number, description, brand, pack_size, case_price, base_unit, category, last_purchased_on')
                // What the kitchen actually buys comes first, most recent first; the limit
                // below would otherwise cut a bought product off behind 25 alphabetical ones.
                .order('last_purchased_on', { ascending: false, nullsFirst: false })
                .order('description')
                .limit(25)
            for (const w of words) {
                request = request.or(`description.ilike.%${w}%,brand.ilike.%${w}%,custom_description.ilike.%${w}%,product_number.ilike.%${w}%`)
            }
            const { data, error } = await request
            setSearching(false)
            if (error) { setSearchError(error.message); setResults([]); return }
            setSearchError(null)
            setResults(data || [])
        }, 250)
        return () => clearTimeout(timer)
    }, [query])

    return (
        <div className="ingredient-picker" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <input className="input" autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search the catalog" />
                <button className="btn btn-sm btn-secondary" onClick={onCancel}>Cancel</button>
            </div>
            {searching && <div className="catalog-row-lists"><span className="spinner" /> Searching...</div>}
            {searchError && <div className="dish-spec-gap">{searchError}</div>}
            {!searching && query.trim() && results.length === 0 && !searchError && (
                <div className="catalog-row-lists">No products match — try fewer or shorter words.</div>
            )}
            <div className="ingredient-picker-results">
                {results.map(p => (
                    <button key={p.id} className="ingredient-picker-result" disabled={busy} onClick={() => onPick(p)}>
                        <span>{p.description}</span>
                        <span className="catalog-row-meta">
                            #{p.product_number} · {p.pack_size}
                            {p.case_price != null && ` · $${Number(p.case_price).toFixed(2)}/case`}
                            {p.last_purchased_on && ` · bought ${formatDateOnly(p.last_purchased_on)}`}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    )
}

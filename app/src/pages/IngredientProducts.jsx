import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
import { useKeyboardReview } from '../lib/useKeyboardReview.js'
import { unitFit, fitLabel, BASIS_LABEL } from '../lib/orderUnits.js'
import { formatDateOnly } from '../lib/dates.js'

// 40 names per request against the whole catalog (~1,400 products) in the prompt.
// The edge function refuses more than 60.
const MATCH_BATCH = 40

// Each ingredient name mapped ONCE to the catalog product the kitchen buys for it.
// Phase P3. Confirm once, reuse forever (FR-12); change it any time (FR-13).
//
// A confirmed row with NO product is a real answer — "not bought from this catalog" —
// and the order list shows it as a gap with that reason instead of guessing.
export default function IngredientProducts() {
    const [rows, setRows] = useState([])
    const [filter, setFilter] = useState('draft')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [selected, setSelected] = useState(0)
    const [editingId, setEditingId] = useState(null)
    const [busy, setBusy] = useState(false)
    const [matching, setMatching] = useState(null)

    const load = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            setRows(await loadUsage())
            setSelected(0)
        } catch (err) {
            console.error('Could not load ingredient mappings:', err)
            setError(err.message)
            setRows([])
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { load() }, [load])

    const counts = {
        unmapped: rows.filter(r => !r.mapping_status).length,
        draft: rows.filter(r => r.mapping_status === 'draft').length,
        confirmed: rows.filter(r => r.mapping_status === 'confirmed').length,
    }
    // The keyboard hook keys on `id`; an ingredient's identity is its name.
    const visible = rows
        .filter(r => filter === 'all' || (filter === 'unmapped' ? !r.mapping_status : r.mapping_status === filter))
        .map(r => ({ ...r, id: r.ingredient_name }))

    async function matchUnmapped() {
        const names = rows.filter(r => !r.mapping_status).map(r => r.ingredient_name)
        setBusy(true)
        setError(null)
        try {
            const missing = []
            let written = 0
            for (let i = 0; i < names.length; i += MATCH_BATCH) {
                setMatching(`Matching ${Math.min(i + MATCH_BATCH, names.length)} of ${names.length}...`)
                const { data, error: fnError } = await supabase.functions.invoke('draft-dish-specs', {
                    body: { mode: 'products', names: names.slice(i, i + MATCH_BATCH) },
                })
                if (fnError) throw fnError
                if (data?.error) throw new Error(data.error)
                written += (data.inserted ?? 0) + (data.updated ?? 0)
                missing.push(...(data.missing ?? []))
            }
            setMatching(`${written} matched` + (missing.length ? ` · skipped by the model, try again: ${missing.join(', ')}` : ''))
        } catch (err) {
            console.error('Matching ingredients failed:', err)
            setError(`Matching stopped: ${err.message}. Matches made before this are saved.`)
            setMatching(null)
        } finally {
            setBusy(false)
            load()
        }
    }

    // Writes one mapping as the human's answer: confirmed, with the product given
    // (null = not bought from this catalog). Used by Confirm, Change and "Not from
    // catalog" alike, so every human decision lands the same way.
    async function saveMapping(row, productId, aiNote) {
        setBusy(true)
        try {
            const { error: upsertError } = await supabase
                .from('ingredient_products')
                .upsert({
                    ingredient_name: row.ingredient_name,
                    product_id: productId,
                    ai_note: aiNote,
                    status: 'confirmed',
                    confirmed_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
            if (upsertError) throw upsertError
            setEditingId(null)
            const fresh = await loadUsage()
            setRows(fresh)
        } catch (err) {
            console.error('Could not save the mapping:', err)
            setError(err.message)
        } finally {
            setBusy(false)
        }
    }

    useKeyboardReview({
        items: visible, selected, setSelected, editingId, setEditingId, busy,
        actions: {
            c: row => { if (row.mapping_status === 'draft') saveMapping(row, row.product_id, row.ai_note) },
            n: row => { if (row.mapping_status !== 'confirmed') saveMapping(row, null, row.ai_note) },
        },
    })

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Ingredient Products</h1>
                <p className="page-subtitle">
                    {rows.length} ingredients used by the dish specs — {counts.confirmed} confirmed,
                    {' '}{counts.draft} to review, {counts.unmapped} not matched yet. A confirmed match
                    is reused by every dish and never re-asked.
                </p>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-5)', flexWrap: 'wrap' }}>
                <select className="input" style={{ width: 'auto' }} value={filter} onChange={e => setFilter(e.target.value)}>
                    <option value="draft">To review ({counts.draft})</option>
                    <option value="unmapped">Not matched ({counts.unmapped})</option>
                    <option value="confirmed">Confirmed ({counts.confirmed})</option>
                    <option value="all">All ({rows.length})</option>
                </select>
                {counts.unmapped > 0 && (
                    <button className="btn btn-secondary" onClick={matchUnmapped} disabled={busy}>
                        Match {counts.unmapped} ingredient{counts.unmapped === 1 ? '' : 's'} to the catalog
                    </button>
                )}
            </div>

            {matching && <div className="page-subtitle" style={{ marginBottom: 'var(--space-4)' }}>{busy && <span className="spinner" />} {matching}</div>}

            {error && (
                <div className="badge badge-danger" style={{ display: 'block', padding: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                    {error}
                </div>
            )}

            {loading && <div className="page-subtitle"><span className="spinner" /> Loading...</div>}

            {!loading && visible.length === 0 && !error && (
                <div className="page-subtitle">
                    {rows.length === 0 ? 'No dish specs drafted yet — start on Dish Ingredients.' : 'Nothing here.'}
                </div>
            )}

            {!loading && visible.length > 0 && (
                <>
                    <div className="page-subtitle" style={{ marginBottom: 'var(--space-3)' }}>
                        j / k or ↑ ↓ to move · c to confirm the match · e to pick a different product ·
                        n for not bought from this catalog
                    </div>
                    <div className="catalog-list">
                        {visible.map((row, i) => (
                            <MappingRow
                                key={row.id}
                                row={row}
                                isSelected={i === selected}
                                isEditing={editingId === row.id}
                                busy={busy}
                                onSelect={() => setSelected(i)}
                                onEdit={() => setEditingId(row.id)}
                                onCancelEdit={() => setEditingId(null)}
                                onPick={product => saveMapping(row, product.id, `Picked by hand: ${product.description}`)}
                                onConfirm={() => saveMapping(row, row.product_id, row.ai_note)}
                                onNotFromCatalog={() => saveMapping(row, null, row.ai_note)}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}

// ingredient_usage, most-used first. Paged: PostgREST stops at 1000 rows, and an
// unpaged read would quietly show part of the list as if it were all of it.
async function loadUsage() {
    const all = []
    for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase
            .from('ingredient_usage')
            .select('*')
            .order('dish_count', { ascending: false })
            .order('ingredient_name')
            .range(from, from + 999)
        if (error) throw error
        all.push(...(data || []))
        if (!data || data.length < 1000) break
    }
    return all
}

function MappingRow({ row, isSelected, isEditing, busy, onSelect, onEdit, onCancelEdit, onPick, onConfirm, onNotFromCatalog }) {
    const rowRef = useRef(null)
    useEffect(() => {
        if (isSelected) rowRef.current?.scrollIntoView({ block: 'nearest' })
    }, [isSelected])

    // One fit per unit the ingredient is used in: "each" and "oz" against the same
    // product can have different answers, and both must work for every dish to cost.
    const fits = (row.units || []).map(u => ({ unit: u, fit: unitFit(u, row.product_id ? row : null) }))

    return (
        <div ref={rowRef} className={`catalog-row menu-dish-row ${isSelected ? 'selected' : ''}`} onClick={onSelect}>
            <div className="catalog-row-main" style={{ width: '100%' }}>
                <div className="catalog-row-name">{row.ingredient_name}</div>
                <div className="catalog-row-meta">
                    <span>used in {row.dish_count} dish{row.dish_count === 1 ? '' : 'es'}</span>
                    <span>by {(row.units || []).join(', ')}</span>
                    {row.mapping_status === 'confirmed' && !row.product_id && (
                        <span className="badge badge-warning">Not bought from this catalog</span>
                    )}
                </div>
                <DishList dishes={row.dishes || []} />

                {row.product_id && (
                    <div className="ingredient-product-pick">
                        <div>{row.product_description}</div>
                        <div className="catalog-row-meta">
                            <span>#{row.product_number}</span>
                            {row.brand && <span>{row.brand}</span>}
                            <span>{row.pack_size}</span>
                            {row.case_price != null && <span>${Number(row.case_price).toFixed(2)}/case</span>}
                            {row.price_varies && <span className="badge badge-warning">price varies</span>}
                            {row.last_purchased_on
                                ? <span>last bought {formatDateOnly(row.last_purchased_on)}</span>
                                : <span className="dish-spec-gap">no purchase on record</span>}
                        </div>
                        <div className="catalog-row-meta">
                            {fits.map(({ unit, fit }) => (
                                <span key={unit} className={fit.ok ? '' : 'dish-spec-gap'}>
                                    {unit}: {fitLabel(fit)}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
                {row.ai_note && <div className="catalog-row-lists">{row.ai_note}</div>}

                {isEditing && <ProductPicker initial={row.ingredient_name} busy={busy} onPick={onPick} onCancel={onCancelEdit} />}
            </div>
            <div className="catalog-row-price">
                <div className="menu-dish-actions">
                    {row.mapping_status === 'draft' && row.product_id && (
                        <button className="btn btn-sm btn-primary" disabled={busy} onClick={e => { e.stopPropagation(); onConfirm() }}>
                            Confirm
                        </button>
                    )}
                    {row.mapping_status === 'confirmed' && <span className="badge badge-success">Confirmed</span>}
                    {!isEditing && (
                        <button className="btn btn-sm btn-secondary" disabled={busy} onClick={e => { e.stopPropagation(); onEdit() }}>
                            {row.product_id ? 'Change' : 'Pick product'}
                        </button>
                    )}
                    {row.mapping_status !== 'confirmed' && (
                        <button className="btn btn-sm btn-secondary" disabled={busy} onClick={e => { e.stopPropagation(); onNotFromCatalog() }}>
                            Not from catalog
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

// The dishes an ingredient is for, so the reviewer can pick the product the DISH needs:
// "cheese" on a Charcuterie Board and in a Buffalo Chicken Dip are bought differently.
// The first few are shown; the rest open on demand so a pantry staple used by dozens of
// dishes does not bury the list.
const DISHES_SHOWN = 4

function DishList({ dishes }) {
    const [expanded, setExpanded] = useState(false)
    const shown = expanded ? dishes : dishes.slice(0, DISHES_SHOWN)
    const hidden = dishes.length - shown.length

    return (
        <div className="ingredient-dishes">
            {shown.map((d, i) => (
                <div key={`${d.menu}-${d.season}-${d.name}-${i}`}>
                    <span className="ingredient-dish-name">{d.name}</span>
                    {' — '}{d.season ? `${d.menu} (${d.season})` : d.menu}
                    {' · '}{Number(d.qty)} {d.unit === 'floz' ? 'fl oz' : d.unit} per {BASIS_LABEL[d.basis] || d.basis || 'serving'}
                </div>
            ))}
            {dishes.length > DISHES_SHOWN && (
                <button
                    type="button"
                    className="ingredient-dishes-more"
                    onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}
                >
                    {expanded ? 'Show fewer' : `+${hidden} more dish${hidden === 1 ? '' : 'es'}`}
                </button>
            )}
        </div>
    )
}

// Search the catalog and pick any product, including one the model never suggested
// (FR-13). Every word must match somewhere, so "breast chicken" finds "CHICKEN BREAST"
// the way a person would expect.
function ProductPicker({ initial, busy, onPick, onCancel }) {
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

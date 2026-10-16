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
    // What the open row is doing: 'product' (pick a catalog product) or 'split' (move
    // some of its dishes to another ingredient name). One editingId keeps the keyboard
    // hook paused, and Escape closing, for both.
    const [editMode, setEditMode] = useState('product')
    const [busy, setBusy] = useState(false)
    const [matching, setMatching] = useState(null)
    const [query, setQuery] = useState('')

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
    // A search looks across every status: the mistakes worth searching for are mostly
    // in confirmed rows, which the default "To review" filter hides.
    // The keyboard hook keys on `id`; an ingredient's identity is its name.
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
    const visible = rows
        .filter(r => words.length > 0
            ? words.every(w => searchText(r).includes(w))
            : filter === 'all' || (filter === 'unmapped' ? !r.mapping_status : r.mapping_status === filter))
        // The ingredient itself before rows that only match through a dish's name
        // ("eggs" before mayonnaise, used in Deviled Eggs); most-used order within each.
        .map(r => ({ r, rank: searchRank(r, words) }))
        .sort((a, b) => a.rank - b.rank)
        .map(({ r }) => ({ ...r, id: r.ingredient_name }))

    // Opens the row's product picker ('product') or its dish split ('split').
    function openEditor(row, mode) {
        setEditMode(mode)
        setEditingId(row.id)
    }

    // After a split the moved dishes live under the new name; searching for it puts
    // that row (and the one they left) in front of the reviewer to finish the job.
    async function afterSplit(newName, warning) {
        setEditingId(null)
        setQuery(newName)
        setError(warning)
        try {
            setRows(await loadUsage())
            setSelected(0)
        } catch (err) {
            console.error('Could not reload ingredient mappings:', err)
            setError(err.message)
        }
    }

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
            s: row => openEditor(row, 'split'),
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
                <input
                    className="input"
                    style={{ width: 'auto', minWidth: '16rem' }}
                    type="search"
                    value={query}
                    onChange={e => { setQuery(e.target.value); setSelected(0) }}
                    placeholder="Search ingredient, product or dish"
                />
                <select className="input" style={{ width: 'auto' }} value={filter} onChange={e => setFilter(e.target.value)} disabled={words.length > 0}>
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
                        {words.length > 0 && `${visible.length} found across every status · `}
                        j / k or ↑ ↓ to move · c to confirm the match · e to pick a different product ·
                        n for not bought from this catalog · s to split dishes off to another name
                    </div>
                    <div className="catalog-list">
                        {visible.map((row, i) => (
                            <MappingRow
                                key={row.id}
                                row={row}
                                isSelected={i === selected}
                                isEditing={editingId === row.id}
                                editMode={editMode}
                                busy={busy}
                                onSelect={() => setSelected(i)}
                                onEdit={() => openEditor(row, 'product')}
                                onSplit={() => openEditor(row, 'split')}
                                onSplitDone={afterSplit}
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

// Everything a search can match on one row: its name, its product and its dishes.
function searchText(row) {
    return [row.ingredient_name, row.product_description, ...(row.dishes || []).map(d => d.name)]
        .filter(Boolean).join(' ').toLowerCase()
}

// 0 = the name is the search, 1 = the name holds every word, 2 = matched elsewhere.
function searchRank(row, words) {
    if (words.length === 0) return 0
    if (row.ingredient_name === words.join(' ')) return 0
    return words.every(w => row.ingredient_name.includes(w)) ? 1 : 2
}

function MappingRow({ row, isSelected, isEditing, editMode, busy, onSelect, onEdit, onSplit, onSplitDone, onCancelEdit, onPick, onConfirm, onNotFromCatalog }) {
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

                {isEditing && editMode === 'product' && <ProductPicker initial={row.ingredient_name} busy={busy} onPick={onPick} onCancel={onCancelEdit} />}
                {isEditing && editMode === 'split' && <SplitForm row={row} onDone={onSplitDone} onCancel={onCancelEdit} />}
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
                    {!isEditing && (
                        <button className="btn btn-sm btn-secondary" disabled={busy} onClick={e => { e.stopPropagation(); onSplit() }}>
                            Split
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

// Moves the ticked dishes' lines from this ingredient name to another. A name maps to
// ONE product for every dish that uses it, so when one name covers two things the
// kitchen buys differently ("egg": a frozen patty on the breakfast sandwiches, shell
// eggs everywhere else) the fix is to give some of the dishes a different name.
//
// Moved dishes take whatever the new name is mapped to; a brand-new name starts with no
// product. Moving EVERY dish carries the match along to a brand-new name (a plain
// rename) and drops it when joining an existing name, so no confirmed match is left on a
// name no dish uses: the drafter could write that name again and its dish would pick up
// the product without anyone reviewing it.
function SplitForm({ row, onDone, onCancel }) {
    const from = row.ingredient_name
    const [lines, setLines] = useState(null)
    const [ticked, setTicked] = useState(() => new Set())
    const [newName, setNewName] = useState('')
    const [target, setTarget] = useState(null)
    const [saving, setSaving] = useState(false)
    const [formError, setFormError] = useState(null)

    const to = normaliseName(newName)
    const allTicked = lines !== null && lines.length > 0 && ticked.size === lines.length

    // Every line using this name, orderable dish or not, so a move leaves none behind.
    useEffect(() => {
        let live = true
        supabase
            .from('dish_ingredients')
            .select('dish_id, portion_qty, portion_unit, menu_dishes(name, menu_source, season)')
            .eq('ingredient_name', from)
            .then(({ data, error }) => {
                if (!live) return
                if (error) { setFormError(error.message); setLines([]); return }
                setLines([...(data || [])].sort((a, b) =>
                    (a.menu_dishes?.menu_source || '').localeCompare(b.menu_dishes?.menu_source || '')
                    || (a.menu_dishes?.name || '').localeCompare(b.menu_dishes?.name || '')))
            })
        return () => { live = false }
    }, [from])

    // What the typed name already is, so the reviewer sees where the dishes will land
    // before moving them.
    useEffect(() => {
        if (!to || to === from) { setTarget(null); return }
        let live = true
        const timer = setTimeout(async () => {
            try {
                const found = await lookupName(to)
                if (live) setTarget({ name: to, ...found })
            } catch (err) {
                if (live) setFormError(err.message)
            }
        }, 250)
        return () => { live = false; clearTimeout(timer) }
    }, [to, from])

    function toggle(dishId) {
        setTicked(prev => {
            const next = new Set(prev)
            if (next.has(dishId)) next.delete(dishId)
            else next.add(dishId)
            return next
        })
    }

    async function save() {
        if (to === from) { setFormError(`Those dishes already say "${from}".`); return }
        setSaving(true)
        setFormError(null)
        const ids = [...ticked]
        let before
        try {
            // Looked up again here, not taken from the preview, which can trail the typing.
            before = await lookupName(to)

            // unique (dish_id, ingredient_name): one dish already listing the new name
            // would fail the whole update, so name those dishes instead.
            const { data: clash, error: clashError } = await supabase
                .from('dish_ingredients').select('dish_id').eq('ingredient_name', to).in('dish_id', ids)
            if (clashError) throw clashError
            if (clash.length > 0) {
                const names = clash.map(c => lines.find(l => l.dish_id === c.dish_id)?.menu_dishes?.name)
                throw new Error(`Already listing "${to}": ${names.join(', ')}. Untick them, or fix them on Dish Ingredients.`)
            }

            const { data: moved, error: moveError } = await supabase
                .from('dish_ingredients')
                .update({ ingredient_name: to })
                .eq('ingredient_name', from)
                .in('dish_id', ids)
                .select('id')
            if (moveError) throw moveError
            if (moved.length !== ids.length) throw new Error(`Moved ${moved.length} of ${ids.length} dishes — reload and check them.`)
        } catch (err) {
            console.error('Could not move the dishes:', err)
            setFormError(err.message)
            setSaving(false)
            return
        }

        // The dishes have moved; a failure from here on is reported on the page, since
        // the form's dish list no longer matches the database.
        let warning = null
        if (row.mapping_status) {
            try {
                // Counted afresh, not read off the form's list: a dish drafted with this
                // name while the form sat open still needs the match.
                const { count: left, error: countError } = await supabase
                    .from('dish_ingredients')
                    .select('id', { count: 'exact', head: true })
                    .eq('ingredient_name', from)
                if (countError) throw countError
                if (left === 0) {
                    const brandNew = !before.mapping && before.dishCount === 0
                    const { error: mapError } = brandNew
                        ? await supabase.from('ingredient_products')
                            .update({ ingredient_name: to, updated_at: new Date().toISOString() })
                            .eq('ingredient_name', from)
                        : await supabase.from('ingredient_products').delete().eq('ingredient_name', from)
                    if (mapError) throw mapError
                }
            } catch (err) {
                console.error('Could not tidy the old match:', err)
                warning = `The dishes moved, but "${from}" still has its old match: ${err.message}`
            }
        }
        setSaving(false)
        onDone(to, warning)
    }

    return (
        <div className="ingredient-picker" onClick={e => e.stopPropagation()}>
            <div className="catalog-row-lists">
                Tick the dishes that need a different ingredient, then name it. The rest stay "{from}".
            </div>
            {lines === null && <div className="catalog-row-lists"><span className="spinner" /> Loading dishes...</div>}
            {lines !== null && lines.length > 0 && (
                <>
                    <button
                        type="button"
                        className="ingredient-dishes-more"
                        onClick={() => setTicked(allTicked ? new Set() : new Set(lines.map(l => l.dish_id)))}
                    >
                        {allTicked ? 'Untick all' : `Tick all ${lines.length}`}
                    </button>
                    <div className="ingredient-split-list">
                        {lines.map(l => (
                            <label key={l.dish_id} className="ingredient-split-dish">
                                <input type="checkbox" checked={ticked.has(l.dish_id)} onChange={() => toggle(l.dish_id)} />
                                <span>
                                    <span className="ingredient-dish-name">{l.menu_dishes?.name}</span>
                                    {' — '}{l.menu_dishes?.season ? `${l.menu_dishes.menu_source} (${l.menu_dishes.season})` : l.menu_dishes?.menu_source}
                                    {' · '}{Number(l.portion_qty)} {l.portion_unit === 'floz' ? 'fl oz' : l.portion_unit}
                                </span>
                            </label>
                        ))}
                    </div>
                </>
            )}
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <input className="input" autoFocus value={newName} onChange={e => setNewName(e.target.value)} placeholder="New ingredient name" />
                <button className="btn btn-sm btn-primary" disabled={saving || ticked.size === 0 || !to} onClick={save}>
                    Move {ticked.size}
                </button>
                <button className="btn btn-sm btn-secondary" disabled={saving} onClick={onCancel}>Cancel</button>
            </div>
            {target?.name === to && ticked.size > 0 && (
                <div className="catalog-row-lists">{splitPreview(ticked.size, to, allTicked && !!row.mapping_status, target)}</div>
            )}
            {formError && <div className="dish-spec-gap">{formError}</div>}
        </div>
    )
}

// The database's check on ingredient names (lower case, trimmed), plus runs of spaces
// squeezed to one, so "egg  patty" can't become a second name beside "egg patty".
function normaliseName(name) {
    return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

// A name's current match (if any) and how many dish lines already use it.
async function lookupName(name) {
    const [mapping, used] = await Promise.all([
        supabase
            .from('ingredient_products')
            .select('status, product_id, supplier_products(description)')
            .eq('ingredient_name', name)
            .maybeSingle(),
        supabase
            .from('dish_ingredients')
            .select('id', { count: 'exact', head: true })
            .eq('ingredient_name', name),
    ])
    if (mapping.error) throw mapping.error
    if (used.error) throw used.error
    return { mapping: mapping.data, dishCount: used.count ?? 0 }
}

// The line under the Split form saying where the ticked dishes will land and what
// product they will take there.
function splitPreview(count, to, carriesMatch, target) {
    const dishes = `${count} dish${count === 1 ? '' : 'es'}`
    if (!target.mapping && target.dishCount === 0) {
        return carriesMatch
            ? `${dishes} will be renamed "${to}" and keep this match.`
            : `${dishes} will move to "${to}", a new ingredient with no product yet — pick one after.`
    }
    const answer = !target.mapping ? 'no product yet'
        : !target.mapping.product_id ? `${target.mapping.status}, not bought from this catalog`
        : `${target.mapping.status}: ${target.mapping.supplier_products?.description}`
    return `${dishes} will join "${to}" (${answer}).`
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

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
import { useKeyboardReview } from '../lib/useKeyboardReview.js'
import { PORTION_UNIT_NAMES, specCost, lineGap, GAP_REASONS } from '../lib/orderUnits.js'

const BASES = ['person', 'each', 'piece', 'dozen', 'tray', 'lb']
const BASIS_LABEL = { person: 'guest', each: 'each', piece: 'piece', dozen: 'dozen', tray: 'tray', lb: 'lb' }

// 8 dishes per request: the 8 themed buffets (~20 ingredients each, the heaviest
// dishes on any menu) drafted in 15s on 2026-09-27, far inside the 130s deadline. The
// edge function refuses more than 12.
const DRAFT_BATCH = 8
// dish_ingredient_lines is read in chunks of dishes: an id list for all 364 dishes
// makes an over-long URL, and 30 dishes x ~25 lines stays under PostgREST's 1000-row cap.
const LINES_CHUNK = 30

// What each confirmed catering dish is made of, per one of its selling units — the
// spec the BEO order list (P4) multiplies by the event's count. Phase P3.
//
// Same review shape as Menu Dishes: the model drafts, you confirm, nothing downstream
// reads a draft. The estimated cost beside each dish is there to catch a wrong portion
// by eye — a $19 food cost on a $38 buffet is a spec to look at twice.
export default function DishSpecs() {
    const [progress, setProgress] = useState([])
    const [menuSource, setMenuSource] = useState('')
    const [status, setStatus] = useState('draft')
    const [dishes, setDishes] = useState([])
    const [lines, setLines] = useState({})
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [selected, setSelected] = useState(0)
    const [editingId, setEditingId] = useState(null)
    const [busy, setBusy] = useState(false)
    const [drafting, setDrafting] = useState(null)

    const loadProgress = useCallback(async () => {
        const { data, error: rpcError } = await supabase.rpc('dish_spec_progress')
        if (rpcError) console.error('Could not read spec progress:', rpcError)
        else setProgress(data || [])
    }, [])

    const load = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            let request = supabase
                .from('orderable_menu_dishes')
                .select('id, name, menu_source, menu_section, description, season, serves, price_unit, spec_basis, spec_status, spec_note')
                .order('menu_source')
                .order('menu_section', { nullsFirst: true })
                .order('name')
            if (menuSource) request = request.eq('menu_source', menuSource)
            if (status !== 'all') request = request.eq('spec_status', status)

            const { data, error: queryError } = await request
            if (queryError) throw queryError
            setDishes(data || [])
            setLines(await loadLines((data || []).map(d => d.id)))
            setSelected(0)
        } catch (err) {
            console.error('Could not load dish specs:', err)
            setError(err.message)
            setDishes([])
            setLines({})
        } finally {
            setLoading(false)
        }
    }, [menuSource, status])

    useEffect(() => { loadProgress() }, [loadProgress])
    useEffect(() => { load() }, [load])

    // Drafts every UNSPECCED dish in the chosen menu, a batch at a time. Scoped to one
    // menu on purpose: the plan is Custom Buffets + Plated Dinners + Themed Buffets
    // first, and a button that drafts all 364 dishes invites a review nobody finishes.
    async function draftMenu() {
        setBusy(true)
        setError(null)
        try {
            const { data, error: queryError } = await supabase
                .from('orderable_menu_dishes')
                .select('id')
                .eq('menu_source', menuSource)
                .eq('spec_status', 'none')
            if (queryError) throw queryError
            const ids = (data || []).map(d => d.id)

            const missing = []
            let written = 0
            for (let i = 0; i < ids.length; i += DRAFT_BATCH) {
                setDrafting(`Drafting ${Math.min(i + DRAFT_BATCH, ids.length)} of ${ids.length}...`)
                const { data: result, error: fnError } = await supabase.functions.invoke('draft-dish-specs', {
                    body: { mode: 'ingredients', dishIds: ids.slice(i, i + DRAFT_BATCH) },
                })
                if (fnError) throw fnError
                if (result?.error) throw new Error(result.error)
                written += result.written ?? 0
                missing.push(...(result.missing ?? []))
            }
            // A dish the model skipped stays unspecced and is named here, so "drafted"
            // never quietly means "drafted most of them".
            setDrafting(`${written} drafted` + (missing.length ? ` · not drafted, try again: ${missing.join(', ')}` : ''))
        } catch (err) {
            console.error('Drafting dish specs failed:', err)
            setError(`Drafting stopped: ${err.message}. Dishes drafted before this are saved.`)
            setDrafting(null)
        } finally {
            setBusy(false)
            loadProgress()
            load()
        }
    }

    async function confirmSpec(dish) {
        setBusy(true)
        try {
            const { error: updateError } = await supabase
                .from('menu_dishes')
                .update({ spec_status: 'confirmed', spec_confirmed_at: new Date().toISOString() })
                .eq('id', dish.id)
                .eq('spec_status', 'draft')
            if (updateError) throw updateError
            if (status === 'draft') setDishes(prev => prev.filter(d => d.id !== dish.id))
            else setDishes(prev => prev.map(d => d.id === dish.id ? { ...d, spec_status: 'confirmed' } : d))
            loadProgress()
        } catch (err) {
            console.error('Could not confirm the spec:', err)
            setError(err.message)
        } finally {
            setBusy(false)
        }
    }

    // Scoped to what is ON SCREEN, never "all drafts everywhere" (same rule as menus).
    async function confirmAllVisible() {
        const ids = dishes.filter(d => d.spec_status === 'draft').map(d => d.id)
        if (ids.length === 0) return
        setBusy(true)
        try {
            const { error: updateError } = await supabase
                .from('menu_dishes')
                .update({ spec_status: 'confirmed', spec_confirmed_at: new Date().toISOString() })
                .in('id', ids)
                .eq('spec_status', 'draft')
            if (updateError) throw updateError
            await load()
            await loadProgress()
        } catch (err) {
            console.error('Could not confirm specs:', err)
            setError(err.message)
        } finally {
            setBusy(false)
        }
    }

    // One RPC call writes the basis, note and every ingredient together, so a lost
    // connection can never leave half a list behind.
    async function saveSpec(dish, edits, nextStatus) {
        setBusy(true)
        try {
            const { error: rpcError } = await supabase.rpc('save_dish_spec', {
                p_dish_id: dish.id,
                p_basis: edits.basis,
                p_note: edits.note,
                p_ingredients: edits.ingredients,
                p_status: nextStatus,
            })
            if (rpcError) throw rpcError
            setEditingId(null)
            await load()
            await loadProgress()
        } catch (err) {
            console.error('Could not save the spec:', err)
            setError(err.message)
        } finally {
            setBusy(false)
        }
    }

    useKeyboardReview({
        items: dishes, selected, setSelected, editingId, setEditingId, busy,
        actions: { c: dish => { if (dish.spec_status === 'draft') confirmSpec(dish) } },
    })

    const draftCount = dishes.filter(d => d.spec_status === 'draft').length
    const chosen = progress.filter(p => p.menu_source === menuSource)
    const unspeccedInMenu = chosen.reduce((n, p) => n + p.unspecced, 0)
    const totals = progress.reduce((acc, p) => ({
        total: acc.total + p.total, unspecced: acc.unspecced + p.unspecced,
        drafts: acc.drafts + p.drafts, confirmed: acc.confirmed + p.confirmed,
    }), { total: 0, unspecced: 0, drafts: 0, confirmed: 0 })
    const menuNames = [...new Set(progress.map(p => p.menu_source))]

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Dish Ingredients</h1>
                <p className="page-subtitle">
                    {totals.total} orderable dishes — {totals.confirmed} confirmed, {totals.drafts} to
                    review, {totals.unspecced} not drafted yet. Portions are per one of the dish's
                    selling units, as purchased.
                </p>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-5)', flexWrap: 'wrap' }}>
                <select className="input" style={{ width: 'auto', minWidth: '210px' }} value={menuSource} onChange={e => setMenuSource(e.target.value)}>
                    <option value="">All menus</option>
                    {menuNames.map(name => {
                        const rows = progress.filter(p => p.menu_source === name)
                        const sum = key => rows.reduce((n, p) => n + p[key], 0)
                        return (
                            <option key={name} value={name}>
                                {name} — {sum('confirmed')}/{sum('total')} confirmed
                            </option>
                        )
                    })}
                </select>
                <select className="input" style={{ width: 'auto' }} value={status} onChange={e => setStatus(e.target.value)}>
                    <option value="draft">To review</option>
                    <option value="none">Not drafted</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="all">All</option>
                </select>
                {menuSource && unspeccedInMenu > 0 && (
                    <button className="btn btn-secondary" onClick={draftMenu} disabled={busy}>
                        Draft ingredients for {unspeccedInMenu} dish{unspeccedInMenu === 1 ? '' : 'es'}
                    </button>
                )}
                {draftCount > 0 && (
                    <button className="btn btn-primary" onClick={confirmAllVisible} disabled={busy}>
                        Confirm all {draftCount} shown
                    </button>
                )}
            </div>

            {drafting && <div className="page-subtitle" style={{ marginBottom: 'var(--space-4)' }}>{busy && <span className="spinner" />} {drafting}</div>}

            {error && (
                <div className="badge badge-danger" style={{ display: 'block', padding: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                    {error}
                </div>
            )}

            {loading && <div className="page-subtitle"><span className="spinner" /> Loading...</div>}

            {!loading && dishes.length === 0 && !error && (
                <div className="page-subtitle">
                    {status === 'draft'
                        ? 'Nothing to review here. Pick a menu and draft its ingredients.'
                        : 'No dishes match.'}
                </div>
            )}

            {!loading && dishes.length > 0 && (
                <>
                    <div className="page-subtitle" style={{ marginBottom: 'var(--space-3)' }}>
                        j / k or ↑ ↓ to move · c to confirm · e to edit · Esc to close an edit
                    </div>
                    <div className="catalog-list">
                        {dishes.map((dish, i) => (
                            <SpecRow
                                key={dish.id}
                                dish={dish}
                                lines={lines[dish.id] || []}
                                isSelected={i === selected}
                                isEditing={editingId === dish.id}
                                busy={busy}
                                onSelect={() => setSelected(i)}
                                onEdit={() => setEditingId(dish.id)}
                                onCancelEdit={() => setEditingId(null)}
                                onSave={(edits, nextStatus) => saveSpec(dish, edits, nextStatus)}
                                onConfirm={() => confirmSpec(dish)}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}

// dish_ingredient_lines for many dishes, grouped by dish.
async function loadLines(dishIds) {
    const byDish = {}
    for (let i = 0; i < dishIds.length; i += LINES_CHUNK) {
        const { data, error } = await supabase
            .from('dish_ingredient_lines')
            .select('*')
            .in('dish_id', dishIds.slice(i, i + LINES_CHUNK))
            .order('sort_order')
        if (error) throw error
        // A full page means rows may have been cut off by the 1000-row cap — say so
        // rather than render a dish with part of its ingredient list.
        if ((data || []).length >= 1000) throw new Error('Too many ingredient lines to load at once — pick a single menu.')
        for (const line of data || []) (byDish[line.dish_id] ||= []).push(line)
    }
    return byDish
}

function SpecRow({ dish, lines, isSelected, isEditing, busy, onSelect, onEdit, onCancelEdit, onSave, onConfirm }) {
    const rowRef = useRef(null)
    useEffect(() => {
        if (isSelected) rowRef.current?.scrollIntoView({ block: 'nearest' })
    }, [isSelected])

    if (isEditing) {
        return <SpecEditForm dish={dish} lines={lines} busy={busy} onSave={onSave} onCancel={onCancelEdit} />
    }

    const { cost, costed, gaps } = specCost(lines)
    const per = BASIS_LABEL[dish.spec_basis] || dish.spec_basis

    return (
        <div ref={rowRef} className={`catalog-row menu-dish-row dish-spec-row ${isSelected ? 'selected' : ''}`} onClick={onSelect}>
            <div className="catalog-row-main" style={{ width: '100%' }}>
                <div className="catalog-row-name">{dish.name}</div>
                <div className="catalog-row-meta">
                    {dish.menu_section && <span className="catalog-row-tag">{dish.menu_section}</span>}
                    <span>{dish.menu_source}{dish.season ? ` · ${dish.season}` : ''}</span>
                    {dish.spec_basis && <span>per {per}{dish.spec_basis === 'tray' && dish.serves ? ` (serves ${dish.serves})` : ''}</span>}
                </div>
                {dish.description && <div className="catalog-row-lists">{dish.description}</div>}
                {dish.spec_note && <div className="dish-spec-note">{dish.spec_note}</div>}

                {lines.length > 0 && (
                    <table className="dish-spec-lines">
                        <tbody>
                            {lines.map(line => {
                                const gap = lineGap(line)
                                return (
                                    <tr key={line.id}>
                                        <td className="dish-spec-qty">{Number(line.portion_qty)} {line.portion_unit}</td>
                                        <td>{line.ingredient_name}</td>
                                        <td className={gap ? 'dish-spec-gap' : 'dish-spec-product'}>
                                            {gap ? GAP_REASONS[gap] : line.product_description}
                                            {!gap && line.mapping_status === 'draft' && ' (unconfirmed match)'}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                )}
            </div>
            <div className="catalog-row-price">
                {lines.length > 0 && (
                    <>
                        <div className="catalog-row-case">≈ ${cost.toFixed(2)}<span className="catalog-row-case-label">/{per}</span></div>
                        <div className="catalog-row-basis">
                            {gaps.length === 0 ? 'all ingredients costed' : `${costed} of ${lines.length} costed`}
                        </div>
                    </>
                )}
                <div className="menu-dish-actions">
                    {dish.spec_status === 'draft' && (
                        <button className="btn btn-sm btn-primary" disabled={busy} onClick={e => { e.stopPropagation(); onConfirm() }}>
                            Confirm
                        </button>
                    )}
                    {dish.spec_status === 'confirmed' && <span className="badge badge-success">Confirmed</span>}
                    <button className="btn btn-sm btn-secondary" disabled={busy} onClick={e => { e.stopPropagation(); onEdit() }}>
                        {dish.spec_status === 'none' ? 'Write by hand' : 'Edit'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// Edits are validated here before the RPC so a mistyped row gets a message beside the
// form instead of a constraint error from the database.
function SpecEditForm({ dish, lines, busy, onSave, onCancel }) {
    const [basis, setBasis] = useState(dish.spec_basis || derivedBasis(dish))
    const [note, setNote] = useState(dish.spec_note || '')
    const [rows, setRows] = useState(
        lines.map(l => ({ key: l.id, name: l.ingredient_name, qty: String(l.portion_qty), unit: l.portion_unit }))
    )
    const [formError, setFormError] = useState(null)

    const setRow = (key, field, value) => setRows(prev => prev.map(r => r.key === key ? { ...r, [field]: value } : r))
    const addRow = () => setRows(prev => [...prev, { key: crypto.randomUUID(), name: '', qty: '', unit: 'oz' }])
    const removeRow = key => setRows(prev => prev.filter(r => r.key !== key))

    function submit(nextStatus) {
        const { ingredients, problem } = normaliseSpecRows(rows)
        if (problem) { setFormError(problem); return }
        onSave({ basis, note, ingredients }, nextStatus)
    }

    // Saving keeps a confirmed spec confirmed — editing it IS the human review (FR-10).
    const keepStatus = dish.spec_status === 'confirmed' ? 'confirmed' : 'draft'

    return (
        <div className="catalog-row menu-dish-row editing">
            <div style={{ width: '100%' }}>
                <div className="catalog-row-name" style={{ marginBottom: 'var(--space-3)' }}>{dish.name}</div>
                {dish.description && <div className="catalog-row-lists" style={{ marginBottom: 'var(--space-3)' }}>{dish.description}</div>}

                <div className="menu-dish-edit-grid">
                    <label className="menu-dish-field">
                        <span className="menu-dish-field-label">Portions are per</span>
                        <select className="input" value={basis} onChange={e => setBasis(e.target.value)}>
                            {BASES.map(b => <option key={b} value={b}>{BASIS_LABEL[b]}</option>)}
                        </select>
                    </label>
                </div>

                <div className="dish-spec-edit-rows">
                    {rows.map(r => (
                        <div key={r.key} className="dish-spec-edit-row">
                            <input className="input" inputMode="decimal" placeholder="qty" value={r.qty} onChange={e => setRow(r.key, 'qty', e.target.value)} />
                            <select className="input" value={r.unit} onChange={e => setRow(r.key, 'unit', e.target.value)}>
                                {PORTION_UNIT_NAMES.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                            <input className="input" placeholder="ingredient" value={r.name} onChange={e => setRow(r.key, 'name', e.target.value)} />
                            <button className="btn btn-sm btn-danger" onClick={() => removeRow(r.key)} aria-label={`Remove ${r.name || 'row'}`}>✕</button>
                        </div>
                    ))}
                    <button className="btn btn-sm btn-secondary" onClick={addRow}>+ Add ingredient</button>
                </div>

                <label className="menu-dish-field" style={{ marginTop: 'var(--space-3)' }}>
                    <span className="menu-dish-field-label">Note — what this spec knowingly leaves out</span>
                    <textarea className="input" rows={2} value={note} onChange={e => setNote(e.target.value)} />
                </label>

                {formError && <div className="badge badge-danger" style={{ display: 'block', padding: 'var(--space-2)', marginTop: 'var(--space-3)' }}>{formError}</div>}

                <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)', flexWrap: 'wrap' }}>
                    <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => submit(keepStatus)}>Save</button>
                    {keepStatus === 'draft' && (
                        <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => submit('confirmed')}>Save &amp; confirm</button>
                    )}
                    <button className="btn btn-secondary btn-sm" disabled={busy} onClick={onCancel}>Cancel</button>
                </div>
            </div>
        </div>
    )
}

// Same rule the drafting function uses (draft-dish-specs basisFor), so a spec written
// by hand starts on the unit the dish is actually sold in.
function derivedBasis(dish) {
    if (BASES.includes(dish.price_unit)) return dish.price_unit
    return dish.serves ? 'tray' : 'person'
}

// Form rows -> the RPC's ingredient list, or the first problem found. Blank rows are
// dropped (an "Add ingredient" never filled in); a half-filled one is an error, because
// dropping it would silently lose an ingredient someone meant to add.
function normaliseSpecRows(rows) {
    const ingredients = []
    for (const r of rows) {
        const name = r.name.trim().toLowerCase().replace(/\s+/g, ' ')
        const qtyText = String(r.qty).trim()
        if (!name && !qtyText) continue
        const qty = Number(qtyText)
        if (!name) return { problem: `A row with amount ${qtyText} has no ingredient name.` }
        if (!(qty > 0)) return { problem: `"${name}" needs an amount greater than 0.` }
        if (ingredients.some(i => i.name === name)) return { problem: `"${name}" is listed twice — merge it into one row.` }
        ingredients.push({ name, qty, unit: r.unit })
    }
    if (ingredients.length === 0) return { problem: 'A spec needs at least one ingredient.' }
    return { ingredients }
}

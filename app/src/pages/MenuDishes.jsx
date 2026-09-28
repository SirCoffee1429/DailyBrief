import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
import MenuUploadPanel from '../components/MenuUploadPanel.jsx'
import { normaliseDishEdits, priceLabel } from '../lib/menuDrafts.js'
import { useKeyboardReview } from '../lib/useKeyboardReview.js'

const PRICE_UNITS = ['each', 'person', 'dozen', 'tray', 'piece', 'lb']

// The catering menus, as dishes a BEO line can eventually be matched to.
//
// Confirming is the whole job here — roughly 250-300 dishes across the 8 menus, which
// the design named as the risk that kills the feature if the UI is slow. So the list is
// keyboard-driven (j/k to move, c to confirm and advance, e to edit) and carries a
// bulk-confirm for a section you have read down and agree with.
export default function MenuDishes() {
    const [sources, setSources] = useState([])
    const [menuSource, setMenuSource] = useState('')
    const [status, setStatus] = useState('draft')
    const [dishes, setDishes] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [showUpload, setShowUpload] = useState(false)
    const [selected, setSelected] = useState(0)
    const [editingId, setEditingId] = useState(null)
    const [busy, setBusy] = useState(false)

    const loadSources = useCallback(async () => {
        const { data, error: rpcError } = await supabase.rpc('menu_dish_sources')
        if (rpcError) console.error('Could not read menu sources:', rpcError)
        else setSources(data || [])
    }, [])

    const load = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            let request = supabase
                .from('menu_dishes')
                .select('*')
                .order('menu_source')
                .order('source_page')
                .order('menu_section', { nullsFirst: true })
                .order('name')

            if (menuSource) request = request.eq('menu_source', menuSource)
            if (status !== 'all') request = request.eq('status', status)

            const { data, error: queryError } = await request
            // Unchecked, this would render as "no dishes" — a wrong answer wearing the
            // face of a real one.
            if (queryError) throw queryError
            setDishes(data || [])
            setSelected(0)
        } catch (err) {
            console.error('Could not load menu dishes:', err)
            setError(err.message)
            setDishes([])
        } finally {
            setLoading(false)
        }
    }, [menuSource, status])

    useEffect(() => { loadSources() }, [loadSources])
    useEffect(() => { load() }, [load])

    // Confirming removes the dish from a draft-filtered list, so the selection stays on
    // the same INDEX rather than following the row — which lands it on the next dish.
    async function confirmDish(dish) {
        setBusy(true)
        try {
            const { error: updateError } = await supabase
                .from('menu_dishes')
                .update({ status: 'confirmed', confirmed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
                .eq('id', dish.id)
            if (updateError) throw updateError

            if (status === 'draft') {
                setDishes(prev => prev.filter(d => d.id !== dish.id))
            } else {
                setDishes(prev => prev.map(d => d.id === dish.id ? { ...d, status: 'confirmed' } : d))
                setSelected(i => Math.min(i + 1, dishes.length - 1))
            }
            loadSources()
        } catch (err) {
            console.error('Could not confirm dish:', err)
            setError(err.message)
        } finally {
            setBusy(false)
        }
    }

    // Bulk-confirm is scoped to what is ON SCREEN, never to "all drafts everywhere" —
    // confirming a menu you have not read is exactly the mistake this gate exists to
    // prevent, and an office-wide button invites it.
    async function confirmAllVisible() {
        const ids = dishes.filter(d => d.status === 'draft').map(d => d.id)
        if (ids.length === 0) return
        setBusy(true)
        try {
            const { error: updateError } = await supabase
                .from('menu_dishes')
                .update({ status: 'confirmed', confirmed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
                .in('id', ids)
            if (updateError) throw updateError
            await load()
            await loadSources()
        } catch (err) {
            console.error('Could not confirm dishes:', err)
            setError(err.message)
        } finally {
            setBusy(false)
        }
    }

    async function saveEdits(dish, edits) {
        setBusy(true)
        try {
            const payload = { ...normaliseDishEdits(edits), updated_at: new Date().toISOString() }
            const { error: updateError } = await supabase
                .from('menu_dishes')
                .update(payload)
                .eq('id', dish.id)
            if (updateError) throw updateError
            setDishes(prev => prev.map(d => d.id === dish.id ? { ...d, ...payload } : d))
            setEditingId(null)
        } catch (err) {
            console.error('Could not save the dish:', err)
            setError(err.message)
        } finally {
            setBusy(false)
        }
    }

    // A row that states a selection surcharge rather than food — "Additional Salad +$5"
    // means the SECOND salad costs $5 more, whichever salad that turns out to be. It is
    // confirmed (it has been reviewed and the price is real) but flagged, because the
    // dish the rule applies to is already its own row and gets ordered on its own.
    // Giving this one ingredients too would order that food twice.
    async function markPriceRule(dish) {
        setBusy(true)
        try {
            const { error: updateError } = await supabase
                .from('menu_dishes')
                .update({
                    is_price_rule: true,
                    status: 'confirmed',
                    confirmed_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq('id', dish.id)
            if (updateError) throw updateError

            if (status === 'draft') setDishes(prev => prev.filter(d => d.id !== dish.id))
            else setDishes(prev => prev.map(d => d.id === dish.id
                ? { ...d, is_price_rule: true, status: 'confirmed' } : d))
            loadSources()
        } catch (err) {
            console.error('Could not mark the price rule:', err)
            setError(err.message)
        } finally {
            setBusy(false)
        }
    }

    // A dish the menus do not really offer (a heading the model mistook for a dish) is
    // deleted rather than confirmed. Only drafts can be discarded this way.
    async function discardDish(dish) {
        setBusy(true)
        try {
            const { error: deleteError } = await supabase.from('menu_dishes').delete().eq('id', dish.id)
            if (deleteError) throw deleteError
            setDishes(prev => prev.filter(d => d.id !== dish.id))
            loadSources()
        } catch (err) {
            console.error('Could not discard the dish:', err)
            setError(err.message)
        } finally {
            setBusy(false)
        }
    }

    useKeyboardReview({
        items: dishes, selected, setSelected, editingId, setEditingId, busy,
        actions: {
            c: dish => { if (dish.status === 'draft') confirmDish(dish) },
            p: dish => { if (dish.status === 'draft') markPriceRule(dish) },
        },
    })

    const draftCount = dishes.filter(d => d.status === 'draft').length
    const totals = sources.reduce(
        (acc, s) => ({ total: acc.total + s.total, drafts: acc.drafts + s.drafts }),
        { total: 0, drafts: 0 }
    )

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Menu Dishes</h1>
                <p className="page-subtitle">
                    {totals.total === 0
                        ? 'No menus drafted yet.'
                        : `${totals.total} dishes across ${sources.length} menus — ${totals.drafts} still to confirm. Nothing downstream uses a dish until it is confirmed.`}
                </p>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-5)', flexWrap: 'wrap' }}>
                <select
                    className="input"
                    style={{ width: 'auto', minWidth: '210px' }}
                    value={menuSource}
                    onChange={e => setMenuSource(e.target.value)}
                >
                    <option value="">All menus</option>
                    {sources.map(s => (
                        <option key={s.menu_source + (s.season || '')} value={s.menu_source}>
                            {s.menu_source}{s.season ? ` (${s.season})` : ''} — {s.drafts} to confirm
                        </option>
                    ))}
                </select>
                <select
                    className="input"
                    style={{ width: 'auto' }}
                    value={status}
                    onChange={e => setStatus(e.target.value)}
                >
                    <option value="draft">To confirm</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="all">All</option>
                </select>
                <button className="btn btn-secondary" onClick={() => setShowUpload(v => !v)}>
                    {showUpload ? 'Hide loading' : 'Load menus'}
                </button>
                {draftCount > 0 && (
                    <button className="btn btn-primary" onClick={confirmAllVisible} disabled={busy}>
                        Confirm all {draftCount} shown
                    </button>
                )}
            </div>

            {showUpload && (
                <MenuUploadPanel onDrafted={() => { loadSources(); load() }} />
            )}

            {error && (
                <div className="badge badge-danger" style={{ display: 'block', padding: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                    {error}
                </div>
            )}

            {loading && <div className="page-subtitle"><span className="spinner" /> Loading...</div>}

            {!loading && dishes.length === 0 && !error && (
                <div className="page-subtitle">
                    {status === 'draft'
                        ? 'Nothing left to confirm here.'
                        : 'No dishes match — load the menu PDFs to draft them.'}
                </div>
            )}

            {!loading && dishes.length > 0 && (
                <>
                    <div className="page-subtitle" style={{ marginBottom: 'var(--space-3)' }}>
                        j / k or ↑ ↓ to move · c to confirm · p to mark a price rule ·
                        e to edit · Esc to close an edit
                    </div>
                    <div className="catalog-list">
                        {dishes.map((dish, i) => (
                            <DishRow
                                key={dish.id}
                                dish={dish}
                                isSelected={i === selected}
                                isEditing={editingId === dish.id}
                                busy={busy}
                                onSelect={() => setSelected(i)}
                                onEdit={() => setEditingId(dish.id)}
                                onCancelEdit={() => setEditingId(null)}
                                onSave={edits => saveEdits(dish, edits)}
                                onConfirm={() => confirmDish(dish)}
                                onPriceRule={() => markPriceRule(dish)}
                                onDiscard={() => discardDish(dish)}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}

function DishRow({ dish, isSelected, isEditing, busy, onSelect, onEdit, onCancelEdit, onSave, onConfirm, onPriceRule, onDiscard }) {
    const rowRef = useRef(null)

    // Keep the keyboard cursor on screen when it walks past the fold.
    useEffect(() => {
        if (isSelected) rowRef.current?.scrollIntoView({ block: 'nearest' })
    }, [isSelected])

    if (isEditing) {
        return <DishEditForm dish={dish} busy={busy} onSave={onSave} onCancel={onCancelEdit} />
    }

    return (
        <div
            ref={rowRef}
            className={`catalog-row menu-dish-row ${isSelected ? 'selected' : ''}`}
            onClick={onSelect}
        >
            <div className="catalog-row-main">
                <div className="catalog-row-name">{dish.name}</div>
                <div className="catalog-row-meta">
                    {dish.menu_section && <span className="catalog-row-tag">{dish.menu_section}</span>}
                    {dish.is_price_rule && <span className="badge badge-warning">Price rule — not food</span>}
                    <span>{dish.menu_source}{dish.season ? ` · ${dish.season}` : ''}</span>
                    {dish.source_page && <span>p{dish.source_page}</span>}
                    {dish.serves && <span>serves {dish.serves}</span>}
                    {dish.min_order && <span>min {dish.min_order}</span>}
                </div>
                {dish.description && <div className="catalog-row-lists">{dish.description}</div>}
            </div>
            <div className="catalog-row-price">
                <div className="catalog-row-case">{priceLabel(dish)}</div>
                <div className="menu-dish-actions">
                    {dish.status === 'draft' ? (
                        <>
                            <button className="btn btn-sm btn-primary" disabled={busy} onClick={e => { e.stopPropagation(); onConfirm() }}>
                                Confirm
                            </button>
                            <button className="btn btn-sm btn-secondary" disabled={busy} onClick={e => { e.stopPropagation(); onEdit() }}>
                                Edit
                            </button>
                            {/* Three distinct outcomes: real food (Confirm), a real price
                                rule that is not food (Price rule), and noise the model
                                misread off the page (Not a dish, which deletes). */}
                            <button className="btn btn-sm btn-secondary" disabled={busy} onClick={e => { e.stopPropagation(); onPriceRule() }}>
                                Price rule
                            </button>
                            <button className="btn btn-sm btn-danger" disabled={busy} onClick={e => { e.stopPropagation(); onDiscard() }}>
                                Not a dish
                            </button>
                        </>
                    ) : (
                        <>
                            <span className="badge badge-success">Confirmed</span>
                            <button className="btn btn-sm btn-secondary" disabled={busy} onClick={e => { e.stopPropagation(); onEdit() }}>
                                Edit
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

// Identity (name, menu_source, season) is not editable: changing it here would either
// collide with another dish's unique key or quietly orphan the row from the menu it was
// drafted off. A misread NAME is a discard-and-redraft, not an edit.
function DishEditForm({ dish, busy, onSave, onCancel }) {
    const [form, setForm] = useState(dish)
    const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

    return (
        <div className="catalog-row menu-dish-row editing">
            <div style={{ width: '100%' }}>
                <div className="catalog-row-name" style={{ marginBottom: 'var(--space-3)' }}>{dish.name}</div>

                <div className="menu-dish-edit-grid">
                    <Field label="Section">
                        <input className="input" value={form.menu_section ?? ''} onChange={e => set('menu_section', e.target.value)} />
                    </Field>
                    <Field label="Upcharge (+$)">
                        <input className="input" inputMode="decimal" value={form.upcharge ?? ''} onChange={e => set('upcharge', e.target.value)} />
                    </Field>
                    <Field label="Own price ($)">
                        <input className="input" inputMode="decimal" value={form.base_price ?? ''} onChange={e => set('base_price', e.target.value)} />
                    </Field>
                    <Field label="Price buys">
                        <select className="input" value={form.price_unit ?? ''} onChange={e => set('price_unit', e.target.value)}>
                            <option value="">—</option>
                            {PRICE_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                    </Field>
                    <Field label="How many of that">
                        <input className="input" inputMode="decimal" value={form.price_qty ?? 1} onChange={e => set('price_qty', e.target.value)} />
                    </Field>
                    <Field label="Serves">
                        <input className="input" inputMode="numeric" value={form.serves ?? ''} onChange={e => set('serves', e.target.value)} />
                    </Field>
                    <Field label="Minimum order">
                        <input className="input" inputMode="numeric" value={form.min_order ?? ''} onChange={e => set('min_order', e.target.value)} />
                    </Field>
                </div>

                <Field label="Description">
                    <textarea
                        className="input"
                        rows={2}
                        value={form.description ?? ''}
                        onChange={e => set('description', e.target.value)}
                    />
                </Field>

                <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
                    <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => onSave(form)}>Save</button>
                    <button className="btn btn-secondary btn-sm" disabled={busy} onClick={onCancel}>Cancel</button>
                </div>
            </div>
        </div>
    )
}

function Field({ label, children }) {
    return (
        <label className="menu-dish-field">
            <span className="menu-dish-field-label">{label}</span>
            {children}
        </label>
    )
}

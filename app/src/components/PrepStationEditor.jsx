import { Fragment, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { groupBySection } from '../lib/prepSheets.js'
import { moveItem, moveSection, insertItem, orderUpdates, parPatch } from '../lib/prepEdit.js'

const ITEM_COLUMNS = 'id, station_id, section, name, par_text, par_qty, par_unit, sort_order, have'

// Office Setup → edit one station by hand: rename / retire the station, rename and move sections, and add, rename,
// re-par, move and retire items. Every change saves at once (boxes save when you leave them) and shows on the
// kitchen sheet live. Retire, never delete: history keeps pointing at the row.
export default function PrepStationEditor({ stations, onStationsChanged }) {
    const [stationId, setStationId] = useState('')
    const [items, setItems] = useState(null)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const [confirmRetire, setConfirmRetire] = useState(null) // an item id, or 'station'
    const [failures, setFailures] = useState(0) // bumped on a failed save so the boxes go back to the saved text

    const station = stations.find(s => s.id === stationId) ?? null
    const openId = useRef(null) // the station on screen; a late answer for another one is dropped

    // Reload the open station's lines whenever it changes or the station list does (an upload, a rename).
    useEffect(() => {
        openId.current = station?.id ?? null
        if (station) loadItems(station.id); else setItems(null)
    }, [station?.id, stations])

    async function loadItems(id) {
        const { data, error: err } = await supabase.from('prep_items').select(ITEM_COLUMNS)
            .eq('station_id', id).eq('active', true).order('sort_order')
        if (id !== openId.current) return
        if (err) return fail('load the items', err)
        setItems(data)
    }

    // Runs one save, then reloads; shows a plain message when it fails (a repeated name, most often).
    async function save(what, run, after = () => loadItems(station.id)) {
        setBusy(true)
        setError('')
        setConfirmRetire(null)
        const { error: err } = await run()
        setBusy(false)
        if (err) return fail(what, err)
        await after()
    }

    function fail(what, err) {
        console.error(`Prep setup: could not ${what}:`, err)
        setFailures(n => n + 1)
        setError(err.code === '23505' ? 'That name is already used here. Pick another.' : `Could not ${what}. Try again.`)
    }

    const updateItem = (item, patch) => save('save the item', () =>
        supabase.from('prep_items').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', item.id))

    const saveOrder = list => {
        const rows = orderUpdates(list)
        return rows.length ? save('save the order', () => supabase.from('prep_items').upsert(rows)) : null
    }

    const renameSection = (group, name) => save('rename the section', () =>
        supabase.from('prep_items').update({ section: name || null, updated_at: new Date().toISOString() })
            .in('id', group.items.map(i => i.id)))

    // A new item: saved at the bottom (so a failed renumber never leaves it on top), then numbered into place at the
    // end of its section.
    async function addItem(section, name, parText) {
        const { patch } = parPatch({}, parText)
        delete patch.have
        await save('add the item', async () => {
            const res = await supabase.from('prep_items')
                .insert({ station_id: station.id, section: section || null, name, ...patch, sort_order: Math.max(-1, ...items.map(i => i.sort_order)) + 1 })
                .select(ITEM_COLUMNS).single()
            if (res.error) return res
            return supabase.from('prep_items').upsert(orderUpdates(insertItem(items, res.data)))
        })
    }

    const renameStation = name => save('rename the station', () =>
        supabase.from('prep_stations').update({ name }).eq('id', station.id), onStationsChanged)

    const retireStation = () => save('retire the station', () =>
        supabase.from('prep_stations').update({ active: false }).eq('id', station.id),
        () => { setStationId(''); return onStationsChanged() })

    const addStation = name => save('add the station', () =>
        supabase.from('prep_stations').insert({ name, sort_order: stations.length }), onStationsChanged)

    return (
        <section className="card prep-card">
            <h2 className="prep-card-title">Edit a station</h2>
            <div className="prep-station-tabs">
                {stations.map(s => (
                    <button key={s.id} type="button" onClick={() => setStationId(s.id)}
                        className={`prep-station-tab${s.id === stationId ? ' active' : ''}`}>{s.name}</button>
                ))}
            </div>
            <AddForm fields={['New station name']} label="Add station" busy={busy} onAdd={([name]) => addStation(name)} />
            {error && <p className="prep-error">{error}</p>}

            {station && items && (
                <Fragment key={failures}>
                    <div className="prep-edit-row prep-edit-station">
                        <SaveOnLeave value={station.name} label="Station name" required onSave={renameStation} />
                        <RetireButton armed={confirmRetire === 'station'} busy={busy} what={station.name}
                            onArm={() => setConfirmRetire('station')} onCancel={() => setConfirmRetire(null)} onRetire={retireStation} />
                    </div>

                    {groupBySection(items).map((group, g, groups) => (
                        <div key={`${group.section}-${g}`} className="prep-edit-group">
                            <div className="prep-edit-row prep-edit-section">
                                <SaveOnLeave value={group.section ?? ''} label="Section" placeholder="(no section)"
                                    onSave={name => renameSection(group, name)} />
                                <MoveButtons busy={busy} first={g === 0} last={g === groups.length - 1}
                                    onMove={dir => saveOrder(moveSection(items, g, dir))} />
                            </div>
                            {group.items.map((item, k) => (
                                <div key={item.id} className="prep-edit-row">
                                    <SaveOnLeave value={item.name} label="Item" required onSave={name => updateItem(item, { name })} />
                                    <SaveOnLeave value={item.par_text} label="Par" small onSave={text => updateItem(item, parPatch(item, text).patch)} />
                                    <span className="prep-edit-read">{readPar(item)}</span>
                                    <MoveButtons busy={busy} first={k === 0} last={k === group.items.length - 1}
                                        onMove={dir => saveOrder(moveItem(items, item.id, dir))} />
                                    <RetireButton armed={confirmRetire === item.id} busy={busy} what={item.name}
                                        onArm={() => setConfirmRetire(item.id)} onCancel={() => setConfirmRetire(null)}
                                        onRetire={() => updateItem(item, { active: false })} />
                                </div>
                            ))}
                            <AddForm fields={['New item', 'Par']} label="Add item" busy={busy}
                                onAdd={([name, par]) => addItem(group.section, name, par)} />
                        </div>
                    ))}

                    <h3 className="prep-card-subtitle">New section</h3>
                    <AddForm fields={['Section name', 'First item', 'Par']} label="Add section" busy={busy}
                        onAdd={([section, name, par]) => addItem(section, name, par)} />
                </Fragment>
            )}
        </section>
    )
}

// How the app reads a stored par: "20 × ea", "No par", or flagged when the text can't be read (no color).
function readPar(item) {
    if (item.par_qty != null) return `${Number(item.par_qty)} × ${item.par_unit}`
    if (item.par_text) return <span className="prep-warn">Not understood: no color</span>
    return <span className="prep-muted">No par</span>
}

// A text box that saves when you leave it (or press Enter), only if the text changed. A required box left blank
// goes back to the saved value instead of saving.
function SaveOnLeave({ value, label, placeholder, small, required, onSave }) {
    return (
        <input
            key={value} defaultValue={value} aria-label={label} placeholder={placeholder ?? label} maxLength={80}
            className={`prep-edit-input${small ? ' prep-edit-input-small' : ''}`}
            onBlur={e => {
                const text = e.target.value.trim()
                if (text === value.trim() || (required && !text)) e.target.value = value
                else onSave(text)
            }}
            onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
        />
    )
}

function MoveButtons({ busy, first, last, onMove }) {
    return (
        <span className="prep-edit-move">
            <button type="button" className="btn btn-sm btn-secondary" disabled={busy || first} onClick={() => onMove(-1)} aria-label="Move up">↑</button>
            <button type="button" className="btn btn-sm btn-secondary" disabled={busy || last} onClick={() => onMove(1)} aria-label="Move down">↓</button>
        </span>
    )
}

// Retire asks once more before it happens (it takes the line off every sheet; history is kept).
function RetireButton({ armed, busy, what, onArm, onCancel, onRetire }) {
    if (!armed) return <button type="button" className="btn btn-sm btn-secondary" disabled={busy} onClick={onArm}>Retire</button>
    return (
        <span className="prep-edit-move">
            <button type="button" className="btn btn-sm btn-danger" disabled={busy} onClick={onRetire} aria-label={`Retire ${what}`}>Retire {what}?</button>
            <button type="button" className="btn btn-sm btn-secondary" onClick={onCancel}>Keep</button>
        </span>
    )
}

// A small one-line form: its boxes, then the button. The first box is required; it clears after adding.
function AddForm({ fields, label, busy, onAdd }) {
    function submit(e) {
        e.preventDefault()
        const boxes = [...e.currentTarget.querySelectorAll('input')]
        const values = boxes.map(b => b.value.trim())
        if (!values[0] || (fields.length === 3 && !values[1])) return
        onAdd(values)
        boxes.forEach(b => { b.value = '' })
    }
    return (
        <form className="prep-edit-row prep-edit-add" onSubmit={submit}>
            {fields.map(f => (
                <input key={f} placeholder={f} aria-label={f} maxLength={80}
                    className={`prep-edit-input${f === 'Par' ? ' prep-edit-input-small' : ''}`} />
            ))}
            <button type="submit" className="btn btn-sm btn-primary" disabled={busy}>{label}</button>
        </form>
    )
}

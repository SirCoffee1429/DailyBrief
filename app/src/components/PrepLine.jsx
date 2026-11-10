import { useState } from 'react'
import {
    lineStatus, quickValues, unitSuffix, parseHaveInput, parseMadeInput, formatStamp,
} from '../lib/prepSheets.js'

// One item on a station's prep sheet: name and color chip, par and how much to prep, the Have box and quick buttons,
// then Done / Partial / Note, and who changed it last. `onRecord(kind, { amount, note })` saves and resolves true/false.
export default function PrepLine({ item, state, onRecord, onRefuse }) {
    const [open, setOpen] = useState(null) // null | 'partial' | 'note'
    // The Have box is keyed on the saved value so a save (or a refused entry) resets it to what's stored. While the
    // cook is typing in it, the key is held, so a live change from another device can't wipe what they're typing.
    const haveKey = `${item.have}-${state.error ?? ''}`
    const [editKey, setEditKey] = useState(null)
    const status = lineStatus(item)
    const have = item.have == null ? null : Number(item.have)
    const parQty = item.par_qty == null ? null : Number(item.par_qty)

    // The Have box saves when the cook leaves it or presses Enter. Blank or unchanged saves nothing.
    function commitHave(e) {
        const { value, error } = parseHaveInput(e.target.value)
        if (error) return onRefuse(error)
        if (value == null || value === have) return
        onRecord('count', { amount: value })
    }

    // Done, Partial and Note close their box only once the save went through.
    async function recordAndClose(kind, fields) {
        if (await onRecord(kind, fields)) setOpen(null)
    }

    // Partial: "made N" adds N to what's on hand.
    function submitPartial(e) {
        e.preventDefault()
        const { value, error } = parseMadeInput(e.currentTarget.elements.made.value)
        if (error) return onRefuse(error)
        recordAndClose('partial', { amount: value })
    }

    // Note: saving a blank note clears it (the database trims it).
    function submitNote(e) {
        e.preventDefault()
        recordAndClose('note', { note: e.currentTarget.elements.note.value })
    }

    return (
        <div className={`prep-line prep-line-${status.color ?? 'grey'}`}>
            <div className="prep-line-top">
                <span className="prep-line-name">{item.name}</span>
                <span className={`prep-chip prep-chip-${status.color ?? 'grey'}`}>{status.label}</span>
            </div>
            <div className="prep-line-par">
                <span>Par {item.par_text || '—'}</span>
                {status.prep && <strong className="prep-line-need">{status.prep}</strong>}
            </div>

            <div className="prep-line-have">
                <label className="prep-have">
                    <span className="prep-have-label">Have</span>
                    <input
                        key={editKey ?? haveKey}
                        type="number" inputMode="decimal" min="0" step="any"
                        defaultValue={have ?? ''} placeholder="—"
                        onFocus={() => setEditKey(haveKey)}
                        onBlur={e => { setEditKey(null); commitHave(e) }}
                        onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
                        aria-label={`How much ${item.name} you have`}
                    />
                    <span className="prep-have-unit">{unitSuffix(have, item.par_unit)}</span>
                </label>
                {state.saving && <span className="prep-muted">Saving…</span>}
            </div>

            {parQty != null && (
                <div className="prep-quick">
                    {quickValues(parQty).map(q => (
                        <button
                            key={q.label} type="button"
                            className={`prep-quick-btn${have === q.value ? ' active' : ''}`}
                            onClick={() => onRecord('count', { amount: q.value })} disabled={state.saving}
                        >
                            {q.label}
                        </button>
                    ))}
                </div>
            )}

            <div className="prep-actions-row">
                <button
                    type="button" className="prep-act prep-act-done"
                    onClick={() => recordAndClose('done', {})}
                    disabled={state.saving || parQty == null}
                    title={parQty == null ? 'No par to fill up to' : 'Prepped back up to par'}
                >
                    <i className="fa-solid fa-check" /> Done
                </button>
                <button type="button" className={`prep-act${open === 'partial' ? ' active' : ''}`} onClick={() => setOpen(open === 'partial' ? null : 'partial')}>
                    <i className="fa-solid fa-plus" /> Partial
                </button>
                <button type="button" className={`prep-act${open === 'note' ? ' active' : ''}`} onClick={() => setOpen(open === 'note' ? null : 'note')}>
                    <i className="fa-regular fa-note-sticky" /> {item.note ? 'Edit note' : 'Note'}
                </button>
            </div>

            {open === 'partial' && (
                <form className="prep-inline-form" onSubmit={submitPartial}>
                    <label className="prep-have">
                        <span className="prep-have-label">Made</span>
                        <input name="made" type="number" inputMode="decimal" min="0" step="any" autoFocus aria-label={`How much ${item.name} you made`} />
                        <span className="prep-have-unit">{unitSuffix(null, item.par_unit)}</span>
                    </label>
                    <button type="submit" className="prep-act prep-act-done" disabled={state.saving}>Add</button>
                </form>
            )}

            {open === 'note' && (
                <form className="prep-inline-form" onSubmit={submitNote}>
                    <input name="note" className="prep-note-input" defaultValue={item.note ?? ''} maxLength={200} autoFocus placeholder="e.g. only 12 in the walk-in" aria-label={`Note for ${item.name}`} />
                    <button type="submit" className="prep-act prep-act-done" disabled={state.saving}>Save</button>
                    {item.note && (
                        <button type="button" className="prep-act" disabled={state.saving} onClick={() => recordAndClose('note', { note: '' })}>Clear</button>
                    )}
                </form>
            )}

            {item.note && open !== 'note' && (
                <p className="prep-note"><i className="fa-regular fa-note-sticky" /> {item.note}</p>
            )}
            {item.changed_at && (
                <p className="prep-stamp">{item.changed_by}, {formatStamp(item.changed_at)}</p>
            )}
            {state.error && <p className="prep-error">{state.error}</p>}
        </div>
    )
}

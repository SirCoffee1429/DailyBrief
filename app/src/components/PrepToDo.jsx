import { useMemo, useState } from 'react'
import { toPrepList } from '../lib/prepSheets.js'
import PrepPartialForm from './PrepPartialForm.jsx'

// The "To prep" box at the top of a station's sheet (spec Addition 11-11): only the Red and Yellow items, most needed
// first, each with Done and Partial right on the row, so the crew works down this list without scrolling away. Saves go
// through the page's `onRecord(item, kind, fields)` (name check, saving and errors shared with the line below), and the
// list re-sorts from the live items, so a Done row drops out at once.
export default function PrepToDo({ items, lineState, onRecord, onRefuse }) {
    const list = useMemo(() => toPrepList(items), [items])
    const anyCounted = items.some(i => i.have != null)

    return (
        <section className="prep-todo" aria-label="To prep">
            <h2 className="prep-todo-title">To prep: {list.length}</h2>
            {list.length === 0 && <p className="prep-muted">{anyCounted ? 'Nothing to prep.' : 'Nothing counted yet.'}</p>}
            {list.map(({ item, status }) => (
                <ToDoRow
                    key={item.id} item={item} status={status} state={lineState[item.id] ?? {}}
                    onRecord={(kind, fields) => onRecord(item, kind, fields)}
                    onRefuse={message => onRefuse(item.id, message)}
                />
            ))}
        </section>
    )
}

// One row: the item, how much to prep, Done and Partial. Partial's box closes once its save went through.
function ToDoRow({ item, status, state, onRecord, onRefuse }) {
    const [partialOpen, setPartialOpen] = useState(false)

    async function recordPartial(value) {
        if (await onRecord('partial', { amount: value })) setPartialOpen(false)
    }

    return (
        <div className={`prep-todo-row prep-todo-${status.color}`}>
            <div className="prep-todo-head">
                <span className="prep-line-name">{item.name}</span>
                <strong className="prep-todo-need">{status.prep}</strong>
            </div>
            <div className="prep-actions-row">
                <button
                    type="button" className="prep-act prep-act-done" title="Prepped back up to par"
                    onClick={() => onRecord('done', {})} disabled={state.saving}
                >
                    <i className="fa-solid fa-check" /> Done
                </button>
                <button type="button" className={`prep-act${partialOpen ? ' active' : ''}`} onClick={() => setPartialOpen(o => !o)}>
                    <i className="fa-solid fa-plus" /> Partial
                </button>
            </div>
            {partialOpen && <PrepPartialForm item={item} saving={state.saving} onMade={recordPartial} onRefuse={onRefuse} />}
            {state.saving && <p className="prep-muted">Saving…</p>}
            {state.error && <p className="prep-error">{state.error}</p>}
        </div>
    )
}

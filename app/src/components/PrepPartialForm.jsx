import { unitSuffix, parseMadeInput } from '../lib/prepSheets.js'

// The Partial box, shared by a sheet line and a "To prep" row: "Made N" in the par's unit, added on Enter or Add.
// A good amount goes to `onMade(value)`; one the parser refuses goes to `onRefuse(message)`.
export default function PrepPartialForm({ item, saving, onMade, onRefuse }) {
    function submit(e) {
        e.preventDefault()
        const { value, error } = parseMadeInput(e.currentTarget.elements.made.value)
        if (error) return onRefuse(error)
        onMade(value)
    }

    return (
        <form className="prep-inline-form" onSubmit={submit}>
            <label className="prep-have">
                <span className="prep-have-label">Made</span>
                <input name="made" type="number" inputMode="decimal" min="0" step="any" autoFocus aria-label={`How much ${item.name} you made`} />
                <span className="prep-have-unit">{unitSuffix(null, item.par_unit)}</span>
            </label>
            <button type="submit" className="prep-act prep-act-done" disabled={saving}>Add</button>
        </form>
    )
}

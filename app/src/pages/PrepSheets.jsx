import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import {
    lineStatus, quickValues, unitSuffix, groupBySection, parseHaveInput,
} from '../lib/prepSheets.js'
import '../prepSheets.css'

// The cook's name is remembered on this device, so they pick it once (spec: no typing).
const EMPLOYEE_KEY = 'prepSheets.employeeId'

// The columns one sheet line needs.
const ITEM_COLUMNS = 'id, section, name, par_text, par_qty, par_unit, have, note, changed_at, changed_by, sort_order'

// Kitchen → Prep Sheets: pick a station, then count each item. Every count saves the moment it's entered.
// The open station lives in the URL (?station=<id>) so a reload, or a link from the dashboard, lands on it.
export default function PrepSheets() {
    const [searchParams, setSearchParams] = useSearchParams()
    const [stations, setStations] = useState([])
    const [employees, setEmployees] = useState([])
    const [employeeId, setEmployeeId] = useState(() => localStorage.getItem(EMPLOYEE_KEY) || '')
    const [nameMissing, setNameMissing] = useState(false)
    const [items, setItems] = useState(null)
    const [loadError, setLoadError] = useState('')
    const [lineState, setLineState] = useState({})
    const nameRef = useRef(null)

    const station = stations.find(s => s.id === searchParams.get('station')) ?? null

    useEffect(() => { loadStationsAndCrew() }, [])
    useEffect(() => { if (station) loadItems(station.id) }, [station?.id])

    // Active stations and the active crew roster, both for pickers.
    async function loadStationsAndCrew() {
        const [stationsRes, crewRes] = await Promise.all([
            supabase.from('prep_stations').select('id, name').eq('active', true).order('sort_order'),
            supabase.from('employees').select('id, name').eq('active', true).order('name', { ascending: true }),
        ])
        if (stationsRes.error || crewRes.error) {
            console.error('Failed to load prep stations / crew:', stationsRes.error ?? crewRes.error)
            setLoadError('Could not load the prep sheets. Refresh to try again.')
            return
        }
        setStations(stationsRes.data)
        setEmployees(crewRes.data)
        // A remembered name that has since left the roster is forgotten.
        if (!crewRes.data.some(e => e.id === localStorage.getItem(EMPLOYEE_KEY))) pickEmployee('')
    }

    // One station's items, in sheet order.
    async function loadItems(stationId) {
        setItems(null)
        setLineState({})
        const { data, error } = await supabase
            .from('prep_items').select(ITEM_COLUMNS)
            .eq('station_id', stationId).eq('active', true)
            .order('sort_order')
        if (error) {
            console.error('Failed to load prep items:', error)
            setLoadError('Could not load this station. Refresh to try again.')
            return
        }
        setLoadError('')
        setItems(data)
    }

    // The name dropdown: remembered on this device.
    function pickEmployee(id) {
        setEmployeeId(id)
        setNameMissing(false)
        if (id) localStorage.setItem(EMPLOYEE_KEY, id)
        else localStorage.removeItem(EMPLOYEE_KEY)
    }

    // Saves one count. Without a name nothing is saved: the line says so and the name box is highlighted.
    async function saveCount(item, amount) {
        if (!employeeId) {
            setNameMissing(true)
            setLineError(item.id, 'Not saved: pick your name first.')
            nameRef.current?.focus()
            return
        }
        setLineState(prev => ({ ...prev, [item.id]: { saving: true } }))
        const { data, error } = await supabase.rpc('prep_record', {
            p_item_id: item.id, p_kind: 'count', p_amount: amount, p_note: null, p_employee_id: employeeId,
        })
        if (error) {
            console.error('prep_record failed:', error)
            setLineState(prev => ({ ...prev, [item.id]: { error: error.message || 'Not saved. Try again.' } }))
            return
        }
        setItems(prev => prev.map(i => (i.id === data.id ? data : i)))
        setLineState(prev => ({ ...prev, [item.id]: {} }))
    }

    // A line's own message (a refused amount) without a save.
    function setLineError(itemId, message) {
        setLineState(prev => ({ ...prev, [itemId]: { error: message } }))
    }

    return (
        <div className="prep-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        <i className="fa-solid fa-clipboard-check" style={{ marginRight: '0.5rem' }} />
                        Prep Sheets
                    </h1>
                    <p className="page-subtitle">Count what you have. The color and how much to prep update on their own.</p>
                </div>
            </div>

            {loadError && <p className="prep-error">{loadError}</p>}

            <label className={`prep-field prep-name${nameMissing ? ' prep-name-missing' : ''}`}>
                <span>Your name</span>
                <select ref={nameRef} value={employeeId} onChange={e => pickEmployee(e.target.value)}>
                    <option value="">Pick your name…</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
                {nameMissing && <span className="prep-warn">Pick your name first.</span>}
            </label>

            <div className="prep-station-tabs" role="tablist">
                {stations.map(s => (
                    <button
                        key={s.id} role="tab" aria-selected={s.id === station?.id}
                        className={`prep-station-tab${s.id === station?.id ? ' active' : ''}`}
                        onClick={() => setSearchParams({ station: s.id })}
                    >
                        {s.name}
                    </button>
                ))}
            </div>

            {!station && stations.length > 0 && <p className="prep-muted">Pick a station to open its prep sheet.</p>}
            {station && !items && !loadError && <p className="prep-muted">Loading {station.name}…</p>}
            {station && items?.length === 0 && <p className="prep-muted">{station.name} has no items yet.</p>}

            {station && items && groupBySection(items).map((group, i) => (
                <section key={`${group.section}-${i}`} className="prep-section">
                    {group.section && <h2 className="prep-section-title">{group.section}</h2>}
                    {group.items.map(item => (
                        <PrepLine
                            key={item.id} item={item} state={lineState[item.id] ?? {}}
                            onSave={amount => saveCount(item, amount)}
                            onRefuse={message => setLineError(item.id, message)}
                        />
                    ))}
                </section>
            ))}
        </div>
    )
}

// One item: name and color chip, the par and how much to prep, then the Have box and quick buttons.
function PrepLine({ item, state, onSave, onRefuse }) {
    const status = lineStatus(item)
    const have = item.have == null ? null : Number(item.have)
    const parQty = item.par_qty == null ? null : Number(item.par_qty)

    // The Have box saves when the cook leaves it or presses Enter. Blank or unchanged saves nothing.
    function commit(e) {
        const { value, error } = parseHaveInput(e.target.value)
        if (error) return onRefuse(error)
        if (value == null || value === have) return
        onSave(value)
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
                    {/* Keyed on the saved value so a save (or a refused entry) resets the box to what's stored. */}
                    <input
                        key={`${item.have}-${state.error ?? ''}`}
                        type="number" inputMode="decimal" min="0" step="any"
                        defaultValue={have ?? ''} placeholder="—"
                        onBlur={commit}
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
                            onClick={() => onSave(q.value)} disabled={state.saving}
                        >
                            {q.label}
                        </button>
                    ))}
                </div>
            )}
            {state.error && <p className="prep-error">{state.error}</p>}
        </div>
    )
}

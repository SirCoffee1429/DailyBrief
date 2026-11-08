import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { groupBySection, COUNT_LABELS, lastCountText, applyItemChange, newerCount, officeNames } from '../lib/prepSheets.js'
import PrepLine from '../components/PrepLine.jsx'
import '../prepSheets.css'

// The cook's name is remembered on this device, so they pick it once (spec: no typing). The office sheet remembers its
// own (a manager), so using one side never clears the name picked on the other.
const EMPLOYEE_KEY = 'prepSheets.employeeId'
const OFFICE_EMPLOYEE_KEY = 'prepSheets.officeEmployeeId'

// The columns one sheet line needs.
const ITEM_COLUMNS = 'id, section, name, par_text, par_qty, par_unit, have, note, changed_at, changed_by, sort_order'

// The Finish count picker, closed.
const FINISH_CLOSED = { open: false, saving: false, error: '' }

// Kitchen → Prep Sheets: pick a station, then count each item. Every change saves the moment it's entered.
// The open station lives in the URL (?station=<id>) so a reload, or a link from the dashboard, lands on it.
// `office`: the same sheet inside Office, where the name dropdown lists managers only.
export default function PrepSheets({ office = false }) {
    const employeeKey = office ? OFFICE_EMPLOYEE_KEY : EMPLOYEE_KEY
    const [searchParams, setSearchParams] = useSearchParams()
    const [stations, setStations] = useState([])
    const [employees, setEmployees] = useState([])
    const [employeeId, setEmployeeId] = useState(() => localStorage.getItem(employeeKey) || '')
    const [nameMissing, setNameMissing] = useState(false)
    const [items, setItems] = useState(null)
    const [loadError, setLoadError] = useState('')
    const [lineState, setLineState] = useState({})
    const [lastCount, setLastCount] = useState(null)
    const [finish, setFinish] = useState(FINISH_CLOSED)
    const nameRef = useRef(null)

    const station = stations.find(s => s.id === searchParams.get('station')) ?? null

    useEffect(() => { loadStationsAndCrew() }, [])
    useEffect(() => { if (station) loadStation(station.id) }, [station?.id])

    // Live updates: another device's change to the open station shows here without a reload. One channel per open
    // station, removed when the cook switches stations or leaves the page.
    useEffect(() => {
        if (!station) return
        const filter = `station_id=eq.${station.id}`
        const channel = supabase
            .channel(`prep_station_${station.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'prep_items', filter },
                change => setItems(prev => applyItemChange(prev, change)))
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'prep_counts', filter },
                change => setLastCount(prev => newerCount(prev, change.new)))
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [station?.id])

    // Active stations and the active crew roster (managers only on the office sheet), both for pickers.
    async function loadStationsAndCrew() {
        const [stationsRes, crewRes] = await Promise.all([
            supabase.from('prep_stations').select('id, name').eq('active', true).order('sort_order'),
            supabase.from('employees').select('id, name, primary_station').eq('active', true).order('name', { ascending: true }),
        ])
        if (stationsRes.error || crewRes.error) {
            console.error('Failed to load prep stations / crew:', stationsRes.error ?? crewRes.error)
            setLoadError('Could not load the prep sheets. Refresh to try again.')
            return
        }
        setStations(stationsRes.data)
        const names = office ? officeNames(crewRes.data) : crewRes.data
        setEmployees(names)
        // A remembered name that has since left the list is forgotten.
        if (!names.some(e => e.id === localStorage.getItem(employeeKey))) pickEmployee('')
    }

    // One station's items in sheet order, and its last Finish count.
    async function loadStation(stationId) {
        setItems(null)
        setLineState({})
        setLastCount(null)
        setFinish(FINISH_CLOSED)
        const [itemsRes, countRes] = await Promise.all([
            supabase.from('prep_items').select(ITEM_COLUMNS)
                .eq('station_id', stationId).eq('active', true).order('sort_order'),
            supabase.from('prep_counts').select('label, employee_name, created_at')
                .eq('station_id', stationId).order('created_at', { ascending: false }).limit(1),
        ])
        if (itemsRes.error || countRes.error) {
            console.error('Failed to load prep station:', itemsRes.error ?? countRes.error)
            setLoadError('Could not load this station. Refresh to try again.')
            return
        }
        setLoadError('')
        setItems(itemsRes.data)
        setLastCount(countRes.data[0] ?? null)
    }

    // The name dropdown: remembered on this device.
    function pickEmployee(id) {
        setEmployeeId(id)
        setNameMissing(false)
        if (id) localStorage.setItem(employeeKey, id)
        else localStorage.removeItem(employeeKey)
    }

    // Every save needs a name. Without one the name box is highlighted and focused. Returns whether a name is set.
    function haveName() {
        if (employeeId) return true
        setNameMissing(true)
        nameRef.current?.focus()
        return false
    }

    // A line's own message (a refused amount or a failed save).
    function setLineError(itemId, message) {
        setLineState(prev => ({ ...prev, [itemId]: { error: message } }))
    }

    // Saves one change to an item (count / done / partial / note). Resolves true once it's saved.
    async function record(item, kind, { amount = null, note = null }) {
        if (!haveName()) {
            setLineError(item.id, 'Not saved: pick your name first.')
            return false
        }
        setLineState(prev => ({ ...prev, [item.id]: { saving: true } }))
        const { data, error } = await supabase.rpc('prep_record', {
            p_item_id: item.id, p_kind: kind, p_amount: amount, p_note: note, p_employee_id: employeeId,
        })
        if (error) {
            console.error('prep_record failed:', error)
            setLineError(item.id, error.message || 'Not saved. Try again.')
            return false
        }
        setItems(prev => prev.map(i => (i.id === data.id ? data : i)))
        setLineState(prev => ({ ...prev, [item.id]: {} }))
        return true
    }

    // Finish count: stamps the station with the chosen label, the name and the time.
    async function finishCount(label) {
        if (!haveName()) return
        setFinish({ open: true, saving: true, error: '' })
        const { data, error } = await supabase.rpc('prep_finish_count', {
            p_station_id: station.id, p_label: label, p_employee_id: employeeId,
        })
        if (error) {
            console.error('prep_finish_count failed:', error)
            setFinish({ open: true, saving: false, error: error.message || 'Not saved. Try again.' })
            return
        }
        setLastCount(data)
        setFinish(FINISH_CLOSED)
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

            {station && items && (
                <FinishCount
                    station={station} lastCount={lastCount} finish={finish}
                    onToggle={() => setFinish(f => ({ ...f, open: !f.open, error: '' }))}
                    onPick={finishCount}
                />
            )}

            {station && items && groupBySection(items).map((group, i) => (
                <section key={`${group.section}-${i}`} className="prep-section">
                    {group.section && <h2 className="prep-section-title">{group.section}</h2>}
                    {group.items.map(item => (
                        <PrepLine
                            key={item.id} item={item} state={lineState[item.id] ?? {}}
                            onRecord={(kind, fields) => record(item, kind, fields)}
                            onRefuse={message => setLineError(item.id, message)}
                        />
                    ))}
                </section>
            ))}
        </div>
    )
}

// The station header: its last Finish count, and the button that stamps a new one.
// Finishing never blocks anything: items left alone keep their last value (spec).
function FinishCount({ station, lastCount, finish, onToggle, onPick }) {
    return (
        <div className="prep-finish">
            <div className="prep-finish-head">
                <div>
                    <div className="prep-finish-station">{station.name}</div>
                    <div className="prep-muted">Last count: {lastCountText(lastCount)}</div>
                </div>
                <button
                    type="button" className={`prep-act prep-act-done${finish.open ? ' active' : ''}`}
                    onClick={onToggle} disabled={finish.saving}
                >
                    <i className="fa-solid fa-flag-checkered" /> Finish count
                </button>
            </div>
            {finish.open && (
                <div className="prep-finish-pick">
                    <span className="prep-muted">Which count did you just finish?</span>
                    <div className="prep-finish-options">
                        {COUNT_LABELS.map(c => (
                            <button key={c.key} type="button" className="prep-act" onClick={() => onPick(c.key)} disabled={finish.saving}>
                                {c.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
            {finish.error && <p className="prep-error">{finish.error}</p>}
        </div>
    )
}

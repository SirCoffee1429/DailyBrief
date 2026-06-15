import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { SHIFT_TYPES, STATIONS, DAY_LABELS_SHORT } from '../lib/rosterConstants.js'

// Compresses a sorted day index array into a friendly label:
// [0,1,2,3] -> "Mon–Thu", [4,5] -> "Fri–Sat", [0,2,4] -> "Mon, Wed, Fri"
function dayRangeLabel(days) {
    if (!days || days.length === 0) return '—'
    const sorted = [...days].sort((a, b) => a - b)
    const contiguous = sorted.every((d, i) => i === 0 || d === sorted[i - 1] + 1)
    if (contiguous && sorted.length > 2) {
        return `${DAY_LABELS_SHORT[sorted[0]]}–${DAY_LABELS_SHORT[sorted[sorted.length - 1]]}`
    }
    return sorted.map(d => DAY_LABELS_SHORT[d]).join(', ')
}

const EXCEPTION_TYPES = [
    { value: 'closure', label: 'Closure (no service)' },
    { value: 'live_music', label: 'Live Music (+2 PM cooks)' },
    { value: 'headcount', label: 'Headcount change' },
    { value: 'note', label: 'Note only' },
]

// Coverage Template editor (office). The "demand side" the generator reads:
// standing per-station/shift/day headcount + hours (coverage_slots), plus
// per-week exceptions (coverage_exceptions) layered on for the selected week.
// `weekStart` (Monday YYYY-MM-DD) scopes the exceptions panel.
export default function CoverageTemplateSection({ weekStart = '' }) {
    const [slots, setSlots] = useState([])
    const [exceptions, setExceptions] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    // New-exception draft
    const [exType, setExType] = useState('closure')
    const [exDay, setExDay] = useState('')
    const [exShift, setExShift] = useState('PM')
    const [exStation, setExStation] = useState('')
    const [exDelta, setExDelta] = useState('')
    const [exNote, setExNote] = useState('')

    // Loads the standing template and the selected week's exceptions
    const load = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const slotsReq = supabase.from('coverage_slots').select('*').order('sort_order', { ascending: true })
            const exReq = weekStart
                ? supabase.from('coverage_exceptions').select('*').eq('week_start', weekStart).order('created_at', { ascending: true })
                : Promise.resolve({ data: [], error: null })
            const [slotsRes, exRes] = await Promise.all([slotsReq, exReq])
            if (slotsRes.error) throw slotsRes.error
            if (exRes.error) throw exRes.error
            setSlots(slotsRes.data || [])
            setExceptions(exRes.data || [])
        } catch (err) {
            console.error('Failed to load coverage template:', err)
            setError('Could not load the coverage template. Please try again.')
        } finally {
            setLoading(false)
        }
    }, [weekStart])

    useEffect(() => { load() }, [load])

    // Live refresh across office sessions
    useEffect(() => {
        const channel = supabase
            .channel('coverage_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'coverage_slots' }, () => load())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'coverage_exceptions' }, () => load())
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [load])

    // Immutable local edit to a slot field (persisted on blur / toggle)
    function editSlot(id, field, value) {
        setSlots(prev => prev.map(s => (s.id === id ? { ...s, [field]: value } : s)))
    }

    // Persists a set of fields for one slot
    async function persistSlot(id, patch) {
        try {
            const { error: updErr } = await supabase
                .from('coverage_slots')
                .update({ ...patch, updated_at: new Date().toISOString() })
                .eq('id', id)
            if (updErr) throw updErr
        } catch (err) {
            console.error('Failed to save coverage slot:', err)
            alert('Could not save that change.')
            load()
        }
    }

    // Toggles a single day in/out of a slot's day set, then persists
    function toggleSlotDay(slot, dayIdx) {
        const set = new Set(slot.days_of_week || [])
        set.has(dayIdx) ? set.delete(dayIdx) : set.add(dayIdx)
        const next = [...set].sort((a, b) => a - b)
        editSlot(slot.id, 'days_of_week', next)
        persistSlot(slot.id, { days_of_week: next })
    }

    // Toggles a slot active/off and persists
    function toggleSlotActive(slot) {
        editSlot(slot.id, 'active', !slot.active)
        persistSlot(slot.id, { active: !slot.active })
    }

    // Pool on/off (§7.2): flips active on every seasonal slot in a group
    async function setGroupActive(groupLabel, active) {
        try {
            const ids = slots.filter(s => s.group_label === groupLabel).map(s => s.id)
            const { error: updErr } = await supabase
                .from('coverage_slots')
                .update({ active, updated_at: new Date().toISOString() })
                .in('id', ids)
            if (updErr) throw updErr
            await load()
        } catch (err) {
            console.error('Failed to toggle group:', err)
            alert('Could not update that group.')
        }
    }

    // Adds a blank editable slot to a group
    async function addSlot(groupLabel, shiftType) {
        try {
            const maxSort = Math.max(0, ...slots.filter(s => s.group_label === groupLabel).map(s => s.sort_order))
            const { error: insErr } = await supabase.from('coverage_slots').insert({
                group_label: groupLabel,
                role_label: 'New slot',
                shift_type: shiftType || 'PM',
                station: null,
                days_of_week: [],
                headcount: 1,
                sort_order: maxSort + 1,
            })
            if (insErr) throw insErr
            await load()
        } catch (err) {
            console.error('Failed to add slot:', err)
            alert('Could not add a slot.')
        }
    }

    // Deletes a slot
    async function deleteSlot(slot) {
        if (!confirm(`Delete "${slot.role_label}"?`)) return
        try {
            const { error: delErr } = await supabase.from('coverage_slots').delete().eq('id', slot.id)
            if (delErr) throw delErr
            await load()
        } catch (err) {
            console.error('Failed to delete slot:', err)
            alert('Could not delete that slot.')
        }
    }

    // Adds a per-week exception for the selected week
    async function addException() {
        if (!weekStart) return
        const isLiveMusic = exType === 'live_music'
        if ((exType === 'closure' || isLiveMusic) && exDay === '') {
            alert('Pick a day for this exception.')
            return
        }
        try {
            const { error: insErr } = await supabase.from('coverage_exceptions').insert({
                week_start: weekStart,
                day_of_week: exDay === '' ? null : Number(exDay),
                exception_type: exType,
                shift_type: isLiveMusic ? 'PM' : (exType === 'headcount' ? exShift : null),
                station: exType === 'headcount' && exStation ? exStation : null,
                headcount_delta: isLiveMusic ? 2 : (exType === 'headcount' && exDelta ? Number(exDelta) : null),
                note: exNote.trim() || null,
            })
            if (insErr) throw insErr
            setExDay(''); setExStation(''); setExDelta(''); setExNote('')
            await load()
        } catch (err) {
            console.error('Failed to add exception:', err)
            alert('Could not add the exception.')
        }
    }

    // Deletes an exception
    async function deleteException(ex) {
        try {
            const { error: delErr } = await supabase.from('coverage_exceptions').delete().eq('id', ex.id)
            if (delErr) throw delErr
            await load()
        } catch (err) {
            console.error('Failed to delete exception:', err)
            alert('Could not delete that exception.')
        }
    }

    // Human summary for an exception row
    function exceptionSummary(ex) {
        const day = ex.day_of_week === null || ex.day_of_week === undefined
            ? 'All week'
            : DAY_LABELS_SHORT[ex.day_of_week]
        if (ex.exception_type === 'closure') return `${day} — Closed`
        if (ex.exception_type === 'live_music') return `${day} — Live Music (+2 PM cooks)`
        if (ex.exception_type === 'headcount') {
            const sign = ex.headcount_delta > 0 ? '+' : ''
            return `${day} — ${ex.shift_type || ''} ${ex.station || ''} ${sign}${ex.headcount_delta ?? 0}`.replace(/\s+/g, ' ').trim()
        }
        return `${day} — Note`
    }

    // Group slots in their seeded order
    const groups = []
    for (const s of slots) {
        let g = groups.find(x => x.label === s.group_label)
        if (!g) { g = { label: s.group_label, items: [], shiftType: s.shift_type }; groups.push(g) }
        g.items.push(s)
    }

    if (loading) return <p className="cov-empty">Loading coverage template…</p>

    return (
        <div className="cov-wrap">
            <div className="cov-intro">
                <i className="fa-solid fa-circle-info" />
                <span>
                    Your club's standing staffing recipe — how many people, at which station, on
                    which shift, each day. The schedule builder reads this as required coverage.
                    It defines the <strong>demand</strong>; it does not assign specific people.
                </span>
            </div>

            {error && <p className="cov-error">{error}</p>}

            {/* ── Standing template, grouped ── */}
            {groups.map(group => {
                const seasonal = group.items.some(s => s.seasonal)
                const groupOn = group.items.some(s => s.active)
                return (
                    <div key={group.label} className="cov-group">
                        <div className="cov-group-head">
                            <h4 className="cov-group-title">
                                {group.label}
                                {seasonal && <span className="cov-seasonal-tag">summer</span>}
                            </h4>
                            {seasonal ? (
                                <label className="cov-pool-toggle">
                                    <input
                                        type="checkbox"
                                        checked={groupOn}
                                        onChange={e => setGroupActive(group.label, e.target.checked)}
                                    />
                                    {groupOn ? 'On' : 'Off'}
                                </label>
                            ) : (
                                <button className="cov-add-slot" onClick={() => addSlot(group.label, group.shiftType)}>
                                    <i className="fa-solid fa-plus" /> Add
                                </button>
                            )}
                        </div>

                        <div className="cov-slot-list">
                            {group.items.map(slot => (
                                <div key={slot.id} className={`cov-slot${slot.active ? '' : ' off'}`}>
                                    {/* Active toggle */}
                                    <button
                                        className="cov-slot-active"
                                        onClick={() => toggleSlotActive(slot)}
                                        title={slot.active ? 'Active — click to turn off' : 'Off — click to turn on'}
                                    >
                                        <i className={`fa-${slot.active ? 'solid fa-circle-check' : 'regular fa-circle'}`} />
                                    </button>

                                    {/* Role label */}
                                    <input
                                        className="cov-slot-role"
                                        value={slot.role_label}
                                        onChange={e => editSlot(slot.id, 'role_label', e.target.value)}
                                        onBlur={e => persistSlot(slot.id, { role_label: e.target.value.trim() || 'Slot' })}
                                    />

                                    {/* Shift type + station */}
                                    <select
                                        className="cov-slot-shift"
                                        value={slot.shift_type}
                                        onChange={e => { editSlot(slot.id, 'shift_type', e.target.value); persistSlot(slot.id, { shift_type: e.target.value }) }}
                                    >
                                        {SHIFT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                    <select
                                        className="cov-slot-station"
                                        value={slot.station || ''}
                                        onChange={e => { const v = e.target.value || null; editSlot(slot.id, 'station', v); persistSlot(slot.id, { station: v }) }}
                                    >
                                        <option value="">— any —</option>
                                        {STATIONS.map(st => <option key={st} value={st}>{st}</option>)}
                                    </select>

                                    {/* Day toggles */}
                                    <div className="cov-days" title={dayRangeLabel(slot.days_of_week)}>
                                        {DAY_LABELS_SHORT.map((d, i) => (
                                            <button
                                                key={i}
                                                className={`cov-day${(slot.days_of_week || []).includes(i) ? ' on' : ''}`}
                                                onClick={() => toggleSlotDay(slot, i)}
                                            >
                                                {d[0]}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Headcount */}
                                    <div className="cov-hc">
                                        <input
                                            type="number"
                                            min="0"
                                            value={slot.headcount}
                                            onChange={e => editSlot(slot.id, 'headcount', e.target.value)}
                                            onBlur={e => persistSlot(slot.id, { headcount: Math.max(0, Number(e.target.value) || 0) })}
                                        />
                                        <span>cooks</span>
                                    </div>

                                    {/* Hours */}
                                    <div className="cov-times">
                                        <input
                                            type="time"
                                            value={slot.start_time ? slot.start_time.slice(0, 5) : ''}
                                            onChange={e => editSlot(slot.id, 'start_time', e.target.value)}
                                            onBlur={e => persistSlot(slot.id, { start_time: e.target.value || null })}
                                        />
                                        <span>–</span>
                                        <input
                                            type="time"
                                            value={slot.end_time ? slot.end_time.slice(0, 5) : ''}
                                            onChange={e => editSlot(slot.id, 'end_time', e.target.value)}
                                            onBlur={e => persistSlot(slot.id, { end_time: e.target.value || null })}
                                        />
                                    </div>

                                    <button className="cov-slot-del" onClick={() => deleteSlot(slot)} title="Delete slot">
                                        <i className="fa-solid fa-xmark" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            })}

            {/* ── Per-week exceptions ── */}
            <div className="cov-exceptions">
                <h4 className="cov-group-title">
                    <i className="fa-regular fa-calendar-xmark" /> Exceptions for this week
                </h4>
                {!weekStart ? (
                    <p className="cov-empty">Select a week above to add closures, Live Music, or headcount changes.</p>
                ) : (
                    <>
                        <div className="cov-ex-form">
                            <select value={exType} onChange={e => setExType(e.target.value)}>
                                {EXCEPTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                            <select value={exDay} onChange={e => setExDay(e.target.value)}>
                                <option value="">{exType === 'headcount' || exType === 'note' ? 'Whole week' : 'Pick a day'}</option>
                                {DAY_LABELS_SHORT.map((d, i) => <option key={i} value={i}>{d}</option>)}
                            </select>
                            {exType === 'headcount' && (
                                <>
                                    <select value={exShift} onChange={e => setExShift(e.target.value)}>
                                        {SHIFT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                    <select value={exStation} onChange={e => setExStation(e.target.value)}>
                                        <option value="">— any station —</option>
                                        {STATIONS.map(st => <option key={st} value={st}>{st}</option>)}
                                    </select>
                                    <input
                                        type="number"
                                        className="cov-ex-delta"
                                        placeholder="±"
                                        value={exDelta}
                                        onChange={e => setExDelta(e.target.value)}
                                    />
                                </>
                            )}
                            <input
                                type="text"
                                className="cov-ex-note"
                                placeholder="Note (optional)"
                                value={exNote}
                                onChange={e => setExNote(e.target.value)}
                            />
                            <button className="btn btn-orange btn-sm" onClick={addException}>
                                <i className="fa-solid fa-plus" /> Add
                            </button>
                        </div>

                        {exceptions.length === 0 ? (
                            <p className="cov-empty">No exceptions for this week.</p>
                        ) : (
                            <ul className="cov-ex-list">
                                {exceptions.map(ex => (
                                    <li key={ex.id} className={`cov-ex-item type-${ex.exception_type}`}>
                                        <span className="cov-ex-summary">{exceptionSummary(ex)}</span>
                                        {ex.note && <span className="cov-ex-notetext">{ex.note}</span>}
                                        <button className="cov-slot-del" onClick={() => deleteException(ex)} title="Delete">
                                            <i className="fa-solid fa-xmark" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}

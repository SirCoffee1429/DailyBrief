import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { DAY_LABELS } from '../lib/rosterConstants.js'

// Per-day entry states the editor cycles through. "none" = no DB row, which
// means "no entry" — fully available on a default week, or "inherit my
// normal week" on a specific-week override (docs/auto-scheduler-design.md §3.2).
const STATUS_OPTIONS = [
    { value: 'none', label: 'No entry' },
    { value: 'available', label: 'Available' },
    { value: 'unavailable', label: 'Unavailable' },
]

// Editable 7-day availability grid for one employee in one week context.
// weekStart === null edits the recurring "normal week"; a YYYY-MM-DD Monday
// string edits that specific week's override rows.
export default function AvailabilityWeekEditor({ employeeId, weekStart = null, onSaved }) {
    const [days, setDays] = useState({}) // day_of_week -> { status, start_time, end_time, note }
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [dirty, setDirty] = useState(false)
    const [error, setError] = useState(null)

    // Loads the 7 (or fewer) rows for this employee + week context
    const load = useCallback(async () => {
        if (!employeeId) return
        setLoading(true)
        setError(null)
        try {
            let query = supabase
                .from('employee_availability')
                .select('*')
                .eq('employee_id', employeeId)
            query = weekStart === null
                ? query.is('week_start', null)
                : query.eq('week_start', weekStart)
            const { data, error: loadErr } = await query
            if (loadErr) throw loadErr
            const map = {}
            for (const row of data || []) {
                map[row.day_of_week] = {
                    status: row.status,
                    start_time: row.start_time ? row.start_time.slice(0, 5) : '',
                    end_time: row.end_time ? row.end_time.slice(0, 5) : '',
                    note: row.note || '',
                }
            }
            setDays(map)
            setDirty(false)
        } catch (err) {
            console.error('Failed to load availability:', err)
            setError('Could not load availability. Please try again.')
        } finally {
            setLoading(false)
        }
    }, [employeeId, weekStart])

    useEffect(() => { load() }, [load])

    // Immutable per-day updates — a "none" status removes the entry entirely
    function setDay(dayIdx, patch) {
        setDays(prev => {
            const current = prev[dayIdx] || { status: 'none', start_time: '', end_time: '', note: '' }
            const next = { ...current, ...patch }
            const copy = { ...prev }
            if (next.status === 'none') {
                delete copy[dayIdx]
            } else {
                copy[dayIdx] = next
            }
            return copy
        })
        setDirty(true)
    }

    // Replace-all save: delete this context's rows, insert the current entries.
    // Simple and safe for single-editor usage (no concurrent edit expectations).
    async function save() {
        setSaving(true)
        setError(null)
        try {
            let del = supabase
                .from('employee_availability')
                .delete()
                .eq('employee_id', employeeId)
            del = weekStart === null ? del.is('week_start', null) : del.eq('week_start', weekStart)
            const { error: delErr } = await del
            if (delErr) throw delErr

            const rows = Object.entries(days).map(([dayIdx, d]) => ({
                employee_id: employeeId,
                week_start: weekStart,
                day_of_week: Number(dayIdx),
                status: d.status,
                start_time: d.start_time || null,
                end_time: d.end_time || null,
                note: d.note.trim() || null,
            }))
            if (rows.length > 0) {
                const { error: insErr } = await supabase.from('employee_availability').insert(rows)
                if (insErr) throw insErr
            }
            setDirty(false)
            if (onSaved) onSaved()
        } catch (err) {
            console.error('Failed to save availability:', err)
            setError('Could not save availability. Please try again.')
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return <div className="avail-editor-loading">Loading availability…</div>
    }

    return (
        <div className="avail-editor">
            <p className="avail-editor-hint">
                {weekStart === null
                    ? 'No entry on a day means fully available that day.'
                    : 'No entry on a day means your normal week applies that day.'}
            </p>

            {DAY_LABELS.map((label, dayIdx) => {
                const entry = days[dayIdx]
                const status = entry ? entry.status : 'none'
                return (
                    <div key={dayIdx} className={`avail-day-row avail-day-${status}`}>
                        <span className="avail-day-label">{label}</span>

                        <div className="avail-day-status">
                            {STATUS_OPTIONS.map(opt => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    className={`avail-status-btn${status === opt.value ? ' active' : ''}`}
                                    onClick={() => setDay(dayIdx, { status: opt.value })}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>

                        {status === 'available' && (
                            <div className="avail-day-times">
                                <input
                                    type="time"
                                    value={entry.start_time}
                                    onChange={e => setDay(dayIdx, { start_time: e.target.value })}
                                    title="Earliest start (blank = any time)"
                                />
                                <span className="avail-time-sep">to</span>
                                <input
                                    type="time"
                                    value={entry.end_time}
                                    onChange={e => setDay(dayIdx, { end_time: e.target.value })}
                                    title="Latest end (blank = any time)"
                                />
                            </div>
                        )}

                        {status !== 'none' && (
                            <input
                                type="text"
                                className="avail-day-note"
                                placeholder="Note (e.g. after 4pm only, no nights)"
                                value={entry.note}
                                onChange={e => setDay(dayIdx, { note: e.target.value })}
                            />
                        )}
                    </div>
                )
            })}

            {error && <p className="avail-editor-error">{error}</p>}

            <div className="avail-editor-footer">
                <button
                    type="button"
                    className="btn btn-orange"
                    onClick={save}
                    disabled={!dirty || saving}
                >
                    {saving ? 'Saving…' : dirty ? 'Save Availability' : 'Saved'}
                </button>
            </div>
        </div>
    )
}

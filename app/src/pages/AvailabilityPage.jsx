import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import AvailabilityWeekEditor from '../components/AvailabilityWeekEditor.jsx'
import { upcomingMondays } from '../lib/rosterConstants.js'

// Crew-facing availability page. Same identity pattern as Time Off: pick your
// name, no auth (v1 — revisit when real auth lands). Edits reflect live to the
// office roster and feed the schedule builder.
export default function AvailabilityPage() {
    const [employees, setEmployees] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedId, setSelectedId] = useState('')
    const [availWeek, setAvailWeek] = useState('default') // 'default' | YYYY-MM-DD Monday
    const [savedFlash, setSavedFlash] = useState(false)
    const weekOptions = useMemo(() => upcomingMondays(8), [])

    useEffect(() => {
        async function loadEmployees() {
            setLoading(true)
            try {
                const { data, error } = await supabase
                    .from('employees')
                    .select('id, name')
                    .eq('active', true)
                    .order('name', { ascending: true })
                if (error) throw error
                setEmployees(data || [])
            } catch (err) {
                console.error('Failed to load employees:', err)
            } finally {
                setLoading(false)
            }
        }
        loadEmployees()
    }, [])

    const selected = employees.find(e => e.id === selectedId) || null

    // After a crew save: flash confirmation and flag the submission for office
    // review (any crew edit returns the employee to 'pending', even if they
    // were previously approved)
    async function handleSaved() {
        setSavedFlash(true)
        setTimeout(() => setSavedFlash(false), 2500)
        try {
            await supabase
                .from('employees')
                .update({ availability_status: 'pending', updated_at: new Date().toISOString() })
                .eq('id', selectedId)
        } catch (err) {
            console.error('Failed to flag availability for review:', err)
        }
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        <i className="fa-solid fa-clock" style={{ marginRight: '0.5rem' }} />
                        My Availability
                    </h1>
                    <p className="page-subtitle">
                        Tell the schedule builder when you can work. Set your normal week once,
                        then adjust specific weeks as plans change.
                    </p>
                </div>
            </div>

            <div className="dash-card">
                <div className="form-group">
                    <label className="form-label">Who are you?</label>
                    {loading ? (
                        <p className="roster-loading">Loading crew list…</p>
                    ) : (
                        <select
                            className="avail-name-select"
                            value={selectedId}
                            onChange={e => { setSelectedId(e.target.value); setAvailWeek('default') }}
                        >
                            <option value="">— Select your name —</option>
                            {employees.map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.name}</option>
                            ))}
                        </select>
                    )}
                </div>

                {selected && (
                    <>
                        {/* Explainer — Available with no hours = open all day (matches how
                            crew naturally use it; the generator treats blank times as any time) */}
                        <div className="avail-explainer">
                            <i className="fa-solid fa-circle-info" />
                            <span>
                                <strong>Available with no times entered = you can work any time
                                that day.</strong> Only add start/end times if you're limited to
                                certain hours. Can't work a day at all? Mark it
                                <strong> Unavailable</strong>.
                            </span>
                        </div>

                        <div className="roster-avail-header">
                            <h3>Editing</h3>
                            <select value={availWeek} onChange={e => setAvailWeek(e.target.value)}>
                                <option value="default">My normal week (every week)</option>
                                {weekOptions.map(w => (
                                    <option key={w.value} value={w.value}>{w.label}</option>
                                ))}
                            </select>
                            {savedFlash && (
                                <span className="avail-saved-flash">
                                    <i className="fa-solid fa-check" /> Saved
                                </span>
                            )}
                        </div>

                        <AvailabilityWeekEditor
                            employeeId={selected.id}
                            weekStart={availWeek === 'default' ? null : availWeek}
                            onSaved={handleSaved}
                        />
                    </>
                )}
            </div>
        </div>
    )
}

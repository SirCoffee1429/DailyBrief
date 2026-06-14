import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import AvailabilityWeekEditor from '../components/AvailabilityWeekEditor.jsx'
import { SHIFT_TYPES, STATIONS, upcomingMondays } from '../lib/rosterConstants.js'

// Blank employee shape used when adding a new person
const EMPTY_EMPLOYEE = {
    name: '',
    active: true,
    eligible_shift_types: [],
    trained_stations: [],
    primary_station: null,
    max_weekly_hours: 40,
    target_weekly_hours: null,
    typical_days_per_week: null,
    availability_notes: '',
    notes: '',
}

// Office Roster Manager — single source of truth for the auto-scheduler.
// List/search/filter employees, edit all scheduling fields, and manage each
// person's availability (normal week + per-week overrides).
export default function RosterPage() {
    const [employees, setEmployees] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [showInactive, setShowInactive] = useState(false)
    const [editing, setEditing] = useState(null)   // employee row being edited (or EMPTY_EMPLOYEE)
    const [saving, setSaving] = useState(false)
    const [availWeek, setAvailWeek] = useState('default') // 'default' | YYYY-MM-DD Monday
    const weekOptions = useMemo(() => upcomingMondays(8), [])

    useEffect(() => {
        loadEmployees()

        // Live refresh when crew update their availability or anyone edits the roster
        const channel = supabase
            .channel('roster_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, () => loadEmployees())
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [])

    async function loadEmployees() {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('employees')
                .select('*')
                .order('name', { ascending: true })
            if (error) throw error
            setEmployees(data || [])
        } catch (err) {
            console.error('Failed to load roster:', err)
        } finally {
            setLoading(false)
        }
    }

    const visible = useMemo(() => {
        const q = search.trim().toLowerCase()
        return employees
            .filter(e => showInactive || e.active)
            .filter(e => !q
                || e.name.toLowerCase().includes(q)
                || (e.primary_station || '').toLowerCase().includes(q)
                || (e.trained_stations || []).some(s => s.toLowerCase().includes(q)))
    }, [employees, search, showInactive])

    function openEditor(emp) {
        setAvailWeek('default')
        setEditing(emp ? { ...emp } : { ...EMPTY_EMPLOYEE })
    }

    // Immutable field update on the employee draft
    function setField(field, value) {
        setEditing(prev => ({ ...prev, [field]: value }))
    }

    // Toggles a value in/out of an array field (shift types, stations)
    function toggleArrayField(field, value) {
        setEditing(prev => {
            const list = prev[field] || []
            const next = list.includes(value) ? list.filter(v => v !== value) : [...list, value]
            // Primary station must stay within trained stations
            const patch = { [field]: next }
            if (field === 'trained_stations' && prev.primary_station && !next.includes(prev.primary_station)) {
                patch.primary_station = null
            }
            return { ...prev, ...patch }
        })
    }

    async function saveEmployee() {
        const name = (editing.name || '').trim()
        if (!name) {
            alert('Employee name is required.')
            return
        }
        setSaving(true)
        try {
            const payload = {
                name,
                active: editing.active,
                eligible_shift_types: editing.eligible_shift_types || [],
                trained_stations: editing.trained_stations || [],
                primary_station: editing.primary_station || null,
                max_weekly_hours: Number(editing.max_weekly_hours) || 40,
                target_weekly_hours: editing.target_weekly_hours ? Number(editing.target_weekly_hours) : null,
                typical_days_per_week: editing.typical_days_per_week ? Number(editing.typical_days_per_week) : null,
                availability_notes: (editing.availability_notes || '').trim() || null,
                notes: (editing.notes || '').trim() || null,
                updated_at: new Date().toISOString(),
            }
            const result = editing.id
                ? await supabase.from('employees').update(payload).eq('id', editing.id).select().single()
                : await supabase.from('employees').insert(payload).select().single()
            if (result.error) throw result.error
            // Keep the editor open on the saved row (new employees gain an id,
            // which unlocks the availability section)
            setEditing(result.data)
            await loadEmployees()
        } catch (err) {
            console.error('Failed to save employee:', err)
            alert(err.message?.includes('employees_name_unique')
                ? 'An employee with that name already exists.'
                : 'Could not save employee. Please try again.')
        } finally {
            setSaving(false)
        }
    }

    // Office sign-off control. Sets the employee's availability workflow flag:
    //  'approved' — office has reviewed (or entered) this person's availability
    //  'none'     — clears approval (un-approve / back to untouched)
    // Office entering availability is itself the approval, so the editor's
    // onSaved handler calls this with 'approved' (see the editor wiring below).
    async function setAvailabilityStatus(emp, status) {
        try {
            const { error } = await supabase
                .from('employees')
                .update({ availability_status: status, updated_at: new Date().toISOString() })
                .eq('id', emp.id)
            if (error) throw error
            // Reflect immediately in the open editor modal if it's the same person
            setEditing(prev => (prev && prev.id === emp.id ? { ...prev, availability_status: status } : prev))
            await loadEmployees()
        } catch (err) {
            console.error('Failed to update availability status:', err)
            alert('Could not update availability status.')
        }
    }

    async function toggleActive(emp) {
        try {
            const { error } = await supabase
                .from('employees')
                .update({ active: !emp.active, updated_at: new Date().toISOString() })
                .eq('id', emp.id)
            if (error) throw error
            await loadEmployees()
        } catch (err) {
            console.error('Failed to toggle active:', err)
            alert('Could not update employee status.')
        }
    }

    async function deleteEmployee(emp) {
        if (!confirm(`Permanently delete ${emp.name}? Their availability entries will also be removed. Consider deactivating instead.`)) return
        try {
            const { error } = await supabase.from('employees').delete().eq('id', emp.id)
            if (error) throw error
            setEditing(null)
            await loadEmployees()
        } catch (err) {
            console.error('Failed to delete employee:', err)
            alert('Could not delete employee.')
        }
    }

    const activeCount = employees.filter(e => e.active).length
    const pendingCount = employees.filter(e => e.active && e.availability_status === 'pending').length

    // Badge config per availability workflow state
    const AVAIL_BADGES = {
        none: { label: 'No availability', icon: 'fa-regular fa-circle', cls: 'avail-badge-none' },
        pending: { label: 'Pending review', icon: 'fa-solid fa-hourglass-half', cls: 'avail-badge-pending' },
        approved: { label: 'Approved', icon: 'fa-solid fa-circle-check', cls: 'avail-badge-approved' },
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        <i className="fa-solid fa-users" style={{ marginRight: '0.5rem' }} />
                        Roster
                    </h1>
                    <p className="page-subtitle">
                        {activeCount} active employees — source of truth for the schedule builder.
                        {pendingCount > 0 && (
                            <span className="avail-pending-summary">
                                <i className="fa-solid fa-hourglass-half" /> {pendingCount} availability {pendingCount === 1 ? 'submission' : 'submissions'} awaiting review
                            </span>
                        )}
                    </p>
                </div>
                <button className="btn btn-orange" onClick={() => openEditor(null)}>
                    <i className="fa-solid fa-plus" /> Add Employee
                </button>
            </div>

            <div className="dash-card">
                <div className="roster-toolbar">
                    <input
                        type="text"
                        className="roster-search"
                        placeholder="Search by name or station…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    <label className="roster-inactive-toggle">
                        <input
                            type="checkbox"
                            checked={showInactive}
                            onChange={e => setShowInactive(e.target.checked)}
                        />
                        Show inactive
                    </label>
                </div>

                {loading ? (
                    <p className="roster-loading">Loading roster…</p>
                ) : visible.length === 0 ? (
                    <p className="roster-loading">No employees match.</p>
                ) : (
                    <div className="roster-list">
                        {visible.map(emp => (
                            <div
                                key={emp.id}
                                className={`roster-row${emp.active ? '' : ' roster-row-inactive'}`}
                                onClick={() => openEditor(emp)}
                            >
                                <div className="roster-row-main">
                                    <span className="roster-row-name">{emp.name}</span>
                                    <span className="roster-row-station">
                                        {emp.primary_station || (emp.trained_stations || [])[0] || '—'}
                                    </span>
                                </div>
                                <div className="roster-row-chips">
                                    {(emp.eligible_shift_types || []).map(t => (
                                        <span key={t} className="roster-chip-static">{t}</span>
                                    ))}
                                    {emp.typical_days_per_week && (
                                        <span className="roster-chip-static roster-chip-days">
                                            {emp.typical_days_per_week}d/wk
                                        </span>
                                    )}
                                    {!emp.active && <span className="roster-chip-static roster-chip-inactive">Inactive</span>}
                                </div>
                                {(() => {
                                    const badge = AVAIL_BADGES[emp.availability_status] || AVAIL_BADGES.none
                                    return (
                                        <span className={`avail-badge ${badge.cls}`} title="Availability status">
                                            <i className={badge.icon} /> {badge.label}
                                        </span>
                                    )
                                })()}
                                {emp.availability_status === 'pending' && (
                                    <button
                                        className="btn btn-orange btn-sm roster-row-toggle"
                                        onClick={e => { e.stopPropagation(); setAvailabilityStatus(emp, 'approved') }}
                                    >
                                        <i className="fa-solid fa-check" /> Approve
                                    </button>
                                )}
                                {emp.availability_status === 'approved' && (
                                    <button
                                        className="btn btn-secondary btn-sm roster-row-toggle"
                                        onClick={e => { e.stopPropagation(); setAvailabilityStatus(emp, 'none') }}
                                        title="Clear approval"
                                    >
                                        <i className="fa-solid fa-rotate-left" /> Un-approve
                                    </button>
                                )}
                                <button
                                    className="btn btn-secondary btn-sm roster-row-toggle"
                                    onClick={e => { e.stopPropagation(); toggleActive(emp) }}
                                >
                                    {emp.active ? 'Deactivate' : 'Reactivate'}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ───────── Employee editor modal ───────── */}
            {editing && (
                <div className="modal-backdrop" onClick={() => setEditing(null)}>
                    <div className="modal-content roster-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editing.id ? editing.name : 'New Employee'}</h2>
                            <button className="btn btn-secondary btn-sm" onClick={() => setEditing(null)}>
                                <i className="fa-solid fa-xmark" />
                            </button>
                        </div>

                        <div className="roster-modal-body custom-scrollbar">
                            <div className="form-group">
                                <label className="form-label">Name</label>
                                <input
                                    type="text"
                                    value={editing.name}
                                    onChange={e => setField('name', e.target.value)}
                                    placeholder="Full name"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Eligible Shift Types</label>
                                <div className="roster-chip-group">
                                    {SHIFT_TYPES.map(t => (
                                        <button
                                            key={t}
                                            type="button"
                                            className={`roster-chip${(editing.eligible_shift_types || []).includes(t) ? ' selected' : ''}`}
                                            onClick={() => toggleArrayField('eligible_shift_types', t)}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Trained Stations</label>
                                <div className="roster-chip-group">
                                    {STATIONS.map(s => (
                                        <button
                                            key={s}
                                            type="button"
                                            className={`roster-chip${(editing.trained_stations || []).includes(s) ? ' selected' : ''}`}
                                            onClick={() => toggleArrayField('trained_stations', s)}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="roster-field-grid">
                                <div className="form-group">
                                    <label className="form-label">Primary Station</label>
                                    <select
                                        value={editing.primary_station || ''}
                                        onChange={e => setField('primary_station', e.target.value || null)}
                                    >
                                        <option value="">— None —</option>
                                        {(editing.trained_stations || []).map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Max Hours / Week</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="80"
                                        value={editing.max_weekly_hours ?? 40}
                                        onChange={e => setField('max_weekly_hours', e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Target Hours (optional)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="80"
                                        value={editing.target_weekly_hours ?? ''}
                                        onChange={e => setField('target_weekly_hours', e.target.value)}
                                        placeholder="e.g. 40"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Typical Days / Week</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="7"
                                        value={editing.typical_days_per_week ?? ''}
                                        onChange={e => setField('typical_days_per_week', e.target.value)}
                                        placeholder="e.g. 5"
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Availability Notes (read by the schedule builder)</label>
                                <textarea
                                    rows="2"
                                    value={editing.availability_notes || ''}
                                    onChange={e => setField('availability_notes', e.target.value)}
                                    placeholder='e.g. "No nights Tue/Thu", "Varies weekly — enter each week"'
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">General Notes</label>
                                <textarea
                                    rows="2"
                                    value={editing.notes || ''}
                                    onChange={e => setField('notes', e.target.value)}
                                />
                            </div>

                            {/* Availability editor — only for saved employees (needs an id) */}
                            {editing.id ? (
                                <div className="roster-avail-section">
                                    <div className="roster-avail-header">
                                        <h3>Availability</h3>
                                        {(() => {
                                            const badge = AVAIL_BADGES[editing.availability_status] || AVAIL_BADGES.none
                                            return (
                                                <span className={`avail-badge ${badge.cls}`} title="Availability status">
                                                    <i className={badge.icon} /> {badge.label}
                                                </span>
                                            )
                                        })()}
                                        {editing.availability_status === 'approved' && (
                                            <button
                                                className="btn btn-secondary btn-sm"
                                                onClick={() => setAvailabilityStatus(editing, 'none')}
                                                title="Clear approval"
                                            >
                                                <i className="fa-solid fa-rotate-left" /> Un-approve
                                            </button>
                                        )}
                                        <select value={availWeek} onChange={e => setAvailWeek(e.target.value)}>
                                            <option value="default">Normal week (every week)</option>
                                            {weekOptions.map(w => (
                                                <option key={w.value} value={w.value}>{w.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {/* Saving from the office side marks this person Approved
                                        automatically — the office entering availability is the
                                        approval (auto-approve on save, confirmed by owner). */}
                                    <p className="roster-avail-note">
                                        <i className="fa-solid fa-circle-info" /> Saving marks this employee’s availability as Approved.
                                    </p>
                                    <AvailabilityWeekEditor
                                        employeeId={editing.id}
                                        weekStart={availWeek === 'default' ? null : availWeek}
                                        officeView
                                        onSaved={() => setAvailabilityStatus(editing, 'approved')}
                                    />
                                </div>
                            ) : (
                                <p className="roster-avail-placeholder">
                                    Save the employee first to set their availability.
                                </p>
                            )}
                        </div>

                        <div className="modal-footer roster-modal-footer">
                            {editing.id && (
                                <button className="btn btn-secondary roster-delete-btn" onClick={() => deleteEmployee(editing)}>
                                    <i className="fa-solid fa-trash" /> Delete
                                </button>
                            )}
                            <label className="roster-active-toggle">
                                <input
                                    type="checkbox"
                                    checked={!!editing.active}
                                    onChange={e => setField('active', e.target.checked)}
                                />
                                Active
                            </label>
                            <button className="btn btn-secondary" onClick={() => setEditing(null)}>Close</button>
                            <button className="btn btn-orange" onClick={saveEmployee} disabled={saving}>
                                {saving ? 'Saving…' : 'Save Employee'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

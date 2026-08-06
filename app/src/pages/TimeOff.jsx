import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { notifyOffice, NOTIFICATION_KINDS } from '../lib/notifications.js'

// Time off request calendar. Crew members can submit requests by typing their
// name + day(s) + time. Requests land as 'pending' and the office approves or
// denies them; office mode also enables deletion. Denied requests drop off the
// calendar (the person is not off) but stay in the office's Upcoming list as a
// record. Pending still holds a slot against the 3-person daily cap.
export default function TimeOff({ officeMode = false }) {
    const [requests, setRequests] = useState([])
    const [loading, setLoading] = useState(true)
    const [viewMonth, setViewMonth] = useState(() => {
        const now = new Date()
        return new Date(now.getFullYear(), now.getMonth(), 1)
    })
    const [formOpen, setFormOpen] = useState(false)
    const [selectedDay, setSelectedDay] = useState(null)

    useEffect(() => {
        loadRequests()

        // Realtime sync so both dashboards update the moment someone submits
        const channel = supabase
            .channel('time_off_requests_changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'time_off_requests' },
                () => loadRequests()
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    async function loadRequests() {
        setLoading(true)
        const { data } = await supabase
            .from('time_off_requests')
            .select('*')
            .order('start_date', { ascending: true })
        setRequests(data || [])
        setLoading(false)
    }

    // Office approve / deny. No notification is written: this is an office
    // action, and the office is the only audience the bell has.
    async function setRequestStatus(request, status) {
        // .select() so we can tell an applied update from a silent no-op: a
        // missing RLS UPDATE policy blocks the write by matching zero rows and
        // returns NO error, which is exactly how this shipped broken once.
        const { data, error } = await supabase
            .from('time_off_requests')
            .update({ status })
            .eq('id', request.id)
            .select()

        if (error || !data || data.length === 0) {
            console.error('Failed to update request status:', error || 'no rows updated')
            alert('Could not update that request. Please try again.')
        }
    }

    // Takes the whole request, not just the id, so the notification can record
    // who and when after the row is gone.
    async function deleteRequest(request) {
        if (!confirm('Delete this time off request?')) return
        await supabase.from('time_off_requests').delete().eq('id', request.id)

        // Cancellations are logged whoever does them. The trash button is office-only
        // (crew have no cancel path), but several managers share the one office login,
        // so one manager removing a request is still news to the others.
        notifyOffice({
            kind: NOTIFICATION_KINDS.TIME_OFF_CANCELLED,
            actorName: request.employee_name,
            summary: formatDateRange(request.start_date, request.end_date),
            link: '/office/time-off',
        })
    }

    // Build the month grid (6 weeks * 7 days) starting from Sunday-before the 1st
    const monthGrid = useMemo(() => buildMonthGrid(viewMonth), [viewMonth])

    // Group requests by ISO date string for O(1) lookup per day cell
    const requestsByDate = useMemo(() => {
        const map = new Map()
        for (const req of requests) {
            // A denied request means the person is NOT off, so their name must
            // not appear on the calendar implying otherwise. It stays in the
            // office list below as a record of what was turned down.
            if (req.status === 'denied') continue
            const start = new Date(req.start_date + 'T00:00:00')
            const end = new Date(req.end_date + 'T00:00:00')
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const key = isoDate(d)
                if (!map.has(key)) map.set(key, [])
                map.get(key).push(req)
            }
        }
        return map
    }, [requests])

    // Upcoming = requests with end_date >= today, next 60 days, sorted.
    // Pending first so the office sees what needs a decision without hunting.
    const upcoming = useMemo(() => {
        const today = isoDate(new Date())
        return requests
            .filter(r => r.end_date >= today)
            // Denied requests are kept for the office as a record; crew read this
            // list as "who is off", so a denial should simply drop out for them.
            .filter(r => officeMode || r.status !== 'denied')
            .sort((a, b) => {
                const aPending = a.status === 'pending' ? 0 : 1
                const bPending = b.status === 'pending' ? 0 : 1
                if (aPending !== bPending) return aPending - bPending
                return a.start_date.localeCompare(b.start_date)
            })
    }, [requests, officeMode])

    function prevMonth() {
        setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))
    }

    function nextMonth() {
        setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))
    }

    function openFormForDay(day) {
        if (day) {
            const dayRequests = requestsByDate.get(day) || []
            if (dayRequests.length >= 3) {
                alert(`Cannot request time off: ${new Date(day + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} is already fully booked (3-person limit reached).`);
                return;
            }
        }
        setSelectedDay(day)
        setFormOpen(true)
    }

    const monthLabel = viewMonth.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
    })
    const todayIso = isoDate(new Date())

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        <i className="fa-regular fa-calendar" style={{ marginRight: '0.5rem' }} />
                        Time Off
                    </h1>
                    <p className="page-subtitle">Request days off and see who&apos;s out.</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {!officeMode && (
                        <Link to="/kitchen/availability" className="btn btn-secondary">
                            <i className="fa-solid fa-clock" /> My Availability
                        </Link>
                    )}
                    <button className="btn btn-orange" onClick={() => openFormForDay(null)}>
                        <i className="fa-solid fa-plus" /> Request Time Off
                    </button>
                </div>
            </div>

            <div className="dash-card" style={{ marginBottom: '1rem' }}>
                <div className="time-off-calendar-header">
                    <button className="btn btn-secondary btn-sm" onClick={prevMonth}>
                        <i className="fa-solid fa-chevron-left" />
                    </button>
                    <h2 className="dash-card-heading" style={{ margin: 0 }}>{monthLabel}</h2>
                    <button className="btn btn-secondary btn-sm" onClick={nextMonth}>
                        <i className="fa-solid fa-chevron-right" />
                    </button>
                </div>

                <div className="time-off-weekday-row">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                        <div key={d} className="time-off-weekday">{d}</div>
                    ))}
                </div>

                <div className="time-off-grid">
                    {monthGrid.map(day => {
                        const key = isoDate(day)
                        const dayRequests = requestsByDate.get(key) || []
                        const inMonth = day.getMonth() === viewMonth.getMonth()
                        const isToday = key === todayIso
                        const isFullyBooked = dayRequests.length >= 3
                        return (
                            <button
                                key={key}
                                type="button"
                                className={`time-off-day ${inMonth ? '' : 'out-of-month'} ${isToday ? 'today' : ''} ${isFullyBooked ? 'fully-booked' : ''}`}
                                onClick={() => openFormForDay(key)}
                            >
                                <div className="time-off-day-number">{day.getDate()}</div>
                                <div className="time-off-day-list">
                                    {dayRequests.slice(0, 3).map(r => (
                                        <div
                                            key={r.id}
                                            className={`time-off-pill time-off-pill-${r.time_type}`}
                                            title={formatRequestLabel(r)}
                                        >
                                            {r.employee_name}
                                            <span className="time-off-pill-time">
                                                {timeTypeShort(r)}
                                            </span>
                                        </div>
                                    ))}
                                    {dayRequests.length > 3 && (
                                        <div className="time-off-pill-more">
                                            +{dayRequests.length - 3} more
                                        </div>
                                    )}
                                    {isFullyBooked && (
                                        <div className="time-off-fully-booked-badge">
                                            <i className="fa-solid fa-lock" /> Full
                                        </div>
                                    )}
                                </div>
                            </button>
                        )
                    })}
                </div>
            </div>

            <div className="dash-card">
                <h2 className="dash-card-heading">Upcoming</h2>
                {loading ? (
                    <p style={{ color: 'var(--text-muted)' }}>Loading&hellip;</p>
                ) : upcoming.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>No upcoming time off requests.</p>
                ) : (
                    <ul className="time-off-upcoming-list">
                        {upcoming.map(r => (
                            <li key={r.id} className="time-off-upcoming-item">
                                <div className="time-off-upcoming-main">
                                    <strong>{r.employee_name}</strong>
                                    <span className="time-off-upcoming-dates">
                                        {formatDateRange(r.start_date, r.end_date)}
                                    </span>
                                    <span className="time-off-upcoming-time">
                                        {formatRequestLabel(r)}
                                    </span>
                                    {/* Approved is the resting state, so only the two
                                        states that need attention get a pill */}
                                    {r.status === 'pending' && (
                                        <span className="time-off-status-pill time-off-status-pending">
                                            <i className="fa-solid fa-hourglass-half" /> Pending
                                        </span>
                                    )}
                                    {r.status === 'denied' && (
                                        <span className="time-off-status-pill time-off-status-denied">
                                            <i className="fa-solid fa-ban" /> Denied
                                        </span>
                                    )}
                                </div>
                                {officeMode && (
                                    <div className="time-off-upcoming-actions">
                                        {r.status !== 'approved' && (
                                            <button
                                                className="btn btn-orange btn-sm"
                                                onClick={() => setRequestStatus(r, 'approved')}
                                                title={r.status === 'denied' ? 'Reverse this denial' : 'Approve request'}
                                            >
                                                <i className="fa-solid fa-check" /> Approve
                                            </button>
                                        )}
                                        {r.status === 'pending' && (
                                            <button
                                                className="btn btn-secondary btn-sm"
                                                onClick={() => setRequestStatus(r, 'denied')}
                                                title="Deny request"
                                            >
                                                <i className="fa-solid fa-xmark" /> Deny
                                            </button>
                                        )}
                                        <button
                                            className="btn-icon-danger"
                                            onClick={() => deleteRequest(r)}
                                            title="Delete request"
                                        >
                                            <i className="fa-solid fa-trash" />
                                        </button>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {formOpen && (
                <RequestFormModal
                    defaultDate={selectedDay}
                    onClose={() => setFormOpen(false)}
                    onSaved={request => {
                        setFormOpen(false)
                        loadRequests()
                        // Only crew submissions are news. This same page runs in the
                        // office with officeMode, where a manager entering a request
                        // on someone's behalf would just be notifying themselves.
                        if (!officeMode) {
                            notifyOffice({
                                kind: NOTIFICATION_KINDS.TIME_OFF_CREATED,
                                actorName: request.employee_name,
                                summary: `${formatDateRange(request.start_date, request.end_date)} · ${formatRequestLabel(request)}`,
                                link: '/office/time-off',
                            })
                        }
                    }}
                />
            )}
        </div>
    )
}

// Modal form for submitting a new request. Kept inside this file because it's
// only used here and sharing state via closure is cleaner than a prop drill.
function RequestFormModal({ defaultDate, onClose, onSaved }) {
    const [name, setName] = useState('')
    const [startDate, setStartDate] = useState(defaultDate || isoDate(new Date()))
    const [endDate, setEndDate] = useState(defaultDate || isoDate(new Date()))
    const [timeType, setTimeType] = useState('full')
    const [startTime, setStartTime] = useState('09:00')
    const [endTime, setEndTime] = useState('17:00')
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState(null)

    async function handleSubmit(e) {
        e.preventDefault()
        setError(null)

        const trimmedName = name.trim()
        if (!trimmedName) {
            setError('Please enter your name.')
            return
        }
        if (endDate < startDate) {
            setError('End date must be on or after start date.')
            return
        }
        if (timeType === 'custom' && endTime <= startTime) {
            setError('End time must be after start time.')
            return
        }

        setSubmitting(true)

        // Query database directly to check for overlapping requests and enforce the 2-person limit
        // Pending requests still hold their slot — nobody should be told a day is
        // open while three people are waiting on an answer for it. Only a denial
        // gives the slot back.
        const { data: overlapping, error: fetchError } = await supabase
            .from('time_off_requests')
            .select('id, employee_name, start_date, end_date')
            .neq('status', 'denied')
            .gte('end_date', startDate)
            .lte('start_date', endDate)

        if (fetchError) {
            setError('Failed to verify calendar capacity: ' + fetchError.message)
            setSubmitting(false)
            return
        }

        // Check if any date in the requested range already has 2 or more requests
        const start = new Date(startDate + 'T00:00:00')
        const end = new Date(endDate + 'T00:00:00')
        const blockedDates = []

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const currentDateStr = isoDate(d)
            let count = 0
            for (const req of overlapping) {
                if (currentDateStr >= req.start_date && currentDateStr <= req.end_date) {
                    count++
                }
            }
            if (count >= 3) {
                const formattedDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                blockedDates.push(formattedDate)
            }
        }

        if (blockedDates.length > 0) {
            setError(`Cannot submit request: the following date(s) are already fully booked (3-person limit): ${blockedDates.join(', ')}`)
            setSubmitting(false)
            return
        }

        const payload = {
            employee_name: trimmedName,
            start_date: startDate,
            end_date: endDate,
            time_type: timeType,
            start_time: timeType === 'custom' ? startTime : null,
            end_time: timeType === 'custom' ? endTime : null,
        }
        const { error: insertError } = await supabase
            .from('time_off_requests')
            .insert(payload)
        setSubmitting(false)

        if (insertError) {
            setError(insertError.message)
            return
        }
        onSaved(payload)
    }

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                <div className="modal-header">
                    <h2>Request Time Off</h2>
                    <button className="btn-close" onClick={onClose}>
                        <i className="fa-solid fa-xmark" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    <div className="form-group">
                        <label className="form-label">Your Name</label>
                        <input
                            type="text"
                            className="input"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="e.g. Ryan"
                            required
                            autoFocus
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div className="form-group">
                            <label className="form-label">Start Date</label>
                            <input
                                type="date"
                                className="input"
                                value={startDate}
                                onChange={e => {
                                    setStartDate(e.target.value)
                                    // Keep end_date valid
                                    if (endDate < e.target.value) setEndDate(e.target.value)
                                }}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">End Date</label>
                            <input
                                type="date"
                                className="input"
                                value={endDate}
                                min={startDate}
                                onChange={e => setEndDate(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Time</label>
                        <div className="time-off-time-type-grid">
                            {[
                                { v: 'full', label: 'Full Day' },
                                { v: 'am', label: 'AM Only' },
                                { v: 'pm', label: 'PM Only' },
                                { v: 'custom', label: 'Custom' },
                            ].map(opt => (
                                <button
                                    key={opt.v}
                                    type="button"
                                    className={`time-off-time-type-btn ${timeType === opt.v ? 'active' : ''}`}
                                    onClick={() => setTimeType(opt.v)}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {timeType === 'custom' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            <div className="form-group">
                                <label className="form-label">From</label>
                                <input
                                    type="time"
                                    className="input"
                                    value={startTime}
                                    onChange={e => setStartTime(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Until</label>
                                <input
                                    type="time"
                                    className="input"
                                    value={endTime}
                                    onChange={e => setEndTime(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                    )}

                    {error && (
                        <div style={{ color: 'var(--danger, #e66b35)', fontSize: '0.9rem' }}>
                            {error}
                        </div>
                    )}

                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-orange" disabled={submitting}>
                            {submitting ? 'Submitting...' : 'Submit Request'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

// Local-date YYYY-MM-DD (avoids UTC shift from toISOString)
function isoDate(d) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
}

// 6-week grid starting on the Sunday before (or on) the 1st of the month
function buildMonthGrid(viewMonth) {
    const first = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1)
    const gridStart = new Date(first)
    gridStart.setDate(first.getDate() - first.getDay())
    const days = []
    for (let i = 0; i < 42; i++) {
        const d = new Date(gridStart)
        d.setDate(gridStart.getDate() + i)
        days.push(d)
    }
    return days
}

function timeTypeShort(r) {
    if (r.time_type === 'full') return ''
    if (r.time_type === 'am') return 'AM'
    if (r.time_type === 'pm') return 'PM'
    return `${formatTime(r.start_time)}-${formatTime(r.end_time)}`
}

function formatRequestLabel(r) {
    if (r.time_type === 'full') return 'Full day'
    if (r.time_type === 'am') return 'AM only'
    if (r.time_type === 'pm') return 'PM only'
    return `${formatTime(r.start_time)} – ${formatTime(r.end_time)}`
}

function formatTime(t) {
    if (!t) return ''
    const [h, m] = t.split(':')
    const hr = parseInt(h, 10)
    const suffix = hr >= 12 ? 'pm' : 'am'
    const h12 = ((hr + 11) % 12) + 1
    return m === '00' ? `${h12}${suffix}` : `${h12}:${m}${suffix}`
}

function formatDateRange(start, end) {
    const s = new Date(start + 'T00:00:00')
    const e = new Date(end + 'T00:00:00')
    const opts = { month: 'short', day: 'numeric' }
    if (start === end) return s.toLocaleDateString('en-US', opts)
    // Same month shortcut (e.g. "Apr 25–27")
    if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
        return `${s.toLocaleDateString('en-US', opts)}–${e.getDate()}`
    }
    return `${s.toLocaleDateString('en-US', opts)} – ${e.toLocaleDateString('en-US', opts)}`
}

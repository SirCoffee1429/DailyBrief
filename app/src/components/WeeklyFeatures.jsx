import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAYS_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function getWeekStart(date = new Date()) {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    d.setDate(diff)
    d.setHours(0, 0, 0, 0)
    return d.toISOString().split('T')[0]
}

function getDayDate(weekStart, dayIdx) {
    const d = new Date(weekStart + 'T00:00:00')
    d.setDate(d.getDate() + dayIdx)
    return d.getDate()
}

export default function WeeklyFeatures({ readOnly = false }) {
    const [weekStart, setWeekStart] = useState(() => getWeekStart())
    const [features, setFeatures] = useState({})
    const [editing, setEditing] = useState(null)
    const [editValue, setEditValue] = useState('')
    const [saving, setSaving] = useState(false)

    const isCurrentWeek = weekStart === getWeekStart()
    const now = new Date()
    const todayDow = now.getDay()
    const todayIdx = todayDow === 0 ? 6 : todayDow - 1

    // Mobile: which day is expanded (defaults to today)
    const [mobileDay, setMobileDay] = useState(todayIdx)

    useEffect(() => {
        loadFeatures()
    }, [weekStart])

    // Live sync
    useEffect(() => {
        const channel = supabase
            .channel(`weekly_features_${weekStart}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'weekly_features' },
                () => loadFeatures()
            )
            .subscribe()
        return () => {
            supabase.removeChannel(channel)
        }
    }, [weekStart])

    async function loadFeatures() {
        const { data } = await supabase
            .from('weekly_features')
            .select('*')
            .eq('week_start', weekStart)
        const map = {}
        ;(data || []).forEach(f => {
            map[`${f.day_of_week}-${f.meal}`] = f
        })
        setFeatures(map)
    }

    function shiftWeek(dir) {
        const d = new Date(weekStart + 'T00:00:00')
        d.setDate(d.getDate() + dir * 7)
        setWeekStart(d.toISOString().split('T')[0])
    }

    function startEdit(dayIdx, meal) {
        const key = `${dayIdx}-${meal}`
        setEditing(key)
        setEditValue(features[key]?.content || '')
    }

    async function saveEdit(dayIdx, meal) {
        const key = `${dayIdx}-${meal}`
        const content = editValue.trim()
        setSaving(true)

        if (!content) {
            const existing = features[key]
            if (existing) {
                await supabase.from('weekly_features').delete().eq('id', existing.id)
            }
        } else {
            const existing = features[key]
            if (existing) {
                await supabase.from('weekly_features').update({ content, updated_at: new Date().toISOString() }).eq('id', existing.id)
            } else {
                await supabase.from('weekly_features').insert({
                    week_start: weekStart,
                    day_of_week: dayIdx,
                    meal,
                    content,
                })
            }
        }

        setEditing(null)
        setEditValue('')
        setSaving(false)
        await loadFeatures()
    }

    // Week label
    const ws = new Date(weekStart + 'T00:00:00')
    const we = new Date(ws)
    we.setDate(we.getDate() + 6)
    const monthLabel = ws.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

    const placeholderText = readOnly ? '—' : '+ Add'

    // Renders the editable/read-only cell for a single meal
    function renderMealCell(dayIdx, meal, label, mobileSized) {
        const key = `${dayIdx}-${meal}`
        const entry = features[key]
        const isEditing = editing === key && !readOnly

        const handleCellClick = () => {
            if (readOnly) return
            setEditing(key)
            setEditValue(entry?.content || '')
        }

        return (
            <div className={mobileSized ? 'features-mobile-meal' : 'office-v2-cal-item'}>
                <span className={mobileSized ? 'features-mobile-meal-label' : 'office-v2-cal-item-label'}>{label}: </span>
                {isEditing ? (
                    <textarea
                        autoFocus
                        title={`${label} Feature`}
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter') { e.preventDefault(); e.target.blur() }
                            else if (e.key === 'Escape') setEditing(null)
                        }}
                        onBlur={() => saveEdit(dayIdx, meal)}
                        disabled={saving}
                        placeholder={`Add ${meal}...`}
                        className={mobileSized ? 'features-mobile-textarea' : undefined}
                        style={mobileSized ? undefined : { width: '100%', background: 'transparent', color: '#fff', border: 'none', outline: 'none', resize: 'none', fontSize: '0.75rem', marginTop: '0.25rem', padding: 0 }}
                        rows={mobileSized ? 2 : 3}
                    />
                ) : (
                    <span
                        onClick={handleCellClick}
                        className={mobileSized ? 'features-mobile-meal-content' : undefined}
                        style={mobileSized ? { opacity: entry?.content ? 1 : 0.5, cursor: readOnly ? 'default' : 'pointer' } : { color: '#d1d5db', cursor: readOnly ? 'default' : 'pointer', whiteSpace: 'pre-wrap', display: 'block', minHeight: '1.5rem', opacity: entry?.content ? 1 : 0.5 }}
                    >
                        {entry?.content || placeholderText}
                    </span>
                )}
            </div>
        )
    }

    return (
        <section className={`office-v2-widget${readOnly ? ' kitchen-themed' : ''}`} style={{ padding: 0, paddingBottom: 0, display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div className="office-v2-panel-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <h2 className="office-v2-panel-title">Lunch & Dinner Features</h2>
                    {!isCurrentWeek && (
                        <button onClick={() => { setWeekStart(getWeekStart()); setMobileDay(todayIdx) }} style={{ background: 'rgba(230,107,53,0.1)', color: '#e66b35', border: 'none', borderRadius: '4px', padding: '2px 6px', fontSize: '10px', cursor: 'pointer', fontWeight: 'bold' }}>TODAY</button>
                    )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', color: '#9ca3af' }}>
                    <button onClick={() => shiftWeek(-1)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}><i className="fa-solid fa-chevron-left" style={{ fontSize: '0.75rem' }}></i></button>
                    <span style={{ margin: '0 0.5rem', fontSize: '0.875rem' }}>{monthLabel}</span>
                    <button onClick={() => shiftWeek(1)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}><i className="fa-solid fa-chevron-right" style={{ fontSize: '0.75rem' }}></i></button>
                </div>
            </div>

            {/* ── Desktop: 7-column grid (hidden on mobile) ── */}
            <div className="features-desktop">
                <div className="office-v2-calendar-grid">
                    {DAYS.map((dayName, dayIdx) => {
                        const isToday = isCurrentWeek && dayIdx === todayIdx
                        const dateNum = getDayDate(weekStart, dayIdx)
                        return (
                            <div key={`header-${dayIdx}`} className={`office-v2-cal-header-cell ${isToday ? 'active' : ''}`}>
                                {dayName} {dateNum}
                            </div>
                        )
                    })}
                </div>

                <div className="office-v2-calendar-grid" style={{ minHeight: '120px' }}>
                    {DAYS.map((dayName, dayIdx) => {
                        const isToday = isCurrentWeek && dayIdx === todayIdx
                        return (
                            <div key={`cell-${dayIdx}`} className={`office-v2-cal-cell ${isToday ? 'active' : ''}`}>
                                {renderMealCell(dayIdx, 'lunch', 'Lunch', false)}
                                {renderMealCell(dayIdx, 'dinner', 'Dinner', false)}
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* ── Mobile: today-focused (hidden on desktop) ── */}
            <div className="features-mobile">
                {/* Day pills */}
                <div className="features-mobile-pills">
                    {DAYS.map((dayName, dayIdx) => {
                        const isToday = isCurrentWeek && dayIdx === todayIdx
                        const isSelected = dayIdx === mobileDay
                        const dateNum = getDayDate(weekStart, dayIdx)
                        const hasContent = features[`${dayIdx}-lunch`]?.content || features[`${dayIdx}-dinner`]?.content
                        return (
                            <button
                                key={dayIdx}
                                onClick={() => setMobileDay(dayIdx)}
                                className={`features-mobile-pill ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                            >
                                <span className="features-mobile-pill-day">{dayName}</span>
                                <span className="features-mobile-pill-date">{dateNum}</span>
                                {hasContent && <span className="features-mobile-pill-dot" />}
                            </button>
                        )
                    })}
                </div>

                {/* Expanded day content */}
                <div className="features-mobile-expanded">
                    <div className="features-mobile-day-title">
                        {DAYS_FULL[mobileDay]}
                        {isCurrentWeek && mobileDay === todayIdx && (
                            <span className="features-mobile-today-tag">Today</span>
                        )}
                    </div>
                    {renderMealCell(mobileDay, 'lunch', 'Lunch', true)}
                    {renderMealCell(mobileDay, 'dinner', 'Dinner', true)}
                </div>
            </div>
        </section>
    )
}

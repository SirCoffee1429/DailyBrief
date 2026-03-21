import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

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

export default function WeeklyFeatures() {
    const [weekStart, setWeekStart] = useState(() => getWeekStart())
    const [features, setFeatures] = useState({})
    const [editing, setEditing] = useState(null)
    const [editValue, setEditValue] = useState('')
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        loadFeatures()
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

    function handleKeyDown(e, dayIdx, meal) {
        if (e.key === 'Enter') saveEdit(dayIdx, meal)
        else if (e.key === 'Escape') setEditing(null)
    }

    // Week label
    const ws = new Date(weekStart + 'T00:00:00')
    const we = new Date(ws)
    we.setDate(we.getDate() + 6)
    const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const monthLabel = ws.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

    const isCurrentWeek = weekStart === getWeekStart()
    const now = new Date()
    const todayDow = now.getDay()
    const todayIdx = todayDow === 0 ? 6 : todayDow - 1

    return (
        <div className="wf-calendar">
            {/* Calendar Header */}
            <div className="wf-cal-header">
                <div className="wf-cal-title">
                    <i className="fa-solid fa-utensils" />
                    <h3>Lunch & Dinner Features</h3>
                </div>
                <div className="wf-cal-nav">
                    <button className="wf-nav-btn" onClick={() => shiftWeek(-1)}><i className="fa-solid fa-chevron-left" /></button>
                    <span className="wf-cal-month">{monthLabel}</span>
                    <button className="wf-nav-btn" onClick={() => shiftWeek(1)}><i className="fa-solid fa-chevron-right" /></button>
                    {!isCurrentWeek && (
                        <button className="wf-today-btn" onClick={() => setWeekStart(getWeekStart())}>Today</button>
                    )}
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="wf-cal-grid">
                {DAYS.map((dayName, dayIdx) => {
                    const isToday = isCurrentWeek && dayIdx === todayIdx
                    const dateNum = getDayDate(weekStart, dayIdx)
                    const lunchKey = `${dayIdx}-lunch`
                    const dinnerKey = `${dayIdx}-dinner`
                    const lunch = features[lunchKey]
                    const dinner = features[dinnerKey]

                    return (
                        <div key={dayIdx} className={`wf-cal-day ${isToday ? 'wf-cal-today' : ''}`}>
                            <div className="wf-cal-day-head">
                                <span className="wf-cal-day-name">{dayName}</span>
                                <span className={`wf-cal-day-num ${isToday ? 'wf-cal-num-today' : ''}`}>{dateNum}</span>
                            </div>

                            {/* Lunch */}
                            <div className="wf-cal-meal">
                                <span className="wf-cal-meal-tag wf-cal-lunch">Lunch</span>
                                {editing === lunchKey ? (
                                    <input
                                        className="wf-cal-input"
                                        autoFocus
                                        value={editValue}
                                        onChange={e => setEditValue(e.target.value)}
                                        onKeyDown={e => handleKeyDown(e, dayIdx, 'lunch')}
                                        onBlur={() => saveEdit(dayIdx, 'lunch')}
                                        disabled={saving}
                                        placeholder="Lunch special..."
                                    />
                                ) : (
                                    <div
                                        className={`wf-cal-meal-text ${lunch?.content ? '' : 'wf-cal-empty'}`}
                                        onClick={() => startEdit(dayIdx, 'lunch')}
                                    >
                                        {lunch?.content || '+ Add'}
                                    </div>
                                )}
                            </div>

                            {/* Dinner */}
                            <div className="wf-cal-meal">
                                <span className="wf-cal-meal-tag wf-cal-dinner">Dinner</span>
                                {editing === dinnerKey ? (
                                    <input
                                        className="wf-cal-input"
                                        autoFocus
                                        value={editValue}
                                        onChange={e => setEditValue(e.target.value)}
                                        onKeyDown={e => handleKeyDown(e, dayIdx, 'dinner')}
                                        onBlur={() => saveEdit(dayIdx, 'dinner')}
                                        disabled={saving}
                                        placeholder="Dinner special..."
                                    />
                                ) : (
                                    <div
                                        className={`wf-cal-meal-text ${dinner?.content ? '' : 'wf-cal-empty'}`}
                                        onClick={() => startEdit(dayIdx, 'dinner')}
                                    >
                                        {dinner?.content || '+ Add'}
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

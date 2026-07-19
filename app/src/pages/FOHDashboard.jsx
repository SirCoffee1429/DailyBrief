import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

import WeatherWidget from '../components/WeatherWidget.jsx'
import EightySixFeed from '../components/EightySixFeed.jsx'
import WeeklyFeatures from '../components/WeeklyFeatures.jsx'
import { formatBriefingByline } from '../lib/dates.js'

// Front of House dashboard — mirrors the Kitchen layout but:
//  - Filters briefings to destinations 'foh' or 'both' (no kitchen-only notes)
//  - Drops the Previous Night's Sales card
//  - Labels the briefing card "Shift Notes"
//  - Shifts the Lunch & Dinner Features calendar above the grid for visibility
export default function FOHDashboard() {
    const navigate = useNavigate()
    const [todaysBriefings, setTodaysBriefings] = useState([])
    const [tasks, setTasks] = useState([])

    const [showMenu, setShowMenu] = useState(false)
    const menuRef = useRef(null)

    const briefingDate = todaysBriefings[0]?.date || null

    // Load every briefing on the most recent posted date, newest first — several managers
    // post per day and each one's notes need to be readable without hunting for them.
    useEffect(() => {
        async function load() {
            const { data: latestDate } = await supabase
                .from('briefings')
                .select('date')
                .in('destination', ['foh', 'both'])
                .order('date', { ascending: false })
                .limit(1)
                .maybeSingle()
            if (latestDate) {
                const { data: dayBriefings } = await supabase
                    .from('briefings')
                    .select('*')
                    .eq('date', latestDate.date)
                    .in('destination', ['foh', 'both'])
                    .order('created_at', { ascending: false })

                setTodaysBriefings(dayBriefings || [])
            }
        }
        load()
    }, [])

    // Merge the tasks from all of that day's briefings into one list
    useEffect(() => {
        async function loadTasks() {
            if (todaysBriefings.length === 0) {
                setTasks([])
                return
            }
            const briefingIds = todaysBriefings.map(b => b.id)
            const { data: taskData } = await supabase
                .from('briefing_tasks')
                .select('*')
                .in('briefing_id', briefingIds)

            // sort_order restarts at 0 for each briefing, so group by parent briefing first
            // (matching the stack order) before falling back to each list's own order.
            const briefingRank = new Map(briefingIds.map((id, i) => [id, i]))
            setTasks(
                [...(taskData || [])].sort((a, b) =>
                    briefingRank.get(a.briefing_id) - briefingRank.get(b.briefing_id) ||
                    a.sort_order - b.sort_order
                )
            )
        }
        loadTasks()
    }, [todaysBriefings])

    useEffect(() => {
        function handleClick(e) {
            if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false)
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [])

    async function toggleTask(taskId, isCompleted) {
        await supabase
            .from('briefing_tasks')
            .update({ is_completed: !isCompleted })
            .eq('id', taskId)
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, is_completed: !isCompleted } : t))
    }

    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <div className="header-left">
                    <h1 className="header-title"><i className="fa-solid fa-utensils title-icon" /> Front of House</h1>
                    <p className="header-date" style={{ marginTop: 'var(--space-1)' }}>
                        {briefingDate
                            ? new Date(briefingDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
                            : today
                        }
                    </p>
                </div>
                <div className="header-actions" ref={menuRef}>
                    <button className="header-icon-btn" aria-label="Settings" onClick={() => setShowMenu(prev => !prev)}>
                        <i className="fa-solid fa-gear" />
                    </button>
                    {showMenu && (
                        <div className="settings-dropdown">
                            <button className="settings-dropdown-item" onClick={() => { setShowMenu(false); navigate('/') }}>
                                <i className="fa-solid fa-arrow-right-from-bracket" /> Log Out
                            </button>
                        </div>
                    )}
                </div>
            </header>

            <div style={{ marginBottom: 'var(--space-5)' }}>
                <WeatherWidget />
            </div>

            <WeeklyFeatures readOnly />

            <div className="dashboard-grid">
                <div className="dash-card morning-notes-card">
                    {todaysBriefings.length > 0 ? (
                        <div className="briefing-stack">
                            {todaysBriefings.map(briefing => (
                                <article key={briefing.id} className="briefing-block">
                                    <div className="briefing-block-head">
                                        <div>
                                            {briefing.title && <h3 className="briefing-block-title">{briefing.title}</h3>}
                                            <div className="briefing-block-byline">{formatBriefingByline(briefing)}</div>
                                        </div>
                                        <Link
                                            to={`/office/briefings/${briefing.id}/edit`}
                                            className="briefing-block-edit"
                                            aria-label={`Edit ${briefing.title || 'shift notes'}`}
                                        >
                                            <i className="fa-solid fa-pen" />
                                        </Link>
                                    </div>
                                    <ul className="notes-list">
                                        {briefing.body ? (
                                            briefing.body.split('\n').filter(line => line.trim()).map((line, i) => (
                                                <li key={i}>{line.replace(/^- /, '')}</li>
                                            ))
                                        ) : (
                                            <li>No shift notes on this post.</li>
                                        )}
                                    </ul>
                                </article>
                            ))}
                        </div>
                    ) : (
                        <>
                            <div className="notes-list empty">Nothing posted for the floor</div>
                            <Link to="/office/briefings/new" className="btn btn-primary btn-orange mt-auto inline-flex">Create Shift Notes</Link>
                        </>
                    )}
                </div>

                <div className="dash-card tasks-card">
                    <div className="card-header-row">
                        <h2 className="dash-card-heading"><i className="fa-solid fa-list-check" style={{ color: 'var(--accent)' }} /> Tasks</h2>
                        <span className="task-count-badge">
                            {tasks.filter(t => t.is_completed).length}/{Math.max(tasks.length, 1)}
                        </span>
                    </div>

                    <div className="task-list">
                        {tasks.length > 0 ? (
                            tasks.map(task => (
                                <label key={task.id} className="task-row">
                                    <input
                                        type="checkbox"
                                        className="task-box"
                                        checked={task.is_completed}
                                        onChange={() => toggleTask(task.id, task.is_completed)}
                                    />
                                    <span className={`task-label ${task.is_completed ? 'completed' : ''}`}>
                                        {task.description}
                                    </span>
                                </label>
                            ))
                        ) : (
                            <div className="empty-task-list">No tasks.</div>
                        )}
                    </div>
                    {todaysBriefings.length > 0 && <div className="updated-text">Updated 5m ago</div>}
                </div>

                <EightySixFeed />
            </div>

        </div>
    )
}

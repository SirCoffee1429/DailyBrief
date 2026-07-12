import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

import WeatherWidget from '../components/WeatherWidget.jsx'
import EightySixFeed from '../components/EightySixFeed.jsx'
import WeeklyFeatures from '../components/WeeklyFeatures.jsx'

// Front of House dashboard — mirrors the Kitchen layout but:
//  - Filters briefings to destinations 'foh' or 'both' (no kitchen-only notes)
//  - Drops the Previous Night's Sales card
//  - Labels the briefing card "Shift Notes"
//  - Shifts the Lunch & Dinner Features calendar above the grid for visibility
export default function FOHDashboard() {
    const navigate = useNavigate()
    const [todaysBriefings, setTodaysBriefings] = useState([])
    const [activeIndex, setActiveIndex] = useState(0)
    const [tasks, setTasks] = useState([])

    const [showMenu, setShowMenu] = useState(false)
    const menuRef = useRef(null)

    const latestBriefing = todaysBriefings[activeIndex] || null

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
                    .order('created_at', { ascending: true })

                setTodaysBriefings(dayBriefings || [])
                setActiveIndex(0)
            }
        }
        load()
    }, [])

    useEffect(() => {
        async function loadTasks() {
            if (!latestBriefing) {
                setTasks([])
                return
            }
            const { data: taskData } = await supabase
                .from('briefing_tasks')
                .select('*')
                .eq('briefing_id', latestBriefing.id)
                .order('sort_order')
            setTasks(taskData || [])
        }
        loadTasks()
    }, [latestBriefing])

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
                        {latestBriefing
                            ? new Date(latestBriefing.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
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
                    {todaysBriefings.length > 1 && (
                        <div className="briefing-cycler">
                            <button className="briefing-cycler-btn" disabled={activeIndex === 0} onClick={() => setActiveIndex(activeIndex - 1)} aria-label="Previous Shift Notes">
                                <i className="fa-solid fa-chevron-left" />
                            </button>
                            <span className="briefing-cycler-label">
                                <i className="fa-solid fa-layer-group" style={{ marginRight: '6px', opacity: 0.7 }} />
                                Shift Notes {activeIndex + 1} of {todaysBriefings.length}
                            </span>
                            <button className="briefing-cycler-btn" disabled={activeIndex >= todaysBriefings.length - 1} onClick={() => setActiveIndex(activeIndex + 1)} aria-label="Next Shift Notes">
                                <i className="fa-solid fa-chevron-right" />
                            </button>
                        </div>
                    )}

                    {latestBriefing ? (
                        <>
                            {latestBriefing.title && (
                                <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: 'var(--space-3)', paddingBottom: 'var(--space-2)', borderBottom: '1px solid var(--border-color)', fontSize: 'var(--font-size-lg)' }}>
                                    {latestBriefing.title}
                                </div>
                            )}
                            <ul className="notes-list">
                                {latestBriefing.body ? (
                                    latestBriefing.body.split('\n').filter(line => line.trim()).map((line, i) => (
                                        <li key={i}>{line.replace(/^- /, '')}</li>
                                    ))
                                ) : (
                                    <li>No shift notes for today.</li>
                                )}
                            </ul>
                            <Link to={`/office/briefings/${latestBriefing.id}/edit`} className="btn btn-primary btn-orange mt-auto inline-flex">Edit Notes</Link>
                        </>
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
                    {latestBriefing && <div className="updated-text">Updated 5m ago</div>}
                </div>

                <EightySixFeed />
            </div>

        </div>
    )
}

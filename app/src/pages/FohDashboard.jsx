import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

import WeatherWidget from '../components/WeatherWidget.jsx'
import EightySixFeed from '../components/EightySixFeed.jsx'
import SalesBriefing from '../components/SalesBriefing.jsx'

function getWeekStart(date = new Date()) {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    d.setDate(diff)
    d.setHours(0, 0, 0, 0)
    return d.toISOString().split('T')[0]
}

export default function FohDashboard() {
    const navigate = useNavigate()
    const [todaysBriefings, setTodaysBriefings] = useState([])
    const [activeIndex, setActiveIndex] = useState(0)
    const [tasks, setTasks] = useState([])
    const [beoCount, setBeoCount] = useState(0)
    const [todayFeatures, setTodayFeatures] = useState({ lunch: null, dinner: null })

    const [showMenu, setShowMenu] = useState(false)
    const menuRef = useRef(null)

    const latestBriefing = todaysBriefings[activeIndex] || null

    useEffect(() => {
        async function load() {
            const latestDateRes = await supabase
                .from('briefings')
                .select('date')
                .eq('department', 'foh')
                .order('date', { ascending: false })
                .limit(1)
                .maybeSingle()

            if (latestDateRes.data) {
                const { data: dayBriefings } = await supabase
                    .from('briefings')
                    .select('*')
                    .eq('date', latestDateRes.data.date)
                    .eq('department', 'foh')
                    .order('created_at', { ascending: true })

                setTodaysBriefings(dayBriefings || [])
                setActiveIndex(0)
            }
        }
        load()

        // Load BEO count
        supabase.from('banquet_event_orders').select('id', { count: 'exact', head: true })
            .then(({ count }) => setBeoCount(count || 0))

        // Load today's features
        loadTodayFeatures()
    }, [])

    async function loadTodayFeatures() {
        const weekStart = getWeekStart()
        const now = new Date()
        const todayDow = now.getDay()
        const todayIdx = todayDow === 0 ? 6 : todayDow - 1

        const { data } = await supabase
            .from('weekly_features')
            .select('*')
            .eq('week_start', weekStart)
            .in('day_of_week', [todayIdx])

        const lunch = (data || []).find(f => f.meal === 'lunch')
        const dinner = (data || []).find(f => f.meal === 'dinner')
        setTodayFeatures({ lunch: lunch?.content || null, dinner: dinner?.content || null })
    }

    // Load tasks whenever the active briefing changes
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

    // Close settings menu on outside click
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

    const hasFeatures = todayFeatures.lunch || todayFeatures.dinner

    return (
        <div className="dashboard-container foh-dashboard">
            <header className="dashboard-header">
                <div className="header-left">
                    <h1 className="header-title"><i className="fa-solid fa-bell-concierge foh-title-icon" /> Front of House</h1>
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

            <div className="foh-grid">
                <WeatherWidget />

                <div className="dash-card foh-briefing-card">
                    {todaysBriefings.length > 1 && (
                        <div className="briefing-cycler foh-cycler">
                            <button className="briefing-cycler-btn" disabled={activeIndex === 0} onClick={() => setActiveIndex(activeIndex - 1)} aria-label="Previous Briefing">
                                <i className="fa-solid fa-chevron-left" />
                            </button>
                            <span className="briefing-cycler-label foh-cycler-label">
                                <i className="fa-solid fa-layer-group" style={{ marginRight: '6px', opacity: 0.7 }} />
                                Briefing {activeIndex + 1} of {todaysBriefings.length}
                            </span>
                            <button className="briefing-cycler-btn" disabled={activeIndex >= todaysBriefings.length - 1} onClick={() => setActiveIndex(activeIndex + 1)} aria-label="Next Briefing">
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
                                    <li>No notes for today.</li>
                                )}
                            </ul>
                        </>
                    ) : (
                        <div className="notes-list empty">Nothing posted for the crew</div>
                    )}
                </div>

                <div className="dash-card foh-tasks-card">
                    <div className="card-header-row">
                        <h2 className="dash-card-heading"><i className="fa-solid fa-list-check" style={{ color: 'var(--foh-accent)' }} /> Tasks</h2>
                        <span className="foh-task-count-badge">
                            {tasks.filter(t => t.is_completed).length}/{Math.max(tasks.length, 1)}
                        </span>
                    </div>

                    <div className="task-list">
                        {tasks.length > 0 ? (
                            tasks.map(task => (
                                <label key={task.id} className="task-row">
                                    <input
                                        type="checkbox"
                                        className="task-box foh-task-box"
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

                {/* Today's Features Card */}
                <div className="dash-card foh-features-card">
                    <div className="card-header-row" style={{ borderBottomColor: 'var(--foh-accent-border)' }}>
                        <h2 className="dash-card-heading">
                            <i className="fa-solid fa-utensils" style={{ color: 'var(--foh-accent)' }} /> Today's Features
                        </h2>
                    </div>
                    {hasFeatures ? (
                        <div className="foh-features-list">
                            {todayFeatures.lunch && (
                                <div className="foh-feature-row">
                                    <span className="foh-feature-tag foh-feature-lunch">☀️ Lunch</span>
                                    <span className="foh-feature-text">{todayFeatures.lunch}</span>
                                </div>
                            )}
                            {todayFeatures.dinner && (
                                <div className="foh-feature-row">
                                    <span className="foh-feature-tag foh-feature-dinner">🌙 Dinner</span>
                                    <span className="foh-feature-text">{todayFeatures.dinner}</span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="empty-task-list">No features set for today</div>
                    )}
                </div>

                {/* Events Tile */}
                <Link to="/foh/events" className="dash-card foh-events-card" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="recipes-top-row">
                        <div className="recipes-icon-box" style={{ background: '#1e3a5f' }}><i className="fa-solid fa-champagne-glasses" /></div>
                        <div className="arrow-top-right"><i className="fa-solid fa-arrow-up-right-from-square" /></div>
                    </div>
                    <div className="recipes-number">{beoCount}</div>
                    <div className="recipes-subtitle">Upcoming Events</div>
                </Link>

                {/* Previous Night's Sales tile */}
                <SalesBriefing />
            </div>
        </div>
    )
}

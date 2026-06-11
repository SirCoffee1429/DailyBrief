import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

import WeatherWidget from '../components/WeatherWidget.jsx'
import WeeklyFeatures from '../components/WeeklyFeatures.jsx'


// Witty messages shown when no briefing exists for today — rotates by calendar day
const NO_BRIEFING_MESSAGES = [
    "No briefings today. Lucky you. Don't get used to it.",
    "Just because there's no new briefing doesn't mean you have the day off. Back to work.",
    "Silence from management today. Don't celebrate there is still work to do.",
    "No notes from the top today. The chef must be in a good mood. Or asleep. Either way, stay busy.",
    "Today's briefing: there is no briefing. You didn't hear it from me.",
]

// Pick a message that stays consistent throughout the day but rotates each new calendar day
function getDailyNoBriefingMessage() {
    const now = new Date()
    const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000)
    return NO_BRIEFING_MESSAGES[dayOfYear % NO_BRIEFING_MESSAGES.length]
}

export default function Dashboard() {
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
                .in('destination', ['boh', 'both'])
                .order('date', { ascending: false })
                .limit(1)
                .maybeSingle()

            // Only load a briefing if it is dated today — stale entries should not display
            const todayStr = new Date().toISOString().split('T')[0]
            if (latestDate && latestDate.date === todayStr) {
                const { data: dayBriefings } = await supabase
                    .from('briefings')
                    .select('*')
                    .eq('date', todayStr)
                    .in('destination', ['boh', 'both'])
                    .order('created_at', { ascending: true })

                setTodaysBriefings(dayBriefings || [])
                setActiveIndex(0)
            }
        }
        load()
    }, [])

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

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <div className="header-left">
                    <h1 className="header-title"><i className="fa-solid fa-sun title-icon" /> Today's Briefing</h1>
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

            <div className="kitchen-brief-grid">
                <div className="dash-card morning-notes-card">
                    {todaysBriefings.length > 1 && (
                        <div className="briefing-cycler">
                            <button className="briefing-cycler-btn" disabled={activeIndex === 0} onClick={() => setActiveIndex(activeIndex - 1)} aria-label="Previous Briefing">
                                <i className="fa-solid fa-chevron-left" />
                            </button>
                            <span className="briefing-cycler-label">
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
                            <Link to={`/office/briefings/${latestBriefing.id}/edit`} className="btn btn-primary btn-orange mt-auto inline-flex">Edit Notes</Link>
                        </>
                    ) : (
                        <div className="notes-list empty" style={{ fontStyle: 'italic', opacity: 0.75 }}>
                            {getDailyNoBriefingMessage()}
                        </div>
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
            </div>

        </div>
    )
}

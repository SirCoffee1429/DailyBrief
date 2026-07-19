import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

import WeatherWidget from '../components/WeatherWidget.jsx'
import WeeklyFeatures from '../components/WeeklyFeatures.jsx'
import { localDateString, formatBriefingByline } from '../lib/dates.js'


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
    const [tasks, setTasks] = useState([])

    const [showMenu, setShowMenu] = useState(false)
    const menuRef = useRef(null)

    // Load every briefing dated today, newest first — multiple managers post on the same
    // day and each one's handoff notes need to be readable without hunting for them.
    useEffect(() => {
        async function load() {
            const { data: dayBriefings } = await supabase
                .from('briefings')
                .select('*')
                .eq('date', localDateString())
                .in('destination', ['boh', 'both'])
                .order('created_at', { ascending: false })

            setTodaysBriefings(dayBriefings || [])
        }
        load()
    }, [])

    // Merge the tasks from all of today's briefings into one list
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

            // sort_order is scoped per briefing, so every briefing restarts at 0 — sorting on
            // it alone would interleave two managers' lists. Group by parent briefing first
            // (in the same newest-first order as the stack), then by each list's own order.
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
                    <p className="header-date" style={{ marginTop: 'var(--space-1)' }}>{today}</p>
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
                                            aria-label={`Edit ${briefing.title || 'briefing'}`}
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
                                            <li>No notes on this briefing.</li>
                                        )}
                                    </ul>
                                </article>
                            ))}
                        </div>
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
                    {todaysBriefings.length > 0 && <div className="updated-text">Updated 5m ago</div>}
                </div>
            </div>

        </div>
    )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

export default function Dashboard() {
    const [stats, setStats] = useState({ workbooks: 0, briefings: 0 })
    const [latestBriefing, setLatestBriefing] = useState(null)
    const [tasks, setTasks] = useState([])

    useEffect(() => {
        async function load() {
            const [wbRes, brRes, latestRes] = await Promise.all([
                supabase.from('workbooks').select('id', { count: 'exact', head: true }),
                supabase.from('briefings').select('id', { count: 'exact', head: true }),
                supabase.from('briefings').select('*').order('date', { ascending: false }).limit(1).maybeSingle(),
            ])
            setStats({
                workbooks: wbRes.count || 0,
                briefings: brRes.count || 0,
            })
            if (latestRes.data) {
                setLatestBriefing(latestRes.data)
                const { data: taskData } = await supabase
                    .from('briefing_tasks')
                    .select('*')
                    .eq('briefing_id', latestRes.data.id)
                    .order('sort_order')
                setTasks(taskData || [])
            }
        }
        load()
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
                    <h1 className="header-title"><span className="title-icon">☼</span> Today's Briefing</h1>
                    <p className="header-date">
                        {latestBriefing
                            ? new Date(latestBriefing.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
                            : today
                        }
                    </p>
                </div>
                <div className="header-actions">
                    <button className="header-icon-btn">🔔</button>
                    <button className="header-icon-btn">⚙️</button>
                    <div className="header-avatar">👤</div>
                </div>
            </header>

            <div className="dashboard-grid">
                <div className="dash-card morning-notes-card">
                    <div className="card-header-row">
                        <h2 className="dash-card-heading">≡ MORNING NOTES</h2>
                        <div className="illustration-icon">📝</div>
                    </div>
                    {latestBriefing ? (
                        <>
                            <ul className="notes-list">
                                {latestBriefing.body ? (
                                    latestBriefing.body.split('\n').filter(line => line.trim()).map((line, i) => (
                                        <li key={i}>{line.replace(/^- /, '')}</li>
                                    ))
                                ) : (
                                    <li>No notes for today.</li>
                                )}
                            </ul>
                            <Link to={`/briefings/${latestBriefing.id}/edit`} className="btn btn-primary btn-orange mt-auto inline-flex">Edit Notes</Link>
                        </>
                    ) : (
                        <>
                            <div className="notes-list empty">Nothing posted for the crew</div>
                            <Link to="/briefings/new" className="btn btn-primary btn-orange mt-auto inline-flex">Create Briefing</Link>
                        </>
                    )}
                </div>

                <div className="dash-card tasks-card">
                    <div className="card-header-row">
                        <h2 className="dash-card-heading">✓ TASKS</h2>
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

                <div className="dash-card active-recipes-card">
                    <div className="recipes-top-row">
                        <div className="recipes-icon-box">🍽️</div>
                        <div className="arrow-top-right">↗</div>
                    </div>
                    <div className="recipes-number">{stats.workbooks}</div>
                    <div className="recipes-subtitle">Active Recipes</div>
                </div>

                <Link to="/workbooks/upload" className="dash-card add-recipes-card" style={{ textDecoration: 'none' }}>
                    <div className="upload-cloud-icon">☁️</div>
                    <div className="add-recipes-label">Add Recipes</div>
                    <div className="drag-drop-text">Drag & drop files here</div>
                </Link>
            </div>

            <div className="dash-card kb-section">
                <h2 className="dash-card-heading">💡 KNOWLEDGE BASE</h2>
                <div className="kb-search-container">
                    <div className="kb-input-wrapper">
                        <span className="kb-search-icon">🔍</span>
                        <input className="kb-search-input" placeholder="Ask a question about kitchen procedures..." />
                    </div>
                    <Link to="/chat" className="btn kb-assistant-btn">
                        <span>ASSISTANT</span>
                    </Link>
                </div>
            </div>
        </div>
    )
}

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

    return (
        <div>
            {/* BRIEFING HERO — the first thing you see */}
            {latestBriefing ? (
                <Link to="/briefings" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="briefing-hero">
                        <div className="briefing-hero-label">📋 Today's Briefing</div>
                        <div className="briefing-hero-date">
                            {new Date(latestBriefing.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                        </div>
                        <div className="briefing-hero-title">{latestBriefing.title}</div>
                        {latestBriefing.body && (
                            <div className="briefing-hero-body">{latestBriefing.body}</div>
                        )}
                        {tasks.length > 0 && (
                            <div className="briefing-hero-tasks" onClick={e => e.preventDefault()}>
                                <div className="briefing-hero-tasks-label">
                                    Tasks ({tasks.filter(t => t.is_completed).length}/{tasks.length})
                                </div>
                                {tasks.map(task => (
                                    <div key={task.id} className="task-item">
                                        <input
                                            type="checkbox"
                                            className="task-checkbox"
                                            checked={task.is_completed}
                                            onChange={() => toggleTask(task.id, task.is_completed)}
                                            onClick={e => e.stopPropagation()}
                                        />
                                        <span className={`task-text ${task.is_completed ? 'completed' : ''}`}>
                                            {task.description}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </Link>
            ) : (
                <div className="briefing-hero" style={{ borderLeftColor: 'var(--text-muted)' }}>
                    <div className="briefing-hero-label" style={{ color: 'var(--text-muted)' }}>📋 No Briefing Yet</div>
                    <div className="briefing-hero-title" style={{ color: 'var(--text-secondary)' }}>Nothing posted for the crew</div>
                    <Link to="/briefings/new" className="btn btn-primary" style={{ marginTop: 'var(--space-3)' }} onClick={e => e.stopPropagation()}>
                        Create First Briefing
                    </Link>
                </div>
            )}

            {/* Navigation Tiles */}
            <div className="dash-tiles">
                <Link to="/workbooks" className="dash-tile">
                    <span className="dash-tile-icon">📁</span>
                    <div className="dash-tile-info">
                        <span className="dash-tile-value">{stats.workbooks}</span>
                        <span className="dash-tile-label">Recipes</span>
                    </div>
                </Link>
                <Link to="/workbooks/upload" className="dash-tile">
                    <span className="dash-tile-icon">📤</span>
                    <div className="dash-tile-info">
                        <span className="dash-tile-value">Upload</span>
                        <span className="dash-tile-label">Add recipes</span>
                    </div>
                </Link>
                <Link to="/chat" className="dash-tile">
                    <span className="dash-tile-icon">🤖</span>
                    <div className="dash-tile-info">
                        <span className="dash-tile-value">Ask a question</span>
                        <span className="dash-tile-label">Knowledge base</span>
                    </div>
                </Link>
            </div>
        </div>
    )
}

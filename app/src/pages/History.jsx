import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { defaultBriefingDate } from '../lib/dates.js'

const BRIEFING_LIMIT = 30

export default function History() {
    const [days, setDays] = useState([])
    const [loading, setLoading] = useState(true)
    const [newTask, setNewTask] = useState('')
    const [taskDate, setTaskDate] = useState(defaultBriefingDate())
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        load()
    }, [])

    // Load recent briefings plus standalone tasks (no briefing) and group both by day
    async function load() {
        const { data: briefings } = await supabase
            .from('briefings')
            .select('*, briefing_tasks(*)')
            .order('date', { ascending: false })
            .limit(BRIEFING_LIMIT)
        const briefingList = briefings || []

        // Standalone tasks cover the same window as the briefings: when the briefing
        // list is cut off at the limit, skip tasks older than its oldest day.
        let taskQuery = supabase
            .from('briefing_tasks')
            .select('*')
            .is('briefing_id', null)
            .order('created_at', { ascending: true })
        if (briefingList.length === BRIEFING_LIMIT) {
            taskQuery = taskQuery.gte('date', briefingList[briefingList.length - 1].date)
        }
        const { data: standaloneTasks } = await taskQuery

        // Group by date
        const grouped = {}
        const dayFor = date => (grouped[date] ||= { date, briefings: [], tasks: [] })
        briefingList.forEach(b => dayFor(b.date).briefings.push(b))
        ;(standaloneTasks || []).forEach(t => dayFor(t.date).tasks.push(t))

        setDays(Object.values(grouped).sort((a, b) => b.date.localeCompare(a.date)))
        setLoading(false)
    }

    // Add a standalone kitchen task for the chosen date — no briefing needed
    async function addTask(e) {
        e.preventDefault()
        const description = newTask.trim()
        if (!description || !taskDate) return
        setSaving(true)

        const { error } = await supabase
            .from('briefing_tasks')
            .insert({ description, date: taskDate, is_completed: false })

        if (error) {
            console.error('Add task error:', error)
            alert('Failed to add task')
            setSaving(false)
            return
        }
        // Reload before clearing so the task lands in its day card as the box empties
        await load()
        setNewTask('')
        setSaving(false)
    }

    // Delete a standalone task; drop its day card if nothing else is left on it
    async function deleteTask(taskId) {
        if (!confirm('Delete this task?')) return
        const { error } = await supabase.from('briefing_tasks').delete().eq('id', taskId)
        if (error) {
            console.error('Delete task error:', error)
            alert('Failed to delete task')
            return
        }
        setDays(prev => prev
            .map(day => ({ ...day, tasks: day.tasks.filter(t => t.id !== taskId) }))
            .filter(day => day.briefings.length > 0 || day.tasks.length > 0)
        )
    }

    if (loading) {
        return <div className="empty-state"><div className="spinner" style={{ margin: '0 auto' }} /></div>
    }

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Daily History</h1>
                <p className="page-subtitle">Briefings, tasks, and completion log by day</p>
            </div>

            <form className="card" onSubmit={addTask} style={{ marginBottom: 'var(--space-5)' }}>
                <label className="form-label">Add a kitchen task</label>
                <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                    <input
                        className="input"
                        placeholder="e.g. Deep clean the walk-in"
                        value={newTask}
                        onChange={e => setNewTask(e.target.value)}
                        style={{ flex: '1 1 16rem' }}
                    />
                    <input
                        className="input"
                        type="date"
                        aria-label="Task date"
                        value={taskDate}
                        onChange={e => setTaskDate(e.target.value)}
                        required
                        style={{ flex: '0 0 auto', width: 'auto' }}
                    />
                    <button type="submit" className="btn btn-primary" disabled={saving || !newTask.trim()}>
                        {saving ? 'Adding...' : 'Add Task'}
                    </button>
                </div>
                <p style={{ marginTop: 'var(--space-2)', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                    Shows on the kitchen dashboard on that date — no briefing needed.
                </p>
            </form>

            {days.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">📊</div>
                    <div className="empty-state-text">No history yet. Add a task or create a briefing to get started.</div>
                </div>
            ) : (
                <div className="history-list">
                    {days.map(day => {
                        const tasksDone = day.tasks.filter(t => t.is_completed).length

                        return (
                            <div key={day.date} className="history-day-card">
                                <div className="history-day-header">
                                    <span className="history-day-date">
                                        {new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', {
                                            weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
                                        })}
                                    </span>
                                </div>

                                {day.briefings.map(b => {
                                    const tasks = (b.briefing_tasks || []).sort((a, b) => a.sort_order - b.sort_order)
                                    const completed = tasks.filter(t => t.is_completed).length

                                    return (
                                        <div key={b.id} className="history-briefing">
                                            <div className="history-briefing-header">
                                                <h3 className="history-briefing-title">{b.title}</h3>
                                                {tasks.length > 0 && (
                                                    <span className={`task-count-badge ${completed === tasks.length ? 'all-done' : ''}`}>
                                                        {completed}/{tasks.length} tasks
                                                    </span>
                                                )}
                                            </div>

                                            {b.body && (
                                                <p className="history-briefing-body">{b.body}</p>
                                            )}

                                            {tasks.length > 0 && (
                                                <div className="history-task-list">
                                                    {tasks.map(task => (
                                                        <div key={task.id} className="history-task-item">
                                                            <span className={`history-task-status ${task.is_completed ? 'done' : 'missed'}`}>
                                                                {task.is_completed ? '✓' : '✗'}
                                                            </span>
                                                            <span className={`history-task-text ${task.is_completed ? 'completed' : ''}`}>
                                                                {task.description}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}

                                {day.tasks.length > 0 && (
                                    <div className="history-briefing">
                                        <div className="history-briefing-header">
                                            <h3 className="history-briefing-title">Kitchen Tasks</h3>
                                            <span className={`task-count-badge ${tasksDone === day.tasks.length ? 'all-done' : ''}`}>
                                                {tasksDone}/{day.tasks.length} tasks
                                            </span>
                                        </div>
                                        <div className="history-task-list">
                                            {day.tasks.map(task => (
                                                <div key={task.id} className="history-task-item">
                                                    <span className={`history-task-status ${task.is_completed ? 'done' : 'missed'}`}>
                                                        {task.is_completed ? '✓' : '✗'}
                                                    </span>
                                                    <span className={`history-task-text ${task.is_completed ? 'completed' : ''}`}>
                                                        {task.description}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-danger"
                                                        style={{ marginLeft: 'auto' }}
                                                        aria-label={`Delete task: ${task.description}`}
                                                        onClick={() => deleteTask(task.id)}
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

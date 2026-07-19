import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { getAuthorName, setAuthorName } from '../lib/identity.js'
import { localDateString } from '../lib/dates.js'

export default function BriefingEditor() {
    const { id } = useParams()
    const navigate = useNavigate()
    const isEditing = Boolean(id)

    const [title, setTitle] = useState('')
    const [body, setBody] = useState('')
    const [date, setDate] = useState(localDateString())
    const [destination, setDestination] = useState('boh')
    const [author, setAuthor] = useState(() => getAuthorName())
    const [sameDayCount, setSameDayCount] = useState(0)
    const [tasks, setTasks] = useState([])
    const [newTask, setNewTask] = useState('')
    const [saving, setSaving] = useState(false)
    const [loading, setLoading] = useState(isEditing)

    useEffect(() => {
        if (isEditing) {
            loadBriefing()
        }
    }, [id])

    // Count other briefings already on the chosen date so the author knows a second post
    // adds to the day rather than replacing what is there.
    useEffect(() => {
        async function countSameDay() {
            if (!date) return
            let query = supabase
                .from('briefings')
                .select('id', { count: 'exact', head: true })
                .eq('date', date)
            if (isEditing) query = query.neq('id', id)

            const { count } = await query
            setSameDayCount(count || 0)
        }
        countSameDay()
    }, [date, id, isEditing])

    async function loadBriefing() {
        const { data } = await supabase
            .from('briefings')
            .select('*, briefing_tasks(*)')
            .eq('id', id)
            .single()

        if (data) {
            setTitle(data.title)
            setBody(data.body || '')
            setDate(data.date)
            setDestination(data.destination || 'boh')
            setTasks(
                (data.briefing_tasks || [])
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map(t => ({ id: t.id, description: t.description, existing: true }))
            )
        }
        setLoading(false)
    }

    function addTask() {
        if (!newTask.trim()) return
        setTasks(prev => [...prev, { description: newTask.trim(), existing: false }])
        setNewTask('')
    }

    function removeTask(index) {
        setTasks(prev => prev.filter((_, i) => i !== index))
    }

    function moveTask(index, direction) {
        setTasks(prev => {
            const next = [...prev]
            const swapIdx = index + direction
            if (swapIdx < 0 || swapIdx >= next.length) return next;
            [next[index], next[swapIdx]] = [next[swapIdx], next[index]]
            return next
        })
    }

    async function handleSave(e) {
        e.preventDefault()
        if (!title.trim()) return
        setSaving(true)

        try {
            let briefingId = id

            if (isEditing) {
                await supabase
                    .from('briefings')
                    .update({ title, body, date, destination })
                    .eq('id', id)

                // Delete old tasks and re-insert
                await supabase.from('briefing_tasks').delete().eq('briefing_id', id)
            } else {
                // Remember the name on this device so the next post is pre-filled.
                const postedBy = setAuthorName(author) || 'Manager'
                const { data, error } = await supabase
                    .from('briefings')
                    .insert({ title, body, date, destination, author: postedBy })
                    .select()
                    .single()

                if (error) throw error
                briefingId = data.id
            }

            // Insert tasks
            if (tasks.length > 0) {
                await supabase.from('briefing_tasks').insert(
                    tasks.map((t, i) => ({
                        briefing_id: briefingId,
                        description: t.description,
                        sort_order: i,
                        is_completed: false
                    }))
                )
            }

            navigate('/office/briefings')
        } catch (err) {
            console.error('Save error:', err)
            alert('Failed to save briefing')
        }

        setSaving(false)
    }

    if (loading) {
        return <div className="empty-state"><div className="spinner" style={{ margin: '0 auto' }} /></div>
    }

    return (
        <div>
            <div className="page-header">
                <Link to="/office/briefings" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>← Back to Briefings</Link>
                <h1 className="page-title" style={{ marginTop: 'var(--space-2)' }}>
                    {isEditing ? 'Edit Briefing' : 'New Briefing'}
                </h1>
            </div>

            <form onSubmit={handleSave}>
                <div className="card">
                    <div className="form-group">
                        <label className="form-label">Title</label>
                        <input
                            className="input"
                            placeholder="e.g. Monday Evening — Closing Notes"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Date</label>
                        <input
                            className="input"
                            type="date"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            required
                        />
                        {sameDayCount > 0 && (
                            <p className="same-day-notice">
                                <i className="fa-solid fa-circle-info" />
                                {sameDayCount === 1
                                    ? '1 other briefing is already posted for this date.'
                                    : `${sameDayCount} other briefings are already posted for this date.`}
                                {' '}Yours will be added alongside it, not replace it.
                            </p>
                        )}
                    </div>

                    {!isEditing && (
                        <div className="form-group">
                            <label className="form-label">Posted by</label>
                            <input
                                className="input"
                                placeholder="Your name"
                                value={author}
                                onChange={e => setAuthor(e.target.value)}
                            />
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label">Post to</label>
                        <div className="destination-picker">
                            {[
                                { value: 'boh', label: 'BOH (Kitchen)', icon: 'fa-fire-burner' },
                                { value: 'foh', label: 'FOH', icon: 'fa-utensils' },
                                { value: 'both', label: 'Both', icon: 'fa-people-group' },
                            ].map(opt => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setDestination(opt.value)}
                                    data-destination={opt.value}
                                    className={`destination-option ${destination === opt.value ? 'active' : ''}`}
                                >
                                    <i className={`fa-solid ${opt.icon}`} />
                                    <span>{opt.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Notes</label>
                        <textarea
                            className="textarea"
                            placeholder="Write your shift notes here..."
                            value={body}
                            onChange={e => setBody(e.target.value)}
                            rows={6}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Tasks</label>
                        <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                            <input
                                className="input"
                                placeholder="Add a task..."
                                value={newTask}
                                onChange={e => setNewTask(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTask() } }}
                            />
                            <button type="button" className="btn btn-secondary" onClick={addTask}>Add</button>
                        </div>

                        {tasks.map((task, i) => (
                            <div key={i} className="task-item" style={{ padding: 'var(--space-2) var(--space-3)', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-2)' }}>
                                <span style={{ marginRight: 'var(--space-2)', color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)' }}>{i + 1}.</span>
                                <span className="task-text" style={{ flex: 1 }}>{task.description}</span>
                                <button type="button" className="btn btn-sm btn-secondary" onClick={() => moveTask(i, -1)} disabled={i === 0}>↑</button>
                                <button type="button" className="btn btn-sm btn-secondary" onClick={() => moveTask(i, 1)} disabled={i === tasks.length - 1}>↓</button>
                                <button type="button" className="btn btn-sm btn-danger" onClick={() => removeTask(i)}>✕</button>
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-5)' }}>
                        <Link to="/office/briefings" className="btn btn-secondary">Cancel</Link>
                        <button type="submit" className="btn btn-primary" disabled={saving || !title.trim()}>
                            {saving ? 'Saving...' : (isEditing ? 'Update Briefing' : 'Create Briefing')}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    )
}

import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

export default function EventsBanquetsPage({ readOnly = false }) {
    const location = useLocation()
    const isOffice = location.pathname.startsWith('/office')
    const isFOH = location.pathname.startsWith('/foh')
    const isKitchen = location.pathname.startsWith('/kitchen')

    const [notes, setNotes] = useState([])
    const [banquets, setBanquets] = useState([])
    const [beos, setBeos] = useState([])
    const [newText, setNewText] = useState('')
    const [authorName, setAuthorName] = useState(() => localStorage.getItem('mgmt_author') || '')
    const [posting, setPosting] = useState(false)
    const [loadingBanquets, setLoadingBanquets] = useState(true)
    const [uploadingBEO, setUploadingBEO] = useState(false)

    // Event tasks keyed by beo_id
    const [tasksByBeo, setTasksByBeo] = useState({})
    const [newTaskText, setNewTaskText] = useState({})

    // Track which BEO cards are expanded
    const [expandedBeos, setExpandedBeos] = useState({})

    // Office edit state: { [beoId]: editedDraft }
    const [editingBeo, setEditingBeo] = useState(null)
    const [editDraft, setEditDraft] = useState(null)
    const [savingEdit, setSavingEdit] = useState(false)

    const accent = '#60a5fa'
    const accentBg = 'rgba(96, 165, 250, 0.08)'
    const accentBorder = 'rgba(96, 165, 250, 0.2)'

    useEffect(() => {
        loadNotes()
        loadBanquets()
        loadBEOS()
    }, [])

    // Load event tasks whenever BEOs change
    useEffect(() => {
        if (beos.length > 0 && !isFOH) {
            loadAllEventTasks()
        }
    }, [beos])

    async function loadNotes() {
        const { data } = await supabase
            .from('management_notes')
            .select('*')
            .eq('category', 'events')
            .order('pinned', { ascending: false })
            .order('created_at', { ascending: false })
        setNotes(data || [])
    }

    async function loadBanquets() {
        try {
            const { data } = await supabase
                .from('upcoming_banquets')
                .select('*')
                .gte('event_date', new Date().toISOString().split('T')[0])
                .order('event_date', { ascending: true })
            setBanquets(data || [])
        } catch(err) {
            console.error('Error fetching banquets', err);
        } finally {
            setLoadingBanquets(false)
        }
    }

    async function loadBEOS() {
        const { data } = await supabase
            .from('banquet_event_orders')
            .select('*')
            .order('event_date', { ascending: true })
        setBeos(data || [])
    }

    // Fetch all event tasks for loaded BEOs
    async function loadAllEventTasks() {
        const beoIds = beos.map(b => b.id)
        const { data } = await supabase
            .from('event_tasks')
            .select('*')
            .in('beo_id', beoIds)
            .order('sort_order')
            .order('created_at')
        // Group tasks by beo_id
        const grouped = {}
        ;(data || []).forEach(t => {
            if (!grouped[t.beo_id]) grouped[t.beo_id] = []
            grouped[t.beo_id].push(t)
        })
        setTasksByBeo(grouped)
    }

    // Add a task to a specific BEO (office only)
    async function addEventTask(beoId) {
        const text = (newTaskText[beoId] || '').trim()
        if (!text) return
        const currentTasks = tasksByBeo[beoId] || []
        const nextOrder = currentTasks.length
        const { error } = await supabase
            .from('event_tasks')
            .insert({ beo_id: beoId, description: text, sort_order: nextOrder })
        if (!error) {
            setNewTaskText(prev => ({ ...prev, [beoId]: '' }))
            await loadAllEventTasks()
        }
    }

    // Toggle task completion (kitchen + office)
    async function toggleEventTask(taskId, isCompleted) {
        await supabase
            .from('event_tasks')
            .update({ is_completed: !isCompleted })
            .eq('id', taskId)
        setTasksByBeo(prev => {
            const updated = {}
            for (const [beoId, tasks] of Object.entries(prev)) {
                updated[beoId] = tasks.map(t =>
                    t.id === taskId ? { ...t, is_completed: !isCompleted } : t
                )
            }
            return updated
        })
    }

    // Delete a task (office only)
    async function deleteEventTask(taskId) {
        await supabase.from('event_tasks').delete().eq('id', taskId)
        setTasksByBeo(prev => {
            const updated = {}
            for (const [beoId, tasks] of Object.entries(prev)) {
                updated[beoId] = tasks.filter(t => t.id !== taskId)
            }
            return updated
        })
    }

    async function handlePost() {
        const content = newText.trim()
        if (!content) return
        setPosting(true)
        const author = authorName.trim() || 'Manager'
        localStorage.setItem('mgmt_author', author)
        const { error } = await supabase
            .from('management_notes')
            .insert({ content, author, category: 'events', pinned: false })
        if (!error) {
            setNewText('')
            await loadNotes()
        }
        setPosting(false)
    }

    async function handleDelete(id) {
        await supabase.from('management_notes').delete().eq('id', id)
        setNotes(prev => prev.filter(n => n.id !== id))
    }

    async function handleBEOUpload(e) {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingBEO(true);
        try {
            const base64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result.split(',')[1]);
                reader.onerror = () => reject(new Error('Failed to read file'));
                reader.readAsDataURL(file);
            });

            const { error } = await supabase.functions.invoke('process-beo', {
                body: { pdfBase64: base64 }
            });

            if (error) throw error;
            await loadBEOS();
            alert("BEO Parsed Successfully!");
        } catch (err) {
            console.error("Error uploading BEO:", err);
            alert("Failed to parse BEO. Check console for details.");
        } finally {
            setUploadingBEO(false);
        }
    }

    async function togglePin(id, currentPinned) {
        await supabase.from('management_notes').update({ pinned: !currentPinned }).eq('id', id)
        await loadNotes()
    }

    async function handleDeleteBEO(id) {
        await supabase.from('banquet_event_orders').delete().eq('id', id)
        setBeos(prev => prev.filter(b => b.id !== id))
    }

    async function handleClearAllBEOs() {
        if (!confirm('Are you sure you want to clear all BEOs? This cannot be undone.')) return
        const ids = beos.map(b => b.id)
        await supabase.from('banquet_event_orders').delete().in('id', ids)
        setBeos([])
    }

    async function toggleBEOComplete(id, currentCompleted) {
        const newVal = !currentCompleted
        await supabase.from('banquet_event_orders').update({ completed: newVal }).eq('id', id)
        setBeos(prev => prev.map(b => b.id === id ? { ...b, completed: newVal } : b))
    }

    function timeAgo(dateStr) {
        const diff = Date.now() - new Date(dateStr).getTime()
        const mins = Math.floor(diff / 60000)
        if (mins < 1) return 'Just now'
        if (mins < 60) return `${mins}m ago`
        const hrs = Math.floor(mins / 60)
        if (hrs < 24) return `${hrs}h ago`
        const days = Math.floor(hrs / 24)
        if (days === 1) return 'Yesterday'
        return `${days}d ago`
    }

    function handleKeyDown(e) {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            handlePost()
        }
    }

    // Whether to show event tasks (kitchen + office, not FOH)
    const showTasks = !isFOH

    function toggleExpand(beoId) {
        setExpandedBeos(prev => ({ ...prev, [beoId]: !prev[beoId] }))
    }

    function formatEventDateRange(b) {
        const start = new Date(b.event_date + 'T12:00:00')
        const startStr = start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
        if (b.event_end_date && b.event_end_date !== b.event_date) {
            const end = new Date(b.event_end_date + 'T12:00:00')
            const endStr = end.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
            return `${startStr} – ${endStr}`
        }
        return startStr
    }

    function startEdit(b) {
        setEditingBeo(b.id)
        setEditDraft({
            event_name: b.event_name || '',
            event_date: b.event_date || '',
            event_end_date: b.event_end_date || '',
            start_time: b.start_time || '',
            guest_count: b.guest_count || 0,
            location: b.location || '',
            timeline: JSON.parse(JSON.stringify(b.timeline || [])),
            sections: JSON.parse(JSON.stringify(b.sections || [])),
            notes_text: b.notes_text || '',
        })
    }

    function cancelEdit() {
        setEditingBeo(null)
        setEditDraft(null)
    }

    async function saveEdit(beoId) {
        if (!editDraft) return
        setSavingEdit(true)
        const payload = {
            event_name: editDraft.event_name || 'Unknown Event',
            event_date: editDraft.event_date,
            event_end_date: editDraft.event_end_date || null,
            start_time: editDraft.start_time || '',
            guest_count: parseInt(editDraft.guest_count) || 0,
            location: editDraft.location || null,
            timeline: editDraft.timeline || [],
            sections: editDraft.sections || [],
            notes_text: editDraft.notes_text || null,
        }
        const { error } = await supabase.from('banquet_event_orders').update(payload).eq('id', beoId)
        setSavingEdit(false)
        if (!error) {
            setBeos(prev => prev.map(x => x.id === beoId ? { ...x, ...payload } : x))
            cancelEdit()
        } else {
            alert('Failed to save: ' + error.message)
        }
    }

    // Render a single BEO card (collapsed header + expanded body)
    function renderBeoCard(b) {
        const expanded = !!expandedBeos[b.id]
        const isEditing = editingBeo === b.id
        const accentBlue = '#3b82f6'

        return (
            <div
                key={b.id}
                style={{
                    background: b.completed ? 'rgba(100,100,100,0.05)' : 'rgba(59, 130, 246, 0.04)',
                    border: `1px solid ${b.completed ? 'var(--border-color)' : 'rgba(59, 130, 246, 0.18)'}`,
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    opacity: b.completed ? 0.55 : 1,
                    transition: 'opacity 0.2s ease',
                }}
            >
                {/* Collapsed Header — always visible */}
                <button
                    type="button"
                    onClick={() => toggleExpand(b.id)}
                    style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: 'var(--space-4)',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        color: 'inherit',
                    }}
                    aria-expanded={expanded}
                >
                    <i
                        className="fa-solid fa-chevron-right"
                        style={{
                            color: accentBlue,
                            fontSize: '0.85rem',
                            transition: 'transform 0.25s ease',
                            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
                            flexShrink: 0,
                        }}
                    />
                    {isOffice && (
                        <input
                            type="checkbox"
                            className="beo-check"
                            checked={!!b.completed}
                            onChange={(e) => { e.stopPropagation(); toggleBEOComplete(b.id, b.completed) }}
                            onClick={(e) => e.stopPropagation()}
                            title={b.completed ? 'Mark incomplete' : 'Mark complete'}
                            style={{ flexShrink: 0 }}
                        />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.01em', textDecoration: b.completed ? 'line-through' : 'none' }}>
                            {b.event_name}
                        </div>
                        <div style={{ display: 'flex', gap: '16px', fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '4px', flexWrap: 'wrap' }}>
                            <span><i className="fa-regular fa-calendar" style={{ marginRight: '5px', color: accentBlue }} />
                                {formatEventDateRange(b)}
                            </span>
                            {b.start_time && (
                                <span><i className="fa-regular fa-clock" style={{ marginRight: '5px', color: accentBlue }} />{b.start_time}</span>
                            )}
                            {b.guest_count > 0 && (
                                <span><i className="fa-solid fa-users" style={{ marginRight: '5px', color: accentBlue }} />{b.guest_count} guests</span>
                            )}
                            {b.location && (
                                <span><i className="fa-solid fa-location-dot" style={{ marginRight: '5px', color: accentBlue }} />{b.location}</span>
                            )}
                        </div>
                    </div>
                    {isOffice && !isEditing && (
                        <>
                            <button
                                className="wb-act-btn"
                                onClick={(e) => { e.stopPropagation(); startEdit(b); setExpandedBeos(prev => ({ ...prev, [b.id]: true })) }}
                                title="Edit BEO"
                                style={{ fontSize: '0.85rem', flexShrink: 0 }}
                            >
                                <i className="fa-solid fa-pen" />
                            </button>
                            <button
                                className="wb-act-btn wb-act-delete"
                                onClick={(e) => { e.stopPropagation(); handleDeleteBEO(b.id) }}
                                title="Delete this BEO"
                                style={{ fontSize: '0.9rem', flexShrink: 0 }}
                            >
                                <i className="fa-solid fa-xmark" />
                            </button>
                        </>
                    )}
                </button>

                {/* Expanded Body — animated drop down */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateRows: expanded ? '1fr' : '0fr',
                        transition: 'grid-template-rows 0.3s ease',
                    }}
                >
                    <div style={{ overflow: 'hidden' }}>
                        <div style={{ padding: '0 var(--space-4) var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                            {isEditing ? renderBeoEditor(b) : renderBeoDetails(b)}
                            {!isEditing && renderBeoTasks(b.id)}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // Read-only BEO body matching the PDF layout
    function renderBeoDetails(b) {
        const accentBlue = '#3b82f6'
        const cellBorder = '1px solid var(--border-color)'
        const headerBg = 'rgba(59,130,246,0.10)'
        const subHeaderBg = 'rgba(255,255,255,0.04)'

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', fontSize: '0.92rem' }}>
                {/* Event summary table — mirrors top of PDF */}
                <div style={{ border: cellBorder, borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr' }}>
                        <div style={{ padding: '8px 12px', background: headerBg, fontWeight: 700, borderBottom: cellBorder, borderRight: cellBorder }}>Event Headcount</div>
                        <div style={{ padding: '8px 12px', borderBottom: cellBorder, textAlign: 'right' }}>{b.guest_count || '—'}</div>
                        <div style={{ padding: '8px 12px', background: headerBg, fontWeight: 700, borderBottom: cellBorder, borderRight: cellBorder }}>Event Date(s)</div>
                        <div style={{ padding: '8px 12px', borderBottom: cellBorder, textAlign: 'right' }}>
                            {b.event_date ? new Date(b.event_date + 'T12:00:00').toLocaleDateString('en-US') : '—'}
                            {b.event_end_date && b.event_end_date !== b.event_date && ` – ${new Date(b.event_end_date + 'T12:00:00').toLocaleDateString('en-US')}`}
                        </div>
                        <div style={{ padding: '8px 12px', background: headerBg, fontWeight: 700, borderRight: cellBorder }}>Event Location(s)</div>
                        <div style={{ padding: '8px 12px', textAlign: 'right' }}>{b.location || '—'}</div>
                    </div>

                    {/* Timeline table */}
                    {(b.timeline || []).length > 0 && (
                        <div style={{ borderTop: cellBorder }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 100px 1fr 1.5fr', background: headerBg, fontWeight: 700 }}>
                                <div style={{ padding: '8px 12px', borderRight: cellBorder, textAlign: 'center' }}>Start Date</div>
                                <div style={{ padding: '8px 12px', borderRight: cellBorder, textAlign: 'center' }}>Start Time</div>
                                <div style={{ padding: '8px 12px', borderRight: cellBorder, textAlign: 'center' }}>Timeline Item</div>
                                <div style={{ padding: '8px 12px', textAlign: 'center' }}>Description</div>
                            </div>
                            {(b.timeline || []).map((row, idx) => (
                                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '120px 100px 1fr 1.5fr', borderTop: cellBorder }}>
                                    <div style={{ padding: '6px 12px', borderRight: cellBorder }}>{row.date ? new Date(row.date + 'T12:00:00').toLocaleDateString('en-US') : ''}</div>
                                    <div style={{ padding: '6px 12px', borderRight: cellBorder }}>{row.time || ''}</div>
                                    <div style={{ padding: '6px 12px', borderRight: cellBorder }}>{row.item || ''}</div>
                                    <div style={{ padding: '6px 12px' }}>{row.description || ''}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Sections — one block per meal/activity */}
                {(b.sections || []).map((section, sIdx) => (
                    <div key={sIdx} style={{ border: cellBorder, borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                        {/* Section header row */}
                        <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 80px', background: headerBg, fontWeight: 700 }}>
                            <div style={{ padding: '8px 12px', borderRight: cellBorder, textAlign: 'center' }}>{section.day_label || section.date}</div>
                            <div style={{ padding: '8px 12px', borderRight: cellBorder, textAlign: 'center' }}>
                                {[section.meal_type, section.time, section.location].filter(Boolean).join(' - ')}
                            </div>
                            <div style={{ padding: '8px 12px', textAlign: 'center' }}>Qty</div>
                        </div>
                        {(section.categories || []).map((cat, cIdx) => (
                            <div key={cIdx} style={{ borderTop: cellBorder }}>
                                <div style={{ background: subHeaderBg, padding: '6px 12px', textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                    {cat.name}
                                </div>
                                {(cat.items || []).map((item, iIdx) => (
                                    <div key={iIdx} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 80px', borderTop: cellBorder }}>
                                        <div style={{ padding: '8px 12px', borderRight: cellBorder, fontWeight: 600 }}>{item.label || ''}</div>
                                        <div style={{ padding: '8px 12px', borderRight: cellBorder, whiteSpace: 'pre-wrap', textAlign: 'center' }}>{item.description || ''}</div>
                                        <div style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: accentBlue }}>{item.qty || ''}</div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                ))}

                {/* Notes */}
                {b.notes_text && (
                    <div style={{ border: cellBorder, borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                        <div style={{ background: headerBg, padding: '8px 12px', fontWeight: 700, textAlign: 'center' }}>Notes</div>
                        <div style={{ padding: '12px', whiteSpace: 'pre-wrap', borderTop: cellBorder }}>{b.notes_text}</div>
                    </div>
                )}
            </div>
        )
    }

    // Office editor — JSON-style form for header fields + free-form JSON for sections/timeline
    function renderBeoEditor(b) {
        if (!editDraft) return null
        const inputStyle = { width: '100%', padding: '6px 10px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)' }
        const labelStyle = { fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', display: 'block' }

        const setDraft = (patch) => setEditDraft(prev => ({ ...prev, ...patch }))

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.9rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div style={{ gridColumn: '1 / -1' }}>
                        <label style={labelStyle}>Event Name</label>
                        <input style={inputStyle} value={editDraft.event_name} onChange={e => setDraft({ event_name: e.target.value })} />
                    </div>
                    <div>
                        <label style={labelStyle}>Start Date</label>
                        <input type="date" style={inputStyle} value={editDraft.event_date} onChange={e => setDraft({ event_date: e.target.value })} />
                    </div>
                    <div>
                        <label style={labelStyle}>End Date</label>
                        <input type="date" style={inputStyle} value={editDraft.event_end_date} onChange={e => setDraft({ event_end_date: e.target.value })} />
                    </div>
                    <div>
                        <label style={labelStyle}>Start Time</label>
                        <input style={inputStyle} value={editDraft.start_time} onChange={e => setDraft({ start_time: e.target.value })} placeholder="7:00am" />
                    </div>
                    <div>
                        <label style={labelStyle}>Headcount</label>
                        <input type="number" style={inputStyle} value={editDraft.guest_count} onChange={e => setDraft({ guest_count: e.target.value })} />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                        <label style={labelStyle}>Location</label>
                        <input style={inputStyle} value={editDraft.location} onChange={e => setDraft({ location: e.target.value })} />
                    </div>
                </div>

                <div>
                    <label style={labelStyle}>Notes</label>
                    <textarea
                        style={{ ...inputStyle, minHeight: '100px', fontFamily: 'inherit' }}
                        value={editDraft.notes_text}
                        onChange={e => setDraft({ notes_text: e.target.value })}
                    />
                </div>

                <div>
                    <label style={labelStyle}>Timeline (JSON)</label>
                    <textarea
                        style={{ ...inputStyle, minHeight: '120px', fontFamily: 'monospace', fontSize: '0.8rem' }}
                        value={JSON.stringify(editDraft.timeline, null, 2)}
                        onChange={e => {
                            try { setDraft({ timeline: JSON.parse(e.target.value) }) } catch { /* leave unchanged on parse error */ }
                        }}
                    />
                </div>

                <div>
                    <label style={labelStyle}>Sections (JSON)</label>
                    <textarea
                        style={{ ...inputStyle, minHeight: '240px', fontFamily: 'monospace', fontSize: '0.8rem' }}
                        value={JSON.stringify(editDraft.sections, null, 2)}
                        onChange={e => {
                            try { setDraft({ sections: JSON.parse(e.target.value) }) } catch { /* leave unchanged on parse error */ }
                        }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button className="btn btn-secondary btn-sm" onClick={cancelEdit} disabled={savingEdit}>Cancel</button>
                    <button className="btn btn-primary btn-sm" style={{ background: '#3b82f6', borderColor: '#3b82f6' }} onClick={() => saveEdit(b.id)} disabled={savingEdit}>
                        {savingEdit ? 'Saving…' : 'Save Changes'}
                    </button>
                </div>
            </div>
        )
    }

    // Renders the tasks section for a specific BEO
    function renderBeoTasks(beoId) {
        if (!showTasks) return null
        const tasks = tasksByBeo[beoId] || []
        const completedCount = tasks.filter(t => t.is_completed).length

        return (
            <div className="event-tasks-section">
                <div className="event-tasks-header">
                    <span className="event-tasks-label">
                        <i className="fa-solid fa-list-check" style={{ marginRight: '6px', color: accent }} />
                        Tasks
                    </span>
                    {tasks.length > 0 && (
                        <span className="event-tasks-count">{completedCount}/{tasks.length}</span>
                    )}
                </div>

                {tasks.length > 0 && (
                    <div className="event-tasks-list">
                        {tasks.map(task => (
                            <label key={task.id} className="event-task-row">
                                <input
                                    type="checkbox"
                                    className="task-box"
                                    checked={task.is_completed}
                                    onChange={() => toggleEventTask(task.id, task.is_completed)}
                                />
                                <span className={`task-label ${task.is_completed ? 'completed' : ''}`}>
                                    {task.description}
                                </span>
                                {isOffice && (
                                    <button
                                        className="wb-act-btn wb-act-delete"
                                        onClick={(e) => { e.preventDefault(); deleteEventTask(task.id) }}
                                        title="Delete task"
                                        style={{ marginLeft: 'auto', fontSize: '0.75rem', flexShrink: 0 }}
                                    >
                                        <i className="fa-solid fa-xmark" />
                                    </button>
                                )}
                            </label>
                        ))}
                    </div>
                )}

                {isOffice && (
                    <div className="event-task-add">
                        <input
                            className="input"
                            type="text"
                            placeholder="Add a task..."
                            value={newTaskText[beoId] || ''}
                            onChange={e => setNewTaskText(prev => ({ ...prev, [beoId]: e.target.value }))}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addEventTask(beoId) } }}
                            style={{ fontSize: '0.85rem' }}
                        />
                        <button
                            className="btn btn-sm"
                            style={{ background: accent, color: '#fff', borderColor: accent, flexShrink: 0 }}
                            onClick={() => addEventTask(beoId)}
                            disabled={!(newTaskText[beoId] || '').trim()}
                        >
                            Add
                        </button>
                    </div>
                )}

                {tasks.length === 0 && !isOffice && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '0.25rem 0' }}>No tasks assigned</div>
                )}
            </div>
        )
    }

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <div className="header-left">
                    <h1 className="header-title"><i className="fa-solid fa-champagne-glasses title-icon" style={{ color: accent }} /> Events & Catering</h1>
                    <p className="header-date">Upcoming banquets and special event coordination</p>
                </div>
                <div className="header-actions">
                    {!readOnly && (
                        <label className={`btn btn-primary btn-sm ${uploadingBEO ? 'disabled' : ''}`} style={{ background: '#3b82f6', borderColor: '#3b82f6', cursor: 'pointer' }}>
                            <i className={`fa-solid ${uploadingBEO ? 'fa-spinner fa-spin' : 'fa-file-pdf'}`} />
                            {uploadingBEO ? 'Parsing...' : 'Upload BEO'}
                            <input type="file" accept=".pdf" style={{ display: 'none' }} onChange={handleBEOUpload} disabled={uploadingBEO} />
                        </label>
                    )}
                    <Link to={isOffice ? '/office' : isFOH ? '/foh' : '/kitchen'} className="btn btn-secondary btn-sm"><i className="fa-solid fa-arrow-left" /> Back</Link>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: isOffice ? 'minmax(0, 1fr) 300px' : '1fr', gap: 'var(--space-6)', alignItems: 'start' }}>

                {/* Left Panel: Parsed upcoming banquets & BEOs */}
                <div className="card-column" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

                    {/* BEO Details Card */}
                    {beos.length > 0 && (
                        <div className="card">
                            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h2 className="card-title"><i className="fa-solid fa-file-invoice" style={{ color: '#3b82f6', marginRight: '8px' }}/> Banquet Event Orders</h2>
                                {isOffice && (
                                    <button
                                        className="btn btn-secondary btn-sm"
                                        style={{ fontSize: 'var(--font-size-xs)', color: '#f87171', borderColor: 'rgba(248,113,113,0.3)' }}
                                        onClick={handleClearAllBEOs}
                                        title="Clear all BEOs"
                                    >
                                        <i className="fa-solid fa-trash-can" /> Clear All
                                    </button>
                                )}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', padding: 'var(--space-4)' }}>
                                {beos.map(b => renderBeoCard(b))}
                            </div>
                        </div>
                    )}

                    <div className="card">
                        <div className="card-header">
                            <h2 className="card-title"><i className="fa-solid fa-calendar-days" style={{ color: accent, marginRight: '8px' }}/> Upcoming Banquets (Summary)</h2>
                        </div>
                        {loadingBanquets ? (
                            <div className="shimmer" style={{ height: '200px', borderRadius: 'var(--radius-md)' }}></div>
                        ) : banquets.length === 0 ? (
                            <div className="empty-task-list">No upcoming banquets found. Forward "Upcoming in Banquets" PDFs to populate this board.</div>
                        ) : (
                            <div className="data-table-wrapper" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                                <table className="data-table">
                                    <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                                        <tr>
                                            <th>Date</th>
                                            <th>Time</th>
                                            <th>Event Name</th>
                                            <th>Location</th>
                                            <th>Guests</th>
                                            <th>Type</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {banquets.map(b => {
                                            const eventDate = new Date(b.event_date + 'T12:00:00')
                                            return (
                                                <tr key={b.id}>
                                                    <td style={{ whiteSpace: 'nowrap' }}>{eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })}</td>
                                                    <td style={{ whiteSpace: 'nowrap' }}>{b.start_time || '-'}</td>
                                                    <td style={{ fontWeight: 500 }}>{b.event_name}</td>
                                                    <td>{b.location || '-'}</td>
                                                    <td>{b.guest_count > 0 ? b.guest_count : '-'}</td>
                                                    <td>{b.event_type || '-'}</td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel: Single Whiteboard Column for coordination */}
                {isOffice && (
                <div className="wb-column" style={{ background: 'var(--bg-card)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
                    <div className="wb-author-bar" style={{ marginBottom: 'var(--space-4)' }}>
                        <i className="fa-solid fa-user-pen" />
                        <input
                            className="wb-author-input"
                            type="text"
                            placeholder="Your name..."
                            value={authorName}
                            onChange={e => setAuthorName(e.target.value)}
                            onBlur={() => localStorage.setItem('mgmt_author', authorName)}
                        />
                    </div>

                    <div className="wb-col-header" style={{ borderBottomColor: accentBorder }}>
                        <h3 className="wb-col-title">
                            <i className="fa-solid fa-comments" style={{ color: accent }} />
                            Event Coordination
                        </h3>
                        <span className="wb-col-count" style={{ background: accentBg, color: accent }}>
                            {notes.length}
                        </span>
                    </div>

                    <div className="wb-col-feed" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                        {notes.length === 0 ? (
                            <div className="wb-empty">No coordination notes yet</div>
                        ) : (
                            notes.map(note => (
                                <div
                                    key={note.id}
                                    className={`wb-note ${note.pinned ? 'wb-note-pinned' : ''}`}
                                    style={{
                                        background: note.pinned ? accentBg : undefined,
                                        borderColor: note.pinned ? accentBorder : undefined,
                                    }}
                                >
                                    <div className="wb-note-header">
                                        <span className="wb-note-author" style={{ color: accent }}>{note.author}</span>
                                        <span className="wb-note-time">{timeAgo(note.created_at)}</span>
                                    </div>
                                    <p className="wb-note-body">{note.content}</p>
                                    {note.pinned && (
                                        <span className="wb-pinned-tag" style={{ background: accentBg, color: accent }}>
                                            <i className="fa-solid fa-thumbtack" /> Pinned
                                        </span>
                                    )}
                                    <div className="wb-note-actions">
                                        <button
                                            className={`wb-act-btn ${note.pinned ? 'active' : ''}`}
                                            style={{ '--act-color': accent }}
                                            onClick={() => togglePin(note.id, note.pinned)}
                                            title={note.pinned ? 'Unpin' : 'Pin'}
                                        >
                                            <i className="fa-solid fa-thumbtack" />
                                        </button>
                                        <button
                                            className="wb-act-btn wb-act-delete"
                                            onClick={() => handleDelete(note.id)}
                                            title="Delete"
                                        >
                                            <i className="fa-solid fa-trash-can" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="wb-col-input" style={{ marginTop: 'var(--space-4)' }}>
                        <div className="wb-input-row">
                            <input
                                className="wb-text-input"
                                type="text"
                                placeholder="Write a note..."
                                value={newText}
                                onChange={e => setNewText(e.target.value)}
                                onKeyDown={handleKeyDown}
                            />
                            <button
                                className="wb-send-btn"
                                style={{ background: accent }}
                                onClick={handlePost}
                                disabled={posting || !newText.trim()}
                            >
                                {posting
                                    ? <i className="fa-solid fa-spinner fa-spin" />
                                    : <i className="fa-solid fa-paper-plane" />}
                            </button>
                        </div>
                    </div>
                </div>
                )}

            </div>
        </div>
    )
}

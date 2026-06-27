import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
import { getDeviceId, getAuthorName, setAuthorName as persistAuthorName } from '../lib/identity.js'

const COLUMNS = [
    { key: 'comms', title: 'Department Communication', icon: 'fa-comments', accent: '#4ade80', accentBg: 'rgba(74, 222, 128, 0.08)', accentBorder: 'rgba(74, 222, 128, 0.2)' },
]

export default function ManagementWhiteboard({ hideHeader = false }) {
    const [notes, setNotes] = useState([])
    // likesByNote: { [note_id]: [{ device_id, author_name }] }
    const [likesByNote, setLikesByNote] = useState({})
    const [newTexts, setNewTexts] = useState({ alerts: '', events: '', comms: '' })
    const [authorName, setAuthorName] = useState(() => getAuthorName())
    const [posting, setPosting] = useState(null)
    // namePrompt: null | { run: (name) => void } — deferred action awaiting a first-time name
    const [namePrompt, setNamePrompt] = useState(null)
    const [nameDraft, setNameDraft] = useState('')
    const inputRefs = useRef({})
    const myDeviceId = getDeviceId()

    useEffect(() => {
        loadNotes()
        loadLikes()
    }, [])

    // Realtime: keep posts and acknowledgements in sync across every open board,
    // mirroring the event_tasks subscription pattern.
    useEffect(() => {
        const channel = supabase
            .channel('mgmt_comms_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'management_notes' }, () => loadNotes())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'management_note_likes' }, () => loadLikes())
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [])

    async function loadNotes() {
        const { data } = await supabase
            .from('management_notes')
            .select('*')
            .order('pinned', { ascending: false })
            .order('created_at', { ascending: false })
        setNotes(data || [])
    }

    // Load all acknowledgements and group them by note for quick lookup/render.
    async function loadLikes() {
        const { data, error } = await supabase
            .from('management_note_likes')
            .select('note_id, device_id, author_name')
        if (error) {
            console.error('Failed to load acknowledgements:', error)
            return
        }
        const grouped = {}
        for (const row of data || []) {
            (grouped[row.note_id] ||= []).push({ device_id: row.device_id, author_name: row.author_name })
        }
        setLikesByNote(grouped)
    }

    // Resolve the current user's name, or defer the action behind a first-time prompt.
    function requireName(action) {
        const existing = (authorName || getAuthorName()).trim()
        if (existing) {
            persistAuthorName(existing)
            action(existing)
        } else {
            setNameDraft('')
            setNamePrompt({ run: action })
        }
    }

    // Confirm the inline first-time name prompt, then run the deferred action.
    function confirmName() {
        const clean = persistAuthorName(nameDraft)
        if (!clean) return
        setAuthorName(clean)
        const action = namePrompt?.run
        setNamePrompt(null)
        setNameDraft('')
        if (action) action(clean)
    }

    // Insert a note once we have a resolved author name.
    async function submitPost(category, name) {
        const content = newTexts[category]?.trim()
        if (!content) return
        setPosting(category)
        const { error } = await supabase
            .from('management_notes')
            .insert({ content, author: name, category, pinned: false })
        if (error) {
            console.error('Failed to post note:', error)
        } else {
            setNewTexts(prev => ({ ...prev, [category]: '' }))
            await loadNotes()
        }
        setPosting(null)
    }

    function handlePost(category) {
        if (!newTexts[category]?.trim()) return
        requireName(name => submitPost(category, name))
    }

    // Toggle this device's acknowledgement on a note (optimistic, reconciled by realtime).
    async function toggleLike(noteId, name) {
        const current = likesByNote[noteId] || []
        const liked = current.some(l => l.device_id === myDeviceId)

        if (liked) {
            setLikesByNote(prev => ({ ...prev, [noteId]: (prev[noteId] || []).filter(l => l.device_id !== myDeviceId) }))
            const { error } = await supabase
                .from('management_note_likes')
                .delete()
                .eq('note_id', noteId)
                .eq('device_id', myDeviceId)
            if (error) {
                console.error('Failed to remove acknowledgement:', error)
                loadLikes()
            }
        } else {
            setLikesByNote(prev => ({ ...prev, [noteId]: [...(prev[noteId] || []), { device_id: myDeviceId, author_name: name }] }))
            const { error } = await supabase
                .from('management_note_likes')
                .insert({ note_id: noteId, device_id: myDeviceId, author_name: name })
            // 23505 = unique violation: already acknowledged (e.g. double-tap) — treat as no-op.
            if (error && error.code !== '23505') {
                console.error('Failed to acknowledge note:', error)
                loadLikes()
            }
        }
    }

    function handleLike(noteId) {
        requireName(name => toggleLike(noteId, name))
    }

    async function handleDelete(id) {
        await supabase.from('management_notes').delete().eq('id', id)
        setNotes(prev => prev.filter(n => n.id !== id))
    }

    async function togglePin(id, currentPinned) {
        await supabase.from('management_notes').update({ pinned: !currentPinned }).eq('id', id)
        await loadNotes()
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

    function handleKeyDown(e, category) {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            handlePost(category)
        }
    }

    // When embedded on the dashboard (hideHeader), use flex layout to fill container
    const embeddedBoardStyle = hideHeader ? { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, height: '100%' } : {}
    const embeddedColumnsStyle = hideHeader ? { flex: 1, minHeight: 0 } : {}
    const embeddedColumnStyle = hideHeader ? { border: 'none', background: 'transparent', minHeight: 0, maxHeight: 'none', flex: 1 } : {}

    return (
        <div className="wb-board" style={embeddedBoardStyle}>
            {/* Author name bar */}
            {!hideHeader && (
                <div className="wb-author-bar">
                    <i className="fa-solid fa-user-pen" />
                    <input
                        className="wb-author-input"
                        type="text"
                        placeholder="Your name..."
                        value={authorName}
                        onChange={e => setAuthorName(e.target.value)}
                        onBlur={() => persistAuthorName(authorName)}
                    />
                </div>
            )}

            {/* Column grid — width tracks the actual column count so a single board
                fills the full container instead of a fixed 3-up slot */}
            <div className="wb-columns" style={{ gridTemplateColumns: `repeat(${COLUMNS.length}, 1fr)`, ...embeddedColumnsStyle }}>
                {COLUMNS.map(col => {
                    const colNotes = notes.filter(n => n.category === col.key)
                    return (
                        <div key={col.key} className="wb-column" style={embeddedColumnStyle}>

                            {!hideHeader && (
                                <div className="wb-col-header" style={{ borderBottomColor: col.accentBorder }}>
                                    <h3 className="wb-col-title">
                                        <i className={`fa-solid ${col.icon}`} style={{ color: col.accent }} />
                                        {col.title}
                                    </h3>
                                    <span className="wb-col-count" style={{ background: col.accentBg, color: col.accent }}>
                                        {colNotes.length}
                                    </span>
                                </div>
                            )}

                            <div className="wb-col-feed">
                                {colNotes.length === 0 ? (
                                    <div className="wb-empty">No posts yet</div>
                                ) : (
                                    colNotes.map(note => {
                                        const likes = likesByNote[note.id] || []
                                        const iLiked = likes.some(l => l.device_id === myDeviceId)
                                        return (
                                            <div
                                                key={note.id}
                                                className={`wb-note ${note.pinned ? 'wb-note-pinned' : ''}`}
                                                style={{
                                                    background: note.pinned ? col.accentBg : undefined,
                                                    borderColor: note.pinned ? col.accentBorder : undefined,
                                                }}
                                            >
                                                <div className="wb-note-header">
                                                    <span className="wb-note-author" style={{ color: col.accent }}>{note.author}</span>
                                                    <span className="wb-note-time">{timeAgo(note.created_at)}</span>
                                                </div>
                                                <p className="wb-note-body">{note.content}</p>
                                                {note.pinned && (
                                                    <span className="wb-pinned-tag" style={{ background: col.accentBg, color: col.accent }}>
                                                        <i className="fa-solid fa-thumbtack" /> Pinned
                                                    </span>
                                                )}

                                                {/* Bottom-right actions: acknowledge (always visible) + pin/delete (on hover) */}
                                                <div className="wb-note-actions">
                                                    <button
                                                        className={`wb-ack-btn ${iLiked ? 'active' : ''}`}
                                                        style={{ '--act-color': col.accent }}
                                                        onClick={() => handleLike(note.id)}
                                                        title={likes.length > 0
                                                            ? `Acknowledged by: ${likes.map(l => l.author_name).join(', ')}`
                                                            : 'Acknowledge'}
                                                    >
                                                        <i className="fa-solid fa-thumbs-up" />
                                                        {likes.length > 0 && <span className="wb-ack-count">{likes.length}</span>}
                                                    </button>
                                                    <button
                                                        className={`wb-act-btn ${note.pinned ? 'active' : ''}`}
                                                        style={{ '--act-color': col.accent }}
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
                                        )
                                    })
                                )}
                            </div>

                            <div className="wb-col-input">
                                {namePrompt ? (
                                    // First-time inline name capture — completes the deferred action on confirm.
                                    <div className="wb-name-prompt">
                                        <span className="wb-name-prompt-label">Enter your name to continue</span>
                                        <div className="wb-input-row">
                                            <input
                                                className="wb-text-input"
                                                type="text"
                                                autoFocus
                                                placeholder="Your name..."
                                                value={nameDraft}
                                                onChange={e => setNameDraft(e.target.value)}
                                                onKeyDown={e => { if (e.key === 'Enter') confirmName() }}
                                            />
                                            <button
                                                className="wb-send-btn"
                                                style={{ background: col.accent }}
                                                onClick={confirmName}
                                                disabled={!nameDraft.trim()}
                                                title="Save name"
                                            >
                                                <i className="fa-solid fa-check" />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="wb-input-row">
                                        <input
                                            ref={el => inputRefs.current[col.key] = el}
                                            className="wb-text-input"
                                            type="text"
                                            placeholder="Write a message..."
                                            value={newTexts[col.key]}
                                            onChange={e => setNewTexts(prev => ({ ...prev, [col.key]: e.target.value }))}
                                            onKeyDown={e => handleKeyDown(e, col.key)}
                                        />
                                        <button
                                            className="wb-send-btn"
                                            style={{ background: col.accent }}
                                            onClick={() => handlePost(col.key)}
                                            disabled={posting === col.key || !newTexts[col.key]?.trim()}
                                        >
                                            {posting === col.key
                                                ? <i className="fa-solid fa-spinner fa-spin" />
                                                : <i className="fa-solid fa-paper-plane" />}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

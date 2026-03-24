import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

export default function EventsBanquetsPage() {
    const [notes, setNotes] = useState([])
    const [banquets, setBanquets] = useState([])
    const [beos, setBeos] = useState([])
    const [newText, setNewText] = useState('')
    const [authorName, setAuthorName] = useState(() => localStorage.getItem('mgmt_author') || '')
    const [posting, setPosting] = useState(false)
    const [loadingBanquets, setLoadingBanquets] = useState(true)
    const [uploadingBEO, setUploadingBEO] = useState(false)

    const accent = '#60a5fa'
    const accentBg = 'rgba(96, 165, 250, 0.08)'
    const accentBorder = 'rgba(96, 165, 250, 0.2)'

    useEffect(() => {
        loadNotes()
        loadBanquets()
        loadBEOS()
    }, [])

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
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                const base64 = reader.result.split(',')[1];
                const { data, error } = await supabase.functions.invoke('process-beo', {
                    body: { pdfBase64: base64 }
                });

                if (error) throw error;
                await loadBEOS();
                alert("BEO Parsed Successfully!");
            };
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

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <div className="header-left">
                    <h1 className="header-title"><i className="fa-solid fa-champagne-glasses title-icon" style={{ color: accent }} /> Events & Catering</h1>
                    <p className="header-date">Upcoming banquets and special event coordination</p>
                </div>
                <div className="header-actions">
                    <label className={`btn btn-primary btn-sm ${uploadingBEO ? 'disabled' : ''}`} style={{ background: '#3b82f6', borderColor: '#3b82f6', cursor: 'pointer' }}>
                        <i className={`fa-solid ${uploadingBEO ? 'fa-spinner fa-spin' : 'fa-file-pdf'}`} />
                        {uploadingBEO ? 'Parsing...' : 'Upload BEO'}
                        <input type="file" accept=".pdf" style={{ display: 'none' }} onChange={handleBEOUpload} disabled={uploadingBEO} />
                    </label>
                    <Link to="/office" className="btn btn-secondary btn-sm"><i className="fa-solid fa-arrow-left" /> Back</Link>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 350px', gap: 'var(--space-6)', alignItems: 'start' }}>
                
                {/* Left Panel: Parsed upcoming banquets & BEOs */}
                <div className="card-column" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
                    
                    {/* BEO Details Card (New!) */}
                    {beos.length > 0 && (
                        <div className="card">
                            <div className="card-header">
                                <h2 className="card-title"><i className="fa-solid fa-file-invoice" style={{ color: '#3b82f6', marginRight: '8px' }}/> Recent Event Orders (BEOs)</h2>
                            </div>
                            <div className="data-table-wrapper" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Event</th>
                                            <th>Date</th>
                                            <th>Guests</th>
                                            <th>Food Items & Qty</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {beos.slice().reverse().map(b => (
                                            <tr key={b.id}>
                                                <td style={{ fontWeight: 600 }}>{b.event_name}</td>
                                                <td>{new Date(b.event_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' })}</td>
                                                <td>{b.guest_count}</td>
                                                <td>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.9em' }}>
                                                        {(b.food_items || []).map((fi, idx) => (
                                                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '2px' }}>
                                                                <span style={{ color: 'var(--text-primary)' }}>• {fi.item}</span>
                                                                <span style={{ fontWeight: 700, color: '#3b82f6' }}>{fi.quantity}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
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

            </div>
        </div>
    )
}

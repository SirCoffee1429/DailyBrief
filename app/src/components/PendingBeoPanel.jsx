import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { formatRelativeTime } from '../lib/notifications.js'
import { usePendingBeoImports, approveBeoImport, discardBeoImport } from '../lib/usePendingBeoImports.js'
import { diffBeoImport, summarizeDiffs, eventKey } from '../lib/beoDiff.js'

// Review queue for BEOs that arrived by email, shown above the BEO list on the
// Events page. An emailed BEO is almost always an update to an event the crew is
// already working from, so nothing here is applied until someone approves it.

// Long values (notes especially) would otherwise blow out the row height.
function truncate(value, max = 90) {
    if (!value) return '—'
    return value.length > max ? `${value.slice(0, max)}…` : value
}

// Which waiting emails mention the same event. Rows arrive newest first, so a
// lower index is a newer email. Approving the older of two packets that both
// touch an event would quietly undo the newer one, and nothing else on screen
// would say so.
function buildOverlapIndex(rows) {
    const byKey = new Map()
    rows.forEach((row, index) => {
        for (const event of row.parsed_events || []) {
            const key = eventKey(event)
            if (!byKey.has(key)) byKey.set(key, [])
            byKey.get(key).push(index)
        }
    })
    return byKey
}

function overlapNote(overlapIndex, key, rowIndex) {
    const seenIn = overlapIndex.get(key)
    if (!seenIn || seenIn.length < 2) return null
    return Math.min(...seenIn) < rowIndex
        ? 'Also in a newer email below the fold — approving this one may undo it'
        : 'Also in an older email still waiting'
}

export default function PendingBeoPanel({ beos, onApplied }) {
    const { rows } = usePendingBeoImports()
    const [busyId, setBusyId] = useState(null)
    const [expanded, setExpanded] = useState({})

    if (rows.length === 0) return null

    const overlapIndex = buildOverlapIndex(rows)

    // The original attachment is the only copy of record — Postmark truncates
    // stored messages and never hosts attachments — so the link is minted fresh
    // and short-lived rather than stored.
    async function handleViewOriginal(row) {
        const { data, error } = await supabase.storage
            .from('beo-emails')
            .createSignedUrl(row.pdf_path, 60)

        if (error || !data?.signedUrl) {
            console.error('Failed to sign BEO original:', error)
            alert('Could not open the original PDF.')
            return
        }
        window.open(data.signedUrl, '_blank', 'noopener')
    }

    async function handleApprove(row, summary) {
        const total = (row.parsed_events || []).length
        const confirmed = window.confirm(
            `Apply all ${total} event${total === 1 ? '' : 's'} from this email?\n\n` +
            `${summary.changed} changed, ${summary.new} new, ${summary.unchanged} unchanged.\n\n` +
            'Tasks, crew notes and order items are preserved.'
        )
        if (!confirmed) return

        setBusyId(row.id)
        try {
            const result = await approveBeoImport(row)
            await onApplied?.()
            const updated = result?.updated ?? 0
            const inserted = result?.inserted ?? 0
            const parts = []
            if (updated > 0) parts.push(`${updated} BEO${updated === 1 ? '' : 's'} updated`)
            if (inserted > 0) parts.push(`${inserted} new BEO${inserted === 1 ? '' : 's'} added`)
            alert(`${parts.join(', ') || 'No changes applied'}. Tasks, notes, and order items preserved.`)
        } catch (err) {
            console.error('Failed to approve emailed BEO:', err)
            alert(`Could not apply this BEO. Details: ${err?.message || String(err)}`)
        } finally {
            setBusyId(null)
        }
    }

    async function handleDiscard(row) {
        if (!window.confirm('Discard this emailed BEO without applying it?')) return

        setBusyId(row.id)
        try {
            await discardBeoImport(row)
        } catch (err) {
            console.error('Failed to discard emailed BEO:', err)
            alert(`Could not discard this BEO. Details: ${err?.message || String(err)}`)
        } finally {
            setBusyId(null)
        }
    }

    return (
        <div className="beo-queue">
            <div className="beo-queue-title">
                <i className="fa-solid fa-envelope-open-text" />
                <span>{rows.length === 1 ? '1 BEO from email' : `${rows.length} BEOs from email`}</span>
            </div>

            {rows.map((row, rowIndex) => {
                const entries = diffBeoImport(row.parsed_events, beos)
                const summary = summarizeDiffs(entries)
                const notable = entries.filter(entry => entry.diff.status !== 'unchanged')
                const unchangedCount = summary.unchanged
                const isOpen = expanded[row.id]
                const busy = busyId === row.id

                return (
                    <div key={row.id} className="beo-queue-card">
                        <div className="beo-queue-card-head">
                            <div>
                                <span className="beo-queue-from">{row.from_email}</span>
                                <span className="beo-queue-subject">{row.subject || 'No subject'}</span>
                            </div>
                            <span className="beo-queue-time">{formatRelativeTime(row.created_at)}</span>
                        </div>

                        {row.status === 'processing' && (
                            <p className="beo-queue-status">
                                <i className="fa-solid fa-spinner fa-spin" /> Reading the BEO — this takes about a minute.
                            </p>
                        )}

                        {row.status === 'parse_failed' && (
                            <p className="beo-queue-status failed">
                                <i className="fa-solid fa-triangle-exclamation" /> Could not read this PDF
                                {row.error_text ? ` — ${truncate(row.error_text, 120)}` : ''}. Open the original and add it by hand.
                            </p>
                        )}

                        {row.status === 'pending' && (
                            <>
                                <p className="beo-queue-summary">
                                    {entries.length} event{entries.length === 1 ? '' : 's'} · {summary.changed} changed,{' '}
                                    {summary.new} new, {summary.unchanged} unchanged
                                </p>

                                {notable.length === 0 ? (
                                    <p className="beo-queue-status">
                                        Nothing differs from what is already on the board.
                                    </p>
                                ) : (
                                    <ul className="beo-queue-events">
                                        {notable.map(entry => {
                                            const note = overlapNote(overlapIndex, eventKey(entry.event), rowIndex)
                                            return (
                                                <li key={eventKey(entry.event)} className="beo-queue-event">
                                                    <div className="beo-queue-event-head">
                                                        <span className="beo-queue-event-name">
                                                            {entry.event.event_name || 'Untitled event'}
                                                        </span>
                                                        <span className="beo-queue-event-date">{entry.event.event_date}</span>
                                                        {entry.diff.status === 'new' && (
                                                            <span className="beo-queue-tag new">New</span>
                                                        )}
                                                    </div>

                                                    {note && (
                                                        <p className="beo-queue-overlap">
                                                            <i className="fa-solid fa-triangle-exclamation" /> {note}
                                                        </p>
                                                    )}

                                                    {entry.diff.fields.map(field => (
                                                        <p key={field.key} className="beo-queue-change">
                                                            {field.label}: <s>{truncate(field.from)}</s> → <b>{truncate(field.to)}</b>
                                                        </p>
                                                    ))}

                                                    {entry.diff.added.map((item, i) => (
                                                        <p key={`a${i}`} className="beo-queue-change added">
                                                            + {item.label || item.category}: {truncate(item.description, 70)}
                                                            {item.qty ? ` ×${item.qty}` : ''}
                                                        </p>
                                                    ))}

                                                    {entry.diff.removed.map((item, i) => (
                                                        <p key={`r${i}`} className="beo-queue-change removed">
                                                            − {item.label || item.category}: {truncate(item.description, 70)}
                                                        </p>
                                                    ))}

                                                    {entry.diff.changed.map((item, i) => (
                                                        <p key={`c${i}`} className="beo-queue-change">
                                                            {item.label || item.category}: {truncate(item.description, 60)} —
                                                            qty <s>{item.from || '—'}</s> → <b>{item.to || '—'}</b>
                                                        </p>
                                                    ))}
                                                </li>
                                            )
                                        })}
                                    </ul>
                                )}

                                {unchangedCount > 0 && (
                                    <button
                                        className="beo-queue-toggle"
                                        onClick={() => setExpanded(prev => ({ ...prev, [row.id]: !prev[row.id] }))}
                                    >
                                        <i className={`fa-solid fa-chevron-${isOpen ? 'down' : 'right'}`} />
                                        {' '}{unchangedCount} unchanged
                                    </button>
                                )}

                                {isOpen && (
                                    <ul className="beo-queue-unchanged">
                                        {entries
                                            .filter(entry => entry.diff.status === 'unchanged')
                                            .map(entry => (
                                                <li key={eventKey(entry.event)}>
                                                    {entry.event.event_name} · {entry.event.event_date}
                                                </li>
                                            ))}
                                    </ul>
                                )}
                            </>
                        )}

                        <div className="beo-queue-actions">
                            {row.pdf_path && (
                                <button className="beo-queue-link" onClick={() => handleViewOriginal(row)}>
                                    <i className="fa-solid fa-file-pdf" /> View original
                                </button>
                            )}
                            {row.status === 'pending' && (
                                <button
                                    className="beo-queue-approve"
                                    disabled={busy}
                                    onClick={() => handleApprove(row, summary)}
                                >
                                    {busy ? 'Applying…' : 'Approve all'}
                                </button>
                            )}
                            {row.status !== 'processing' && (
                                <button className="beo-queue-discard" disabled={busy} onClick={() => handleDiscard(row)}>
                                    Discard
                                </button>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

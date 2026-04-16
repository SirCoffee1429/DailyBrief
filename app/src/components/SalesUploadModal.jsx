import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase.js'

const MAX_FILE_BYTES = 8 * 1024 * 1024

// Read a File into a base64 string (strips the data URL prefix)
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
            const result = reader.result
            const comma = result.indexOf(',')
            resolve(comma >= 0 ? result.slice(comma + 1) : result)
        }
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(file)
    })
}

export default function SalesUploadModal({ onClose, onComplete }) {
    const [items, setItems] = useState([])
    const [running, setRunning] = useState(false)
    const fileInputRef = useRef(null)

    // Normalize selected files into status rows
    function handleFilesSelected(fileList) {
        const files = Array.from(fileList || [])
            .filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'))
        const rows = files.map(f => ({
            file: f,
            name: f.name,
            size: f.size,
            status: f.size > MAX_FILE_BYTES ? 'error' : 'pending',
            message: f.size > MAX_FILE_BYTES ? 'File exceeds 8MB limit' : '',
        }))
        setItems(prev => [...prev, ...rows])
    }

    function removeRow(idx) {
        if (running) return
        setItems(prev => prev.filter((_, i) => i !== idx))
    }

    // Sequentially upload each pending file so we don't hammer Gemini rate limits
    async function startUpload() {
        if (running) return
        setRunning(true)

        for (let i = 0; i < items.length; i++) {
            const row = items[i]
            if (row.status !== 'pending') continue

            setItems(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'reading', message: 'Reading file...' } : r))

            try {
                const base64 = await fileToBase64(row.file)

                setItems(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'parsing', message: 'Parsing with AI...' } : r))

                const { data, error } = await supabase.functions.invoke('process-sales-data', {
                    body: {
                        pdfBase64: base64,
                        filename: row.name,
                        source: 'manual-upload',
                    },
                })

                if (error) throw error

                if (data?.success) {
                    setItems(prev => prev.map((r, idx) => idx === i ? {
                        ...r,
                        status: 'success',
                        message: `Saved ${data.count} items for ${data.report_date}`,
                    } : r))
                } else if (data?.ignored) {
                    setItems(prev => prev.map((r, idx) => idx === i ? {
                        ...r,
                        status: 'error',
                        message: data.reason || 'Ignored by parser',
                    } : r))
                } else {
                    throw new Error(data?.error || 'Unknown error from edge function')
                }
            } catch (err) {
                console.error('Sales upload failed for', row.name, err)
                setItems(prev => prev.map((r, idx) => idx === i ? {
                    ...r,
                    status: 'error',
                    message: err?.message || 'Upload failed',
                } : r))
            }
        }

        setRunning(false)
        if (onComplete) onComplete()
    }

    const pendingCount = items.filter(r => r.status === 'pending').length
    const successCount = items.filter(r => r.status === 'success').length
    const errorCount = items.filter(r => r.status === 'error').length

    return (
        <div className="modal-backdrop" onClick={running ? undefined : onClose}>
            <div
                className="modal-content"
                style={{ maxWidth: '640px' }}
                onClick={e => e.stopPropagation()}
            >
                <div className="modal-header">
                    <h2>
                        <i className="fa-solid fa-file-arrow-up" style={{ color: 'var(--accent)', marginRight: '10px' }} />
                        Upload Sales Reports
                    </h2>
                    <button className="btn-close" onClick={onClose} disabled={running} aria-label="Close">
                        <i className="fa-solid fa-xmark" />
                    </button>
                </div>

                <div style={{ padding: 'var(--space-5)', maxHeight: '60vh', overflowY: 'auto' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginTop: 0, marginBottom: 'var(--space-4)' }}>
                        Select one or more Item Sales PDFs. Each upload replaces any existing data for that report's date.
                    </p>

                    <div
                        onClick={() => !running && fileInputRef.current?.click()}
                        style={{
                            border: '2px dashed var(--border-color)',
                            borderRadius: 'var(--radius-lg)',
                            padding: 'var(--space-6)',
                            textAlign: 'center',
                            cursor: running ? 'not-allowed' : 'pointer',
                            background: 'var(--bg-card-hover)',
                            transition: 'border-color 0.2s ease',
                        }}
                        onDragOver={e => { e.preventDefault() }}
                        onDrop={e => {
                            e.preventDefault()
                            if (!running) handleFilesSelected(e.dataTransfer.files)
                        }}
                    >
                        <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: '2rem', color: 'var(--accent)', marginBottom: 'var(--space-2)' }} />
                        <div style={{ color: 'var(--text-bright)', fontWeight: 600 }}>
                            Click to select or drop PDFs here
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-1)' }}>
                            Max 8MB per file
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept="application/pdf,.pdf"
                            style={{ display: 'none' }}
                            onChange={e => {
                                handleFilesSelected(e.target.files)
                                e.target.value = ''
                            }}
                        />
                    </div>

                    {items.length > 0 && (
                        <div style={{ marginTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                            {items.map((row, idx) => (
                                <StatusRow key={`${row.name}-${idx}`} row={row} onRemove={() => removeRow(idx)} running={running} />
                            ))}
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <div style={{ marginRight: 'auto', color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>
                        {items.length > 0 && (
                            <>
                                {successCount > 0 && <span style={{ color: 'var(--accent)', marginRight: 'var(--space-3)' }}>✓ {successCount} saved</span>}
                                {errorCount > 0 && <span style={{ color: '#ef4444', marginRight: 'var(--space-3)' }}>✗ {errorCount} failed</span>}
                                {pendingCount > 0 && <span>{pendingCount} pending</span>}
                            </>
                        )}
                    </div>
                    <button className="btn btn-secondary" onClick={onClose} disabled={running}>
                        {running ? 'Uploading…' : 'Close'}
                    </button>
                    <button
                        className="btn btn-primary btn-orange"
                        onClick={startUpload}
                        disabled={running || pendingCount === 0}
                    >
                        {running ? (
                            <><i className="fa-solid fa-spinner fa-spin" /> Processing…</>
                        ) : (
                            <><i className="fa-solid fa-bolt" /> Process {pendingCount || ''}</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}

function StatusRow({ row, onRemove, running }) {
    const icon = {
        pending: { name: 'fa-file-pdf', color: 'var(--text-muted)' },
        reading: { name: 'fa-spinner fa-spin', color: 'var(--accent)' },
        parsing: { name: 'fa-spinner fa-spin', color: 'var(--accent)' },
        success: { name: 'fa-circle-check', color: 'var(--accent)' },
        error: { name: 'fa-circle-exclamation', color: '#ef4444' },
    }[row.status]

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
            padding: 'var(--space-3)',
            background: 'var(--bg-card-hover)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
        }}>
            <i className={`fa-solid ${icon.name}`} style={{ color: icon.color, fontSize: '1.1rem', width: '20px', textAlign: 'center' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: 'var(--text-bright)', fontSize: 'var(--font-size-sm)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {row.name}
                </div>
                {row.message && (
                    <div style={{ color: row.status === 'error' ? '#ef4444' : 'var(--text-muted)', fontSize: '0.75rem', marginTop: '2px' }}>
                        {row.message}
                    </div>
                )}
            </div>
            {(row.status === 'pending' || row.status === 'error') && !running && (
                <button
                    onClick={onRemove}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.9rem' }}
                    aria-label="Remove"
                >
                    <i className="fa-solid fa-xmark" />
                </button>
            )}
        </div>
    )
}

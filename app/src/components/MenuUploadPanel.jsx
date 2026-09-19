import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
import { menuSourceFromFilename } from '../lib/menuDrafts.js'

// Drafts dishes from catering menu PDFs, one file per request.
//
// One at a time on purpose: each menu is its own identity (menu_source), the model
// takes ~25-90s per file, and a batch that dies halfway through would leave the office
// guessing which menus landed. Sequential means the per-file result line IS the record.
export default function MenuUploadPanel({ onDrafted }) {
    const [files, setFiles] = useState([])
    const [results, setResults] = useState([])
    const [busy, setBusy] = useState(false)
    const [current, setCurrent] = useState(null)
    const [dragging, setDragging] = useState(false)
    const inputRef = useRef(null)

    function addFiles(fileList) {
        const pdfs = Array.from(fileList).filter(f => f.name.toLowerCase().endsWith('.pdf'))
        setFiles(prev => [...prev, ...pdfs.filter(f => !prev.some(p => p.name === f.name))])
        setResults([])
    }

    async function draftAll() {
        setBusy(true)
        setResults([])
        const collected = []

        for (const file of files) {
            const { menuSource, season } = menuSourceFromFilename(file.name)
            setCurrent(menuSource)
            try {
                const base64 = await new Promise((resolve, reject) => {
                    const reader = new FileReader()
                    reader.onload = () => resolve(reader.result.split(',')[1])
                    reader.onerror = () => reject(new Error('Could not read the file'))
                    reader.readAsDataURL(file)
                })

                const { data, error } = await supabase.functions.invoke('process-menu', {
                    body: { pdfBase64: base64, menuSource, season },
                })
                if (error) throw error
                if (data?.error) throw new Error(data.error)

                collected.push({ menuSource, season, ...data })
            } catch (err) {
                console.error(`Menu draft failed for ${file.name}:`, err)
                collected.push({ menuSource, season, error: err.message || String(err) })
            }
            // Written after every file, so a failure late in the list does not hide the
            // menus that already succeeded.
            setResults([...collected])
        }

        setCurrent(null)
        setBusy(false)
        setFiles([])
        onDrafted?.()
    }

    return (
        <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
            <div
                className={`upload-zone ${dragging ? 'dragging' : ''}`}
                onClick={() => inputRef.current?.click()}
                onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files) }}
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
            >
                <div className="upload-zone-icon">📋</div>
                <div className="upload-zone-text">Drop the catering menu PDFs here</div>
                <div className="upload-zone-hint">
                    Everything drafted lands unconfirmed — nothing is used downstream until
                    you confirm it below
                </div>
                <input
                    ref={inputRef}
                    type="file"
                    accept=".pdf"
                    multiple
                    style={{ display: 'none' }}
                    onChange={e => { addFiles(e.target.files); e.target.value = '' }}
                />
            </div>

            {files.length > 0 && (
                <div className="upload-file-list" style={{ marginTop: 'var(--space-4)' }}>
                    {files.map((f, i) => {
                        const { menuSource, season } = menuSourceFromFilename(f.name)
                        return (
                            <div key={f.name} className="upload-file-item">
                                <span style={{ fontSize: '1.2rem' }}>📄</span>
                                <span className="upload-file-name">
                                    {menuSource}{season ? ` · ${season}` : ''}
                                </span>
                                {!busy && (
                                    <button
                                        className="btn btn-sm btn-danger"
                                        onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))}
                                    >✕</button>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            {results.length > 0 && (
                <div className="menu-draft-results">
                    {results.map(r => (
                        <div key={r.menuSource + (r.season || '')} className="menu-draft-result">
                            <span className="menu-draft-result-name">
                                {r.menuSource}{r.season ? ` · ${r.season}` : ''}
                            </span>
                            {r.error
                                ? <span className="badge badge-danger">{r.error}</span>
                                : <span className="menu-draft-result-counts">
                                    {r.inserted} new · {r.updated} redrafted
                                    {r.skipped_confirmed > 0 && ` · ${r.skipped_confirmed} left alone (already confirmed)`}
                                </span>}
                        </div>
                    ))}
                </div>
            )}

            <div style={{ marginTop: 'var(--space-5)', display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
                <button className="btn btn-primary" onClick={draftAll} disabled={busy || files.length === 0}>
                    {busy ? `Reading ${current}...` : `Draft ${files.length} menu${files.length === 1 ? '' : 's'}`}
                </button>
                {files.length > 0 && !busy && (
                    <button className="btn btn-secondary" onClick={() => { setFiles([]); setResults([]) }}>
                        Clear
                    </button>
                )}
                {busy && <span className="page-subtitle">Each menu takes up to two minutes.</span>}
            </div>
        </div>
    )
}

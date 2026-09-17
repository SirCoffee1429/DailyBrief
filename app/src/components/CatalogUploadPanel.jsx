import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase.js'
import { localDateString } from '../lib/dates.js'
import { parseExportWorkbook, mergeBatch } from '../lib/catalogParse.js'

// Rows per upsert request. 1,381 products in one call is a large payload for
// PostgREST; 500 keeps each request small without making the upload chatty.
const CHUNK_SIZE = 500

// Uploads a BATCH of raw Performance Foodservice exports. The whole batch is parsed
// and merged in the browser first, so the counts can be reviewed BEFORE anything is
// written — the merge is deterministic, so the preview is exactly what gets stored.
export default function CatalogUploadPanel({ onCommitted }) {
    const [files, setFiles] = useState([])
    const [preview, setPreview] = useState(null)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState(null)
    const [dragging, setDragging] = useState(false)
    const inputRef = useRef(null)

    function addFiles(fileList) {
        const xlsx = Array.from(fileList).filter(f => f.name.endsWith('.xlsx') || f.name.endsWith('.xls'))
        setFiles(prev => [...prev, ...xlsx.filter(f => !prev.some(p => p.name === f.name))])
        setPreview(null)
        setError(null)
    }

    // Parse and merge every selected file without touching the database.
    async function buildPreview() {
        setBusy(true)
        setError(null)
        try {
            const parsed = []
            for (const file of files) {
                const buffer = await file.arrayBuffer()
                const workbook = XLSX.read(buffer, { type: 'array' })
                const sheetToRows = (name) => workbook.Sheets[name]
                    ? XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, blankrows: false, defval: '' })
                    : null
                parsed.push(parseExportWorkbook(sheetToRows, file.name))
            }
            setPreview(mergeBatch(parsed))
        } catch (err) {
            console.error('Catalog parse failed:', err)
            setError(err.message)
            setPreview(null)
        } finally {
            setBusy(false)
        }
    }

    // Writes the merged batch. Upsert on product_number: price, pack and source lists
    // are refreshed, while category/item_group are deliberately absent from the payload
    // so a refresh can never overwrite a curated categorisation. Nothing is deleted.
    async function commit() {
        if (!preview) return
        setBusy(true)
        setError(null)
        try {
            const priceAsOf = localDateString()
            const rows = preview.products.map(p => ({
                product_number: p.product_number,
                description: p.description,
                brand: p.brand,
                custom_description: p.custom_description,
                pack_size: p.pack_size,
                pack_count: p.pack_count,
                pack_unit_size: p.pack_unit_size,
                pack_unit_size_max: p.pack_unit_size_max,
                pack_unit: p.pack_unit,
                pack_total_base: p.pack_total_base,
                base_unit: p.base_unit,
                uom: p.uom,
                price: p.price,
                price_basis: p.price_basis,
                case_price: p.case_price,
                price_varies: p.price_varies,
                price_as_of: priceAsOf,
                source_lists: p.source_lists,
                last_seen_at: new Date().toISOString(),
            }))

            for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
                const { error: upsertError } = await supabase
                    .from('supplier_products')
                    .upsert(rows.slice(i, i + CHUNK_SIZE), { onConflict: 'product_number' })
                if (upsertError) throw upsertError
            }

            const { error: uploadError } = await supabase
                .from('supplier_catalog_uploads')
                .insert({
                    source_label: files.map(f => f.name).join(', ').slice(0, 500),
                    file_count: preview.stats.files,
                    product_count: preview.stats.products,
                })
            if (uploadError) throw uploadError

            setFiles([])
            setPreview(null)
            onCommitted?.()
        } catch (err) {
            console.error('Catalog commit failed:', err)
            setError(err.message)
        } finally {
            setBusy(false)
        }
    }

    const stats = preview?.stats

    return (
        <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
            <div
                className={`upload-zone ${dragging ? 'dragging' : ''}`}
                onClick={() => inputRef.current?.click()}
                onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files) }}
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
            >
                <div className="upload-zone-icon">📦</div>
                <div className="upload-zone-text">Drop the order guide exports here</div>
                <div className="upload-zone-hint">
                    All of them at once — the highest price only wins within a single batch
                </div>
                <input
                    ref={inputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    multiple
                    style={{ display: 'none' }}
                    onChange={e => addFiles(e.target.files)}
                />
            </div>

            {files.length > 0 && (
                <div className="upload-file-list" style={{ marginTop: 'var(--space-4)' }}>
                    {files.map((f, i) => (
                        <div key={f.name} className="upload-file-item">
                            <span style={{ fontSize: '1.2rem' }}>📄</span>
                            <span className="upload-file-name">{f.name}</span>
                            {!busy && (
                                <button
                                    className="btn btn-sm btn-danger"
                                    onClick={() => { setFiles(prev => prev.filter((_, idx) => idx !== i)); setPreview(null) }}
                                >✕</button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {error && (
                <div className="badge badge-danger" style={{ display: 'block', marginTop: 'var(--space-4)', padding: 'var(--space-3)' }}>
                    {error}
                </div>
            )}

            {stats && (
                <div style={{ marginTop: 'var(--space-4)' }}>
                    <div className="catalog-stat-row">
                        <Stat label="Files" value={stats.files} />
                        <Stat label="Rows read" value={stats.raw_rows.toLocaleString()} />
                        <Stat label="Products" value={stats.products.toLocaleString()} />
                        <Stat label="Price varies" value={stats.price_varies} />
                        <Stat label="No price" value={stats.unpriced} />
                        <Stat label="Needs pack size" value={stats.no_pack_base} />
                    </div>
                    <p className="page-subtitle" style={{ marginTop: 'var(--space-3)' }}>
                        Nothing is saved yet. "Needs pack size" counts products whose pack cannot be
                        measured automatically — #10 cans and a few odd packs — which stay orderable
                        but carry no case total until someone fills the size in.
                    </p>
                </div>
            )}

            <div style={{ marginTop: 'var(--space-5)', display: 'flex', gap: 'var(--space-3)' }}>
                <button className="btn btn-secondary" onClick={buildPreview} disabled={busy || files.length === 0}>
                    {busy && !preview ? 'Reading...' : `Check ${files.length} file(s)`}
                </button>
                {preview && (
                    <button className="btn btn-primary" onClick={commit} disabled={busy}>
                        {busy ? 'Saving...' : `Save ${stats.products.toLocaleString()} products`}
                    </button>
                )}
                {files.length > 0 && !busy && (
                    <button className="btn btn-secondary" onClick={() => { setFiles([]); setPreview(null); setError(null) }}>
                        Clear
                    </button>
                )}
            </div>
        </div>
    )
}

function Stat({ label, value }) {
    return (
        <div className="catalog-stat">
            <div className="catalog-stat-value">{value}</div>
            <div className="catalog-stat-label">{label}</div>
        </div>
    )
}

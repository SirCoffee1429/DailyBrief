import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase.js'
import { parsePurchaseHistory } from '../lib/catalogParse.js'
import { formatDateOnly } from '../lib/dates.js'

// Records what the kitchen last bought, from PFG's "Inventory Worksheet" purchase-history
// export, so the ingredient -> product matching can prefer products that are actually ordered.
//
// Its own panel, like the category seed, because it writes a different thing: last-purchase
// dates only. It never touches prices — that export's Price column is per pound for
// catch-weight items with nothing to say so — and a product it adds arrives unpriced.
export default function PurchaseHistoryPanel({ onRecorded }) {
    const [preview, setPreview] = useState(null)
    const [result, setResult] = useState(null)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState(null)
    const inputRef = useRef(null)

    // Parses in the browser so the preview shows exactly what would be saved.
    async function readFile(file) {
        setBusy(true)
        setError(null)
        setResult(null)
        try {
            const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' })
            const parsed = parsePurchaseHistory({
                sheetNames: workbook.SheetNames,
                sheetToRows: (name) => workbook.Sheets[name]
                    ? XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, blankrows: false, defval: '' })
                    : null,
            }, file.name)
            if (parsed.rows.length === 0) throw new Error('No purchases could be read from this file.')
            setPreview({ ...parsed, fileName: file.name })
        } catch (err) {
            console.error('Purchase history parse failed:', err)
            setError(err.message)
            setPreview(null)
        } finally {
            setBusy(false)
            // Lets the same file be chosen again after a fix.
            if (inputRef.current) inputRef.current.value = ''
        }
    }

    // One RPC: atomic, and a last-purchase date can never move backwards (see the migration).
    async function record() {
        if (!preview) return
        setBusy(true)
        setError(null)
        try {
            const { data, error: rpcError } = await supabase.rpc('record_purchase_history', { p_rows: preview.rows })
            if (rpcError) throw rpcError
            setResult(Array.isArray(data) ? data[0] : data)
            setPreview(null)
            onRecorded?.()
        } catch (err) {
            console.error('Recording purchase history failed:', err)
            setError(err.message)
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
            <div style={{ fontWeight: 600, marginBottom: 'var(--space-2)' }}>Purchase history</div>
            <p className="page-subtitle" style={{ marginBottom: 'var(--space-4)' }}>
                The Inventory Worksheet export of your purchase history. Records when each product
                was last bought, so ingredient matching prefers what you actually order. Prices are
                not changed; a product missing from the catalog is added without a price.
            </p>

            <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls"
                style={{ display: 'none' }}
                onChange={e => e.target.files?.[0] && readFile(e.target.files[0])}
            />

            {preview && (
                <div style={{ marginBottom: 'var(--space-4)' }}>
                    <div className="catalog-stat-row">
                        <Stat label="Products" value={preview.stats.products.toLocaleString()} />
                        <Stat label="Earliest" value={formatDateOnly(preview.stats.earliest)} />
                        <Stat label="Latest" value={formatDateOnly(preview.stats.latest)} />
                    </div>
                    <p className="page-subtitle" style={{ marginTop: 'var(--space-3)' }}>
                        From {preview.fileName}. Nothing is saved yet.
                    </p>
                    {preview.stats.unparsed > 0 && (
                        <div className="badge badge-warning" style={{ display: 'block', marginTop: 'var(--space-3)', padding: 'var(--space-3)' }}>
                            {preview.stats.unparsed} row(s) had no readable purchase and will be skipped:{' '}
                            {preview.unparsed.slice(0, 5).map(u => `#${u.product_number}`).join(', ')}
                            {preview.unparsed.length > 5 ? '…' : ''}
                        </div>
                    )}
                </div>
            )}

            {result && (
                <div style={{ marginBottom: 'var(--space-4)' }}>
                    <div className="catalog-stat-row">
                        <Stat label="Updated" value={result.updated} />
                        <Stat label="Already newer" value={result.kept_newer} />
                        <Stat label="Added, no price" value={result.inserted} />
                    </div>
                    {result.inserted > 0 && (
                        <p className="page-subtitle" style={{ marginTop: 'var(--space-3)' }}>
                            Added products show "No price" until the next order-guide load prices them.
                        </p>
                    )}
                </div>
            )}

            {error && (
                <div className="badge badge-danger" style={{ display: 'block', marginBottom: 'var(--space-4)', padding: 'var(--space-3)' }}>
                    {error}
                </div>
            )}

            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <button className="btn btn-secondary" onClick={() => inputRef.current?.click()} disabled={busy}>
                    {busy && !preview ? 'Reading...' : 'Choose purchase history'}
                </button>
                {preview && (
                    <button className="btn btn-primary" onClick={record} disabled={busy}>
                        {busy ? 'Recording...' : `Record ${preview.stats.products.toLocaleString()} purchases`}
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

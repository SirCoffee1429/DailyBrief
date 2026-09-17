import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase.js'
import { parseMasterCategories } from '../lib/catalogParse.js'

// Seeds category and item_group from the master item list.
//
// Kept separate from the order-guide uploader on purpose: that one takes the RAW exports
// and rebuilds prices, this one takes the single master file and only fills in
// categorisation. Mixing them in one drop zone would invite feeding the master into the
// price merge.
export default function CategorySeedPanel({ onSeeded }) {
    const [preview, setPreview] = useState(null)
    const [result, setResult] = useState(null)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState(null)
    const inputRef = useRef(null)

    async function readFile(file) {
        setBusy(true)
        setError(null)
        setResult(null)
        try {
            const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' })
            const parsed = parseMasterCategories({
                sheetNames: workbook.SheetNames,
                sheetToRows: (name) => workbook.Sheets[name]
                    ? XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, blankrows: false, defval: '' })
                    : null,
            })
            if (parsed.rows.length === 0) {
                throw new Error('No product numbers found — is this the master item list?')
            }
            setPreview({ ...parsed, fileName: file.name })
        } catch (err) {
            console.error('Master list parse failed:', err)
            setError(err.message)
            setPreview(null)
        } finally {
            setBusy(false)
        }
    }

    // One RPC rather than ~352 per-pair updates: atomic, and it cannot leave the catalog
    // half-categorised. Products that already have a category are skipped, not overwritten.
    async function seed() {
        if (!preview) return
        setBusy(true)
        setError(null)
        try {
            const { data, error: rpcError } = await supabase.rpc('seed_supplier_categories', {
                rows: preview.rows,
            })
            if (rpcError) throw rpcError
            const counts = Array.isArray(data) ? data[0] : data
            setResult(counts)
            setPreview(null)
            onSeeded?.()
        } catch (err) {
            console.error('Category seeding failed:', err)
            setError(err.message)
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
            <div style={{ fontWeight: 600, marginBottom: 'var(--space-2)' }}>Categories from the master list</div>
            <p className="page-subtitle" style={{ marginBottom: 'var(--space-4)' }}>
                The order guides carry no category. This reads the master item list and files
                each product under its sheet — Beef, Produce, Seafood and the rest. Products
                that already have a category are left alone.
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
                        <Stat label="Categories" value={preview.stats.categories} />
                        <Stat label="Item groups" value={preview.stats.item_groups} />
                    </div>
                    <p className="page-subtitle" style={{ marginTop: 'var(--space-3)' }}>
                        From {preview.fileName}. Nothing is saved yet.
                    </p>
                    {preview.stats.conflicts > 0 && (
                        <div className="badge badge-warning" style={{ display: 'block', marginTop: 'var(--space-3)', padding: 'var(--space-3)' }}>
                            {preview.stats.conflicts} product(s) appear under more than one category —
                            the first sheet wins. Worth checking the master list.
                        </div>
                    )}
                    {preview.stats.skipped_sheets.length > 0 && (
                        <p className="page-subtitle" style={{ marginTop: 'var(--space-2)' }}>
                            Skipped (no product column): {preview.stats.skipped_sheets.join(', ')}
                        </p>
                    )}
                </div>
            )}

            {result && (
                <div style={{ marginBottom: 'var(--space-4)' }}>
                    <div className="catalog-stat-row">
                        <Stat label="Categorised" value={result.seeded} />
                        <Stat label="Already set" value={result.skipped} />
                        <Stat label="Not in catalog" value={result.unmatched} />
                    </div>
                    {result.unmatched > 0 && (
                        <p className="page-subtitle" style={{ marginTop: 'var(--space-3)' }}>
                            "Not in catalog" means the master lists a product the order guides
                            never did — load the order guides first if that number looks high.
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
                    {busy && !preview ? 'Reading...' : 'Choose master list'}
                </button>
                {preview && (
                    <button className="btn btn-primary" onClick={seed} disabled={busy}>
                        {busy ? 'Filing...' : `File ${preview.stats.products.toLocaleString()} products`}
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

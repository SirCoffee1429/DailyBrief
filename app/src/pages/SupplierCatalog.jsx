import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import CatalogUploadPanel from '../components/CatalogUploadPanel.jsx'

const PAGE_SIZE = 50

// The supplier catalog: what the club can actually buy, and at what price. Search is
// the point of the page — the order-list work downstream needs a product number, and
// this is where a human finds one.
export default function SupplierCatalog() {
    const [query, setQuery] = useState('')
    const [products, setProducts] = useState([])
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [showUpload, setShowUpload] = useState(false)
    const [lastUpload, setLastUpload] = useState(null)
    // Bumped after a commit so the header's "loaded on" line re-reads.
    const [refreshKey, setRefreshKey] = useState(0)

    // Debounced so typing doesn't fire a request per keystroke.
    const [search, setSearch] = useState('')
    useEffect(() => {
        const timer = setTimeout(() => { setSearch(query.trim()); setPage(0) }, 250)
        return () => clearTimeout(timer)
    }, [query])

    const load = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            let request = supabase
                .from('supplier_products')
                .select('*', { count: 'exact' })
                .order('description')
                .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)

            if (search) {
                // Match the kitchen's vocabulary as well as the supplier's: a product
                // is findable by description, brand, the club's own name for it, or
                // its number.
                const escaped = search.replace(/[%,()]/g, ' ')
                request = request.or(
                    `description.ilike.%${escaped}%,brand.ilike.%${escaped}%,` +
                    `custom_description.ilike.%${escaped}%,product_number.ilike.%${escaped}%`
                )
            }

            const { data, error: queryError, count } = await request
            // An unchecked error here would render as "no products" — a wrong answer
            // that looks like a real one.
            if (queryError) throw queryError
            setProducts(data || [])
            setTotal(count || 0)
        } catch (err) {
            console.error('Catalog search failed:', err)
            setError(err.message)
            setProducts([])
            setTotal(0)
        } finally {
            setLoading(false)
        }
    }, [search, page])

    useEffect(() => { load() }, [load])

    // Last upload, so the page says how old the prices are without anyone guessing.
    useEffect(() => {
        supabase
            .from('supplier_catalog_uploads')
            .select('uploaded_at, file_count, product_count')
            .order('uploaded_at', { ascending: false })
            .limit(1)
            .maybeSingle()
            .then(({ data, error: uploadError }) => {
                if (uploadError) console.error('Could not read last catalog upload:', uploadError)
                else setLastUpload(data)
            })
    }, [refreshKey])

    const pageCount = Math.ceil(total / PAGE_SIZE)

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Supplier Catalog</h1>
                <p className="page-subtitle">
                    {lastUpload
                        ? `${lastUpload.product_count.toLocaleString()} products from ${lastUpload.file_count} order guides, loaded ${new Date(lastUpload.uploaded_at).toLocaleDateString()}.`
                        : 'No order guides loaded yet.'}
                </p>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-5)', flexWrap: 'wrap' }}>
                <input
                    className="input"
                    style={{ flex: 1, minWidth: '240px' }}
                    placeholder="Search by name, brand or product number..."
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                />
                <button className="btn btn-secondary" onClick={() => setShowUpload(v => !v)}>
                    {showUpload ? 'Hide upload' : 'Load order guides'}
                </button>
            </div>

            {showUpload && (
                <CatalogUploadPanel onCommitted={() => { setRefreshKey(k => k + 1); setPage(0); load() }} />
            )}

            {error && (
                <div className="badge badge-danger" style={{ display: 'block', padding: 'var(--space-3)' }}>
                    Could not load the catalog: {error}
                </div>
            )}

            {loading && <div className="page-subtitle"><span className="spinner" /> Loading...</div>}

            {!loading && !error && products.length === 0 && (
                <div className="page-subtitle">
                    {search ? `Nothing matches "${search}".` : 'The catalog is empty — load the order guide exports to fill it.'}
                </div>
            )}

            {!loading && products.length > 0 && (
                <>
                    <div className="page-subtitle" style={{ marginBottom: 'var(--space-3)' }}>
                        {total.toLocaleString()} product{total === 1 ? '' : 's'}
                        {search ? ` matching "${search}"` : ''}
                    </div>
                    <div className="catalog-list">
                        {products.map(p => <ProductRow key={p.id} product={p} />)}
                    </div>

                    {pageCount > 1 && (
                        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', marginTop: 'var(--space-5)' }}>
                            <button className="btn btn-sm btn-secondary" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                                Previous
                            </button>
                            <span className="page-subtitle">Page {page + 1} of {pageCount}</span>
                            <button className="btn btn-sm btn-secondary" disabled={page + 1 >= pageCount} onClick={() => setPage(p => p + 1)}>
                                Next
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

function ProductRow({ product }) {
    const {
        description, custom_description, brand, product_number, pack_size,
        price, price_basis, case_price, price_varies, pack_total_base, base_unit, source_lists,
    } = product

    return (
        <div className="catalog-row">
            <div className="catalog-row-main">
                <div className="catalog-row-name">{custom_description || description}</div>
                <div className="catalog-row-meta">
                    {brand && <span>{brand}</span>}
                    <span>#{product_number}</span>
                    <span>{pack_size}</span>
                    {pack_total_base && <span>{round(pack_total_base)} {base_unit}/case</span>}
                </div>
                {source_lists?.length > 0 && (
                    <div className="catalog-row-lists">{source_lists.join(' · ')}</div>
                )}
            </div>
            <div className="catalog-row-price">
                {price === null ? (
                    <span className="badge badge-warning">No price</span>
                ) : (
                    <>
                        <div className="catalog-row-case">
                            {case_price === null ? '—' : `$${case_price.toFixed(2)}`}
                            <span className="catalog-row-case-label">/case</span>
                        </div>
                        {price_basis === 'lb' && (
                            <div className="catalog-row-basis">${price.toFixed(4)}/lb · catch weight</div>
                        )}
                        {case_price === null && price_basis === 'lb' && (
                            <div className="catalog-row-basis">pack not in pounds — case total unknown</div>
                        )}
                        {price_varies && <span className="badge badge-warning">Price varies</span>}
                    </>
                )}
            </div>
        </div>
    )
}

function round(n) {
    return Math.round(n * 100) / 100
}

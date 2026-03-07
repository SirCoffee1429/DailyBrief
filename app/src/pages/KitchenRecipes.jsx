import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

export default function KitchenRecipes() {
    const [workbooks, setWorkbooks] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function load() {
            const { data } = await supabase
                .from('workbooks')
                .select('*')
                .order('uploaded_at', { ascending: false })
            setWorkbooks(data || [])
            setLoading(false)
        }
        load()
    }, [])

    function formatSize(bytes) {
        if (!bytes) return '—'
        if (bytes < 1024) return bytes + ' B'
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
        return (bytes / 1048576).toFixed(1) + ' MB'
    }

    if (loading) {
        return (
            <div className="empty-state">
                <div className="spinner" style={{ margin: '0 auto' }} />
            </div>
        )
    }

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 className="page-title">Recipes</h1>
                    <p className="page-subtitle">{workbooks.length} recipe{workbooks.length !== 1 ? 's' : ''} uploaded</p>
                </div>
            </div>

            {workbooks.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">📁</div>
                    <div className="empty-state-text">No recipes available yet.</div>
                </div>
            ) : (
                <div className="workbook-grid">
                    {workbooks.map(wb => (
                        <Link key={wb.id} to={`/kitchen/recipes/${wb.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                            <div className="workbook-card">
                                <div className="workbook-card-icon">📊</div>
                                <div className="workbook-card-name">{wb.file_name}</div>
                                <div className="workbook-card-meta">
                                    <span>{wb.sheet_count} sheet{wb.sheet_count !== 1 ? 's' : ''}</span>
                                    <span>{formatSize(wb.file_size)}</span>
                                    <span>{new Date(wb.uploaded_at).toLocaleDateString()}</span>
                                </div>
                                <div style={{ marginTop: 'var(--space-3)' }}>
                                    <span className={`badge ${wb.status === 'parsed' ? 'badge-success' : wb.status === 'failed' ? 'badge-danger' : 'badge-warning'}`}>
                                        {wb.status}
                                    </span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}

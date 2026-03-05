import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

export default function WorkbookLibrary() {
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

    async function deleteWorkbook(id, e) {
        e.preventDefault()
        e.stopPropagation()
        if (!confirm('Delete this recipe and all its data?')) return
        await supabase.from('workbooks').delete().eq('id', id)
        setWorkbooks(prev => prev.filter(w => w.id !== id))
    }

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
                <Link to="/workbooks/upload" className="btn btn-primary">📤 Upload</Link>
            </div>

            {workbooks.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">📁</div>
                    <div className="empty-state-text">No recipes yet. Upload some .xlsx files to get started.</div>
                    <Link to="/workbooks/upload" className="btn btn-primary" style={{ marginTop: 'var(--space-5)' }}>
                        📤 Upload Recipes
                    </Link>
                </div>
            ) : (
                <div className="workbook-grid">
                    {workbooks.map(wb => (
                        <Link key={wb.id} to={`/workbooks/${wb.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                            <div className="workbook-card">
                                <div className="workbook-card-icon">📊</div>
                                <div className="workbook-card-name">{wb.file_name}</div>
                                <div className="workbook-card-meta">
                                    <span>{wb.sheet_count} sheet{wb.sheet_count !== 1 ? 's' : ''}</span>
                                    <span>{formatSize(wb.file_size)}</span>
                                    <span>{new Date(wb.uploaded_at).toLocaleDateString()}</span>
                                </div>
                                <div style={{ marginTop: 'var(--space-3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span className={`badge ${wb.status === 'parsed' ? 'badge-success' : wb.status === 'failed' ? 'badge-danger' : 'badge-warning'}`}>
                                        {wb.status}
                                    </span>
                                    <button className="btn btn-sm btn-danger" onClick={(e) => deleteWorkbook(wb.id, e)}>
                                        🗑
                                    </button>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}

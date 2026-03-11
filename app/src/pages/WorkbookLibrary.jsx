import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { formatFileSize } from '../lib/workbooks.js'
import { useCategories } from '../lib/useCategories.js'
import CategoryManager from '../components/CategoryManager.jsx'

export default function WorkbookLibrary() {
    const { categories, loading: categoriesLoading, refetch: refetchCategories } = useCategories()
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
    const [workbooks, setWorkbooks] = useState([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('All')
    const [searchQuery, setSearchQuery] = useState('')

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

    async function deleteAllWorkbooks() {
        if (!confirm('Are you absolutely sure you want to delete ALL recipes? This cannot be undone.')) return

        const idsToDelete = workbooks.map(wb => wb.id)
        if (idsToDelete.length === 0) return

        const { error } = await supabase.from('workbooks').delete().in('id', idsToDelete)

        if (!error) {
            setWorkbooks([])
            setSearchQuery('')
        } else {
            console.error(error)
            alert('Failed to delete all recipes.')
        }
    }

    if (loading) {
        return (
            <div className="empty-state">
                <div className="spinner" style={{ margin: '0 auto' }} />
            </div>
        )
    }

    const filteredWorkbooks = workbooks.filter(wb => {
        const matchesCategory = filter === 'All' || wb.category === filter
        const matchesSearch = wb.file_name.toLowerCase().includes(searchQuery.toLowerCase())
        return matchesCategory && matchesSearch
    })

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 className="page-title">Recipes</h1>
                    <p className="page-subtitle">{filteredWorkbooks.length} recipe{filteredWorkbooks.length !== 1 ? 's' : ''} {filter !== 'All' ? `in ${filter}` : 'uploaded'}</p>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <button onClick={deleteAllWorkbooks} className="btn btn-danger" disabled={workbooks.length === 0}>
                        <i className="fa-solid fa-trash" /> Delete All
                    </button>
                    <button onClick={() => setIsCategoryModalOpen(true)} className="btn btn-secondary">
                        <i className="fa-solid fa-list" /> Manage Categories
                    </button>
                    <Link to="/office/workbooks/upload" className="btn btn-primary">📤 Upload</Link>
                </div>
            </div>

            <div style={{ marginBottom: 'var(--space-4)' }}>
                <div className="kb-input-wrapper" style={{ flex: 'none', maxWidth: '400px', width: '100%' }}>
                    <span className="kb-search-icon"><i className="fa-solid fa-magnifying-glass" /></span>
                    <input
                        type="text"
                        placeholder="Search recipes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="kb-search-input"
                    />
                </div>
            </div>

            <div style={{ marginBottom: 'var(--space-4)', display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                {categoriesLoading ? (
                    <span className="text-muted">Loading categories...</span>
                ) : (
                    ['All', ...categories.map(c => c.name)].map(c => (
                        <button
                            key={c}
                            onClick={() => setFilter(c)}
                            className={`btn btn-sm ${filter === c ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ borderRadius: '20px' }}
                        >
                            {c}
                        </button>
                    ))
                )}
            </div>

            {filteredWorkbooks.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">📁</div>
                    <div className="empty-state-text">No recipes found in this category.</div>
                    {filter === 'All' && (
                        <Link to="/office/workbooks/upload" className="btn btn-primary" style={{ marginTop: 'var(--space-5)' }}>
                            📤 Upload Recipes
                        </Link>
                    )}
                </div>
            ) : (
                <div className="workbook-grid">
                    {filteredWorkbooks.map(wb => (
                        <Link key={wb.id} to={`/office/workbooks/${wb.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                            <div className="workbook-card">
                                <div className="workbook-card-icon">📊</div>
                                <div className="workbook-card-name">{wb.file_name}</div>
                                <div className="workbook-card-meta">
                                    <span>{wb.sheet_count} sheet{wb.sheet_count !== 1 ? 's' : ''}</span>
                                    <span>{formatFileSize(wb.file_size)}</span>
                                    <span>{new Date(wb.uploaded_at).toLocaleDateString()}</span>
                                </div>
                                <div style={{ marginTop: 'var(--space-3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                                        <span className={`badge ${wb.status === 'parsed' ? 'badge-success' : wb.status === 'failed' ? 'badge-danger' : 'badge-warning'}`}>
                                            {wb.status}
                                        </span>
                                        {wb.category && (
                                            <span className="badge badge-info" style={{ backgroundColor: 'var(--bg-accent)', color: 'var(--text-accent)' }}>
                                                {wb.category}
                                            </span>
                                        )}
                                    </div>
                                    <button className="btn btn-sm btn-danger" onClick={(e) => deleteWorkbook(wb.id, e)}>
                                        🗑
                                    </button>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            <CategoryManager
                isOpen={isCategoryModalOpen}
                onClose={() => setIsCategoryModalOpen(false)}
                categories={categories}
                refetchCategories={refetchCategories}
            />
        </div>
    )
}

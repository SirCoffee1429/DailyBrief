import { useEffect, useState } from 'react'
import { useParams, Link, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

export default function SalesReportDetail() {
    const { date } = useParams()
    const location = useLocation()
    const [salesItems, setSalesItems] = useState([])
    const [loading, setLoading] = useState(true)

    // Determine base path to route back correctly
    const basePath = location.pathname.startsWith('/office') ? '/office/sales' : '/kitchen/sales'

    useEffect(() => {
        async function fetchSalesData() {
            try {
                const { data, error } = await supabase
                    .from('sales_data')
                    .select('*')
                    .eq('report_date', date)
                    .order('units_sold', { ascending: false })

                if (error) throw error
                setSalesItems(data || [])
            } catch (err) {
                console.error("Error fetching detailed sales data:", err)
            } finally {
                setLoading(false)
            }
        }

        if (date) {
            fetchSalesData()
        }
    }, [date])

    if (loading) {
        return (
            <div className="card">
                <div className="shimmer" style={{ height: '300px', borderRadius: 'var(--radius-md)' }}></div>
            </div>
        )
    }

    const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('en-US', { 
        weekday: 'long',
        month: 'long', 
        day: 'numeric',
        year: 'numeric'
    })

    return (
        <div className="card">
            <div className="card-header-row mb-6">
                <div>
                    <h1 className="page-title"><i className="fa-solid fa-fire-flame-curved" style={{ color: 'var(--orange)' }} /> {formattedDate}</h1>
                    <div style={{ color: 'var(--text-muted)', marginTop: 'var(--space-1)' }}>Prep Focus: Top Sellers</div>
                </div>
                <Link to={basePath} className="btn btn-secondary">
                    <i className="fa-solid fa-arrow-left" /> Back to Dates
                </Link>
            </div>

            {salesItems.length === 0 ? (
                <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-muted)' }}>No data found for this date.</div>
            ) : (
                <div className="sales-list-grid">
                    {salesItems.map((item, idx) => (
                        <div key={item.id} className="sales-item-row" style={{ padding: 'var(--space-3) var(--space-4)' }}>
                            <span className="sales-item-rank" style={{ fontSize: '1rem', minWidth: '30px' }}>#{idx + 1}</span>
                            <span className="sales-item-name" style={{ fontSize: '1rem' }}>{item.item_name}</span>
                            <div className="sales-item-bar-container" style={{ height: '12px' }}>
                                 <div 
                                    className="sales-item-bar" 
                                    style={{ 
                                        width: `${(item.units_sold / salesItems[0].units_sold) * 100}%`,
                                        background: 'var(--orange)',
                                        opacity: Math.max(0.3, 1 - (idx * 0.05)) // Keep a minimum opacity
                                    }} 
                                 />
                            </div>
                            <span className="sales-item-count" style={{ fontSize: '1.1rem', minWidth: '40px' }}>{item.units_sold}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

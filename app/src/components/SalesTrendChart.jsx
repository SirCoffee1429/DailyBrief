import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase.js'

const METRICS = [
    { key: 'units_sold', label: 'Units Sold', color: '#f97316', format: v => v.toLocaleString() },
    { key: 'total_net_sales', label: 'Sales', color: '#3b82f6', format: v => `$${v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` },
    { key: 'discounts', label: 'Discounts', color: '#f43f5e', format: v => `$${v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` },
    { key: 'net_sales', label: 'Net Sales', color: '#10b981', format: v => `$${v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` },
    { key: 'tax', label: 'Tax', color: '#a78bfa', format: v => `$${v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` },
]

function getWeekLabel(dateStr) {
    const d = new Date(dateStr + 'T00:00:00')
    // Get Monday of that week
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(d)
    monday.setDate(diff)
    return monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getMonthLabel(dateStr) {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

function getWeekKey(dateStr) {
    const d = new Date(dateStr + 'T00:00:00')
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(d)
    monday.setDate(diff)
    return monday.toISOString().split('T')[0]
}

function getMonthKey(dateStr) {
    return dateStr.substring(0, 7) // YYYY-MM
}

export default function SalesTrendChart() {
    const [rawData, setRawData] = useState([])
    const [loading, setLoading] = useState(true)
    const [mode, setMode] = useState('daily') // 'daily', 'weekly', 'monthly'
    const [activeMetrics, setActiveMetrics] = useState(['units_sold', 'total_net_sales'])
    const [tooltip, setTooltip] = useState(null)
    const svgRef = useRef(null)

    useEffect(() => {
        async function fetchData() {
            try {
                const { data, error } = await supabase
                    .from('sales_data')
                    .select('report_date, units_sold, total_net_sales, discounts, net_sales, tax')
                    .order('report_date', { ascending: true })

                if (error) throw error
                setRawData(data || [])
            } catch (err) {
                console.error('Error fetching sales trend data:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    const toggleMetric = (key) => {
        setActiveMetrics(prev => {
            if (prev.includes(key)) {
                if (prev.length === 1) return prev // Keep at least one active
                return prev.filter(k => k !== key)
            }
            return [...prev, key]
        })
    }

    // Aggregate data by mode
    const chartData = (() => {
        if (rawData.length === 0) return []

        const grouped = {}
        rawData.forEach(row => {
            let key, label
            if (mode === 'daily') {
                key = row.report_date
                const d = new Date(row.report_date + 'T00:00:00')
                label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            } else if (mode === 'weekly') {
                key = getWeekKey(row.report_date)
                label = getWeekLabel(row.report_date)
            } else {
                key = getMonthKey(row.report_date)
                label = getMonthLabel(row.report_date)
            }

            if (!grouped[key]) {
                grouped[key] = { key, label, units_sold: 0, total_net_sales: 0, discounts: 0, net_sales: 0, tax: 0 }
            }
            grouped[key].units_sold += Number(row.units_sold) || 0
            grouped[key].total_net_sales += Number(row.total_net_sales) || 0
            grouped[key].discounts += Number(row.discounts) || 0
            grouped[key].net_sales += Number(row.net_sales) || 0
            grouped[key].tax += Number(row.tax) || 0
        })

        return Object.values(grouped).sort((a, b) => a.key.localeCompare(b.key))
    })()

    // SVG Chart dimensions
    const W = 800, H = 320
    const PAD = { top: 24, right: 24, bottom: 50, left: 60 }
    const plotW = W - PAD.left - PAD.right
    const plotH = H - PAD.top - PAD.bottom

    // Compute scale per metric (each metric gets its own Y scale since units vs dollars differ)
    const getScale = (metricKey) => {
        if (chartData.length === 0) return { min: 0, max: 1 }
        const vals = chartData.map(d => d[metricKey])
        const max = Math.max(...vals, 1)
        return { min: 0, max: max * 1.1 }
    }

    // We use the "primary" active metric for the Y axis labels
    const primaryMetric = METRICS.find(m => activeMetrics.includes(m.key)) || METRICS[0]
    const primaryScale = getScale(primaryMetric.key)

    const getX = (i) => PAD.left + (chartData.length > 1 ? (i / (chartData.length - 1)) * plotW : plotW / 2)
    const getY = (val, scale) => PAD.top + plotH - ((val - scale.min) / (scale.max - scale.min || 1)) * plotH

    // Y axis ticks for primary metric
    const yTicks = []
    const tickCount = 5
    for (let i = 0; i <= tickCount; i++) {
        const val = primaryScale.min + (primaryScale.max - primaryScale.min) * (i / tickCount)
        yTicks.push(val)
    }

    // Build line paths
    const lines = METRICS.filter(m => activeMetrics.includes(m.key)).map(metric => {
        const scale = getScale(metric.key)
        const points = chartData.map((d, i) => `${getX(i)},${getY(d[metric.key], scale)}`)
        return {
            ...metric,
            scale,
            path: `M${points.join(' L')}`,
            points: chartData.map((d, i) => ({ x: getX(i), y: getY(d[metric.key], scale), val: d[metric.key] }))
        }
    })

    const handleMouseMove = (e) => {
        if (chartData.length === 0) return
        const svg = svgRef.current
        if (!svg) return
        const rect = svg.getBoundingClientRect()
        const scaleX = W / rect.width
        const mouseX = (e.clientX - rect.left) * scaleX

        // Find closest data point
        let closestIdx = 0
        let closestDist = Infinity
        chartData.forEach((d, i) => {
            const dist = Math.abs(getX(i) - mouseX)
            if (dist < closestDist) {
                closestDist = dist
                closestIdx = i
            }
        })

        if (closestDist < 50) {
            setTooltip({
                idx: closestIdx,
                x: getX(closestIdx),
                data: chartData[closestIdx]
            })
        } else {
            setTooltip(null)
        }
    }

    if (loading) {
        return (
            <div className="trend-chart-card">
                <div className="shimmer" style={{ height: '400px', borderRadius: 'var(--radius-md)' }}></div>
            </div>
        )
    }

    if (chartData.length === 0) {
        return (
            <div className="trend-chart-card">
                <div className="trend-chart-header">
                    <h2 className="trend-chart-title">
                        <i className="fa-solid fa-chart-line" style={{ color: 'var(--orange)' }} />
                        Sales Trends
                    </h2>
                </div>
                <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No sales data available for charting.
                </div>
            </div>
        )
    }

    return (
        <div className="trend-chart-card">
            <div className="trend-chart-header">
                <h2 className="trend-chart-title">
                    <i className="fa-solid fa-chart-line" style={{ color: 'var(--orange)' }} />
                    Sales Trends
                </h2>
                <div className="trend-mode-toggle">
                    {['daily', 'weekly', 'monthly'].map(m => (
                        <button
                            key={m}
                            className={`trend-mode-btn ${mode === m ? 'active' : ''}`}
                            onClick={() => setMode(m)}
                        >
                            {m.charAt(0).toUpperCase() + m.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Metric Toggles */}
            <div className="trend-legend">
                {METRICS.map(m => (
                    <button
                        key={m.key}
                        className={`trend-legend-btn ${activeMetrics.includes(m.key) ? 'active' : ''}`}
                        style={{ '--legend-color': m.color }}
                        onClick={() => toggleMetric(m.key)}
                    >
                        <span className="trend-legend-dot" style={{ background: activeMetrics.includes(m.key) ? m.color : '#555' }} />
                        {m.label}
                    </button>
                ))}
            </div>

            {/* SVG Chart */}
            <div className="trend-chart-container">
                <svg
                    ref={svgRef}
                    viewBox={`0 0 ${W} ${H}`}
                    className="trend-svg"
                    onMouseMove={handleMouseMove}
                    onMouseLeave={() => setTooltip(null)}
                >
                    {/* Grid lines */}
                    {yTicks.map((val, i) => (
                        <g key={i}>
                            <line
                                x1={PAD.left} y1={getY(val, primaryScale)}
                                x2={W - PAD.right} y2={getY(val, primaryScale)}
                                stroke="rgba(255,255,255,0.06)" strokeWidth="1"
                            />
                            <text
                                x={PAD.left - 8} y={getY(val, primaryScale) + 4}
                                fill="#9ca3af" fontSize="10" textAnchor="end"
                            >
                                {primaryMetric.key === 'units_sold' ? Math.round(val) : `$${Math.round(val)}`}
                            </text>
                        </g>
                    ))}

                    {/* X axis labels */}
                    {chartData.map((d, i) => {
                        // Show at most ~12 labels to avoid crowding
                        const step = Math.max(1, Math.floor(chartData.length / 12))
                        if (i % step !== 0 && i !== chartData.length - 1) return null
                        return (
                            <text
                                key={i}
                                x={getX(i)} y={H - 8}
                                fill="#9ca3af" fontSize="10" textAnchor="middle"
                                transform={`rotate(-25, ${getX(i)}, ${H - 8})`}
                            >
                                {d.label}
                            </text>
                        )
                    })}

                    {/* Lines */}
                    {lines.map(line => (
                        <g key={line.key}>
                            {/* Gradient area fill */}
                            <defs>
                                <linearGradient id={`grad-${line.key}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={line.color} stopOpacity="0.2" />
                                    <stop offset="100%" stopColor={line.color} stopOpacity="0" />
                                </linearGradient>
                            </defs>
                            {chartData.length > 1 && (
                                <path
                                    d={`${line.path} L${getX(chartData.length - 1)},${PAD.top + plotH} L${getX(0)},${PAD.top + plotH} Z`}
                                    fill={`url(#grad-${line.key})`}
                                />
                            )}
                            <path
                                d={line.path}
                                fill="none"
                                stroke={line.color}
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </g>
                    ))}

                    {/* Tooltip crosshair & dots */}
                    {tooltip && (
                        <g>
                            <line
                                x1={tooltip.x} y1={PAD.top}
                                x2={tooltip.x} y2={PAD.top + plotH}
                                stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="4,4"
                            />
                            {lines.map(line => {
                                const pt = line.points[tooltip.idx]
                                return (
                                    <circle
                                        key={line.key}
                                        cx={pt.x} cy={pt.y} r="5"
                                        fill={line.color} stroke="#1a1a2e" strokeWidth="2"
                                    />
                                )
                            })}
                        </g>
                    )}
                </svg>

                {/* HTML Tooltip */}
                {tooltip && (
                    <div
                        className="trend-tooltip"
                        style={{
                            left: `${(tooltip.x / W) * 100}%`,
                            top: '16px',
                        }}
                    >
                        <div className="trend-tooltip-date">{tooltip.data.label}</div>
                        {lines.map(line => (
                            <div key={line.key} className="trend-tooltip-row">
                                <span className="trend-tooltip-dot" style={{ background: line.color }} />
                                <span className="trend-tooltip-label">{line.label}:</span>
                                <span className="trend-tooltip-val">{line.format(line.points[tooltip.idx].val)}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Summary Cards */}
            <div className="trend-summary-row">
                {METRICS.filter(m => activeMetrics.includes(m.key)).map(m => {
                    const total = chartData.reduce((sum, d) => sum + d[m.key], 0)
                    const avg = chartData.length > 0 ? total / chartData.length : 0
                    return (
                        <div key={m.key} className="trend-summary-card" style={{ '--summary-color': m.color }}>
                            <div className="trend-summary-label">{m.label}</div>
                            <div className="trend-summary-total">{m.format(total)}</div>
                            <div className="trend-summary-avg">avg {m.format(Math.round(avg))} / {mode === 'monthly' ? 'mo' : mode === 'weekly' ? 'wk' : 'day'}</div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

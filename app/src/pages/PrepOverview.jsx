import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { rankStations, applyItemChange, newerCount, lastCountText, formatStamp } from '../lib/prepSheets.js'
import '../prepSheets.css'

// Office → Prep Overview: every station ranked by how much prep it has left (2 × red + yellow), so the office knows
// where to send help. Tap a station to open its sheet. Live: any count, Finish count or station change shows at once.
export default function PrepOverview() {
    const [stations, setStations] = useState(null)
    const [items, setItems] = useState(null)
    const [latestCounts, setLatestCounts] = useState({})
    const [loadError, setLoadError] = useState('')

    const ranked = useMemo(
        () => (stations && items ? rankStations(stations, items, latestCounts) : null),
        [stations, items, latestCounts],
    )

    useEffect(() => { load() }, [])

    // Live updates across every station. Item and Finish count changes merge straight in; a station added, renamed
    // or retired (Setup) reloads everything.
    useEffect(() => {
        const channel = supabase
            .channel('prep_overview')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'prep_items' },
                change => setItems(prev => applyItemChange(prev, change)))
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'prep_counts' },
                ({ new: count }) => setLatestCounts(prev => ({
                    ...prev, [count.station_id]: newerCount(prev[count.station_id], count),
                })))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'prep_stations' }, () => load())
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [])

    // Active stations, each with its last Finish count, and every active line (well under PostgREST's 1000-row cap:
    // five stations hold ~175 lines).
    async function load() {
        const [stationsRes, itemsRes] = await Promise.all([
            supabase.from('prep_stations')
                .select('id, name, prep_counts(station_id, label, employee_name, created_at)')
                .eq('active', true)
                .order('created_at', { referencedTable: 'prep_counts', ascending: false })
                .limit(1, { referencedTable: 'prep_counts' }),
            supabase.from('prep_items').select('id, station_id, have, par_qty, changed_at, sort_order').eq('active', true),
        ])
        if (stationsRes.error || itemsRes.error) {
            console.error('Failed to load the prep overview:', stationsRes.error ?? itemsRes.error)
            setLoadError('Could not load the prep overview. Refresh to try again.')
            return
        }
        setLoadError('')
        setStations(stationsRes.data.map(({ id, name }) => ({ id, name })))
        setLatestCounts(Object.fromEntries(stationsRes.data.map(s => [s.id, s.prep_counts[0] ?? null])))
        setItems(itemsRes.data)
    }

    return (
        <div className="prep-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        <i className="fa-solid fa-clipboard-check" style={{ marginRight: '0.5rem' }} />
                        Prep Overview
                    </h1>
                    <p className="page-subtitle">Stations with the most prep left come first (red counts double).</p>
                </div>
                <Link to="/office/prep/setup" className="btn btn-secondary">
                    <i className="fa-solid fa-gear" /> Setup
                </Link>
            </div>

            {loadError && <p className="prep-error">{loadError}</p>}
            {!ranked && !loadError && <p className="prep-muted">Loading…</p>}
            {ranked?.length === 0 && <p className="prep-muted">No stations yet. Add one in Setup.</p>}

            {ranked && (
                <div className="prep-overview">
                    {ranked.map(s => <StationCard key={s.id} station={s} />)}
                </div>
            )}
        </div>
    )
}

// One station: its score and color counts, the last Finish count and the latest change. Opens the station's sheet.
function StationCard({ station }) {
    return (
        <Link to={`/office/prep/sheet?station=${station.id}`} className="card prep-overview-card">
            <div className="prep-overview-head">
                <span className="prep-overview-name">{station.name}</span>
                <span className="prep-overview-score" title="2 × red + yellow">Score {station.score}</span>
            </div>
            <div className="prep-overview-counts">
                <span className="prep-chip prep-chip-red">{station.red} red</span>
                <span className="prep-chip prep-chip-yellow">{station.yellow} yellow</span>
                <span className="prep-chip prep-chip-green">{station.green} green</span>
                {station.uncounted > 0 && <span className="prep-chip prep-chip-grey">{station.uncounted} not counted</span>}
            </div>
            <p className="prep-muted">Last count: {lastCountText(station.lastCount)}</p>
            <p className="prep-muted">
                {station.lastUpdate ? `Last update: ${formatStamp(station.lastUpdate)}` : 'No updates yet'}
            </p>
        </Link>
    )
}

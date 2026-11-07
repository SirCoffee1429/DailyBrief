import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { stationCounts } from '../lib/prepSheets.js'
import { usePrepBoard } from '../lib/usePrepBoard.js'
import '../prepSheets.css'

// Kitchen dashboard tile: each station's red and yellow counts, in sheet order, live. Tap a station to open its sheet.
export default function PrepStationTile() {
    const { stations, items, latestCounts, loadError } = usePrepBoard('prep_dashboard_tile')
    const rows = useMemo(
        () => (stations && items ? stationCounts(stations, items, latestCounts) : null),
        [stations, items, latestCounts],
    )

    return (
        <div className="dash-card prep-tile">
            <div className="card-header-row">
                <h2 className="dash-card-heading">
                    <i className="fa-solid fa-clipboard-check" style={{ color: 'var(--accent)' }} /> Prep Sheets
                </h2>
            </div>
            {loadError && <p className="prep-error">{loadError}</p>}
            {!rows && !loadError && <p className="prep-muted">Loading…</p>}
            {rows?.length === 0 && <p className="prep-muted">No stations yet.</p>}
            {rows?.length > 0 && (
                <div className="prep-tile-list">
                    {rows.map(s => (
                        <Link key={s.id} to={`/kitchen/prep?station=${s.id}`} className="prep-tile-row">
                            <span className="prep-tile-name">{s.name}</span>
                            <span className="prep-chip prep-chip-red">{s.red} red</span>
                            <span className="prep-chip prep-chip-yellow">{s.yellow} yellow</span>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}

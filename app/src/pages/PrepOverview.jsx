import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { rankStations, lastCountText, formatStamp } from '../lib/prepSheets.js'
import { usePrepBoard } from '../lib/usePrepBoard.js'
import '../prepSheets.css'

// Office → Prep Overview: every station ranked and colored by how far behind it is (its 2 × red + yellow score over the
// most it could score), so the office knows where to send help. Tap a station to open its sheet. Live: any count,
// Finish count or station change shows at once.
export default function PrepOverview() {
    const { stations, items, latestCounts, loadError } = usePrepBoard('prep_overview')
    const ranked = useMemo(
        () => (stations && items ? rankStations(stations, items, latestCounts) : null),
        [stations, items, latestCounts],
    )

    return (
        <div className="prep-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        <i className="fa-solid fa-clipboard-check" style={{ marginRight: '0.5rem' }} />
                        Prep Overview
                    </h1>
                    <p className="page-subtitle">Stations furthest behind their pars come first (red counts double).</p>
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

// One station, the whole card red/yellow/green by how far behind it is: the % behind, its color counts, the last Finish
// count and the latest change. Opens the station's sheet. The % rounds down so it never reads past its color's cutoff.
function StationCard({ station }) {
    const colorClass = station.color ? ` prep-overview-${station.color}` : ''
    return (
        <Link to={`/office/prep/sheet?station=${station.id}`} className={`card prep-overview-card${colorClass}`}>
            <div className="prep-overview-head">
                <span className="prep-overview-name">{station.name}</span>
                <span className="prep-overview-score" title={`Score ${station.score}: 2 × red + yellow, out of 2 per counted item`}>
                    {station.need == null ? 'Not counted' : `${Math.floor(station.need * 100)}% behind`}
                </span>
            </div>
            <div className="prep-overview-counts">
                <span className={`prep-chip prep-chip-red${station.red > 0 ? ' prep-chip-red-solid' : ''}`}>{station.red} red</span>
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

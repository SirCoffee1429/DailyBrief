import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import {
    readPrepFile, parsePrepRows, setLineKind, toSections, stationNameFromFile, toUploadPayload,
} from '../lib/prepSheetUpload.js'
import '../prepSheets.css'

// Office → Prep Sheets setup: see the stations, and upload a station's prep sheet spreadsheet.
// The upload is a PREVIEW until Confirm; only Confirm writes (prep_replace_station, all or nothing).
export default function PrepSetup() {
    const [stations, setStations] = useState([])
    const [loadError, setLoadError] = useState('')
    const [fileName, setFileName] = useState('')
    const [lines, setLines] = useState(null)
    const [stationName, setStationName] = useState('')
    const [parseError, setParseError] = useState('')
    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState('')
    const [saved, setSaved] = useState(null)

    // The preview's sections and counts, and the station this upload would replace (if any).
    const sections = useMemo(() => (lines ? toSections(lines) : null), [lines])
    const summary = useMemo(() => summarize(sections), [sections])
    const existing = stations.find(s => s.name.toLowerCase() === stationName.trim().toLowerCase())

    useEffect(() => { loadStations() }, [])

    // Active stations with how many active items each has.
    async function loadStations() {
        setLoadError('')
        const { data, error } = await supabase
            .from('prep_stations')
            .select('id, name, sort_order, prep_items(count)')
            .eq('active', true)
            .eq('prep_items.active', true)
            .order('sort_order')
        if (error) {
            console.error('Failed to load prep stations:', error)
            setLoadError('Could not load the stations. Refresh to try again.')
            return
        }
        setStations(data.map(s => ({ id: s.id, name: s.name, itemCount: s.prep_items[0]?.count ?? 0 })))
    }

    // A file was picked: read and parse it into preview lines. Nothing is saved here.
    async function handleFile(e) {
        const file = e.target.files?.[0]
        e.target.value = ''
        if (!file) return
        resetPreview()
        setFileName(file.name)
        try {
            const parsed = parsePrepRows(readPrepFile(await file.arrayBuffer()))
            if (parsed.length === 0) throw new Error('No items found under the Par header.')
            setLines(parsed)
            setStationName(stationNameFromFile(file.name))
        } catch (err) {
            console.error('Failed to read prep sheet:', err)
            setParseError(`Could not read ${file.name}: ${err.message}`)
        }
    }

    // Clears the preview and any messages.
    function resetPreview() {
        setLines(null)
        setFileName('')
        setStationName('')
        setParseError('')
        setSaveError('')
        setSaved(null)
    }

    // Confirm: replace the station's list with the previewed items.
    async function handleConfirm() {
        const name = stationName.trim()
        if (!name || !sections) return
        setSaving(true)
        setSaveError('')
        const { data, error } = await supabase.rpc('prep_replace_station', {
            p_station_name: name,
            p_items: toUploadPayload(sections),
        })
        setSaving(false)
        if (error) {
            console.error('prep_replace_station failed:', error)
            setSaveError(error.message || 'Saving failed. Nothing was changed.')
            return
        }
        const result = data?.[0] ?? { inserted: 0, updated: 0, retired: 0 }
        setLines(null)
        setFileName('')
        setSaved({ name, ...result })
        loadStations()
    }

    return (
        <div className="prep-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        <i className="fa-solid fa-clipboard-check" style={{ marginRight: '0.5rem' }} />
                        Prep Sheets Setup
                    </h1>
                    <p className="page-subtitle">Load a station's prep sheet from its spreadsheet. You'll see a preview before anything is saved.</p>
                </div>
            </div>

            {/* Stations already loaded */}
            <section className="card prep-card">
                <h2 className="prep-card-title">Stations</h2>
                {loadError && <p className="prep-error">{loadError}</p>}
                {!loadError && stations.length === 0 && <p className="prep-muted">No stations yet. Upload a prep sheet below.</p>}
                {stations.length > 0 && (
                    <ul className="prep-station-list">
                        {stations.map(s => (
                            <li key={s.id}><strong>{s.name}</strong><span className="prep-muted">{s.itemCount} items</span></li>
                        ))}
                    </ul>
                )}
            </section>

            {/* Upload */}
            <section className="card prep-card">
                <h2 className="prep-card-title">Upload a prep sheet</h2>
                <label className="btn btn-secondary prep-file-btn">
                    <i className="fa-solid fa-file-arrow-up" /> Choose .xls / .xlsx
                    <input type="file" accept=".xls,.xlsx" onChange={handleFile} hidden />
                </label>
                {parseError && <p className="prep-error">{parseError}</p>}
                {saved && (
                    <p className="prep-success">
                        Saved {saved.name}: {saved.inserted} added, {saved.updated} updated, {saved.retired} removed.
                    </p>
                )}
            </section>

            {/* Preview: nothing is written until Confirm */}
            {lines && (
                <section className="card prep-card">
                    <div className="prep-preview-head">
                        <div>
                            <h2 className="prep-card-title">Preview: {fileName}</h2>
                            <p className="prep-muted">
                                {summary.sections} sections · {summary.items} items · {summary.noPar} with no par
                                {summary.unparsed > 0 && <span className="prep-warn"> · {summary.unparsed} par{summary.unparsed === 1 ? '' : 's'} not understood</span>}
                            </p>
                        </div>
                        <label className="prep-field">
                            <span>Station</span>
                            <input value={stationName} onChange={e => setStationName(e.target.value)} maxLength={60} />
                        </label>
                    </div>

                    <p className={existing ? 'prep-warn' : 'prep-muted'}>
                        {existing
                            ? `Replaces ${existing.name}'s list (${existing.itemCount} items). Items with the same name keep their counts; items not in this file come off the sheet (their history is kept).`
                            : 'This creates a new station.'}
                    </p>
                    <p className="prep-muted">
                        A row with no par can be a section heading or an item. Check each one marked{' '}
                        <span className="prep-tag">no par</span> and switch it if it's wrong.
                    </p>

                    <PreviewTable lines={lines} onToggle={index => setLines(prev => setLineKind(prev, index, prev[index].kind === 'section' ? 'item' : 'section'))} />

                    {saveError && <p className="prep-error">{saveError}</p>}
                    <div className="prep-actions">
                        <button className="btn btn-secondary" onClick={resetPreview} disabled={saving}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleConfirm} disabled={saving || !stationName.trim() || summary.items === 0}>
                            {saving ? 'Saving…' : `Confirm: save ${summary.items} items to ${stationName.trim() || '…'}`}
                        </button>
                    </div>
                </section>
            )}
        </div>
    )
}

// Every preview line in sheet order. Section rows are headings; a blank-par row has a Section/Item switch.
function PreviewTable({ lines, onToggle }) {
    return (
        <table className="prep-preview">
            <thead>
                <tr><th>Item</th><th>Par on sheet</th><th>Read as</th><th /></tr>
            </thead>
            <tbody>
                {lines.map((line, i) => (
                    <tr key={i} className={line.kind === 'section' ? 'prep-preview-section' : ''}>
                        <td>{line.name}</td>
                        <td>{line.parText || <span className="prep-tag">no par</span>}</td>
                        <td>{readAs(line)}</td>
                        <td>
                            {line.blankPar && (
                                <button className="btn btn-sm btn-secondary" onClick={() => onToggle(i)}>
                                    Make {line.kind === 'section' ? 'item' : 'section'}
                                </button>
                            )}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    )
}

// How the app understood one line.
function readAs(line) {
    if (line.kind === 'section') return 'Section'
    if (line.unparsed) return <span className="prep-warn">Not understood: no color</span>
    if (line.qty == null) return <span className="prep-muted">Item, no par</span>
    return `${line.qty} × ${line.unit}`
}

// Counts for the preview header.
function summarize(sections) {
    const items = (sections ?? []).flatMap(s => s.items)
    return {
        sections: (sections ?? []).filter(s => s.name).length,
        items: items.length,
        noPar: items.filter(i => i.qty == null && !i.unparsed).length,
        unparsed: items.filter(i => i.unparsed).length,
    }
}

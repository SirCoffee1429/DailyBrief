import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import { applyItemChange, newerCount } from './prepSheets.js'

// Every active prep station (sheet order), each one's last Finish count, and every active line, kept live. Used by
// the office overview and the kitchen dashboard tile. `channelName` must differ per caller (one channel per screen).
// Item and Finish count changes merge straight in; a station added, renamed or retired (Setup) reloads everything, and
// so does every (re)join of the channel, so changes missed while a screen slept or lost wifi show up.
export function usePrepBoard(channelName) {
    const [stations, setStations] = useState(null)
    const [items, setItems] = useState(null)
    const [latestCounts, setLatestCounts] = useState({})
    const [loadError, setLoadError] = useState('')

    useEffect(() => {
        load()
        const channel = supabase
            .channel(channelName)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'prep_items' },
                change => setItems(prev => applyItemChange(prev, change)))
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'prep_counts' },
                ({ new: count }) => setLatestCounts(prev => ({
                    ...prev, [count.station_id]: newerCount(prev[count.station_id], count),
                })))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'prep_stations' }, () => load())
            .subscribe(status => { if (status === 'SUBSCRIBED') load() })
        return () => { supabase.removeChannel(channel) }
    }, [channelName])

    // Stations with their last Finish count (embedded, newest 1) and every active line (well under PostgREST's
    // 1000-row cap: five stations hold ~175 lines).
    async function load() {
        const [stationsRes, itemsRes] = await Promise.all([
            supabase.from('prep_stations')
                .select('id, name, prep_counts(station_id, label, employee_name, created_at)')
                .eq('active', true)
                .order('sort_order')
                .order('created_at', { referencedTable: 'prep_counts', ascending: false })
                .limit(1, { referencedTable: 'prep_counts' }),
            supabase.from('prep_items').select('id, station_id, have, par_qty, changed_at, sort_order').eq('active', true),
        ])
        if (stationsRes.error || itemsRes.error) {
            console.error('Failed to load the prep stations:', stationsRes.error ?? itemsRes.error)
            setLoadError('Could not load the prep sheets. Refresh to try again.')
            return
        }
        setLoadError('')
        setStations(stationsRes.data.map(({ id, name }) => ({ id, name })))
        setLatestCounts(Object.fromEntries(stationsRes.data.map(s => [s.id, s.prep_counts[0] ?? null])))
        setItems(itemsRes.data)
    }

    return { stations, items, latestCounts, loadError }
}

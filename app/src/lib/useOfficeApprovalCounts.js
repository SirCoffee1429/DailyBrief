import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase.js'
import { localDateString } from './dates.js'
import { sweepStuckBeoImports } from './usePendingBeoImports.js'

// Counts of work actually waiting on the office, for the sidebar badges.
//
// Deliberately NOT derived from the notification feed: these are shared,
// outstanding-work counts, so they clear only when someone does the work, not
// when a manager glances at the bell. Two managers therefore always see the
// same numbers, unlike the per-device unread count on the bell itself.
export function useOfficeApprovalCounts() {
    const [counts, setCounts] = useState({ timeOff: 0, availability: 0, beoImports: 0 })

    const load = useCallback(async () => {
        try {
            // Past requests are moot even if never reviewed, so only count ones
            // whose last day is still ahead. localDateString, not toISOString —
            // the UTC date rolls over at 7pm Central and would drop today.
            const today = localDateString()

            // Retire anything abandoned mid-parse before counting, so a dead
            // import shows up in the badge on this pass rather than the next.
            // This hook is mounted by OfficeLayout, so it runs on every office
            // page — the widest net available without a scheduled job.
            await sweepStuckBeoImports()

            const [timeOffRes, availabilityRes, beoImportsRes] = await Promise.all([
                supabase
                    .from('time_off_requests')
                    .select('id', { count: 'exact', head: true })
                    .eq('status', 'pending')
                    .gte('end_date', today),
                // Same predicate RosterManager uses for its own pending count.
                supabase
                    .from('employees')
                    .select('id', { count: 'exact', head: true })
                    .eq('active', true)
                    .eq('availability_status', 'pending'),
                // 'processing' is deliberately excluded: the parse is still
                // running and there is nothing for anyone to do about it yet, so
                // badging it would send someone to a card with no buttons.
                supabase
                    .from('pending_beo_imports')
                    .select('id', { count: 'exact', head: true })
                    .in('status', ['pending', 'parse_failed']),
            ])

            if (timeOffRes.error) throw timeOffRes.error
            if (availabilityRes.error) throw availabilityRes.error
            if (beoImportsRes.error) throw beoImportsRes.error

            setCounts({
                timeOff: timeOffRes.count || 0,
                availability: availabilityRes.count || 0,
                beoImports: beoImportsRes.count || 0,
            })
        } catch (err) {
            console.error('Failed to load office approval counts:', err)
        }
    }, [])

    useEffect(() => {
        load()

        // Both tables are already in the supabase_realtime publication. Any
        // change can affect a count (a submission, an approval, a deletion), so
        // this listens broadly and just refetches — the queries are head-only
        // counts, so a refetch is cheap.
        const channel = supabase
            .channel('office_approval_counts')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'time_off_requests' }, load)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, load)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pending_beo_imports' }, load)
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [load])

    return counts
}

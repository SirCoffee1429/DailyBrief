import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase.js'
import { NOTIFICATION_KINDS } from './notifications.js'

// BEOs that arrived by email and still need someone. Resolved rows drop out of
// the query entirely rather than being filtered in the panel, so the queue only
// ever shows outstanding work.
const OPEN_STATUSES = ['processing', 'pending', 'parse_failed']

export function usePendingBeoImports() {
    const [rows, setRows] = useState([])
    const [loading, setLoading] = useState(true)

    const load = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('pending_beo_imports')
                .select('*')
                .in('status', OPEN_STATUSES)
                .order('created_at', { ascending: false })

            if (error) throw error
            setRows(data || [])
        } catch (err) {
            console.error('Failed to load pending BEO imports:', err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        load()

        // A row's status is changed by receive-beo-email's background task, not
        // by this browser, so realtime is the only way the panel ever learns a
        // parse finished. Without it 'Reading the BEO…' would sit on screen for
        // the ~90s the parse takes and then stay there until a manual refresh.
        const channel = supabase
            .channel('pending_beo_imports_queue')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pending_beo_imports' }, load)
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [load])

    return { rows, loading, reload: load }
}

// Applies every event in an emailed BEO through process-beo Mode B, which
// updates matching rows in place and so preserves event_tasks, event_order_items
// and crew_notes. The parsed events are replayed exactly as stored, so this
// costs no second Gemini call.
export async function approveBeoImport(row) {
    const { data, error } = await supabase.functions.invoke('process-beo', {
        body: { parsedEvents: row.parsed_events, overwrite: true },
    })

    if (error) throw error

    await resolveRow(row.id, 'approved')
    return data
}

export async function discardBeoImport(row) {
    await resolveRow(row.id, 'discarded')
}

// A parse can die mid-flight — the worker hitting a wall-clock or memory ceiling,
// or a deploy landing at the wrong moment. Its row is left at 'processing' with
// nothing still running to correct it: uncounted, unnotified, and reading on
// screen as though it were still working. That is the precise silent failure
// this whole feature exists to avoid, and receive-beo-email cannot cover it,
// because the code that would report the failure is the code that died.
//
// Real parses finish in 30-90s, and the function's own ceilings — a 130s Gemini
// timeout inside a 400s wall clock — put the hard limit near seven minutes.
// Ten is clear of both without leaving a corpse on screen for long.
const STUCK_AFTER_MINUTES = 10

// Deliberately swept from the office shell rather than by a scheduled job: a
// stuck import only matters to someone looking at the office app, and this runs
// the moment anyone opens any page of it. That is a real trade — nothing happens
// while the app is closed — but it avoids standing up pg_cron for a case that
// resolves itself the instant a human arrives.
//
// The .select() doubles as the concurrency guard. With two managers open at
// once both fire this, but only the update that actually matched rows gets any
// back, so exactly one of them writes the notifications.
export async function sweepStuckBeoImports() {
    const cutoff = new Date(Date.now() - STUCK_AFTER_MINUTES * 60_000).toISOString()

    const { data, error } = await supabase
        .from('pending_beo_imports')
        .update({
            status: 'parse_failed',
            error_text: 'Parse never finished — the reader stopped before it could report back. '
                + 'Re-send the email, or upload the PDF by hand.',
        })
        .eq('status', 'processing')
        .lt('created_at', cutoff)
        .select('id, from_email, subject')

    if (error) {
        console.error('Failed to sweep stuck BEO imports:', error)
        return
    }
    if (!data?.length) return

    const { error: notifyErr } = await supabase.from('office_notifications').insert(
        data.map(row => ({
            kind: NOTIFICATION_KINDS.BEO_EMAIL_FAILED,
            actor_name: row.from_email,
            summary: row.subject || 'Emailed BEO stopped part-way through',
            link: '/office/events',
        }))
    )

    if (notifyErr) console.error('Swept stuck BEO imports but could not notify:', notifyErr)
}

// Selects the updated row and treats zero rows as failure. Checking `error`
// alone is not enough: a policy that refuses an update is not an error, it
// simply matches nothing and reports success — which is exactly how the time
// off approvals became silent no-ops on August 6.
async function resolveRow(id, status) {
    const { data, error } = await supabase
        .from('pending_beo_imports')
        .update({ status, resolved_at: new Date().toISOString() })
        .eq('id', id)
        .select('id')

    if (error) throw error
    if (!data?.length) {
        throw new Error('The queue row was not updated. It may already have been resolved on another device.')
    }
}

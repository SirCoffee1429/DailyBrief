import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase.js'

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

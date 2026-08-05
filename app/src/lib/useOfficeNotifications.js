import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from './supabase.js'
import { NOTIFICATION_WINDOW_DAYS } from './notifications.js'

const LAST_SEEN_KEY = 'officeNotificationsLastSeen'

// The read cursor is per-device on purpose. The office shares one password, so
// there is no user identity to hang a read flag on; storing it server-side would
// mean the first manager to open the bell clears it for everyone, hiding a new
// request from a manager who never saw it.
function readLastSeen() {
    try {
        const stored = localStorage.getItem(LAST_SEEN_KEY)
        if (stored) return stored
        // First visit on this device: start the cursor at now, so a newly added
        // phone does not open to a pile of history other managers already handled.
        const now = new Date().toISOString()
        localStorage.setItem(LAST_SEEN_KEY, now)
        return now
    } catch {
        // Private browsing or storage disabled: degrade to "everything is read"
        // rather than nagging with a count that can never be cleared.
        return new Date().toISOString()
    }
}

function writeLastSeen(value) {
    try {
        localStorage.setItem(LAST_SEEN_KEY, value)
    } catch {
        // Nothing to do — the badge simply won't persist across reloads here.
    }
}

// Loads the office notification feed and tracks which items this device has seen.
export function useOfficeNotifications() {
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [lastSeen, setLastSeen] = useState(readLastSeen)

    const load = useCallback(async () => {
        try {
            const since = new Date()
            since.setDate(since.getDate() - NOTIFICATION_WINDOW_DAYS)

            const { data, error } = await supabase
                .from('office_notifications')
                .select('*')
                .gte('created_at', since.toISOString())
                .order('created_at', { ascending: false })

            if (error) throw error
            setItems(data || [])
        } catch (err) {
            console.error('Failed to load office notifications:', err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        load()

        // Realtime so the bell increments while a manager is already on screen.
        // Only INSERTs matter — notifications are append-only.
        const channel = supabase
            .channel('office_notifications_changes')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'office_notifications' },
                payload => setItems(prev => [payload.new, ...prev])
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [load])

    const unreadCount = useMemo(
        () => items.filter(n => n.created_at > lastSeen).length,
        [items, lastSeen]
    )

    // Marking read moves the cursor to now rather than clearing the list, so the
    // recent feed stays browsable after the badge goes away.
    const markAllRead = useCallback(() => {
        const now = new Date().toISOString()
        writeLastSeen(now)
        setLastSeen(now)
    }, [])

    return { items, loading, unreadCount, lastSeen, markAllRead }
}

// Office notification feed helpers.
//
// Notifications are written by the app, not by database triggers. There is no
// auth yet, so every write reaches Postgres as the anon role and the database
// cannot tell a crew submission from an office one. The app can, so the callers
// below skip office-initiated actions to keep managers from being notified
// about their own clicks.

import { supabase } from './supabase.js'

// Notification kinds. These mirror the CHECK constraint on
// office_notifications.kind — adding one here needs a migration too.
export const NOTIFICATION_KINDS = {
    TIME_OFF_CREATED: 'time_off_created',
    TIME_OFF_CANCELLED: 'time_off_cancelled',
    AVAILABILITY_CHANGED: 'availability_changed',
}

// How far back the bell looks. Old rows stay in the table but never load, so the
// query cost stays flat as the feed grows.
export const NOTIFICATION_WINDOW_DAYS = 30

// Writes one notification. Deliberately fire-and-forget: a failed notification
// must never block or fail the crew action that triggered it, so errors are
// logged and swallowed rather than thrown.
export async function notifyOffice({ kind, actorName, summary, link }) {
    try {
        const { error } = await supabase
            .from('office_notifications')
            .insert({ kind, actor_name: actorName, summary, link })
        if (error) throw error
    } catch (err) {
        console.error('Failed to write office notification:', err)
    }
}

// Compact age stamp for the bell list: "just now", "5m ago", "2h ago", "3d ago".
// Falls back to a plain date once an item is older than a week.
export function formatRelativeTime(timestamp) {
    if (!timestamp) return ''
    const then = new Date(timestamp)
    const minutes = Math.floor((Date.now() - then.getTime()) / 60000)

    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes}m ago`

    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`

    const days = Math.floor(hours / 24)
    if (days === 1) return 'yesterday'
    if (days < 7) return `${days}d ago`

    return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

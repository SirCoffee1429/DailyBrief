-- Two new notification kinds for emailed BEOs.
--
-- beo_email_received → a BEO arrived and is waiting in the review queue
-- beo_email_failed   → it arrived but Gemini could not parse it
--
-- The failure kind is deliberate: without it a bad parse would be invisible, and
-- an email that silently disappears is worse than one that visibly failed.
--
-- kind is a CHECK constraint, so this must move together with NOTIFICATION_KINDS
-- in app/src/lib/notifications.js AND the KIND_DISPLAY map in
-- NotificationBell.jsx — the bell renders nothing for a kind it has no display
-- entry for (`if (!display) return null`), so an unmapped kind is invisible.

alter table public.office_notifications
    drop constraint if exists office_notifications_kind_check;

alter table public.office_notifications
    add constraint office_notifications_kind_check
    check (kind in (
        'time_off_created',
        'time_off_cancelled',
        'availability_changed',
        'beo_email_received',
        'beo_email_failed'
    ));

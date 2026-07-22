// Date helpers for briefing display.
//
// Why this exists: `new Date().toISOString().split('T')[0]` yields the UTC date, which in
// Central time rolls over to tomorrow at 7pm local. Dashboards comparing a briefing's date
// against that string stopped matching every evening and fell through to the "no briefing"
// state while briefings existed. These helpers stay on the device's local calendar, so the
// day flips at local midnight.

// Local calendar date as YYYY-MM-DD, matching the format of the `briefings.date` column.
export function localDateString(d = new Date()) {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

// Local hour (24h) at/after which a NEW briefing defaults to the NEXT day instead of today.
// Rationale: briefings are always posted after dinner service, so anything from 5pm onward is
// for the next service day and should pre-fill tomorrow; earlier posts default to today. The
// on-site devices run on Central time, so this local-hour check is effectively the CST/CDT hour.
// Tune this one number to move the boundary; the manager can always override in the picker.
const NEXT_DAY_CUTOFF_HOUR = 17 // 5pm

// The date a NEW briefing should default to: today before the cutoff, tomorrow at/after it.
// Stays on the local calendar (setDate handles month/year rollover) so it never jumps a day
// early via UTC the way toISOString() did.
export function defaultBriefingDate(now = new Date()) {
    const d = new Date(now)
    if (d.getHours() >= NEXT_DAY_CUTOFF_HOUR) {
        d.setDate(d.getDate() + 1)
    }
    return localDateString(d)
}

// Formats a briefing's created_at into a compact local post time, e.g. "9:34pm".
export function formatPostTime(timestamp) {
    if (!timestamp) return ''
    return new Date(timestamp)
        .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        .replace(/\s/g, '')
        .toLowerCase()
}

// Builds the "Ryan · 9:34pm" byline. Legacy briefings have no author, so they show the
// time alone rather than a fabricated name.
export function formatBriefingByline(briefing) {
    return [briefing.author, formatPostTime(briefing.created_at)].filter(Boolean).join(' · ')
}

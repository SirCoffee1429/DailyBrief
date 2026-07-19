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

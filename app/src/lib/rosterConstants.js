// Canonical vocabularies for the auto-scheduler roster system.
// These feed dropdowns/chips and AI context — stored as plain text in
// Supabase (no hard DB enforcement per docs/auto-scheduler-design.md §2).

export const SHIFT_TYPES = ['AM', 'PM', 'Banquet', 'Turn', 'Pool']

export const STATIONS = [
    'Manager',
    'Hot Line',
    'Salad',
    'Sautee',
    'Char',
    'Flat Top',
    'Fry',
    'Dish',
    'Pastry',
    'Turn',
    'Pool Manager',
    'Pool Cook',
    'Banquet',
    'Pizza Wagon',
]

// Monday-start week convention used app-wide (matches schedules.week_start)
export const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
export const DAY_LABELS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// Formats a Date as a local YYYY-MM-DD string (no UTC shifting)
export function isoDate(d) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
}

// Returns the Monday of the week containing the given date
export function mondayOf(date) {
    const d = new Date(date)
    const offset = (d.getDay() + 6) % 7 // Mon=0 ... Sun=6
    d.setDate(d.getDate() - offset)
    return d
}

// Generates the next `count` Mondays (including the current week's Monday)
// as { value: 'YYYY-MM-DD', label: 'Week of Jun 15' } options
export function upcomingMondays(count = 8) {
    const start = mondayOf(new Date())
    return Array.from({ length: count }, (_, i) => {
        const d = new Date(start)
        d.setDate(d.getDate() + i * 7)
        const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        return { value: isoDate(d), label: `Week of ${label}${i === 0 ? ' (this week)' : ''}` }
    })
}

// Converts a 'HH:MM' / 'HH:MM:SS' time string to a friendly 12-hour label
export function friendlyTime(t) {
    if (!t) return ''
    const [h, m] = t.split(':').map(Number)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const hour12 = h % 12 === 0 ? 12 : h % 12
    return m === 0 ? `${hour12} ${ampm}` : `${hour12}:${String(m).padStart(2, '0')} ${ampm}`
}

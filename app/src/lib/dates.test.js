// Characterization tests for lib/dates.js: they pin what the helpers do today, so a later
// change that breaks the 5pm cutoff or the local-calendar rule fails here first.
// Dates are built with the local-time Date constructor, so the tests pass in any time zone.
import { describe, it, expect } from 'vitest'
import { localDateString, defaultBriefingDate, formatDateOnly, formatBriefingByline } from './dates.js'

// localDateString must use the device's calendar, never the UTC one.
describe('localDateString', () => {
    it('formats a local date as YYYY-MM-DD with zero padding', () => {
        expect(localDateString(new Date(2026, 0, 5, 9, 0))).toBe('2026-01-05')
    })

    it('keeps the local day late in the evening, when UTC has already rolled over', () => {
        expect(localDateString(new Date(2026, 10, 2, 23, 30))).toBe('2026-11-02')
    })
})

// defaultBriefingDate: today before 5pm local, tomorrow from 5pm on.
describe('defaultBriefingDate', () => {
    it('defaults to today before the 5pm cutoff', () => {
        expect(defaultBriefingDate(new Date(2026, 10, 2, 16, 59))).toBe('2026-11-02')
    })

    it('defaults to tomorrow at exactly 5pm', () => {
        expect(defaultBriefingDate(new Date(2026, 10, 2, 17, 0))).toBe('2026-11-03')
    })

    it('rolls over the month and the year', () => {
        expect(defaultBriefingDate(new Date(2026, 11, 31, 20, 0))).toBe('2027-01-01')
    })
})

// formatDateOnly reads the DATE column's own parts, so it can never shift a day.
describe('formatDateOnly', () => {
    it('shows a stored date as M/D/YYYY', () => {
        expect(formatDateOnly('2026-09-28')).toBe('9/28/2026')
    })

    it('shows a dash when there is no date', () => {
        expect(formatDateOnly(null)).toBe('—')
    })
})

// formatBriefingByline: legacy briefings have no author and show the time alone.
describe('formatBriefingByline', () => {
    it('shows only the time when there is no author', () => {
        const created = new Date(2026, 10, 2, 21, 34).toISOString()
        expect(formatBriefingByline({ author: null, created_at: created })).toBe('9:34pm')
    })

    it('joins author and time with a middle dot', () => {
        const created = new Date(2026, 10, 2, 9, 5).toISOString()
        expect(formatBriefingByline({ author: 'Ryan', created_at: created })).toBe('Ryan · 9:05am')
    })
})

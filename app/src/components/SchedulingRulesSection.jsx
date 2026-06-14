import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'

// Source-of-truth scheduling rules manager (office only). Managers capture the
// standing constraints + per-week exceptions the auto-scheduler generator
// (Phase 2/3) will read when building a new schedule. Two scopes:
//   'standing' — week_start NULL, applies to every schedule
//   'week'     — week_start = the currently viewed week, that week only
// `active` lets a rule be paused without deleting it.
export default function SchedulingRulesSection({ weekStart = '' }) {
    const [scope, setScope] = useState('standing') // 'standing' | 'week'
    const [rules, setRules] = useState([])          // all standing + current-week rules
    const [newText, setNewText] = useState('')
    const [editingId, setEditingId] = useState(null)
    const [editingText, setEditingText] = useState('')
    const [loading, setLoading] = useState(true)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState(null)

    // Loads standing rules plus any rules scoped to the active week
    const load = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            let query = supabase.from('scheduling_rules').select('*')
            // Pull standing (NULL) rules always; add this week's rows when a week is selected
            query = weekStart
                ? query.or(`week_start.is.null,week_start.eq.${weekStart}`)
                : query.is('week_start', null)
            const { data, error: loadErr } = await query
                .order('sort_order', { ascending: true })
                .order('created_at', { ascending: true })
            if (loadErr) throw loadErr
            setRules(data || [])
        } catch (err) {
            console.error('Failed to load scheduling rules:', err)
            setError('Could not load scheduling rules. Please try again.')
        } finally {
            setLoading(false)
        }
    }, [weekStart])

    useEffect(() => { load() }, [load])

    // Live refresh so rule edits reflect across open office sessions
    useEffect(() => {
        const channel = supabase
            .channel('scheduling_rules_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'scheduling_rules' }, () => load())
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [load])

    // Rules for the scope currently being viewed
    const visible = rules.filter(r =>
        scope === 'standing' ? r.week_start === null : r.week_start === weekStart
    )

    // Adds a new rule under the active scope
    async function addRule() {
        const text = newText.trim()
        if (!text) return
        setBusy(true)
        try {
            const { error: insErr } = await supabase.from('scheduling_rules').insert({
                rule_text: text,
                active: true,
                week_start: scope === 'week' ? weekStart : null,
                sort_order: visible.length,
            })
            if (insErr) throw insErr
            setNewText('')
            await load()
        } catch (err) {
            console.error('Failed to add rule:', err)
            alert('Could not add rule. Please try again.')
        } finally {
            setBusy(false)
        }
    }

    // Toggles a rule between active and paused
    async function toggleActive(rule) {
        try {
            const { error: updErr } = await supabase
                .from('scheduling_rules')
                .update({ active: !rule.active, updated_at: new Date().toISOString() })
                .eq('id', rule.id)
            if (updErr) throw updErr
            await load()
        } catch (err) {
            console.error('Failed to toggle rule:', err)
            alert('Could not update rule.')
        }
    }

    // Persists an inline edit to a rule's text
    async function saveEdit() {
        const text = editingText.trim()
        if (!text) { setEditingId(null); return }
        try {
            const { error: updErr } = await supabase
                .from('scheduling_rules')
                .update({ rule_text: text, updated_at: new Date().toISOString() })
                .eq('id', editingId)
            if (updErr) throw updErr
            setEditingId(null)
            setEditingText('')
            await load()
        } catch (err) {
            console.error('Failed to save rule edit:', err)
            alert('Could not save rule.')
        }
    }

    // Permanently removes a rule
    async function deleteRule(rule) {
        if (!confirm('Delete this rule?')) return
        try {
            const { error: delErr } = await supabase.from('scheduling_rules').delete().eq('id', rule.id)
            if (delErr) throw delErr
            await load()
        } catch (err) {
            console.error('Failed to delete rule:', err)
            alert('Could not delete rule.')
        }
    }

    const weekLabel = weekStart
        ? new Date(weekStart + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : null

    return (
        <div className="sot-card">
            <div className="sot-header">
                <div>
                    <h3 className="sot-title">
                        <i className="fa-solid fa-scale-balanced" /> Source of Truth — Scheduling Rules
                    </h3>
                    <p className="sot-subtitle">
                        Constraints the schedule builder reads when generating a new schedule.
                        Pause a rule with its toggle instead of deleting it.
                    </p>
                </div>
            </div>

            {/* Scope toggle: standing rules vs. this-week-only rules */}
            <div className="sot-scope-toggle">
                <button
                    type="button"
                    className={`sot-scope-btn${scope === 'standing' ? ' active' : ''}`}
                    onClick={() => setScope('standing')}
                >
                    <i className="fa-solid fa-infinity" /> Standing (every week)
                </button>
                <button
                    type="button"
                    className={`sot-scope-btn${scope === 'week' ? ' active' : ''}`}
                    onClick={() => weekStart && setScope('week')}
                    disabled={!weekStart}
                    title={weekStart ? '' : 'Select a week to add week-specific rules'}
                >
                    <i className="fa-regular fa-calendar" /> {weekLabel ? `Just for ${weekLabel}` : 'This week only'}
                </button>
            </div>

            {error && <p className="sot-error">{error}</p>}

            {/* Add a rule under the active scope */}
            <div className="sot-add-row">
                <input
                    type="text"
                    className="sot-add-input"
                    placeholder={scope === 'standing'
                        ? 'e.g. Always 2 cooks on Char for Fri/Sat dinner'
                        : `e.g. Holiday week — extra banquet prep ${weekLabel ? `(${weekLabel})` : ''}`}
                    value={newText}
                    onChange={e => setNewText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') addRule() }}
                />
                <button className="btn btn-orange btn-sm" onClick={addRule} disabled={busy || !newText.trim()}>
                    <i className="fa-solid fa-plus" /> Add rule
                </button>
            </div>

            {/* Rule list for the active scope */}
            {loading ? (
                <p className="sot-empty">Loading rules…</p>
            ) : visible.length === 0 ? (
                <p className="sot-empty">
                    {scope === 'standing'
                        ? 'No standing rules yet. Add the constraints that always apply.'
                        : 'No rules for this week. Add anything specific to this week here.'}
                </p>
            ) : (
                <ul className="sot-list">
                    {visible.map(rule => (
                        <li key={rule.id} className={`sot-item${rule.active ? '' : ' paused'}`}>
                            {/* Active/pause toggle */}
                            <button
                                type="button"
                                className="sot-toggle"
                                onClick={() => toggleActive(rule)}
                                title={rule.active ? 'Active — click to pause' : 'Paused — click to activate'}
                            >
                                <i className={`fa-${rule.active ? 'solid fa-square-check' : 'regular fa-square'}`} />
                            </button>

                            {editingId === rule.id ? (
                                <input
                                    type="text"
                                    className="sot-edit-input"
                                    value={editingText}
                                    autoFocus
                                    onChange={e => setEditingText(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') saveEdit()
                                        if (e.key === 'Escape') { setEditingId(null); setEditingText('') }
                                    }}
                                    onBlur={saveEdit}
                                />
                            ) : (
                                <span
                                    className="sot-text"
                                    onClick={() => { setEditingId(rule.id); setEditingText(rule.rule_text) }}
                                    title="Click to edit"
                                >
                                    {rule.rule_text}
                                    {!rule.active && <span className="sot-paused-tag">paused</span>}
                                </span>
                            )}

                            <button
                                type="button"
                                className="sot-delete"
                                onClick={() => deleteRule(rule)}
                                title="Delete rule"
                            >
                                <i className="fa-solid fa-xmark" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}

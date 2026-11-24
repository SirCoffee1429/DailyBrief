import { useMemo, useState } from 'react'
import { suggestDishes, searchDishes, matchRow } from '../lib/beoLines.js'
import { saveMatch } from '../lib/beoOrderData.js'

// Labels for the answers that are not a dish.
const ANSWER_LABELS = {
    not_food: 'Not food',
    not_on_menu: 'Not on a menu',
    describes_above: 'Describes the line above',
}

// Search results shown at once: a word like "salad" matches dozens of dishes.
const SEARCH_LIMIT = 12

// What tells same-name dishes apart: the menu, its section and the season.
function dishMeta(dish) {
    return [dish.menu_source, dish.menu_section, dish.season].filter(Boolean).join(' · ')
}

// The "lines to match" box (spec/beo-order-from-specs.md, rules 2a and 3): each BEO line that is
// not yet a known dish, with the ways to answer it, and each dish name typed under another dish,
// asked Part of / Its own dish. Each answer is saved at once and used on every future BEO with the
// same wording (a pair answer only under that dish). Build list builds with what is answered;
// unanswered lines go to the AI this time (a pair counts as part of its dish) and are asked again next time.
// `changing`: opened by Change match on a built dish; an unanswered line stays as it is.
export default function BeoLineMatcher({ lines, dishes, building, changing = false, onBuild, onCancel }) {
    const [answers, setAnswers] = useState({}) // line id -> { kind, dish }
    const answered = lines.filter(line => answers[line.id]).length
    // What happens to a line left unanswered. A pair line says it on its own line.
    const unansweredNote = changing ? 'Leave it unanswered to keep it as it is.'
        : lines.some(line => !line.underDishId) ? 'Lines left unanswered go to the AI this time.'
        : ''

    return (
        <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(52, 211, 153, 0.18)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                    {changing ? 'Change match' : `${lines.length} BEO ${lines.length === 1 ? 'line' : 'lines'} to match`}
                    <span style={{ marginLeft: '8px', fontWeight: 400, fontSize: '0.8rem', color: 'var(--text-muted)' }}>{answered} answered</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Each answer is saved and used on every future BEO with the same wording. {unansweredNote}
                </div>
            </div>

            {lines.map(line => (
                <MatchLine
                    key={line.id}
                    line={line}
                    dishes={dishes}
                    answer={answers[line.id]}
                    disabled={building}
                    changing={changing}
                    onAnswered={answer => setAnswers(prev => ({ ...prev, [line.id]: answer }))}
                />
            ))}

            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary btn-sm" onClick={onCancel} disabled={building}>Cancel</button>
                <button
                    className="btn btn-sm"
                    style={{ background: '#34d399', color: '#111', borderColor: '#34d399' }}
                    onClick={onBuild}
                    disabled={building}
                >
                    {building ? <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '4px' }} />Building...</> : 'Build list'}
                </button>
            </div>
        </div>
    )
}

// One line to match: its BEO item for context, then suggested dishes, a dish search, and the
// three non-dish answers. A dish name under another dish (`underDishId`) gets only Part of /
// Its own dish. Only a saved answer counts, so a failed save leaves the line as it was.
function MatchLine({ line, dishes, answer, disabled, changing, onAnswered }) {
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState(null)
    const [searchOpen, setSearchOpen] = useState(false)
    const [query, setQuery] = useState('')
    const isPair = Boolean(line.underDishId)
    const suggestions = useMemo(() => (isPair ? [] : suggestDishes(line.text, dishes)), [isPair, line.text, dishes])
    const results = searchOpen ? searchDishes(query, dishes).slice(0, SEARCH_LIMIT) : []
    const busy = disabled || saving
    // For a pair: the dish the line sits under, and the dish its name is
    const underDish = isPair ? dishes.find(d => d.id === line.underDishId) : null
    const ownDish = isPair ? dishes.find(d => d.id === line.dishId) : null
    const underName = underDish?.name ?? line.itemTexts[0]

    // Saves the answer, then shows it.
    async function answerWith(kind, dish = null) {
        setSaving(true)
        setError(null)
        try {
            await saveMatch(matchRow(line.key, kind, dish?.id, line.underDishId))
            onAnswered({ kind, dish })
            setSearchOpen(false)
        } catch (err) {
            console.error('Error saving BEO line match:', err)
            setError(`Not saved: ${err.message || 'unknown error'}. Try again.`)
        } finally {
            setSaving(false)
        }
    }

    // Is this the saved answer? Highlights the chosen button.
    const isAnswer = (kind, dish = null) => answer?.kind === kind && (kind !== 'dish' || answer.dish?.id === dish?.id)
    const buttonClass = chosen => `btn btn-sm ${chosen ? 'btn-primary' : 'btn-secondary'}`

    return (
        <div style={{ border: '1px solid var(--border, rgba(255,255,255,0.1))', borderRadius: 'var(--radius-sm)', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {/* The line, and the BEO item it sits in */}
            <div>
                <div style={{ fontWeight: 600, overflowWrap: 'anywhere' }}>
                    {line.text}
                    {isPair && <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}> under {underName}</span>}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflowWrap: 'anywhere' }}>
                    {[line.category, line.label].filter(Boolean).join(' · ')}
                    {line.itemTexts.length > 1 && (
                        <div style={{ whiteSpace: 'pre-line', marginTop: '2px' }}>
                            {line.itemTexts.map((text, i) => (
                                <div key={i} style={i === line.lineIndex ? { color: 'var(--text-primary, inherit)', fontWeight: 600 } : undefined}>{text}</div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* A dish name under another dish: part of that dish, or a dish of its own */}
            {isPair && (
                <>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        <button className={buttonClass(isAnswer('part_of_dish'))} disabled={busy} onClick={() => answerWith('part_of_dish')}>
                            Part of {underName}
                        </button>
                        <button className={buttonClass(isAnswer('dish', ownDish))} disabled={busy || !ownDish} onClick={() => answerWith('dish', ownDish)}>
                            Its own dish
                        </button>
                    </div>
                    {!answer && !changing && <div className="catalog-row-lists">Left unanswered, it counts as part of {underName} this time.</div>}
                </>
            )}

            {/* Suggested dishes, most shared words first */}
            {suggestions.length > 0 && (
                <div className="ingredient-picker-results">
                    {suggestions.map(dish => (
                        <button
                            key={dish.id}
                            className="ingredient-picker-result"
                            style={isAnswer('dish', dish) ? { outline: '2px solid #34d399' } : undefined}
                            disabled={busy}
                            onClick={() => answerWith('dish', dish)}
                        >
                            <span>{dish.name}</span>
                            <span className="catalog-row-meta">{dishMeta(dish)}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* The other answers */}
            {!isPair && <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                <button className={buttonClass(searchOpen)} disabled={busy} onClick={() => setSearchOpen(open => !open)}>
                    Pick another dish
                </button>
                {Object.entries(ANSWER_LABELS)
                    .filter(([kind]) => kind !== 'describes_above' || line.canDescribeAbove)
                    .map(([kind, label]) => (
                        <button key={kind} className={buttonClass(isAnswer(kind))} disabled={busy} onClick={() => answerWith(kind)}>
                            {label}
                        </button>
                    ))}
            </div>}

            {/* Search over every orderable dish */}
            {searchOpen && (
                <div className="ingredient-picker">
                    <input className="input" autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search the menu dishes" />
                    {query.trim() && results.length === 0 && <div className="catalog-row-lists">No dish matches.</div>}
                    <div className="ingredient-picker-results">
                        {results.map(dish => (
                            <button key={dish.id} className="ingredient-picker-result" disabled={busy} onClick={() => answerWith('dish', dish)}>
                                <span>{dish.name}</span>
                                <span className="catalog-row-meta">{dishMeta(dish)}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {saving && <div className="catalog-row-lists"><span className="spinner" /> Saving...</div>}
            {error && <div className="dish-spec-gap">{error}</div>}
            {answer && !saving && (
                <div style={{ fontSize: '0.8rem', color: '#34d399' }}>
                    <i className="fa-solid fa-check" style={{ marginRight: '4px' }} />
                    {answer.kind === 'part_of_dish' ? `Part of ${underName}`
                        : answer.kind === 'dish' ? `${isPair ? 'Its own dish: ' : ''}${answer.dish.name} (${dishMeta(answer.dish)})`
                        : ANSWER_LABELS[answer.kind]}
                </div>
            )}
        </div>
    )
}

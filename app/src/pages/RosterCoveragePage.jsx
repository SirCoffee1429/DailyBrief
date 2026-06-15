import { useMemo, useState } from 'react'
import RosterManager from '../components/RosterManager.jsx'
import CoverageTemplateSection from '../components/CoverageTemplateSection.jsx'
import SchedulingRulesSection from '../components/SchedulingRulesSection.jsx'
import { upcomingMondays } from '../lib/rosterConstants.js'

// Office hub bundling the auto-scheduler INPUTS in one place:
//  • Roster            — who works here + their availability
//  • Coverage Template — how many people each station/shift/day needs
//  • Rules             — free-text constraints the AI reads
// The /office/schedule page stays the schedule OUTPUT (grid). A shared week
// selector scopes the per-week pieces (coverage exceptions + week-specific rules).
const TABS = [
    { id: 'roster', label: 'Roster', icon: 'fa-solid fa-users' },
    { id: 'coverage', label: 'Coverage Template', icon: 'fa-solid fa-table-cells' },
    { id: 'rules', label: 'Source of Truth Rules', icon: 'fa-solid fa-scale-balanced' },
]

export default function RosterCoveragePage() {
    const [activeTab, setActiveTab] = useState('roster')
    const weekOptions = useMemo(() => upcomingMondays(8), [])
    const [selectedWeek, setSelectedWeek] = useState(weekOptions[0]?.value || '')

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        <i className="fa-solid fa-layer-group" style={{ marginRight: '0.5rem' }} />
                        Roster &amp; Coverage
                    </h1>
                    <p className="page-subtitle">
                        Everything the schedule builder reads — staff &amp; availability, required
                        coverage, and standing rules.
                    </p>
                </div>

                {/* Shared week selector — only the per-week tabs use it */}
                {activeTab !== 'roster' && (
                    <div className="rc-week-picker">
                        <i className="fa-regular fa-calendar" />
                        <select value={selectedWeek} onChange={e => setSelectedWeek(e.target.value)}>
                            {weekOptions.map(w => (
                                <option key={w.value} value={w.value}>{w.label}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Tab bar */}
            <div className="rc-tabs">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        className={`rc-tab${activeTab === tab.id ? ' active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        <i className={tab.icon} /> {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab panels */}
            {activeTab === 'roster' && <RosterManager />}
            {activeTab === 'coverage' && <CoverageTemplateSection weekStart={selectedWeek} />}
            {activeTab === 'rules' && <SchedulingRulesSection weekStart={selectedWeek} />}
        </div>
    )
}

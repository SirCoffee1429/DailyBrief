import { useState, useRef, useCallback } from 'react'
import { NavLink } from 'react-router-dom'
import AssistantWidget from './AssistantWidget.jsx'

// Front of House shell — mirrors KitchenLayout but applies the cyan theme
// variant via the `foh-theme` class on the app-shell root, and drops the
// Sales tab since FOH dashboards don't expose sales data.
export default function FOHLayout({ children }) {
    const [assistantOpen, setAssistantOpen] = useState(false)
    const [voiceMode, setVoiceMode] = useState(false)
    const [longPressActive, setLongPressActive] = useState(false)
    const longPressTimer = useRef(null)
    const didTriggerVoice = useRef(false)

    const handlePointerDown = useCallback(() => {
        didTriggerVoice.current = false
        setLongPressActive(true)
        longPressTimer.current = setTimeout(() => {
            didTriggerVoice.current = true
            setLongPressActive(false)
            setVoiceMode(true)
            setAssistantOpen(true)
        }, 1500)
    }, [])

    const handlePointerUp = useCallback(() => {
        clearTimeout(longPressTimer.current)
        setLongPressActive(false)
        if (!didTriggerVoice.current) {
            setAssistantOpen(prev => !prev)
        }
    }, [])

    const handlePointerLeave = useCallback(() => {
        clearTimeout(longPressTimer.current)
        setLongPressActive(false)
    }, [])

    return (
        <div className="app-shell foh-theme">
            <main className="main-content">
                {children}
            </main>

            <AssistantWidget
                externalOpen={assistantOpen}
                onExternalClose={() => { setAssistantOpen(false); setVoiceMode(false) }}
                voiceMode={voiceMode}
                onVoiceModeEnd={() => setVoiceMode(false)}
            />

            <nav className="bottom-tab-bar">
                <NavLink
                    to="/foh"
                    end
                    className={({ isActive }) => `bottom-tab-link ${isActive ? 'active' : ''}`}
                >
                    <i className="tab-icon fa-solid fa-table-cells-large" />
                    <span className="tab-label">Brief</span>
                </NavLink>

                <NavLink
                    to="/foh/events"
                    className={({ isActive }) => `bottom-tab-link ${isActive ? 'active' : ''}`}
                >
                    <i className="tab-icon fa-solid fa-champagne-glasses" />
                    <span className="tab-label">Events</span>
                </NavLink>

                <button
                    className={`bottom-tab-link bottom-tab-center ${assistantOpen ? 'active' : ''} ${longPressActive ? 'long-press-active' : ''}`}
                    onPointerDown={handlePointerDown}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerLeave}
                    onContextMenu={e => e.preventDefault()}
                    aria-label="Toggle Assistant (hold for voice)"
                >
                    <i className={`tab-icon fa-solid ${longPressActive ? 'fa-microphone' : 'fa-brain'}`} />
                    <span className="tab-label">Assistant</span>
                </button>

                <NavLink
                    to="/foh/recipes"
                    className={({ isActive }) => `bottom-tab-link ${isActive ? 'active' : ''}`}
                >
                    <i className="tab-icon fa-solid fa-utensils" />
                    <span className="tab-label">Recipes</span>
                </NavLink>

                <NavLink
                    to="/foh/chat"
                    className={({ isActive }) => `bottom-tab-link ${isActive ? 'active' : ''}`}
                >
                    <i className="tab-icon fa-solid fa-list-check" />
                    <span className="tab-label">Tasks</span>
                </NavLink>
            </nav>
        </div>
    )
}

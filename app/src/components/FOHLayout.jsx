import { useState, useRef, useCallback } from 'react'
import { NavLink } from 'react-router-dom'
import AssistantWidget from './AssistantWidget.jsx'

// Front of House shell — office-style left sidebar layout (reuses the office-v2
// structural classes with a .foh-v2 modifier that applies the all-cyan FOH
// palette). Mirrors KitchenLayout; replaces the old floating bottom tab bar.
export default function FOHLayout({ children }) {
    const [assistantOpen, setAssistantOpen] = useState(false)
    const [voiceMode, setVoiceMode] = useState(false)
    const [longPressActive, setLongPressActive] = useState(false)
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const longPressTimer = useRef(null)
    const didTriggerVoice = useRef(false)

    const closeSidebar = useCallback(() => setSidebarOpen(false), [])
    const toggleSidebar = useCallback(() => setSidebarOpen(prev => !prev), [])

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

    const navItems = [
        { to: '/foh', label: 'Brief', icon: 'fa-solid fa-table-cells-large', end: true },
        { to: '/foh/events', label: 'Events', icon: 'fa-solid fa-champagne-glasses' },
        { to: '/foh/recipes', label: 'Recipes', icon: 'fa-solid fa-utensils' },
    ]

    return (
        <div className="office-v2-container foh-v2">
            {/* Sidebar */}
            <aside className={`office-v2-sidebar${sidebarOpen ? ' sidebar-open' : ''}`}>
                <div className="office-v2-sidebar-header">
                    <button className="office-v2-nav-link" onClick={toggleSidebar} style={{ padding: '0', marginRight: '1rem', border: 'none' }}>
                        <i className="fa-solid fa-bars" />
                    </button>
                    <h1 className="office-v2-sidebar-title">Front of House</h1>
                </div>

                <nav className="office-v2-nav custom-scrollbar">
                    {navItems.map(item => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            onClick={closeSidebar}
                            className={({ isActive }) => `office-v2-nav-link ${isActive ? 'active' : ''}`}
                        >
                            <i className={`${item.icon} office-v2-nav-icon`} />
                            <span style={{ marginLeft: '0.75rem', fontWeight: 500 }}>{item.label}</span>
                        </NavLink>
                    ))}

                    {/* Assistant — bottom of nav, long-press for voice (cyan active state) */}
                    <div style={{ marginTop: 'auto', marginBottom: '0.5rem', padding: '0 0.5rem' }}>
                        <button
                            className={`office-v2-nav-link ${assistantOpen ? 'active' : ''}`}
                            style={{
                                width: '100%',
                                border: 'none',
                                background: assistantOpen ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
                                textAlign: 'left',
                                cursor: 'pointer',
                                borderRadius: '0.5rem'
                            }}
                            onPointerDown={handlePointerDown}
                            onPointerUp={handlePointerUp}
                            onPointerLeave={handlePointerLeave}
                            onContextMenu={e => e.preventDefault()}
                        >
                            <i className={`fa-solid ${longPressActive ? 'fa-microphone' : 'fa-brain'} office-v2-nav-icon`} style={{ color: assistantOpen ? '#06b6d4' : '' }} />
                            <span style={{ marginLeft: '0.75rem', color: assistantOpen ? '#06b6d4' : '' }}>Assistant</span>
                        </button>
                    </div>
                </nav>
            </aside>

            {/* Overlay — closes sidebar when tapped on mobile */}
            {sidebarOpen && (
                <div className="office-v2-sidebar-overlay" onClick={closeSidebar} />
            )}

            {/* Main Wrapper */}
            <main className="office-v2-main">
                {/* Mobile-only hamburger to open sidebar */}
                <button className="office-v2-hamburger-mobile" onClick={toggleSidebar}>
                    <i className="fa-solid fa-bars" />
                </button>

                {/* Sub-routes inject here — main-content keeps FOH pages' centered
                    max-width page styling */}
                <div className="foh-v2-scroll custom-scrollbar">
                    <div className="main-content">
                        {children}
                    </div>
                </div>
            </main>

            <AssistantWidget
                externalOpen={assistantOpen}
                onExternalClose={() => { setAssistantOpen(false); setVoiceMode(false) }}
                voiceMode={voiceMode}
                onVoiceModeEnd={() => setVoiceMode(false)}
            />
        </div>
    )
}

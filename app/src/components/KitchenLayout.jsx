import { useState, useRef, useCallback } from 'react'
import { NavLink } from 'react-router-dom'
import AssistantWidget from './AssistantWidget.jsx'

// Kitchen shell — office-style left sidebar layout (reuses the office-v2
// structural classes with a .kitchen-v2 modifier that keeps the kitchen's
// own background/colors). Replaces the old floating bottom tab bar.
export default function KitchenLayout({ children }) {
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
        // If voice mode was NOT triggered, treat as normal tap
        if (!didTriggerVoice.current) {
            setAssistantOpen(prev => !prev)
        }
    }, [])

    const handlePointerLeave = useCallback(() => {
        clearTimeout(longPressTimer.current)
        setLongPressActive(false)
    }, [])

    const navItems = [
        { to: '/kitchen', label: 'Brief', icon: 'fa-solid fa-table-cells-large', end: true },
        { to: '/kitchen/events', label: 'Events', icon: 'fa-solid fa-champagne-glasses' },
        { to: '/kitchen/schedule', label: 'Schedule', icon: 'fa-solid fa-calendar-days' },
        { to: '/kitchen/availability', label: 'Availability', icon: 'fa-solid fa-clock' },
        { to: '/kitchen/recipes', label: 'Recipes', icon: 'fa-solid fa-utensils' },
        { to: '/kitchen/sales', label: 'Sales', icon: 'fa-solid fa-chart-line' },
        { to: '/kitchen/time-off', label: 'Time Off', icon: 'fa-regular fa-calendar' },
    ]

    return (
        <div className="office-v2-container kitchen-v2">
            {/* Sidebar */}
            <aside className={`office-v2-sidebar${sidebarOpen ? ' sidebar-open' : ''}`}>
                <div className="office-v2-sidebar-header">
                    <button className="office-v2-nav-link" onClick={toggleSidebar} style={{ padding: '0', marginRight: '1rem', border: 'none' }}>
                        <i className="fa-solid fa-bars" />
                    </button>
                    <h1 className="office-v2-sidebar-title">Kitchen</h1>
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

                    {/* Assistant — bottom of nav, long-press for voice (matches office) */}
                    <div style={{ marginTop: 'auto', marginBottom: '0.5rem', padding: '0 0.5rem' }}>
                        <button
                            className={`office-v2-nav-link ${assistantOpen ? 'active' : ''}`}
                            style={{
                                width: '100%',
                                border: 'none',
                                background: assistantOpen ? 'rgba(230, 107, 53, 0.2)' : 'transparent',
                                textAlign: 'left',
                                cursor: 'pointer',
                                borderRadius: '0.5rem'
                            }}
                            onPointerDown={handlePointerDown}
                            onPointerUp={handlePointerUp}
                            onPointerLeave={handlePointerLeave}
                            onContextMenu={e => e.preventDefault()}
                        >
                            <i className={`fa-solid ${longPressActive ? 'fa-microphone' : 'fa-brain'} office-v2-nav-icon`} style={{ color: assistantOpen ? '#e66b35' : '' }} />
                            <span style={{ marginLeft: '0.75rem', color: assistantOpen ? '#e66b35' : '' }}>Assistant</span>
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

                {/* Sub-routes inject here — main-content keeps the kitchen's
                    centered max-width page styling */}
                <div className="kitchen-v2-scroll custom-scrollbar">
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

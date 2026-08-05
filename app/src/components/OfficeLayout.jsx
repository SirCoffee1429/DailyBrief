import { useState, useRef, useCallback } from 'react'
import { NavLink } from 'react-router-dom'
import AssistantWidget from './AssistantWidget.jsx'
import NotificationBell from './NotificationBell.jsx'
import { useNavigate } from 'react-router-dom'

export default function OfficeLayout({ children }) {
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

    const navigate = useNavigate()

   function handleLogout() {
     sessionStorage.removeItem('officeUnlocked')
     navigate('/')
   }

    return (
        <div className="office-v2-container">
            {/* Sidebar */}
            <aside className={`office-v2-sidebar${sidebarOpen ? ' sidebar-open' : ''}`}>
                <div className="office-v2-sidebar-header">
                    <button className="office-v2-nav-link" onClick={toggleSidebar} style={{ padding: '0', marginRight: '1rem', border: 'none' }}>
                        <i className="fa-solid fa-bars" />
                    </button>
                    <h1 className="office-v2-sidebar-title">Office Dashboard</h1>
                </div>
                
                <nav className="office-v2-nav custom-scrollbar">
                    <NavLink to="/office" end onClick={closeSidebar} className={({ isActive }) => `office-v2-nav-link ${isActive ? 'active' : ''}`}>
                        <i className="fa-solid fa-grip office-v2-nav-icon" />
                        <span style={{ marginLeft: '0.75rem', fontWeight: 500 }}>Dashboard</span>
                    </NavLink>
                    <NavLink to="/office/sales" onClick={closeSidebar} className={({ isActive }) => `office-v2-nav-link ${isActive ? 'active' : ''}`}>
                        <i className="fa-solid fa-dollar-sign office-v2-nav-icon" />
                        <span style={{ marginLeft: '0.75rem' }}>Sales</span>
                    </NavLink>
                    <NavLink to="/office/workbooks" onClick={closeSidebar} className={({ isActive }) => `office-v2-nav-link ${isActive ? 'active' : ''}`}>
                        <i className="fa-solid fa-book-open office-v2-nav-icon" />
                        <span style={{ marginLeft: '0.75rem' }}>Recipes</span>
                    </NavLink>
                    <NavLink to="/office/history" onClick={closeSidebar} className={({ isActive }) => `office-v2-nav-link ${isActive ? 'active' : ''}`}>
                        <i className="fa-solid fa-check-square office-v2-nav-icon" />
                        <span style={{ marginLeft: '0.75rem' }}>Tasks</span>
                    </NavLink>
                    <NavLink to="/office/briefings" onClick={closeSidebar} className={({ isActive }) => `office-v2-nav-link ${isActive ? 'active' : ''}`}>
                        <i className="fa-solid fa-clipboard-list office-v2-nav-icon" />
                        <span style={{ marginLeft: '0.75rem' }}>Briefings</span>
                    </NavLink>
                    <NavLink to="/office/events" onClick={closeSidebar} className={({ isActive }) => `office-v2-nav-link ${isActive ? 'active' : ''}`}>
                        <i className="fa-solid fa-calendar-alt office-v2-nav-icon" />
                        <span style={{ marginLeft: '0.75rem' }}>Events</span>
                    </NavLink>
                    <NavLink to="/office/time-off" onClick={closeSidebar} className={({ isActive }) => `office-v2-nav-link ${isActive ? 'active' : ''}`}>
                        <i className="fa-regular fa-calendar office-v2-nav-icon" />
                        <span style={{ marginLeft: '0.75rem' }}>Time Off</span>
                    </NavLink>
                    <NavLink to="/office/schedule" onClick={closeSidebar} className={({ isActive }) => `office-v2-nav-link ${isActive ? 'active' : ''}`}>
                        <i className="fa-solid fa-calendar-days office-v2-nav-icon" />
                        <span style={{ marginLeft: '0.75rem' }}>Schedule</span>
                    </NavLink>
                    <NavLink to="/office/roster-coverage" onClick={closeSidebar} className={({ isActive }) => `office-v2-nav-link ${isActive ? 'active' : ''}`}>
                        <i className="fa-solid fa-layer-group office-v2-nav-icon" />
                        <span style={{ marginLeft: '0.75rem' }}>Roster &amp; Coverage</span>
                    </NavLink>
                    <NavLink to="/office/chat" onClick={closeSidebar} className={({ isActive }) => `office-v2-nav-link ${isActive ? 'active' : ''}`}>
                        <i className="fa-solid fa-comments office-v2-nav-icon" />
                        <span style={{ marginLeft: '0.75rem' }}>Communication</span>
                    </NavLink>

                    
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

                <div style={{ padding: '1rem', borderTop: '1px solid #333' }}>
                    <button className="office-v2-nav-link" onClick={() => { closeSidebar(); handleLogout() }} style={{ width: '100%', border: 'none', justifyContent: 'flex-start' }}>
                        <i className="fa-solid fa-lock office-v2-nav-icon" style={{ color: '#e66b35' }} />
                        <span style={{ marginLeft: '0.75rem' }}>Lock Office</span>
                    </button>
                </div>
            </aside>

            {/* Overlay — closes sidebar when tapped on mobile */}
            {sidebarOpen && (
                <div className="office-v2-sidebar-overlay" onClick={closeSidebar} />
            )}

            {/* Main Wrapper */}
            <main className="office-v2-main">
                <header className="office-v2-topbar">
                    {/* Mobile-only hamburger to open sidebar */}
                    <button className="office-v2-hamburger-mobile" onClick={toggleSidebar}>
                        <i className="fa-solid fa-bars" />
                    </button>
                    <NotificationBell />
                    <button
                        style={{
                            color: '#e66b35',
                            border: '1px solid #e66b35',
                            borderRadius: '999px',
                            width: '2rem', height: '2rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', background: 'transparent'
                        }}
                    >
                        <i className="fa-regular fa-user" />
                    </button>
                </header>

                {/* Sub-routes inject here */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', padding: '0 1.5rem 1.5rem 1.5rem' }} className="custom-scrollbar">
                    {children}
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

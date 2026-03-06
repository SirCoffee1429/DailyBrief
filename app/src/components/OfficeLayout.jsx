import { NavLink } from 'react-router-dom'

const officeTabs = [
    { to: '/office', icon: '⊞' },
    { to: '/office/briefings', icon: '📋' },
    { to: '/office/workbooks', icon: '📁' },
    { to: '/office/history', icon: '📊' },
    { to: '/office/chat', icon: '💡' },
]

export default function OfficeLayout({ children }) {
    return (
        <div className="app-shell">
            <main className="main-content">
                {children}
            </main>

            <nav className="bottom-tab-bar">
                {officeTabs.map(item => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.to === '/office'}
                        className={({ isActive }) => `bottom-tab-link ${isActive ? 'active' : ''}`}
                    >
                        <span>{item.icon}</span>
                    </NavLink>
                ))}
            </nav>
        </div>
    )
}

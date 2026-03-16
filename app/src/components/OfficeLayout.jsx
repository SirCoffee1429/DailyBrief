import { NavLink } from 'react-router-dom'

const officeTabs = [
    { to: '/office', icon: 'fa-solid fa-table-cells-large', label: 'Dashboard' },
    { to: '/office/briefings', icon: 'fa-solid fa-clipboard-list', label: 'Briefings' },
    { to: '/office/workbooks', icon: 'fa-solid fa-folder-open', label: 'Recipes' },
    { to: '/office/history', icon: 'fa-solid fa-chart-bar', label: 'History' },
    { to: '/office/chat', icon: 'fa-solid fa-brain', label: 'Assistant' },
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
                        <i className={`tab-icon ${item.icon}`} />
                        <span className="tab-label">{item.label}</span>
                    </NavLink>
                ))}
            </nav>
        </div>
    )
}

import { NavLink } from 'react-router-dom'

const bottomNavItems = [
    { to: '/', icon: '⊞' },
    { to: '/briefings', icon: '📋' },
    { to: '/workbooks', icon: '🍽️' },
    { to: '/workbooks/upload', icon: '📤' },
]

export default function Layout({ children }) {
    return (
        <div className="app-shell">
            <main className="main-content">
                {children}
            </main>

            <nav className="bottom-tab-bar">
                {bottomNavItems.map(item => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.to === '/'}
                        className={({ isActive }) => `bottom-tab-link ${isActive ? 'active' : ''}`}
                    >
                        <span>{item.icon}</span>
                    </NavLink>
                ))}
            </nav>
        </div>
    )
}

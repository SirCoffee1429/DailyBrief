import { NavLink } from 'react-router-dom'

const kitchenTabs = [
    { to: '/kitchen', icon: '⊞' },
    { to: '/kitchen/chat', icon: '💡' },
]

export default function KitchenLayout({ children }) {
    return (
        <div className="app-shell">
            <main className="main-content">
                {children}
            </main>

            <nav className="bottom-tab-bar">
                {kitchenTabs.map(item => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.to === '/kitchen'}
                        className={({ isActive }) => `bottom-tab-link ${isActive ? 'active' : ''}`}
                    >
                        <span>{item.icon}</span>
                    </NavLink>
                ))}
            </nav>
        </div>
    )
}

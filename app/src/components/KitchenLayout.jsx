import { NavLink } from 'react-router-dom'

const kitchenTabs = [
    { to: '/kitchen', icon: 'fa-solid fa-table-cells-large', label: 'Brief' },
    { to: '/kitchen/recipes', icon: 'fa-solid fa-utensils', label: 'Recipes' },
    { to: '/kitchen/chat', icon: 'fa-solid fa-brain', label: 'Assistant' },
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
                        <i className={`tab-icon ${item.icon}`} />
                        <span className="tab-label">{item.label}</span>
                    </NavLink>
                ))}
            </nav>
        </div>
    )
}

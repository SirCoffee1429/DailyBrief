import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import AssistantWidget from './AssistantWidget.jsx'

export default function KitchenLayout({ children }) {
    const [assistantOpen, setAssistantOpen] = useState(false)

    return (
        <div className="app-shell">
            <main className="main-content">
                {children}
            </main>

            {/* Assistant widget — FAB hidden on mobile via CSS; chat panel still works */}
            <AssistantWidget
                externalOpen={assistantOpen}
                onExternalClose={() => setAssistantOpen(false)}
            />

            <nav className="bottom-tab-bar">
                <NavLink
                    to="/kitchen"
                    end
                    className={({ isActive }) => `bottom-tab-link ${isActive ? 'active' : ''}`}
                >
                    <i className="tab-icon fa-solid fa-table-cells-large" />
                    <span className="tab-label">Brief</span>
                </NavLink>

                <NavLink
                    to="/kitchen/sales"
                    className={({ isActive }) => `bottom-tab-link ${isActive ? 'active' : ''}`}
                >
                    <i className="tab-icon fa-solid fa-chart-line" />
                    <span className="tab-label">Sales</span>
                </NavLink>

                {/* Center assistant button — raised orange FAB on mobile */}
                <button
                    className={`bottom-tab-link bottom-tab-center ${assistantOpen ? 'active' : ''}`}
                    onClick={() => setAssistantOpen(prev => !prev)}
                    aria-label="Toggle Assistant"
                >
                    <i className="tab-icon fa-solid fa-brain" />
                    <span className="tab-label">Assistant</span>
                </button>

                <NavLink
                    to="/kitchen/recipes"
                    className={({ isActive }) => `bottom-tab-link ${isActive ? 'active' : ''}`}
                >
                    <i className="tab-icon fa-solid fa-utensils" />
                    <span className="tab-label">Recipes</span>
                </NavLink>

                <NavLink
                    to="/kitchen/chat"
                    className={({ isActive }) => `bottom-tab-link ${isActive ? 'active' : ''}`}
                >
                    <i className="tab-icon fa-solid fa-list-check" />
                    <span className="tab-label">Tasks</span>
                </NavLink>
            </nav>
        </div>
    )
}

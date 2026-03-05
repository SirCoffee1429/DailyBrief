export default function Layout({ children }) {
    return (
        <div className="app-shell">
            <div style={{ padding: 'var(--space-4) var(--space-8)' }}>
                <span className="top-bar-logo-text">DailyBrief</span>
            </div>
            <main className="main-content">
                {children}
            </main>
        </div>
    )
}

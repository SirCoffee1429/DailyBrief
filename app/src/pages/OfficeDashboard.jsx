import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

export default function OfficeDashboard() {
    const [stats, setStats] = useState({ workbooks: 0, briefings: 0, tasks: 0 })

    useEffect(() => {
        async function load() {
            const [wbRes, brRes, taskRes] = await Promise.all([
                supabase.from('workbooks').select('id', { count: 'exact', head: true }),
                supabase.from('briefings').select('id', { count: 'exact', head: true }),
                supabase.from('briefing_tasks').select('id', { count: 'exact', head: true }),
            ])
            setStats({
                workbooks: wbRes.count || 0,
                briefings: brRes.count || 0,
                tasks: taskRes.count || 0,
            })
        }
        load()
    }, [])

    function handleLogout() {
        sessionStorage.removeItem('officeUnlocked')
        window.location.href = '/'
    }

    return (
        <div className="office-dashboard">
            <header className="dashboard-header">
                <div className="header-left">
                    <h1 className="header-title"><i className="fa-solid fa-building title-icon" /> Office Dashboard</h1>
                    <p className="header-date">Manage briefings, recipes, and track daily progress</p>
                </div>
                <div className="header-actions">
                    <button className="btn btn-secondary btn-sm" onClick={handleLogout}><i className="fa-solid fa-lock" /> Lock</button>
                </div>
            </header>

            <div className="office-grid">
                <Link to="/office/briefings" className="office-tile">
                    <div className="office-tile-icon"><i className="fa-solid fa-clipboard-list" /></div>
                    <div className="office-tile-info">
                        <span className="office-tile-value">{stats.briefings}</span>
                        <span className="office-tile-label">Briefings</span>
                    </div>
                    <div className="office-tile-desc">Create & edit daily briefings and tasks</div>
                </Link>

                <Link to="/office/workbooks" className="office-tile">
                    <div className="office-tile-icon"><i className="fa-solid fa-folder-open" /></div>
                    <div className="office-tile-info">
                        <span className="office-tile-value">{stats.workbooks}</span>
                        <span className="office-tile-label">Workbooks</span>
                    </div>
                    <div className="office-tile-desc">Upload & manage recipe workbooks</div>
                </Link>

                <Link to="/office/history" className="office-tile">
                    <div className="office-tile-icon"><i className="fa-solid fa-chart-bar" /></div>
                    <div className="office-tile-info">
                        <span className="office-tile-value">{stats.tasks}</span>
                        <span className="office-tile-label">Task History</span>
                    </div>
                    <div className="office-tile-desc">Daily task completion & briefing log</div>
                </Link>

                <Link to="/office/chat" className="office-tile">
                    <div className="office-tile-icon"><i className="fa-solid fa-brain" /></div>
                    <div className="office-tile-info">
                        <span className="office-tile-value">Ask</span>
                        <span className="office-tile-label">Assistant</span>
                    </div>
                    <div className="office-tile-desc">Knowledge base & recipe questions</div>
                </Link>
            </div>
        </div>
    )
}

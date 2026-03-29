import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import WeatherWidget from '../components/WeatherWidget.jsx'
import SalesBriefing from '../components/SalesBriefing.jsx'

export default function OfficeDashboard() {
    const [stats, setStats] = useState({ workbooks: 0, briefings: 0, tasks: 0, notes: 0, events: 0 })

    useEffect(() => {
        async function load() {
            const [wbRes, brRes, taskRes, boardNoteRes, beoRes] = await Promise.all([
                supabase.from('workbooks').select('id', { count: 'exact', head: true }),
                supabase.from('briefings').select('id', { count: 'exact', head: true }),
                supabase.from('briefing_tasks').select('id', { count: 'exact', head: true }),
                supabase.from('management_notes').select('id', { count: 'exact', head: true }).eq('category', 'comms'),
                supabase.from('banquet_event_orders').select('id', { count: 'exact', head: true }),
            ])
            setStats({
                workbooks: wbRes.count || 0,
                briefings: brRes.count || 0,
                tasks: taskRes.count || 0,
                notes: boardNoteRes.count || 0,
                events: beoRes.count || 0,
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
                <div className="office-weather-row">
                    <WeatherWidget />
                </div>

                <Link to="/office/events" className="office-tile" style={{ borderColor: 'rgba(96, 165, 250, 0.2)' }}>
                    <div className="office-tile-icon"><i className="fa-solid fa-champagne-glasses" style={{ color: '#60a5fa' }} /></div>
                    <div className="office-tile-info">
                        <span className="office-tile-value">{stats.events}</span>
                        <span className="office-tile-label">Events & Catering</span>
                    </div>
                    <div className="office-tile-desc">Manage special events and banquets</div>
                </Link>

                <Link to="/office/board" className="office-tile">
                    <div className="office-tile-icon"><i className="fa-solid fa-chalkboard" /></div>
                    <div className="office-tile-info">
                        <span className="office-tile-value">{stats.notes}</span>
                        <span className="office-tile-label">Board</span>
                    </div>
                    <div className="office-tile-desc">Management whiteboard & internal updates</div>
                </Link>

                <Link to="/office/briefings" className="office-tile">
                    <div className="office-tile-icon"><i className="fa-solid fa-clipboard-list" /></div>
                    <div className="office-tile-info">
                        <span className="office-tile-value">{stats.briefings}</span>
                        <span className="office-tile-label">Briefings</span>
                    </div>
                    <div className="office-tile-desc">Create & edit daily briefings and tasks</div>
                </Link>

                <Link to="/office/workbooks" className="office-tile">
                    <div className="office-tile-icon"><i className="fa-solid fa-book-open" /></div>
                    <div className="office-tile-info">
                        <span className="office-tile-value">{stats.workbooks}</span>
                        <span className="office-tile-label">Recipes</span>
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

                <div className="office-weather-row">
                    <SalesBriefing />
                </div>
            </div>
        </div>
    )
}

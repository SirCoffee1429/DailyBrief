import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import WeatherWidget from '../components/WeatherWidget.jsx'
import SalesBriefing from '../components/SalesBriefing.jsx'
import WeeklyFeatures from '../components/WeeklyFeatures.jsx'

const DEPT_META = {
    kitchen: { label: 'Kitchen', icon: 'fa-fire-burner', accent: '#f97316' },
    foh: { label: 'Front of House', icon: 'fa-bell-concierge', accent: '#10b981' },
}

export default function OfficeDashboard() {
    const { dept } = useParams()
    const base = `/office/${dept}`
    const meta = DEPT_META[dept] || DEPT_META.kitchen

    const [stats, setStats] = useState({ workbooks: 0, briefings: 0, tasks: 0, notes: 0, events: 0 })

    useEffect(() => {
        async function load() {
            const [wbRes, brRes, boardNoteRes, beoRes] = await Promise.all([
                supabase.from('workbooks').select('id', { count: 'exact', head: true }),
                supabase.from('briefings').select('id', { count: 'exact', head: true }).eq('department', dept),
                supabase.from('management_notes').select('id', { count: 'exact', head: true }).eq('category', 'comms'),
                supabase.from('banquet_event_orders').select('id', { count: 'exact', head: true }),
            ])

            // Count tasks only for briefings in this department
            const { data: deptBriefings } = await supabase
                .from('briefings')
                .select('id')
                .eq('department', dept)
            const briefingIds = (deptBriefings || []).map(b => b.id)

            let taskCount = 0
            if (briefingIds.length > 0) {
                const { count } = await supabase
                    .from('briefing_tasks')
                    .select('id', { count: 'exact', head: true })
                    .in('briefing_id', briefingIds)
                taskCount = count || 0
            }

            setStats({
                workbooks: wbRes.count || 0,
                briefings: brRes.count || 0,
                tasks: taskCount,
                notes: boardNoteRes.count || 0,
                events: beoRes.count || 0,
            })
        }
        load()
    }, [dept])

    function handleLogout() {
        sessionStorage.removeItem('officeUnlocked')
        window.location.href = '/'
    }

    return (
        <div className="office-dashboard">
            <header className="dashboard-header">
                <div className="header-left">
                    <h1 className="header-title">
                        <i className={`fa-solid ${meta.icon} title-icon`} style={{ color: meta.accent }} /> {meta.label} — Office
                    </h1>
                    <p className="header-date">Manage briefings, recipes, and track daily progress</p>
                </div>
                <div className="header-actions">
                    <Link to="/office" className="btn btn-secondary btn-sm"><i className="fa-solid fa-arrow-left" /> Departments</Link>
                    <button className="btn btn-secondary btn-sm" onClick={handleLogout}><i className="fa-solid fa-lock" /> Lock</button>
                </div>
            </header>

            <div className="office-grid">
                <div className="office-weather-row">
                    <WeatherWidget />
                </div>

                <div className="office-weather-row">
                    <WeeklyFeatures />
                </div>

                <Link to={`${base}/events`} className="office-tile" style={{ borderColor: 'rgba(96, 165, 250, 0.2)' }}>
                    <div className="office-tile-icon"><i className="fa-solid fa-champagne-glasses" style={{ color: '#60a5fa' }} /></div>
                    <div className="office-tile-info">
                        <span className="office-tile-value">{stats.events}</span>
                        <span className="office-tile-label">Events & Catering</span>
                    </div>
                    <div className="office-tile-desc">Manage special events and banquets</div>
                </Link>

                <Link to={`${base}/board`} className="office-tile">
                    <div className="office-tile-icon"><i className="fa-solid fa-chalkboard" /></div>
                    <div className="office-tile-info">
                        <span className="office-tile-value">{stats.notes}</span>
                        <span className="office-tile-label">Board</span>
                    </div>
                    <div className="office-tile-desc">Management whiteboard & internal updates</div>
                </Link>

                <Link to={`${base}/briefings`} className="office-tile" style={{ borderColor: `${meta.accent}33` }}>
                    <div className="office-tile-icon"><i className="fa-solid fa-clipboard-list" style={{ color: meta.accent }} /></div>
                    <div className="office-tile-info">
                        <span className="office-tile-value">{stats.briefings}</span>
                        <span className="office-tile-label">{meta.label} Briefings</span>
                    </div>
                    <div className="office-tile-desc">Create & edit daily briefings and tasks</div>
                </Link>

                <Link to={`${base}/workbooks`} className="office-tile">
                    <div className="office-tile-icon"><i className="fa-solid fa-book-open" /></div>
                    <div className="office-tile-info">
                        <span className="office-tile-value">{stats.workbooks}</span>
                        <span className="office-tile-label">Recipes</span>
                    </div>
                    <div className="office-tile-desc">Upload & manage recipe workbooks</div>
                </Link>

                <Link to={`${base}/history`} className="office-tile" style={{ borderColor: `${meta.accent}33` }}>
                    <div className="office-tile-icon"><i className="fa-solid fa-chart-bar" style={{ color: meta.accent }} /></div>
                    <div className="office-tile-info">
                        <span className="office-tile-value">{stats.tasks}</span>
                        <span className="office-tile-label">{meta.label} Task History</span>
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

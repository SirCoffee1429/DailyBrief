import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import WeatherWidget from '../components/WeatherWidget.jsx'
import SalesBriefing from '../components/SalesBriefing.jsx'
import WeeklyFeatures from '../components/WeeklyFeatures.jsx'
import ManagementWhiteboard from '../components/ManagementWhiteboard.jsx'

export default function OfficeDashboard() {
    const [stats, setStats] = useState({ workbooks: 0, briefings: 0, tasks: 0, events: 0 })

    useEffect(() => {
        // Fetch counts for each dashboard tile
        async function load() {
            const [wbRes, brRes, taskRes, beoRes] = await Promise.all([
                supabase.from('workbooks').select('id', { count: 'exact', head: true }),
                supabase.from('briefings').select('id', { count: 'exact', head: true }),
                supabase.from('briefing_tasks').select('id', { count: 'exact', head: true }),
                supabase.from('banquet_event_orders').select('id', { count: 'exact', head: true }),
            ])
            setStats({
                workbooks: wbRes.count || 0,
                briefings: brRes.count || 0,
                tasks: taskRes.count || 0,
                events: beoRes.count || 0,
            })
        }
        load()
    }, [])

    // Lock the office and return to landing page
    function handleLogout() {
        sessionStorage.removeItem('officeUnlocked')
        window.location.href = '/'
    }

    return (
        <div className="office-v2-content">
            
            {/* Top Stats Widgets */}
            <section className="office-v2-stats-grid">
                
                {/* Weather Widget — compact 3-day inline card */}
                <div className="office-v2-widget">
                    <WeatherWidget compact={true} />
                </div>

                <Link to="/office/events" className="office-v2-widget office-v2-stat-card" style={{ textDecoration: 'none' }}>
                    <div>
                        <div className="office-v2-stat-value">{stats.events}</div>
                        <div className="office-v2-stat-label">Events & Catering</div>
                    </div>
                    <i className="fa-solid fa-bread-slice office-v2-stat-icon"></i>
                </Link>

                <Link to="/office/briefings" className="office-v2-widget office-v2-stat-card" style={{ textDecoration: 'none' }}>
                    <div>
                        <div className="office-v2-stat-value">{stats.briefings}</div>
                        <div className="office-v2-stat-label">Briefings</div>
                    </div>
                    <i className="fa-regular fa-clipboard office-v2-stat-icon"></i>
                </Link>

                <Link to="/office/workbooks" className="office-v2-widget office-v2-stat-card" style={{ textDecoration: 'none' }}>
                    <div>
                        <div className="office-v2-stat-value">{stats.workbooks}</div>
                        <div className="office-v2-stat-label">Recipes</div>
                    </div>
                    <i className="fa-solid fa-book-open office-v2-stat-icon"></i>
                </Link>

                <Link to="/office/history" className="office-v2-widget office-v2-stat-card" style={{ textDecoration: 'none' }}>
                    <div>
                        <div className="office-v2-stat-value">{stats.tasks}</div>
                        <div className="office-v2-stat-label">Task History</div>
                    </div>
                    <i className="fa-regular fa-calendar-check office-v2-stat-icon"></i>
                </Link>
            </section>

            {/* Calendar Section (WeeklyFeatures natively renders the V2 block now) */}
            <WeeklyFeatures />

            {/* Bottom Grid Layout */}
            <div className="office-v2-bottom-grid">
                
                {/* Chat/Communication — full whiteboard with posting capability */}
                <section className="office-v2-widget office-v2-chat-section" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
                    <div className="office-v2-panel-header">
                        <h2 className="office-v2-panel-title">Department Communication</h2>
                        <Link to="/office/chat" style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', textDecoration: 'none', fontSize: '0.75rem' }}>
                            <i className="fa-solid fa-expand" style={{ marginRight: '0.35rem' }} />Full View
                        </Link>
                    </div>
                    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                        <ManagementWhiteboard hideHeader={true} />
                    </div>
                </section>

                {/* Right Column (Sales Mock) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    
                    {/* Sales Reports Chart Mock */}
                    <section className="office-v2-widget" style={{ padding: '1rem' }}>
                        <h2 className="office-v2-panel-title" style={{ marginBottom: '1rem' }}>Sales Reports</h2>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '0.5rem' }}>Previous Night's Sales</div>
                                <div style={{ position: 'relative', height: '6rem', width: '100%', borderBottom: '1px solid #555', borderLeft: '1px solid #555' }}>
                                    <div style={{ position: 'absolute', left: '-2.5rem', top: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontSize: '10px', color: '#6b7280', textAlign: 'right', width: '2rem' }}>
                                        <span>$500</span><span>$400</span><span>$100</span><span>$0</span>
                                    </div>
                                    <div style={{ position: 'absolute', bottom: '-1.25rem', left: 0, right: 0, display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#6b7280', padding: '0 0.25rem' }}>
                                        <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
                                    </div>
                                    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} preserveAspectRatio="none" viewBox="0 0 100 100">
                                        <polyline fill="none" stroke="#e66b35" strokeWidth="2" points="0,80 20,60 40,75 60,65 80,40 100,55" />
                                        <polygon fill="url(#orange-grad)" opacity="0.2" points="0,100 0,80 20,60 40,75 60,65 80,40 100,55 100,100" />
                                        <defs>
                                            <linearGradient id="orange-grad" x1="0" x2="0" y1="0" y2="1">
                                                <stop offset="0%" stopColor="#e66b35" />
                                                <stop offset="100%" stopColor="#1e1e1e" stopOpacity="0" />
                                            </linearGradient>
                                        </defs>
                                    </svg>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: '80px' }}>
                                <div style={{ borderLeft: '2px solid #e66b35', paddingLeft: '0.5rem' }}>
                                    <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Total</div>
                                    <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#fff' }}>$75.0K</div>
                                </div>
                                <div style={{ borderLeft: '2px solid #e66b35', paddingLeft: '0.5rem' }}>
                                    <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Nights Sales</div>
                                    <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#fff' }}>$9.68K</div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Recent Activity Mock */}
                    <section className="office-v2-widget" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                        <h2 className="office-v2-panel-title" style={{ marginBottom: '1rem' }}>Recent Activity</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <i className="fa-solid fa-bread-slice" style={{ color: '#e66b35', width: '1.25rem', textAlign: 'center' }}></i>
                                <div style={{ flex: 1, fontSize: '0.875rem', color: '#d1d5db', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>New Recipe Added: Spicy Thai Herb Sauce</div>
                                <div style={{ fontSize: '0.75rem', color: '#6b7280', flexShrink: 0 }}>1:33 AM</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <i className="fa-solid fa-check" style={{ color: '#22c55e', width: '1.25rem', textAlign: 'center' }}></i>
                                <div style={{ flex: 1, fontSize: '0.875rem', color: '#d1d5db', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Task Completed: Inventory Check</div>
                                <div style={{ fontSize: '0.75rem', color: '#6b7280', flexShrink: 0 }}>2:38 AM</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <i className="fa-regular fa-clipboard" style={{ color: '#e66b35', width: '1.25rem', textAlign: 'center' }}></i>
                                <div style={{ flex: 1, fontSize: '0.875rem', color: '#d1d5db', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Briefing Updated: Lunch Service Protocol</div>
                                <div style={{ fontSize: '0.75rem', color: '#6b7280', flexShrink: 0 }}>1:57 AM</div>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    )
}

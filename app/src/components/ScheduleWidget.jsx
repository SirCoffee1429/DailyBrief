import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

export default function ScheduleWidget() {
    const [todaysShifts, setTodaysShifts] = useState([])
    const [loading, setLoading] = useState(true)
    const [hasActiveSchedule, setHasActiveSchedule] = useState(false)

    useEffect(() => {
        async function fetchTodaysSchedule() {
            try {
                const todayStr = new Date().toISOString().split('T')[0]
                
                // Fetch the closest schedule that has shifts encompassing today or is the latest uploaded
                const { data, error } = await supabase
                    .from('schedules')
                    .select('*')
                    .order('week_start', { ascending: false })
                    .limit(5) // Inspect the most recent uploaded schedules

                if (error) throw error

                if (!data || data.length === 0) {
                    setHasActiveSchedule(false)
                    setTodaysShifts([])
                    return
                }

                setHasActiveSchedule(true)

                // Search through the schedules to find if any have shifts matching today's calendar date
                let foundShifts = []
                for (const sched of data) {
                    if (sched.schedule_data && Array.isArray(sched.schedule_data.shifts)) {
                        const matches = sched.schedule_data.shifts.filter(s => s.date === todayStr)
                        if (matches.length > 0) {
                            foundShifts = matches
                            break // Found the active schedule encompassing today
                        }
                    }
                }

                // Fallback: If no shifts exactly match today, grab shifts from the most recent schedule that are matching the current day of the week
                if (foundShifts.length === 0 && data[0]?.schedule_data?.shifts) {
                    const latestSched = data[0]
                    const latestWeekStart = new Date(latestSched.week_start + 'T00:00:00')
                    const todayDate = new Date()
                    
                    // Compute offset days since Monday
                    const dayVal = todayDate.getDay() // Sunday = 0, Monday = 1, ...
                    const todayDayOffset = dayVal === 0 ? 6 : dayVal - 1 // Monday = 0, Tuesday = 1, ..., Sunday = 6
                    
                    const calculatedTargetDate = new Date(latestWeekStart)
                    calculatedTargetDate.setDate(latestWeekStart.getDate() + todayDayOffset)
                    const targetDateStr = calculatedTargetDate.toISOString().split('T')[0]

                    foundShifts = latestSched.schedule_data.shifts.filter(s => s.date === targetDateStr)
                }

                // Sort shifts alphabetically by employee name
                const sorted = foundShifts.sort((a, b) => (a.employee_name || '').localeCompare(b.employee_name || ''))
                setTodaysShifts(sorted)

            } catch (err) {
                console.error('Error fetching today\'s shifts for widget:', err)
            } finally {
                setLoading(false)
            }
        }

        fetchTodaysSchedule()

        // Real-time subscription to schedule changes to automatically refresh the roster on the dashboard
        const channel = supabase
            .channel('realtime_schedule_widget_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'schedules' }, () => {
                fetchTodaysSchedule()
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    if (loading) {
        return (
            <div className="dash-card schedule-card" style={{ justifyContent: 'center', alignItems: 'center' }}>
                <i className="fa-solid fa-spinner fa-spin" style={{ color: '#f97316', fontSize: '1.2rem', marginBottom: '8px' }} />
                <span style={{ fontSize: '0.85rem', color: '#71717a' }}>Loading shift roster...</span>
            </div>
        )
    }

    return (
        <Link to="/kitchen/schedule" className="dash-card schedule-card">
            <div className="schedule-card-header">
                <h2 className="schedule-card-title">
                    <i className="fa-solid fa-user-clock" style={{ color: '#f97316', marginRight: '6px' }} />
                    Who's Working Today
                </h2>
                
                {todaysShifts.length > 0 ? (
                    <span className="schedule-card-indicator">
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f97316', display: 'inline-block' }} />
                        {todaysShifts.length} Scheduled
                    </span>
                ) : (
                    <div className="arrow-top-right"><i className="fa-solid fa-arrow-up-right-from-square" /></div>
                )}
            </div>

            {!hasActiveSchedule ? (
                <div className="schedule-card-empty">
                    <i className="fa-regular fa-calendar-plus" style={{ fontSize: '1.2rem', opacity: 0.5 }} />
                    <span>No weekly schedule uploaded yet</span>
                </div>
            ) : todaysShifts.length === 0 ? (
                <div className="schedule-card-empty">
                    <i className="fa-regular fa-clock" style={{ fontSize: '1.2rem', opacity: 0.5 }} />
                    <span>No crew members scheduled for today</span>
                </div>
            ) : (
                <ul className="schedule-card-list custom-scrollbar" style={{ overflowX: 'auto', paddingBottom: '4px' }}>
                    {todaysShifts.map((sh, idx) => (
                        <li key={idx} className="schedule-card-chip">
                            <span style={{ fontWeight: 700, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{sh.employee_name}</span>
                            <span className="schedule-card-chip-time">
                                {sh.start_time} - {sh.end_time}
                            </span>
                            {sh.role && (
                                <span style={{ fontSize: '10px', color: '#71717a', textTransform: 'uppercase', fontWeight: 600 }}>{sh.role}</span>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </Link>
    )
}

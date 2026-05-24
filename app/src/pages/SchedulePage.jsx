import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

const PARSING_MESSAGES = [
    "Decoding management's chicken scratch...",
    "Squinting at the spreadsheet. Give us a second...",
    "Translating manager hieroglyphics into actual BOH shifts...",
    "Checking if the chef actually scheduled anyone for Friday night...",
    "Calculating how many line cooks are going to call in sick this weekend...",
    "Retrieving the weekly grid from the deep vaults...",
    "Converting coffee stains and hand-drawn grids into digital text...",
    "Making sure nobody has to work a clopen... wait, too late."
]
const HIGHLIGHT_COLORS = {
    green: {
        id: 'green',
        name: 'Dish (Green)',
        bg: 'rgba(34, 197, 94, 0.12)',
        border: 'rgba(34, 197, 94, 0.4)',
        solid: '#22c55e',
        glow: 'rgba(34, 197, 94, 0.06)'
    },
    blue: {
        id: 'blue',
        name: 'Pool (Blue)',
        bg: 'rgba(59, 130, 246, 0.12)',
        border: 'rgba(59, 130, 246, 0.4)',
        solid: '#3b82f6',
        glow: 'rgba(59, 130, 246, 0.06)'
    },
    pink: {
        id: 'pink',
        name: 'Banquet (Pink)',
        bg: 'rgba(236, 72, 153, 0.12)',
        border: 'rgba(236, 72, 153, 0.4)',
        solid: '#ec4899',
        glow: 'rgba(236, 72, 153, 0.06)'
    },
    yellow: {
        id: 'yellow',
        name: 'AM (Yellow)',
        bg: 'rgba(234, 179, 8, 0.15)',
        border: 'rgba(234, 179, 8, 0.4)',
        solid: '#eab308',
        glow: 'rgba(234, 179, 8, 0.08)'
    }
}

const getShiftColor = (shift, employeeRowColor = null, employeeRole = '') => {
    if (shift && shift.color) {
        return shift.color
    }
    if (employeeRowColor) {
        return employeeRowColor
    }
    if (shift) {
        const noteLower = (shift.note || '').toLowerCase()
        const roleLower = (shift.role || employeeRole || '').toLowerCase()
        const startLower = (shift.start_time || '').toLowerCase()

        if (roleLower.includes('dish') || roleLower.includes('wash') || noteLower.includes('dish')) {
            return 'green'
        }
        if (roleLower.includes('pool') || roleLower.includes('cabana') || roleLower.includes('pavilion') || noteLower.includes('pool')) {
            return 'blue'
        }
        if (roleLower.includes('banquet') || roleLower.includes('beo') || roleLower.includes('event') || noteLower.includes('banquet') || noteLower.includes('beo')) {
            return 'pink'
        }
        if (noteLower.includes('am') || startLower.includes('am')) {
            const match = shift.start_time.match(/(\d+):(\d+)\s*(AM|PM)/i)
            if (match) {
                const hour = parseInt(match[1])
                const period = match[3].toUpperCase()
                if (period === 'AM' && hour >= 5 && (hour < 11 || (hour === 11 && parseInt(match[2]) <= 30))) {
                    return 'yellow'
                }
            } else {
                return 'yellow'
            }
        }
    }
    return null
}

export default function SchedulePage({ officeMode = false }) {

    const [schedulesList, setSchedulesList] = useState([])
    const [activeWeekStart, setActiveWeekStart] = useState('')
    const [activeSchedule, setActiveSchedule] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    // Upload & Parsing states
    const [uploading, setUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState('')
    const [pendingData, setPendingData] = useState(null)
    const [pendingFileUrl, setPendingFileUrl] = useState('')
    const [pendingFileName, setPendingFileName] = useState('')
    const [modalWeekStart, setModalWeekStart] = useState('')
    const [modalAnnouncements, setModalAnnouncements] = useState('')
    const [uploadMode, setUploadMode] = useState('new') // 'new' or 'merge'

    // UI States
    const [isViewingOriginal, setIsViewingOriginal] = useState(false)
    const [lightboxFileIndex, setLightboxFileIndex] = useState(0)
    const [selectedMobileDay, setSelectedMobileDay] = useState(0) // Monday = 0
    const [activeColorMenu, setActiveColorMenu] = useState(null) // { employeeName } or null

    // Lightbox variables
    const urls = (isViewingOriginal && activeSchedule && activeSchedule.file_url) ? activeSchedule.file_url.split(',') : []
    const names = (isViewingOriginal && activeSchedule && activeSchedule.file_name) ? activeSchedule.file_name.split(',') : []
    const activeUrl = urls[lightboxFileIndex] || ''
    const activeName = names[lightboxFileIndex] || 'Original Schedule'


    // Load list of all schedule weeks
    const loadScheduleWeeks = useCallback(async (selectWeekStart = null) => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('schedules')
                .select('id, week_start, file_name, file_url, created_at')
                .order('week_start', { ascending: false })

            if (error) throw error

            setSchedulesList(data || [])

            if (data && data.length > 0) {
                // If a specific week start was requested, use it; otherwise use the latest uploaded week
                let targetWeek = data[0].week_start
                if (selectWeekStart && data.some(s => s.week_start === selectWeekStart)) {
                    targetWeek = selectWeekStart
                } else {
                    // Try to find the schedule closest to the current calendar week
                    const todayStr = new Date().toISOString().split('T')[0]
                    // First look for any active schedule that is currently running (starts <= today and ends >= today, i.e. within 7 days)
                    const activeWeek = data.find(s => {
                        const sDate = new Date(s.week_start + 'T00:00:00')
                        const diffTime = new Date(todayStr + 'T00:00:00').getTime() - sDate.getTime()
                        const diffDays = diffTime / (1000 * 60 * 60 * 24)
                        return diffDays >= 0 && diffDays < 7
                    })
                    if (activeWeek) {
                        targetWeek = activeWeek.week_start
                    } else {
                        // Fallback: closest past week, or if none, the future week closest to today
                        const closestPast = data.find(s => s.week_start <= todayStr)
                        if (closestPast) {
                            targetWeek = closestPast.week_start
                        } else {
                            // Find the earliest future week
                            const futureWeeks = data.filter(s => s.week_start > todayStr).sort((a,b) => a.week_start.localeCompare(b.week_start))
                            if (futureWeeks.length > 0) {
                                targetWeek = futureWeeks[0].week_start
                            }
                        }
                    }
                }
                setActiveWeekStart(targetWeek)
            } else {
                setActiveWeekStart('')
                setActiveSchedule(null)
            }
        } catch (err) {
            console.error('Error loading schedules list:', err)
            setError('Failed to load schedule history.')
        } finally {
            setLoading(false)
        }
    }, [])

    // Load full details for the active week start
    useEffect(() => {
        if (!activeWeekStart) {
            setActiveSchedule(null)
            return
        }

        async function loadActiveDetails() {
            try {
                const { data, error } = await supabase
                    .from('schedules')
                    .select('*')
                    .eq('week_start', activeWeekStart)
                    .maybeSingle()

                if (error) throw error
                setActiveSchedule(data)
            } catch (err) {
                console.error('Error loading schedule details:', err)
            }
        }

        loadActiveDetails()
    }, [activeWeekStart])

    // Initialize schedule list
    useEffect(() => {
        loadScheduleWeeks()

        // Real-time subscription to schedules table
        const channel = supabase
            .channel('realtime_schedules_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'schedules' }, (payload) => {
                console.log('Realtime schedule update received:', payload)
                if (payload.eventType === 'INSERT') {
                    loadScheduleWeeks(payload.new.week_start)
                } else if (payload.eventType === 'DELETE') {
                    loadScheduleWeeks()
                } else {
                    // Update active schedule in place if currently viewing it
                    if (activeWeekStart && payload.new && payload.new.week_start === activeWeekStart) {
                        setActiveSchedule(payload.new)
                    }
                    loadScheduleWeeks(activeWeekStart)
                }
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [loadScheduleWeeks, activeWeekStart])

    // Generate Monday to Sunday dates for the active week
    const getWeekDays = useCallback(() => {
        if (!activeWeekStart) return []
        const baseDate = new Date(activeWeekStart + 'T00:00:00')
        const days = []
        for (let i = 0; i < 7; i++) {
            const nextDate = new Date(baseDate)
            nextDate.setDate(baseDate.getDate() + i)
            days.push({
                dateStr: nextDate.toISOString().split('T')[0],
                label: nextDate.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' }),
                dayName: nextDate.toLocaleDateString('en-US', { weekday: 'long' }),
                dayIndex: i,
            })
        }
        return days
    }, [activeWeekStart])

    // Get shifts grouped by employee name
    const getEmployeeRows = useCallback(() => {
        if (!activeSchedule || !activeSchedule.schedule_data || !activeSchedule.schedule_data.shifts) return []
        const shifts = activeSchedule.schedule_data.shifts
        const employeeMap = {}

        shifts.forEach(shift => {
            const empName = shift.employee_name || 'Unknown Staff'
            if (!employeeMap[empName]) {
                employeeMap[empName] = { name: empName, role: shift.role || 'Crew', shiftsByDate: {}, color: null }
            }
            
            // Prioritize explicit color in shift
            if (shift.color) {
                employeeMap[empName].color = shift.color
            }

            employeeMap[empName].shiftsByDate[shift.date] = shift
        })

        // After grouping, if an employee has NO explicit color set, try to infer it
        Object.values(employeeMap).forEach(emp => {
            if (!emp.color) {
                const roleLower = (emp.role || '').toLowerCase()
                
                // 1. Green = Dish
                if (roleLower.includes('dish') || roleLower.includes('wash')) {
                    emp.color = 'green'
                }
                // 2. Blue = Pool
                else if (roleLower.includes('pool') || roleLower.includes('cabana') || roleLower.includes('pavilion')) {
                    emp.color = 'blue'
                }
                // 3. Pink = Banquet
                else if (roleLower.includes('banquet') || roleLower.includes('beo') || roleLower.includes('event')) {
                    emp.color = 'pink'
                }
                // 4. Yellow = AM / Morning
                else {
                    // Check if any shift note or role has "am" or starts in morning
                    let isAm = false
                    Object.values(emp.shiftsByDate).forEach(sh => {
                        const noteLower = (sh.note || '').toLowerCase()
                        const startLower = (sh.start_time || '').toLowerCase()
                        
                        if (noteLower.includes('am') || startLower.includes('am')) {
                            // Verify it's actually morning, e.g. starts between 5 AM and 11:30 AM
                            const match = sh.start_time.match(/(\d+):(\d+)\s*(AM|PM)/i)
                            if (match) {
                                const hour = parseInt(match[1])
                                const period = match[3].toUpperCase()
                                if (period === 'AM' && hour >= 5 && (hour < 11 || (hour === 11 && parseInt(match[2]) <= 30))) {
                                    isAm = true
                                }
                            } else {
                                isAm = true
                            }
                        }
                    })
                    if (isAm) {
                        emp.color = 'yellow'
                    }
                }
            }
        })

        return Object.values(employeeMap).sort((a, b) => a.name.localeCompare(b.name))
    }, [activeSchedule])

    // Handle Upload & Parsing Sequence
    const handleFileUpload = async (e) => {
        const files = Array.from(e.target.files || [])
        if (files.length === 0) return

        try {
            setUploading(true)
            setError(null)
            setUploadProgress('Filing the roster under country club secrets...')

            // 1. Upload files in parallel to public.schedules storage bucket
            const uploadedFiles = []
            for (const file of files) {
                const fileExt = file.name.split('.').pop()
                const fileName = `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 5)}.${fileExt}`
                
                const { data: uploadData, error: uploadErr } = await supabase.storage
                    .from('schedules')
                    .upload(fileName, file)

                if (uploadErr) throw uploadErr

                const { data: { publicUrl } } = supabase.storage
                    .from('schedules')
                    .getPublicUrl(fileName)

                uploadedFiles.push({
                    url: publicUrl,
                    name: file.name,
                    fileObj: file
                })
            }

            // 2. Read all as Base64 in parallel to send to multimodal Gemini Edge Function
            setUploadProgress('Checking coffee stain levels...')
            const fileBase64s = await Promise.all(uploadedFiles.map(async (uFile) => {
                const base64 = await new Promise((resolve, reject) => {
                    const reader = new FileReader()
                    reader.onloadend = () => {
                        const raw = reader.result
                        const b64 = raw.split(',')[1]
                        resolve(b64)
                    }
                    reader.onerror = reject
                    reader.readAsDataURL(uFile.fileObj)
                })
                return {
                    fileBase64: base64,
                    mimeType: uFile.fileObj.type,
                    fileName: uFile.fileObj.name
                }
            }))

            // 3. Call process-schedule Edge Function with files array
            const randomMsg = PARSING_MESSAGES[Math.floor(Math.random() * PARSING_MESSAGES.length)]
            setUploadProgress(randomMsg)
            const { data: parsedData, error: parseErr } = await supabase.functions.invoke('process-schedule', {
                body: {
                    files: fileBase64s
                }
            })

            if (parseErr) throw parseErr
            if (!parsedData) throw new Error('No parsed data returned from Edge Function')

            // 4. Determine target week start date
            let targetWeekStart = ''
            if (uploadMode === 'merge') {
                if (pendingData) {
                    targetWeekStart = modalWeekStart || pendingData.week_start || ''
                } else if (activeSchedule) {
                    targetWeekStart = activeSchedule.week_start || ''
                }
            }
            if (!targetWeekStart) {
                targetWeekStart = parsedData.week_start || ''
            }

            // 5. Look up existing schedule context to merge with
            let existingShifts = []
            let existingAnnouncements = []
            let existingUrls = []
            let existingNames = []

            if (uploadMode === 'merge') {
                if (pendingData) {
                    existingShifts = pendingData.shifts || []
                    existingAnnouncements = Array.isArray(pendingData.announcements)
                        ? pendingData.announcements
                        : (pendingData.announcements ? pendingData.announcements.split('\n') : [])
                    existingUrls = pendingFileUrl ? pendingFileUrl.split(',') : []
                    existingNames = pendingFileName ? pendingFileName.split(',') : []
                } else if (activeSchedule) {
                    existingShifts = activeSchedule.schedule_data?.shifts || []
                    existingAnnouncements = activeSchedule.schedule_data?.announcements || []
                    existingUrls = activeSchedule.file_url ? activeSchedule.file_url.split(',') : []
                    existingNames = activeSchedule.file_name ? activeSchedule.file_name.split(',') : []
                }
            } else {
                // uploadMode === 'new': Query if there is an existing schedule for the parsed week_start date
                setUploadProgress('Scanning database for existing rosters on this date...')
                const { data: dupData } = await supabase
                    .from('schedules')
                    .select('*')
                    .eq('week_start', targetWeekStart)
                    .maybeSingle()

                if (dupData) {
                    existingShifts = dupData.schedule_data?.shifts || []
                    existingAnnouncements = dupData.schedule_data?.announcements || []
                    existingUrls = dupData.file_url ? dupData.file_url.split(',') : []
                    existingNames = dupData.file_name ? dupData.file_name.split(',') : []
                }
            }

            // 6. Combine file URLs and Names
            const allUrls = [...existingUrls]
            const allNames = [...existingNames]
            
            uploadedFiles.forEach(f => {
                if (!allUrls.includes(f.url)) {
                    allUrls.push(f.url)
                    allNames.push(f.name)
                }
            })

            const finalUrls = allUrls.join(',')
            const finalNames = allNames.join(',')

            setPendingFileUrl(finalUrls)
            setPendingFileName(finalNames)

            // 7. Merge shifts (avoiding duplicates)
            const shiftKey = (sh) => `${(sh.employee_name || '').trim().toLowerCase()}|${sh.date}|${(sh.start_time || '').trim()}|${(sh.end_time || '').trim()}`
            const seenShifts = new Set(existingShifts.map(shiftKey))
            
            const mergedShifts = [...existingShifts]
            const newShifts = parsedData.shifts || []
            
            // Re-align new shifts if week starts differ
            let alignedNewShifts = newShifts
            if (targetWeekStart && parsedData.week_start && targetWeekStart !== parsedData.week_start) {
                const oldBaseDate = new Date(parsedData.week_start + 'T00:00:00')
                const newBaseDate = new Date(targetWeekStart + 'T00:00:00')
                const diffTime = newBaseDate.getTime() - oldBaseDate.getTime()
                const diffDays = isNaN(diffTime) ? 0 : Math.round(diffTime / (1000 * 60 * 60 * 24))
                
                alignedNewShifts = newShifts.map(shift => {
                    const shiftDateObj = new Date(shift.date + 'T00:00:00')
                    if (!isNaN(shiftDateObj.getTime())) {
                        const newShiftDate = new Date(shiftDateObj)
                        newShiftDate.setDate(shiftDateObj.getDate() + diffDays)
                        return {
                            ...shift,
                            date: newShiftDate.toISOString().split('T')[0]
                        }
                    }
                    return shift
                })
            }

            alignedNewShifts.forEach(sh => {
                const key = shiftKey(sh)
                if (!seenShifts.has(key)) {
                    mergedShifts.push(sh)
                    seenShifts.add(key)
                }
            })

            // 8. Merge announcements
            const mergedAnnouncements = [...existingAnnouncements]
            const newAnns = Array.isArray(parsedData.announcements) 
                ? parsedData.announcements 
                : (parsedData.announcements ? [parsedData.announcements] : [])
                
            newAnns.forEach(ann => {
                const clean = ann.trim()
                if (clean && !mergedAnnouncements.some(existing => existing.trim().toLowerCase() === clean.toLowerCase())) {
                    mergedAnnouncements.push(clean)
                }
            })

            // 9. Open preview dialog/modal with merged data
            const mergedData = {
                ...parsedData,
                week_start: targetWeekStart,
                shifts: mergedShifts,
                announcements: mergedAnnouncements
            }

            setPendingData(mergedData)
            setModalWeekStart(targetWeekStart)
            setModalAnnouncements(mergedAnnouncements.join('\n'))
            
            setUploading(false)
            setUploadProgress('')

        } catch (err) {
            console.error('Error uploading/parsing schedule:', err)
            setError(`Parsing Failed: ${err.message || 'Check your internet connection or file format.'}`)
            setUploading(false)
            setUploadProgress('')
        } finally {
            // Reset file input
            e.target.value = ''
        }
    }

    // Persist parsed data to schedules table
    const handleConfirmSave = async () => {
        if (!pendingData) return

        try {
            setUploading(true)
            setUploadProgress('Saving schedule to BOH system...')

            // Validate week start is selected
            if (!modalWeekStart) {
                alert('Please select a week start date.')
                setUploading(false)
                return
            }

            // Repackage shifts to match potentially edited week_start date
            const oldBaseDate = new Date(pendingData.week_start + 'T00:00:00')
            const newBaseDate = new Date(modalWeekStart + 'T00:00:00')
            const diffTime = newBaseDate.getTime() - oldBaseDate.getTime()
            const diffDays = isNaN(diffTime) ? 0 : Math.round(diffTime / (1000 * 60 * 60 * 24))

            const updatedShifts = (pendingData.shifts || []).map(shift => {
                const shiftDateObj = new Date(shift.date + 'T00:00:00')
                // Re-align days if week start changed
                if (!isNaN(shiftDateObj.getTime())) {
                    const newShiftDate = new Date(shiftDateObj)
                    newShiftDate.setDate(shiftDateObj.getDate() + diffDays)
                    shift.date = newShiftDate.toISOString().split('T')[0]
                }
                return shift
            })


            const finalizedSchedule = {
                week_start: modalWeekStart,
                file_name: pendingFileName,
                file_url: pendingFileUrl,
                schedule_data: {
                    shifts: updatedShifts,
                    announcements: modalAnnouncements.split('\n').filter(Boolean)
                }
            }

            // Insert or Upsert based on week_start date
            const { error: saveErr } = await supabase
                .from('schedules')
                .upsert(finalizedSchedule, { onConflict: 'week_start' })

            if (saveErr) throw saveErr

            // Clear preview state
            setPendingData(null)
            setPendingFileUrl('')
            setPendingFileName('')
            setUploading(false)
            setUploadProgress('')

            // Load and highlight the saved week
            loadScheduleWeeks(modalWeekStart)

        } catch (err) {
            console.error('Error saving confirmed schedule:', err)
            alert(`Failed to save: ${err.message}`)
            setUploading(false)
        }
    }

    // Delete schedule
    const handleDeleteSchedule = async (id, weekStartVal) => {
        if (!window.confirm(`Are you sure you want to delete the schedule for the week of ${weekStartVal}?`)) return

        try {
            const { error: delErr } = await supabase
                .from('schedules')
                .delete()
                .eq('id', id)

            if (delErr) throw delErr
            loadScheduleWeeks()
        } catch (err) {
            console.error('Error deleting schedule:', err)
            alert('Failed to delete schedule.')
        }
    }

    // Persist highlight color change to the database in real-time
    const handleSetEmployeeColor = async (employeeName, color) => {
        if (!activeSchedule || !activeSchedule.schedule_data || !activeSchedule.schedule_data.shifts) return

        try {
            // Update the color property on all shifts for this employee
            const updatedShifts = activeSchedule.schedule_data.shifts.map(shift => {
                if ((shift.employee_name || 'Unknown Staff') === employeeName) {
                    return { ...shift, color: color }
                }
                return shift
            })

            const finalizedSchedule = {
                ...activeSchedule,
                schedule_data: {
                    ...activeSchedule.schedule_data,
                    shifts: updatedShifts
                }
            }

            const { error: saveErr } = await supabase
                .from('schedules')
                .upsert(finalizedSchedule)

            if (saveErr) throw saveErr
            
            // The activeSchedule state will automatically update via the Realtime subscription!
            setActiveColorMenu(null)
        } catch (err) {
            console.error('Error saving employee color highlight:', err)
            alert(`Failed to save color: ${err.message}`)
        }
    }

    const weekDays = getWeekDays()
    const employeeRows = getEmployeeRows()
    const todayStr = new Date().toISOString().split('T')[0]

    return (
        <div className="schedule-container">
            {/* Header section */}
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 className="page-title">{officeMode ? 'Manage Weekly Schedule' : 'Kitchen Schedule'}</h1>
                    <p className="page-subtitle">
                        {officeMode 
                            ? 'Upload schedule sheets, automatically transcribe shifts, and maintain rosters.' 
                            : 'Live Back of House weekly shift timeline & announcements.'
                        }

                    </p>
                </div>
                
                {/* Back button */}
                <Link to={officeMode ? '/office' : '/kitchen'} className="header-icon-btn" title="Back to Dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className="fa-solid fa-arrow-left" />
                </Link>
            </div>

            {/* Error banner */}
            {error && (
                <div style={{ padding: '1rem', background: 'rgba(248, 113, 113, 0.15)', border: '1px solid #f87171', borderRadius: '8px', color: '#f87171', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{error}</span>
                    <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
                </div>
            )}

            {/* Top Toolbar — Week Selection & Admin Upload */}
            <div className="schedule-toolbar" style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                {schedulesList.length > 0 && (
                    <div className="card" style={{ padding: '1rem', flex: 1, minWidth: '280px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <i className="fa-regular fa-calendar-days" style={{ fontSize: '1.2rem', color: '#f97316' }} />
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '11px', color: '#a1a1aa', textTransform: 'uppercase', fontWeight: 600, marginBottom: '4px' }}>Viewing Week Starting</label>
                            <select
                                value={activeWeekStart}
                                onChange={(e) => setActiveWeekStart(e.target.value)}
                                style={{
                                    width: '100%',
                                    background: '#0f1014',
                                    border: '1px solid #27272a',
                                    borderRadius: '6px',
                                    padding: '8px 12px',
                                    color: '#e4e4e7',
                                    fontSize: '0.9rem',
                                    cursor: 'pointer',
                                    outline: 'none'
                                }}
                            >
                                {schedulesList.map(item => {
                                    const dateObj = new Date(item.week_start + 'T00:00:00')
                                    const formatted = dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                                    return (
                                        <option key={item.id} value={item.week_start}>
                                            Week of {formatted}
                                        </option>
                                    )
                                })}
                            </select>
                        </div>
                    </div>
                )}

                {/* Manager File Upload Dropzone (Office only) */}
                {officeMode && (
                    <div className="card" style={{ padding: '1rem', flex: 2, minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {/* Premium Segmented Control Upload Mode Toggle */}
                        <div style={{ display: 'flex', background: '#0f1014', padding: '3px', borderRadius: '8px', border: '1px solid #27272a', width: '100%' }}>
                            <button
                                type="button"
                                onClick={() => setUploadMode('new')}
                                style={{
                                    flex: 1,
                                    background: uploadMode === 'new' ? 'rgba(249, 115, 22, 0.1)' : 'transparent',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '8px 12px',
                                    color: uploadMode === 'new' ? '#f97316' : '#a1a1aa',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                <i className="fa-solid fa-plus-circle" />
                                New / Upcoming Week
                            </button>
                            <button
                                type="button"
                                onClick={() => setUploadMode('merge')}
                                style={{
                                    flex: 1,
                                    background: uploadMode === 'merge' ? 'rgba(249, 115, 22, 0.1)' : 'transparent',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '8px 12px',
                                    color: uploadMode === 'merge' ? '#f97316' : '#a1a1aa',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                <i className="fa-solid fa-code-merge" />
                                Append to Selected Week
                            </button>
                        </div>

                        <div style={{ position: 'relative', flex: 1, display: 'flex' }}>
                            <input
                                type="file"
                                id="schedule-file-picker"
                                accept=".png,.jpg,.jpeg,.pdf"
                                multiple
                                onChange={handleFileUpload}
                                style={{ display: 'none' }}
                            />
                            <label
                                htmlFor="schedule-file-picker"
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: '2px dashed #27272a',
                                    borderRadius: '10px',
                                    padding: '1.25rem 2rem',
                                    cursor: 'pointer',
                                    height: '100%',
                                    width: '100%',
                                    textAlign: 'center',
                                    transition: 'all 0.2s ease',
                                }}
                                className="upload-dropzone-label"
                            >
                                <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: '1.5rem', color: '#f97316', marginBottom: '8px' }} />
                                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                                    {uploadMode === 'new' 
                                        ? 'Upload Upcoming Week Schedule Page(s)' 
                                        : 'Upload Additional Page(s) for Selected Week'
                                    }
                                </span>
                                <span style={{ fontSize: '11px', color: '#71717a', marginTop: '2px' }}>
                                    {uploadMode === 'new'
                                        ? 'Will auto-detect the week from the sheet and start fresh'
                                        : 'Will merge new shifts into the currently viewed week'
                                    }
                                </span>
                            </label>
                        </div>
                    </div>
                )}
            </div>

            {/* AI processing loader overlay */}
            {uploading && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(15, 16, 20, 0.9)', backdropFilter: 'blur(8px)',
                    zIndex: 200, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center'
                }}>
                    <div className="spinner" style={{
                        width: '50px', height: '50px',
                        border: '4px solid rgba(249, 115, 22, 0.1)',
                        borderTop: '4px solid #f97316',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        marginBottom: '1.5rem'
                    }} />
                    <h3 style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '0.5rem' }}>{uploadProgress}</h3>
                    <p style={{ color: '#71717a', fontSize: '0.9rem' }}>Cross-referencing the shift matrix against BOH sanity limits...</p>

                </div>
            )}

            {/* Main Schedule Content */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#71717a' }}>
                    <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '2rem', color: '#f97316', marginBottom: '1rem' }} />
                    <p>Fetching shift rosters...</p>
                </div>
            ) : !activeSchedule ? (
                <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem', borderStyle: 'dashed' }}>
                    <i className="fa-solid fa-calendar-days" style={{ fontSize: '3rem', color: '#27272a', marginBottom: '1.5rem' }} />
                    <h2>No Weekly Schedules Found</h2>
                    <p style={{ color: '#71717a', maxWidth: '400px', margin: '0.5rem auto 1.5rem' }}>
                        {officeMode 
                            ? 'Upload a kitchen schedule printout image or PDF to parse and display BOH shifts.' 
                            : 'Ask management to upload the current BOH schedule in the Office Dashboard.'
                        }
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Weekly Schedule Title Header with Actions */}
                    <div className="card" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                            <span style={{ fontSize: '11px', color: '#f97316', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Roster Schedule</span>
                            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginTop: '2px' }}>
                                Week of {new Date(activeWeekStart + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                            </h2>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                            {/* View original file */}
                            {activeSchedule.file_url && (
                                <button
                                    onClick={() => {
                                        setLightboxFileIndex(0)
                                        setIsViewingOriginal(true)
                                    }}
                                    className="btn"
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid #27272a',
                                        color: '#e4e4e7',
                                        borderRadius: '6px',
                                        padding: '8px 16px',
                                        fontSize: '0.85rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <i className="fa-regular fa-image" />
                                    <span>View Original File</span>
                                </button>
                            )}

                            {/* Trash button (Office mode) */}
                            {officeMode && (
                                <button
                                    onClick={() => handleDeleteSchedule(activeSchedule.id, activeSchedule.week_start)}
                                    className="btn"
                                    style={{
                                        background: 'rgba(248, 113, 113, 0.1)',
                                        border: '1px solid rgba(248, 113, 113, 0.2)',
                                        color: '#f87171',
                                        borderRadius: '6px',
                                        padding: '8px 12px',
                                        cursor: 'pointer',
                                    }}
                                    title="Delete Schedule"
                                >
                                    <i className="fa-solid fa-trash-can" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* DESKTOP VIEW: Premium Horizontal Grid Table */}
                    <div className="card schedule-desktop-grid" style={{ padding: '0', overflowX: 'auto', border: '2px solid #27272a' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #27272a', background: 'rgba(0, 0, 0, 0.2)' }}>
                                    <th style={{ padding: '16px', fontWeight: 700, fontSize: '0.85rem', color: '#a1a1aa', textTransform: 'uppercase', width: '200px' }}>Employee</th>
                                    {weekDays.map(day => {
                                        const isToday = day.dateStr === todayStr
                                        return (
                                            <th 
                                                key={day.dayIndex} 
                                                style={{ 
                                                    padding: '16px', 
                                                    fontWeight: 700, 
                                                    fontSize: '0.85rem', 
                                                    color: isToday ? '#f97316' : '#a1a1aa',
                                                    background: isToday ? 'rgba(249, 115, 22, 0.05)' : 'transparent',
                                                    borderLeft: '1px solid #27272a'
                                                }}
                                            >
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontSize: '11px', textTransform: 'uppercase' }}>{day.dayName}</span>
                                                    <span style={{ fontSize: '0.9rem', color: isToday ? '#f97316' : '#e4e4e7', marginTop: '2px' }}>
                                                        {new Date(day.dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                    </span>
                                                </div>
                                            </th>
                                        )
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {employeeRows.map((row, idx) => {
                                    const colorMeta = row.color ? HIGHLIGHT_COLORS[row.color] : null
                                    return (
                                        <tr 
                                            key={row.name} 
                                            style={{ 
                                                borderBottom: '1px solid #27272a',
                                                background: idx % 2 === 1 ? 'rgba(255, 255, 255, 0.01)' : 'transparent',
                                            }}
                                            className="schedule-row-hover"
                                        >
                                            <td style={{ 
                                                padding: '16px', 
                                                fontWeight: 600, 
                                                borderRight: '1px solid #27272a',
                                                background: colorMeta ? colorMeta.bg : 'transparent',
                                                borderLeft: colorMeta ? `4px solid ${colorMeta.solid}` : 'none',
                                                position: 'relative',
                                                transition: 'all 0.2s'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <span style={{ color: '#e4e4e7', fontSize: '0.95rem' }}>{row.name}</span>
                                                        <span style={{ color: '#71717a', fontSize: '11px', fontWeight: 500, marginTop: '2px', textTransform: 'uppercase' }}>{row.role}</span>
                                                    </div>
                                                    {officeMode && (
                                                        <div style={{ position: 'relative' }}>
                                                            <button
                                                                onClick={() => setActiveColorMenu(activeColorMenu?.employeeName === row.name ? null : { employeeName: row.name })}
                                                                title="Set Roster Color Highlight"
                                                                style={{
                                                                    background: colorMeta ? colorMeta.bg : 'rgba(255,255,255,0.05)',
                                                                    border: `1px solid ${colorMeta ? colorMeta.border : '#27272a'}`,
                                                                    color: colorMeta ? colorMeta.solid : '#71717a',
                                                                    borderRadius: '4px',
                                                                    width: '24px',
                                                                    height: '24px',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    cursor: 'pointer',
                                                                    fontSize: '11px',
                                                                    transition: 'all 0.2s'
                                                                }}
                                                                className="paintbrush-trigger"
                                                            >
                                                                <i className="fa-solid fa-paintbrush" />
                                                            </button>
                                                            {activeColorMenu?.employeeName === row.name && (
                                                                <div style={{
                                                                    position: 'absolute',
                                                                    top: '100%',
                                                                    left: '0',
                                                                    marginTop: '6px',
                                                                    background: 'rgba(15, 16, 20, 0.98)',
                                                                    backdropFilter: 'blur(16px)',
                                                                    border: '1px solid #27272a',
                                                                    borderRadius: '8px',
                                                                    padding: '6px',
                                                                    zIndex: 100,
                                                                    width: '160px',
                                                                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)'
                                                                }}>
                                                                    <div style={{ fontSize: '10px', color: '#71717a', fontWeight: 700, padding: '4px 6px', textTransform: 'uppercase', borderBottom: '1px solid #1f1f23', marginBottom: '4px' }}>
                                                                        Highlight Color
                                                                    </div>
                                                                    {Object.values(HIGHLIGHT_COLORS).map(c => (
                                                                        <button
                                                                            key={c.id}
                                                                            onClick={() => handleSetEmployeeColor(row.name, c.id)}
                                                                            style={{
                                                                                width: '100%',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                gap: '8px',
                                                                                padding: '6px 8px',
                                                                                border: 'none',
                                                                                background: row.color === c.id ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                                                                                borderRadius: '4px',
                                                                                color: c.solid,
                                                                                fontSize: '11px',
                                                                                fontWeight: 600,
                                                                                cursor: 'pointer',
                                                                                textAlign: 'left',
                                                                                transition: 'background 0.15s'
                                                                            }}
                                                                            className="color-option-hover"
                                                                        >
                                                                            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: c.solid }} />
                                                                            {c.name.split(' ')[0]}
                                                                        </button>
                                                                    ))}
                                                                    <button
                                                                        onClick={() => handleSetEmployeeColor(row.name, null)}
                                                                        style={{
                                                                            width: '100%',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            gap: '8px',
                                                                            padding: '6px 8px',
                                                                            border: 'none',
                                                                            background: !row.color ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                                                                            borderRadius: '4px',
                                                                            color: '#a1a1aa',
                                                                            fontSize: '11px',
                                                                            fontWeight: 500,
                                                                            cursor: 'pointer',
                                                                            textAlign: 'left',
                                                                            transition: 'background 0.15s',
                                                                            marginTop: '4px',
                                                                            borderTop: '1px solid #1f1f23'
                                                                        }}
                                                                        className="color-option-hover"
                                                                    >
                                                                        <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#71717a' }} />
                                                                        Clear Color
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            {weekDays.map(day => {
                                                const shift = row.shiftsByDate[day.dateStr]
                                                const isToday = day.dateStr === todayStr
                                                const shiftColor = shift ? getShiftColor(shift, row.color, row.role) : null
                                                const shiftColorMeta = shiftColor ? HIGHLIGHT_COLORS[shiftColor] : null
                                                return (
                                                    <td 
                                                        key={day.dayIndex} 
                                                        style={{ 
                                                            padding: '12px 16px', 
                                                            borderLeft: '1px solid #27272a',
                                                            background: isToday 
                                                                ? 'rgba(249, 115, 22, 0.02)' 
                                                                : (shiftColorMeta ? shiftColorMeta.glow : 'transparent'),
                                                            position: 'relative'
                                                        }}
                                                    >
                                                        {shift ? (
                                                            <div 
                                                                style={{ 
                                                                    background: isToday 
                                                                        ? 'rgba(249, 115, 22, 0.1)' 
                                                                        : (shiftColorMeta ? shiftColorMeta.bg : 'rgba(255, 255, 255, 0.03)'),
                                                                    border: isToday 
                                                                        ? '1px solid rgba(249, 115, 22, 0.3)' 
                                                                        : (shiftColorMeta ? `1px solid ${shiftColorMeta.border}` : '1px solid #27272a'),
                                                                    borderLeft: isToday 
                                                                        ? '1px solid rgba(249, 115, 22, 0.3)' 
                                                                        : (shiftColorMeta ? `4px solid ${shiftColorMeta.solid}` : '1px solid #27272a'),
                                                                    padding: '8px 10px',
                                                                    borderRadius: '6px',
                                                                    display: 'flex',
                                                                    flexDirection: 'column',
                                                                    gap: '2px',
                                                                    boxShadow: isToday 
                                                                        ? '0 0 10px rgba(249, 115, 22, 0.05)' 
                                                                        : 'none'
                                                                }}
                                                            >
                                                                <span style={{ 
                                                                    fontSize: '0.85rem', 
                                                                    fontWeight: 700, 
                                                                    color: isToday 
                                                                        ? '#f97316' 
                                                                        : (shiftColorMeta ? shiftColorMeta.solid : '#e4e4e7') 
                                                                }}>
                                                                    {shift.start_time} - {shift.end_time}
                                                                </span>
                                                                {shift.note && (
                                                                    <span style={{ fontSize: '10px', color: '#a1a1aa', fontWeight: 500 }}>
                                                                        {shift.note}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div style={{ color: '#3f3f46', fontSize: '0.8rem', textAlign: 'center', padding: '8px 0' }}>—</div>
                                                        )}
                                                    </td>
                                                )
                                            })}
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* MOBILE VIEW: Premium Day-by-Day Accordion / Toggles (Hidden on Desktop) */}
                    <div className="schedule-mobile-grid" style={{ display: 'none' }}>
                        {/* Day Tabs */}
                        <div style={{ display: 'flex', overflowX: 'auto', gap: '8px', paddingBottom: '8px', marginBottom: '1rem' }} className="custom-scrollbar">
                            {weekDays.map(day => {
                                const isToday = day.dateStr === todayStr
                                const isSelected = selectedMobileDay === day.dayIndex
                                return (
                                    <button
                                        key={day.dayIndex}
                                        onClick={() => setSelectedMobileDay(day.dayIndex)}
                                        style={{
                                            background: isSelected 
                                                ? '#f97316' 
                                                : isToday ? 'rgba(249, 115, 22, 0.12)' : 'rgba(255,255,255,0.03)',
                                            border: isSelected 
                                                ? '1px solid #f97316' 
                                                : isToday ? '1px solid rgba(249, 115, 22, 0.3)' : '1px solid #27272a',
                                            borderRadius: '20px',
                                            padding: '8px 16px',
                                            color: isSelected ? '#0f1014' : isToday ? '#f97316' : '#a1a1aa',
                                            fontWeight: 700,
                                            fontSize: '0.8rem',
                                            cursor: 'pointer',
                                            whiteSpace: 'nowrap',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {day.dayName.slice(0, 3)} {new Date(day.dateStr + 'T00:00:00').getDate()}
                                    </button>
                                )
                            })}
                        </div>

                        {/* Selected Mobile Day shifts */}
                        <div className="card" style={{ padding: '1.25rem' }}>
                            <div style={{ borderBottom: '1px solid #27272a', paddingBottom: '10px', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>
                                    {weekDays[selectedMobileDay]?.dayName} Shifts
                                </h3>
                                <span style={{ fontSize: '0.85rem', color: '#71717a' }}>
                                    {weekDays[selectedMobileDay] && new Date(weekDays[selectedMobileDay].dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                                </span>
                            </div>

                            {/* Roster list */}
                             {(() => {
                                const targetDayStr = weekDays[selectedMobileDay]?.dateStr
                                const dayShifts = employeeRows
                                    .map(row => ({ name: row.name, role: row.role, color: row.color, shift: row.shiftsByDate[targetDayStr] }))
                                    .filter(item => item.shift)

                                if (dayShifts.length === 0) {
                                    return (
                                        <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#71717a' }}>
                                            <i className="fa-solid fa-mug-hot" style={{ fontSize: '1.5rem', marginBottom: '0.75rem', opacity: 0.5 }} />
                                            <p style={{ fontSize: '0.85rem' }}>No kitchen shifts scheduled for this day.</p>
                                        </div>
                                    )
                                }

                                return (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {dayShifts.map(item => {
                                            const shiftColor = getShiftColor(item.shift, item.color, item.role)
                                            const shiftColorMeta = shiftColor ? HIGHLIGHT_COLORS[shiftColor] : null
                                            return (
                                                <div 
                                                    key={item.name}
                                                    style={{
                                                        background: shiftColorMeta ? shiftColorMeta.bg : 'rgba(255, 255, 255, 0.02)',
                                                        border: shiftColorMeta ? `1px solid ${shiftColorMeta.border}` : '1px solid #27272a',
                                                        borderLeft: shiftColorMeta ? `4px solid ${shiftColorMeta.solid}` : '1px solid #27272a',
                                                        borderRadius: '8px',
                                                        padding: '10px 12px',
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center'
                                                    }}
                                                >
                                                    <div>
                                                        <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#e4e4e7' }}>{item.name}</h4>
                                                        <span style={{ fontSize: '11px', color: shiftColorMeta ? shiftColorMeta.solid : '#71717a', textTransform: 'uppercase', fontWeight: shiftColorMeta ? 600 : 400 }}>{item.role}</span>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: shiftColorMeta ? shiftColorMeta.solid : '#f97316' }}>
                                                                {item.shift.start_time} - {item.shift.end_time}
                                                        </span>
                                                        {item.shift.note && (
                                                            <span style={{ display: 'block', fontSize: '10px', color: '#a1a1aa', marginTop: '2px' }}>
                                                                {item.shift.note}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )
                            })()}
                        </div>
                    </div>

                    {/* Memos / Announcements section */}
                    <div className="card" style={{ borderLeft: '4px solid #f97316' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                            <i className="fa-solid fa-bullhorn" style={{ color: '#f97316', fontSize: '1.1rem' }} />
                            <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Schedule Memos & Announcements</h3>
                        </div>

                        {activeSchedule.schedule_data && activeSchedule.schedule_data.announcements && activeSchedule.schedule_data.announcements.length > 0 ? (
                            <ul className="notes-list" style={{ margin: 0, paddingLeft: '1rem' }}>
                                {activeSchedule.schedule_data.announcements.map((ann, i) => (
                                    <li key={i} style={{ color: '#e4e4e7', fontSize: '0.9rem', marginBottom: '8px' }}>
                                        {ann}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p style={{ color: '#71717a', fontSize: '0.85rem', fontStyle: 'italic', margin: 0 }}>No weekly announcements posted.</p>
                        )}
                    </div>
                </div>
            )}

            {/* PREVIEW & CONFIRM DIALOG MODAL (Office mode only) */}
            {pendingData && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(15, 16, 20, 0.85)', backdropFilter: 'blur(12px)',
                    zIndex: 150, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '1rem'
                }}>
                    <div className="card" style={{
                        width: '100%', maxWidth: '800px', maxHeight: '90vh',
                        display: 'flex', flexDirection: 'column', padding: 0,
                        border: '2px solid #f97316', overflow: 'hidden',
                        boxShadow: '0 10px 40px rgba(249, 115, 22, 0.15)'
                    }}>
                        {/* Header */}
                        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #27272a', background: 'rgba(249, 115, 22, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f97316' }}>Verify Parsed Schedule</h2>
                                <p style={{ fontSize: '11px', color: '#a1a1aa', marginTop: '2px' }}>Parsed from: {pendingFileName}</p>
                            </div>
                            <span style={{ background: 'rgba(249, 115, 22, 0.15)', color: '#f97316', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                                {pendingData.shifts?.length || 0} shifts detected
                            </span>
                        </div>

                        {/* Modal Body Scroll */}
                        <div style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1 }} className="custom-scrollbar">
                            
                            {/* Week start date selection */}
                            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', border: '1px solid #27272a', borderRadius: '8px' }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#e4e4e7', marginBottom: '8px' }}>
                                    Confirm Week Start Date (Must be a Monday):
                                </label>
                                <input
                                    type="date"
                                    value={modalWeekStart}
                                    onChange={(e) => setModalWeekStart(e.target.value)}
                                    style={{
                                        background: '#0f1014',
                                        border: '1px solid #27272a',
                                        borderRadius: '6px',
                                        padding: '10px 12px',
                                        color: '#e4e4e7',
                                        width: '100%',
                                        fontSize: '0.9rem',
                                        outline: 'none'
                                    }}
                                />
                                <p style={{ fontSize: '11px', color: '#71717a', marginTop: '6px' }}>
                                    Detected Monday: <strong>{pendingData.week_start ? new Date(pendingData.week_start + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'None'}</strong>
                                </p>


                            </div>

                            {/* Shifts Preview list */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#e4e4e7', marginBottom: '8px' }}>
                                    Parsed Shift Rosters:
                                </label>
                                <div style={{ border: '1px solid #27272a', borderRadius: '8px', overflow: 'hidden', maxHeight: '200px', overflowY: 'auto' }} className="custom-scrollbar">
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
                                        <thead>
                                            <tr style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid #27272a' }}>
                                                <th style={{ padding: '8px 12px', color: '#a1a1aa' }}>Name</th>
                                                <th style={{ padding: '8px 12px', color: '#a1a1aa' }}>Role</th>
                                                <th style={{ padding: '8px 12px', color: '#a1a1aa', width: '130px' }}>Highlight</th>
                                                <th style={{ padding: '8px 12px', color: '#a1a1aa' }}>Shift Date</th>
                                                <th style={{ padding: '8px 12px', color: '#a1a1aa' }}>Shift Hours</th>
                                                <th style={{ padding: '8px 12px', color: '#a1a1aa' }}>Note</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(pendingData.shifts || []).map((sh, idx) => {
                                                const formattedDate = sh.date 
                                                    ? new Date(sh.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' }) 
                                                    : '—'
                                                const colorMeta = sh.color ? HIGHLIGHT_COLORS[sh.color] : null
                                                return (
                                                    <tr key={idx} style={{ 
                                                        borderBottom: '1px solid #1f1f23', 
                                                        background: idx % 2 === 1 ? 'rgba(255,255,255,0.01)' : 'transparent',
                                                        borderLeft: colorMeta ? `3px solid ${colorMeta.solid}` : 'none'
                                                    }}>
                                                        <td style={{ padding: '8px 12px', fontWeight: 600 }}>{sh.employee_name}</td>
                                                        <td style={{ padding: '8px 12px', color: '#a1a1aa' }}>{sh.role || 'Crew'}</td>
                                                        <td style={{ padding: '4px 12px' }}>
                                                            <select
                                                                value={sh.color || ''}
                                                                onChange={(e) => {
                                                                    const val = e.target.value || null
                                                                    // Update the color ONLY for this specific shift in pendingData
                                                                    const updatedShifts = pendingData.shifts.map((s, sIdx) => {
                                                                        if (sIdx === idx) {
                                                                            return { ...s, color: val }
                                                                        }
                                                                        return s
                                                                    })
                                                                    setPendingData({
                                                                        ...pendingData,
                                                                        shifts: updatedShifts
                                                                    })
                                                                }}
                                                                style={{
                                                                    background: '#0f1014',
                                                                    border: '1px solid #27272a',
                                                                    borderRadius: '4px',
                                                                    color: sh.color ? (HIGHLIGHT_COLORS[sh.color]?.solid || '#e4e4e7') : '#a1a1aa',
                                                                    padding: '4px 6px',
                                                                    fontSize: '11px',
                                                                    outline: 'none',
                                                                    cursor: 'pointer',
                                                                    fontWeight: sh.color ? 700 : 500
                                                                }}
                                                            >
                                                                <option value="" style={{ color: '#71717a' }}>None</option>
                                                                <option value="green" style={{ color: HIGHLIGHT_COLORS.green.solid, fontWeight: 'bold' }}>Dish (Green)</option>
                                                                <option value="blue" style={{ color: HIGHLIGHT_COLORS.blue.solid, fontWeight: 'bold' }}>Pool (Blue)</option>
                                                                <option value="pink" style={{ color: HIGHLIGHT_COLORS.pink.solid, fontWeight: 'bold' }}>Banquet (Pink)</option>
                                                                <option value="yellow" style={{ color: HIGHLIGHT_COLORS.yellow.solid, fontWeight: 'bold' }}>AM (Yellow)</option>
                                                            </select>
                                                        </td>
                                                        <td style={{ padding: '8px 12px' }}>{formattedDate}</td>
                                                        <td style={{ padding: '8px 12px', color: '#f97316', fontWeight: 700 }}>{sh.start_time} - {sh.end_time}</td>
                                                        <td style={{ padding: '8px 12px', color: '#71717a', fontStyle: 'italic' }}>{sh.note || '—'}</td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Announcements Editor */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#e4e4e7', marginBottom: '8px' }}>
                                    Weekly Memos & Announcements (One per line):
                                </label>
                                <textarea
                                    value={modalAnnouncements}
                                    onChange={(e) => setModalAnnouncements(e.target.value)}
                                    rows={4}
                                    placeholder="Enter schedule notices, weekly meetings, specials..."
                                    style={{
                                        width: '100%',
                                        background: '#0f1014',
                                        border: '1px solid #27272a',
                                        borderRadius: '6px',
                                        padding: '10px 12px',
                                        color: '#e4e4e7',
                                        fontSize: '0.9rem',
                                        fontFamily: 'inherit',
                                        resize: 'vertical',
                                        outline: 'none'
                                    }}
                                    className="custom-scrollbar"
                                />
                            </div>

                        </div>

                        {/* Footer Action buttons */}
                        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #27272a', background: 'rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', alignItems: 'center' }}>
                            <input
                                type="file"
                                id="schedule-append-file-picker"
                                accept=".png,.jpg,.jpeg,.pdf"
                                multiple
                                onChange={handleFileUpload}
                                style={{ display: 'none' }}
                            />
                            <label
                                htmlFor="schedule-append-file-picker"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid #27272a',
                                    color: '#e4e4e7',
                                    borderRadius: '6px',
                                    padding: '8px 16px',
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    marginRight: 'auto',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                                    e.currentTarget.style.borderColor = '#3f3f46';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                    e.currentTarget.style.borderColor = '#27272a';
                                }}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="12" y1="5" x2="12" y2="19"></line>
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                                <span>Add Another Page/File</span>
                            </label>
                            <button
                                onClick={() => {
                                    setPendingData(null)
                                    setPendingFileUrl('')
                                    setPendingFileName('')
                                }}
                                style={{
                                    background: 'transparent',
                                    border: '1px solid #27272a',
                                    color: '#a1a1aa',
                                    borderRadius: '6px',
                                    padding: '8px 16px',
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Discard
                            </button>
                            <button
                                onClick={handleConfirmSave}
                                style={{
                                    background: '#f97316',
                                    border: '1px solid #f97316',
                                    color: '#0f1014',
                                    borderRadius: '6px',
                                    padding: '8px 18px',
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                }}
                            >
                                Confirm and Save Schedule
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* ORIGINAL FILE LIGHTBOX OVERLAY */}
                {isViewingOriginal && activeSchedule && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(15, 16, 20, 0.95)', backdropFilter: 'blur(10px)',
                        zIndex: 180, display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        padding: '2rem'
                    }}>
                        {/* Floating controls */}
                        <div style={{ width: '100%', maxWidth: '90vw', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem', zIndex: 190 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                                <span style={{ fontSize: '0.9rem', color: '#a1a1aa' }}>
                                    Original Upload: <span style={{ color: '#fff', fontWeight: 600 }}>{activeName}</span> {urls.length > 1 && `(${lightboxFileIndex + 1} of ${urls.length})`}
                                </span>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        onClick={() => window.open(activeUrl, '_blank')}
                                        style={{
                                            background: 'rgba(255,255,255,0.06)',
                                            border: '1px solid #333',
                                            color: '#fff',
                                            padding: '6px 12px',
                                            borderRadius: '4px',
                                            fontSize: '0.8rem',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}
                                    >
                                        <i className="fa-solid fa-up-right-from-square" /> Open
                                    </button>
                                    <button
                                        onClick={() => window.print()}
                                        style={{
                                            background: 'rgba(255,255,255,0.06)',
                                            border: '1px solid #333',
                                            color: '#fff',
                                            padding: '6px 12px',
                                            borderRadius: '4px',
                                            fontSize: '0.8rem',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}
                                    >
                                        <i className="fa-solid fa-print" /> Print
                                    </button>
                                    <button
                                        onClick={() => setIsViewingOriginal(false)}
                                        style={{
                                            background: '#f97316',
                                            border: 'none',
                                            color: '#0f1014',
                                            padding: '6px 16px',
                                            borderRadius: '4px',
                                            fontSize: '0.8rem',
                                            fontWeight: 700,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>

                            {/* Page selection tabs if multiple pages exist */}
                            {urls.length > 1 && (
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', background: 'rgba(255,255,255,0.03)', padding: '6px', borderRadius: '6px', border: '1px solid #27272a' }}>
                                    {urls.map((url, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setLightboxFileIndex(idx)}
                                            style={{
                                                background: lightboxFileIndex === idx ? '#f97316' : 'transparent',
                                                border: 'none',
                                                color: lightboxFileIndex === idx ? '#0f1014' : '#a1a1aa',
                                                padding: '6px 14px',
                                                borderRadius: '4px',
                                                fontSize: '0.8rem',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease'
                                            }}
                                        >
                                            Page {idx + 1}: {names[idx]?.substring(0, 16) || 'File'}{names[idx]?.length > 16 && '...'}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Image / PDF Display box */}
                        <div style={{
                            flex: 1, width: '100%', maxWidth: '90vw', maxHeight: '80vh',
                            display: 'flex', justifyContent: 'center', alignItems: 'center',
                            overflow: 'auto', border: '1px solid #27272a', borderRadius: '8px',
                            background: '#18181b', padding: '1rem'
                        }} className="custom-scrollbar">
                            {activeName?.toLowerCase().endsWith('.pdf') ? (
                                <iframe
                                    src={activeUrl}
                                    title={`Original PDF Schedule Page ${lightboxFileIndex + 1}`}
                                    style={{ width: '100%', height: '100%', border: 'none', minHeight: '60vh' }}
                                />
                            ) : (
                                <img
                                    src={activeUrl}
                                    alt={`Original Weekly Schedule Page ${lightboxFileIndex + 1}`}
                                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '4px' }}
                                />
                            )}
                        </div>
                    </div>
                )}
        </div>
    )
}

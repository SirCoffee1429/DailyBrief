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
    orange: {
        id: 'orange',
        name: 'Orange',
        bg: 'rgba(249, 115, 22, 0.12)',
        border: 'rgba(249, 115, 22, 0.4)',
        solid: '#f97316',
        glow: 'rgba(249, 115, 22, 0.06)'
    },
    yellow: {
        id: 'yellow',
        name: 'AM (Yellow)',
        bg: 'rgba(234, 179, 8, 0.15)',
        border: 'rgba(234, 179, 8, 0.4)',
        solid: '#eab308',
        glow: 'rgba(234, 179, 8, 0.08)'
    },
    blue: {
        id: 'blue',
        name: 'Pool (Blue)',
        bg: 'rgba(59, 130, 246, 0.12)',
        border: 'rgba(59, 130, 246, 0.4)',
        solid: '#3b82f6',
        glow: 'rgba(59, 130, 246, 0.06)'
    },
    green: {
        id: 'green',
        name: 'Dish (Green)',
        bg: 'rgba(34, 197, 94, 0.12)',
        border: 'rgba(34, 197, 94, 0.4)',
        solid: '#22c55e',
        glow: 'rgba(34, 197, 94, 0.06)'
    },
    pink: {
        id: 'pink',
        name: 'Banquet (Pink)',
        bg: 'rgba(236, 72, 153, 0.12)',
        border: 'rgba(236, 72, 153, 0.4)',
        solid: '#ec4899',
        glow: 'rgba(236, 72, 153, 0.06)'
    }
}

const getShiftColor = (shift, employeeRowColor = null, employeeRole = '') => {
    // 1. Prioritize explicit shift-level color override (e.g. from individual verify edit)
    if (shift && shift.color) {
        return shift.color
    }

    // 2. Try to infer shift-specific color from the shift's own role, note, or timing first!
    if (shift) {
        const noteLower = (shift.note || '').toLowerCase()
        const roleLower = (shift.role || '').toLowerCase()
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
        if (roleLower.includes('orange') || noteLower.includes('orange')) {
            return 'orange'
        }
        
        // Strict word-boundary check for 'am' or 'a.m.' to avoid matching words like 'team', 'came', 'game', etc.
        const amWordRegex = /\b(am|a\.m\.)\b/i
        if (amWordRegex.test(noteLower) || amWordRegex.test(startLower)) {
            const match = shift.start_time.match(/(\d+):(\d+)\s*(AM|PM)/i)
            if (match) {
                const hour = parseInt(match[1])
                const period = match[3].toUpperCase()
                if (period === 'AM' && hour >= 5 && (hour < 11 || (hour === 11 && parseInt(match[2]) <= 30))) {
                    return 'yellow'
                }
            } else {
                // If there's no standard colon but it has AM (e.g., '8 AM' or '8am')
                const simpleMatch = shift.start_time.match(/(\d+)\s*(AM|PM)/i)
                if (simpleMatch) {
                    const hour = parseInt(simpleMatch[1])
                    const period = simpleMatch[2].toUpperCase()
                    if (period === 'AM' && hour >= 5 && hour <= 11) {
                        return 'yellow'
                    }
                } else {
                    // Fallback only if it doesn't explicitly contain 'PM' in the start time
                    const pmMatch = shift.start_time.match(/PM/i)
                    if (!pmMatch) {
                        return 'yellow'
                    }
                }
            }
        }
    }

    // 3. Fall back to employeeRowColor (inherited from employee paintbrush or dominant role highlight)
    // Validate to make sure AM yellow doesn't leak onto PM/evening shifts
    if (employeeRowColor) {
        if (employeeRowColor === 'yellow') {
            if (shift) {
                const startLower = (shift.start_time || '').toLowerCase()
                // A shift with an explicit 'PM' or starting in PM should never inherit yellow
                if (startLower.includes('pm')) {
                    return null
                }
                const match = shift.start_time.match(/(\d+):(\d+)\s*(AM|PM)/i)
                if (match) {
                    const hour = parseInt(match[1])
                    const period = match[3].toUpperCase()
                    if (period === 'AM' && hour >= 5 && (hour < 11 || (hour === 11 && parseInt(match[2]) <= 30))) {
                        return 'yellow'
                    }
                    return null
                }
            }
            return 'yellow'
        }
        return employeeRowColor
    }

    // 4. Finally, fall back to employee role-based inference if we have the employeeRole
    if (employeeRole) {
        const roleLower = employeeRole.toLowerCase()
        if (roleLower.includes('dish') || roleLower.includes('wash')) {
            return 'green'
        }
        if (roleLower.includes('pool') || roleLower.includes('cabana') || roleLower.includes('pavilion')) {
            return 'blue'
        }
        if (roleLower.includes('banquet') || roleLower.includes('beo') || roleLower.includes('event')) {
            return 'pink'
        }
        if (roleLower.includes('orange')) {
            return 'orange'
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

    // Inline schedule editing states (Office Dashboard)
    const [extraEmployees, setExtraEmployees] = useState([])
    const [editingEmployee, setEditingEmployee] = useState(null) // { originalName, name, role, isNew } or null
    const [editingShift, setEditingShift] = useState(null) // { employee_name, date, start_time, end_time, role, color, note, isNew, shiftIndex } or null

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
    const [selectedEmployeeSchedule, setSelectedEmployeeSchedule] = useState(null)


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
        setExtraEmployees([]) // Reset extra employees when changing weeks
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

    // Initialize schedule list once on mount
    useEffect(() => {
        loadScheduleWeeks()
    }, [loadScheduleWeeks])

    // Real-time subscription to schedules table
    useEffect(() => {
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
        const employeeMap = {}

        // 1. Process database shifts if available
        if (activeSchedule && activeSchedule.schedule_data && activeSchedule.schedule_data.shifts) {
            const shifts = activeSchedule.schedule_data.shifts
            shifts.forEach((shift, originalIndex) => {
                const empName = shift.employee_name || 'Unknown Staff'
                if (!employeeMap[empName]) {
                    employeeMap[empName] = { name: empName, role: shift.role || 'Crew', shiftsByDate: {}, color: null, explicitColors: [] }
                }
                
                // Collect explicit colors from individual shifts
                if (shift.color) {
                    employeeMap[empName].explicitColors.push(shift.color)
                }

                if (!employeeMap[empName].shiftsByDate[shift.date]) {
                    employeeMap[empName].shiftsByDate[shift.date] = []
                }
                employeeMap[empName].shiftsByDate[shift.date].push({
                    ...shift,
                    originalIndex
                })
            })
        }

        // 2. Process manually added extra employees
        extraEmployees.forEach(extra => {
            const empName = extra.name
            if (empName && !employeeMap[empName]) {
                employeeMap[empName] = {
                    name: empName,
                    role: extra.role || 'Crew',
                    shiftsByDate: {},
                    color: null,
                    explicitColors: [],
                    isExtra: true
                }
            }
        })

        // Determine employee row color based on consensus of explicit shift colors
        Object.values(employeeMap).forEach(emp => {
            if (emp.explicitColors.length > 0) {
                // Count occurrences of each color
                const counts = {}
                emp.explicitColors.forEach(c => { counts[c] = (counts[c] || 0) + 1 })
                
                let dominantColor = null
                let maxCount = 0
                Object.entries(counts).forEach(([c, count]) => {
                    if (count > maxCount) {
                        maxCount = count
                        dominantColor = c
                    }
                })

                const numShifts = Object.values(emp.shiftsByDate).flat().length
                // Only propagate shift color to the row level if:
                // - It is set on at least 50% of their shifts
                // - And we exclude 'yellow' from leaking unless it is set on ALL of their shifts (uniform AM worker)
                if (dominantColor === 'yellow') {
                    if (maxCount === numShifts) {
                        emp.color = 'yellow'
                    }
                } else if (maxCount >= numShifts / 2) {
                    emp.color = dominantColor
                }
            }

            // After grouping, if an employee has NO explicit color set, try to infer it from their baseline role
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
                // 4. Orange
                else if (roleLower.includes('orange')) {
                    emp.color = 'orange'
                }
                // Note: AM (Yellow) is timing-based and is intentionally NOT inferred at the employee name cell/row level anymore.
            }
        })

        return Object.values(employeeMap).sort((a, b) => a.name.localeCompare(b.name))
    }, [activeSchedule, extraEmployees])

    // Generate Monday to Sunday dates for the modal target week start
    const getModalWeekDays = useCallback(() => {
        const start = modalWeekStart || (pendingData && pendingData.week_start) || ''
        if (!start) return []
        const baseDate = new Date(start + 'T00:00:00')
        const days = []
        for (let i = 0; i < 7; i++) {
            const nextDate = new Date(baseDate)
            nextDate.setDate(baseDate.getDate() + i)
            days.push({
                dateStr: nextDate.toISOString().split('T')[0],
                label: nextDate.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' })
            })
        }
        return days
    }, [modalWeekStart, pendingData])

    // Helper functions for inline schedule editing (Office Dashboard)
    const handleAddEmployeeRow = () => {
        // Prevent adding multiple blank rows
        if (extraEmployees.some(emp => emp.name === 'New Employee' || emp.name === '')) {
            alert('Please finish adding the current new employee first.')
            return
        }

        const newEmp = { name: 'New Employee', role: 'Crew', isNew: true }
        setExtraEmployees([...extraEmployees, newEmp])
        setEditingEmployee({ originalName: 'New Employee', name: '', role: 'Crew', isNew: true })
    }

    const handleSaveEmployeeRow = async () => {
        if (!editingEmployee) return
        const { originalName, name, role, isNew } = editingEmployee
        
        const trimmedName = name.trim()
        const trimmedRole = role.trim() || 'Crew'

        if (!trimmedName) {
            alert('Employee name cannot be empty.')
            return
        }

        try {
            const employeeRows = getEmployeeRows()
            
            if (isNew) {
                // Check if name already exists
                const nameExists = employeeRows.some(emp => emp.name.toLowerCase() === trimmedName.toLowerCase() && emp.name !== 'New Employee')
                if (nameExists) {
                    alert(`An employee named "${trimmedName}" already exists on this week's roster.`)
                    return
                }

                // Add to extraEmployees state
                const newExtra = extraEmployees.map(emp => emp.name === 'New Employee' ? { name: trimmedName, role: trimmedRole } : emp)
                setExtraEmployees(newExtra)
            } else {
                // If renaming, check if name already exists (excluding originalName)
                if (originalName.toLowerCase() !== trimmedName.toLowerCase()) {
                    const nameExists = employeeRows.some(emp => emp.name.toLowerCase() === trimmedName.toLowerCase())
                    if (nameExists) {
                        alert(`An employee named "${trimmedName}" already exists on this week's roster.`)
                        return
                    }
                }

                // Update shifts in database
                if (activeSchedule && activeSchedule.schedule_data && activeSchedule.schedule_data.shifts) {
                    const updatedShifts = activeSchedule.schedule_data.shifts.map(shift => {
                        if ((shift.employee_name || 'Unknown Staff') === originalName) {
                            return { ...shift, employee_name: trimmedName, role: trimmedRole }
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
                }

                // Also update extraEmployees if present
                setExtraEmployees(prev => prev.map(emp => emp.name === originalName ? { ...emp, name: trimmedName, role: trimmedRole } : emp))
            }
            setEditingEmployee(null)
        } catch (err) {
            console.error('Error saving employee changes:', err)
            alert(`Failed to save employee changes: ${err.message}`)
        }
    }

    const handleDeleteEmployeeRow = async (employeeName) => {
        if (!window.confirm(`Are you sure you want to delete all shifts for "${employeeName}" this week?`)) return

        try {
            // Delete shifts from database
            if (activeSchedule && activeSchedule.schedule_data && activeSchedule.schedule_data.shifts) {
                const updatedShifts = activeSchedule.schedule_data.shifts.filter(
                    shift => (shift.employee_name || 'Unknown Staff') !== employeeName
                )

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
            }

            // Remove from extraEmployees if present
            setExtraEmployees(prev => prev.filter(emp => emp.name !== employeeName))
        } catch (err) {
            console.error('Error deleting employee row:', err)
            alert(`Failed to delete employee: ${err.message}`)
        }
    }

    const handleSetEmployeeColor = async (employeeName, colorId) => {
        try {
            // Update shifts in database
            if (activeSchedule && activeSchedule.schedule_data && activeSchedule.schedule_data.shifts) {
                const updatedShifts = activeSchedule.schedule_data.shifts.map(shift => {
                    if ((shift.employee_name || 'Unknown Staff') === employeeName) {
                        return { ...shift, color: colorId }
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
            }

            // Also update in extraEmployees if present
            setExtraEmployees(prev => prev.map(emp => emp.name === employeeName ? { ...emp, color: colorId } : emp))
            
            // Close the menu
            setActiveColorMenu(null)
        } catch (err) {
            console.error('Error setting employee color:', err)
            alert(`Failed to set employee color: ${err.message}`)
        }
    }

    const handleSaveShift = async () => {
        if (!editingShift || !activeSchedule || !activeSchedule.schedule_data) return

        const { isNew, employee_name, date, start_time, end_time, role, color, note, shiftIndex } = editingShift

        const trimmedStart = start_time.trim()
        const trimmedEnd = end_time.trim()

        if (!trimmedStart || !trimmedEnd) {
            alert('Start and End times are required.')
            return
        }

        try {
            const shifts = [...(activeSchedule.schedule_data.shifts || [])]
            const targetShift = {
                employee_name,
                date,
                start_time: trimmedStart,
                end_time: trimmedEnd,
                role: role.trim() || 'Crew',
                color: color || null,
                note: note.trim() || null
            }

            if (isNew) {
                shifts.push(targetShift)
            } else {
                shifts[shiftIndex] = targetShift
            }

            const finalizedSchedule = {
                ...activeSchedule,
                schedule_data: {
                    ...activeSchedule.schedule_data,
                    shifts
                }
            }

            const { error: saveErr } = await supabase
                .from('schedules')
                .upsert(finalizedSchedule)

            if (saveErr) throw saveErr

            // Remove from extraEmployees since they now have a shift saved in the DB
            setExtraEmployees(prev => prev.filter(emp => emp.name !== employee_name))
            setEditingShift(null)
        } catch (err) {
            console.error('Error saving shift:', err)
            alert(`Failed to save shift: ${err.message}`)
        }
    }

    const handleDeleteShift = async (shiftIndex, employeeName) => {
        if (!window.confirm('Are you sure you want to delete this shift?')) return
        if (!activeSchedule || !activeSchedule.schedule_data || !activeSchedule.schedule_data.shifts) return

        try {
            const shifts = activeSchedule.schedule_data.shifts.filter((_, idx) => idx !== shiftIndex)

            const finalizedSchedule = {
                ...activeSchedule,
                schedule_data: {
                    ...activeSchedule.schedule_data,
                    shifts
                }
            }

            const { error: saveErr } = await supabase
                .from('schedules')
                .upsert(finalizedSchedule)

            if (saveErr) throw saveErr

            // If the employee now has 0 shifts, add them to extraEmployees to prevent their row disappearing
            const employeeShiftsRemaining = shifts.filter(s => (s.employee_name || 'Unknown Staff') === employeeName)
            if (employeeShiftsRemaining.length === 0) {
                const origShift = activeSchedule.schedule_data.shifts[shiftIndex]
                const role = origShift ? origShift.role : 'Crew'
                setExtraEmployees(prev => {
                    if (prev.some(emp => emp.name === employeeName)) return prev
                    return [...prev, { name: employeeName, role }]
                })
            }
        } catch (err) {
            console.error('Error deleting shift:', err)
            alert(`Failed to delete shift: ${err.message}`)
        }
    }

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
                                                {editingEmployee && editingEmployee.originalName === row.name ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                                                        <input 
                                                            type="text" 
                                                            value={editingEmployee.name} 
                                                            onChange={(e) => setEditingEmployee({ ...editingEmployee, name: e.target.value })}
                                                            style={{
                                                                background: '#1f1f23',
                                                                border: '1px solid #3f3f46',
                                                                borderRadius: '4px',
                                                                color: '#fff',
                                                                padding: '6px 8px',
                                                                fontSize: '0.85rem',
                                                                width: '100%',
                                                                boxSizing: 'border-box'
                                                            }}
                                                            placeholder="Employee Name"
                                                            autoFocus
                                                        />
                                                        <input 
                                                            type="text" 
                                                            value={editingEmployee.role} 
                                                            onChange={(e) => setEditingEmployee({ ...editingEmployee, role: e.target.value })}
                                                            style={{
                                                                background: '#1f1f23',
                                                                border: '1px solid #3f3f46',
                                                                borderRadius: '4px',
                                                                color: '#a1a1aa',
                                                                padding: '6px 8px',
                                                                fontSize: '11px',
                                                                width: '100%',
                                                                boxSizing: 'border-box'
                                                            }}
                                                            placeholder="Role (e.g. Prep Cook)"
                                                        />
                                                        <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                                                            <button 
                                                                onClick={handleSaveEmployeeRow}
                                                                style={{
                                                                    background: '#f97316',
                                                                    border: 'none',
                                                                    color: '#0f1014',
                                                                    borderRadius: '4px',
                                                                    padding: '4px 8px',
                                                                    fontSize: '11px',
                                                                    fontWeight: 700,
                                                                    cursor: 'pointer'
                                                                }}
                                                            >
                                                                Save
                                                            </button>
                                                            <button 
                                                                onClick={() => {
                                                                    if (editingEmployee.isNew) {
                                                                        setExtraEmployees(extraEmployees.filter(emp => emp.name !== 'New Employee'))
                                                                    }
                                                                    setEditingEmployee(null)
                                                                }}
                                                                style={{
                                                                    background: 'rgba(255, 255, 255, 0.05)',
                                                                    border: '1px solid #27272a',
                                                                    color: '#a1a1aa',
                                                                    borderRadius: '4px',
                                                                    padding: '4px 8px',
                                                                    fontSize: '11px',
                                                                    cursor: 'pointer'
                                                                }}
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="employee-row-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', width: '100%' }}>
                                                        <div 
                                                            onClick={() => setSelectedEmployeeSchedule(row)}
                                                            style={{ 
                                                                display: 'flex', 
                                                                flexDirection: 'column', 
                                                                cursor: 'pointer',
                                                                userSelect: 'none',
                                                                flexGrow: 1
                                                            }}
                                                            title="Click to view weekly schedule"
                                                        >
                                                            <span 
                                                                style={{ 
                                                                    color: '#e4e4e7', 
                                                                    fontSize: '0.95rem', 
                                                                    fontWeight: 600,
                                                                    transition: 'color 0.15s ease'
                                                                }}
                                                                onMouseEnter={(e) => e.target.style.color = '#f97316'}
                                                                onMouseLeave={(e) => e.target.style.color = '#e4e4e7'}
                                                            >
                                                                {row.name}
                                                            </span>
                                                            <span style={{ color: '#71717a', fontSize: '11px', fontWeight: 500, marginTop: '2px', textTransform: 'uppercase' }}>{row.role}</span>
                                                        </div>
                                                        {officeMode && (
                                                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                                <button
                                                                    className="employee-action-btn"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        setEditingEmployee({ originalName: row.name, name: row.name, role: row.role })
                                                                    }}
                                                                    title="Edit Name & Role"
                                                                    style={{
                                                                        background: 'rgba(255,255,255,0.05)',
                                                                        border: '1px solid #27272a',
                                                                        color: '#a1a1aa',
                                                                        borderRadius: '4px',
                                                                        width: '24px',
                                                                        height: '24px',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        cursor: 'pointer',
                                                                        fontSize: '10px'
                                                                    }}
                                                                >
                                                                    <i className="fa-solid fa-pencil" />
                                                                </button>
                                                                <button
                                                                    className="employee-action-btn"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        handleDeleteEmployeeRow(row.name)
                                                                    }}
                                                                    title="Delete Employee"
                                                                    style={{
                                                                        background: 'rgba(239, 68, 68, 0.05)',
                                                                        border: '1px solid rgba(239, 68, 68, 0.2)',
                                                                        color: '#ef4444',
                                                                        borderRadius: '4px',
                                                                        width: '24px',
                                                                        height: '24px',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        cursor: 'pointer',
                                                                        fontSize: '10px'
                                                                    }}
                                                                >
                                                                    <i className="fa-solid fa-trash" />
                                                                </button>
                                                                <div style={{ position: 'relative' }}>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation()
                                                                            setActiveColorMenu(activeColorMenu?.employeeName === row.name ? null : { employeeName: row.name })
                                                                        }}
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
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation()
                                                                                        handleSetEmployeeColor(row.name, c.id)
                                                                                    }}
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
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation()
                                                                                    handleSetEmployeeColor(row.name, null)
                                                                                }}
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
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                            {weekDays.map(day => {
                                                const shifts = row.shiftsByDate[day.dateStr] || []
                                                const isToday = day.dateStr === todayStr
                                                const firstShift = shifts[0]
                                                const cellShiftColor = firstShift ? getShiftColor(firstShift, row.color, row.role) : null
                                                const cellColorMeta = cellShiftColor ? HIGHLIGHT_COLORS[cellShiftColor] : null
                                                return (
                                                    <td 
                                                        key={day.dayIndex} 
                                                        style={{ 
                                                            padding: '12px 16px', 
                                                            borderLeft: '1px solid #27272a',
                                                            background: isToday 
                                                                ? 'rgba(249, 115, 22, 0.02)' 
                                                                : (cellColorMeta ? cellColorMeta.glow : 'transparent'),
                                                            position: 'relative'
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', height: '100%', minHeight: '40px', justifyContent: 'center' }}>
                                                            {shifts.map((shift, idx) => {
                                                                const shiftColor = getShiftColor(shift, row.color, row.role)
                                                                const shiftColorMeta = shiftColor ? HIGHLIGHT_COLORS[shiftColor] : null
                                                                return (
                                                                    <div 
                                                                        key={idx}
                                                                        className="shift-card-interactive"
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
                                                                                : 'none',
                                                                            position: 'relative'
                                                                        }}
                                                                    >
                                                                        <span style={{ 
                                                                            fontSize: '0.85rem', 
                                                                            fontWeight: 700, 
                                                                            color: isToday 
                                                                                ? '#f97316' 
                                                                                : (shiftColorMeta ? shiftColorMeta.solid : '#e4e4e7'),
                                                                            paddingRight: officeMode ? '36px' : '0'
                                                                        }}>
                                                                            {shift.start_time} - {shift.end_time}
                                                                        </span>
                                                                        {shift.note && (
                                                                            <span style={{ fontSize: '10px', color: '#a1a1aa', fontWeight: 500 }}>
                                                                                {shift.note}
                                                                            </span>
                                                                        )}
                                                                        
                                                                        {officeMode && (
                                                                            <div 
                                                                                className="shift-card-actions"
                                                                                style={{
                                                                                    position: 'absolute',
                                                                                    right: '4px',
                                                                                    top: '50%',
                                                                                    transform: 'translateY(-50%)',
                                                                                    display: 'flex',
                                                                                    gap: '4px',
                                                                                    background: 'rgba(15, 16, 20, 0.95)',
                                                                                    padding: '2px 4px',
                                                                                    borderRadius: '4px',
                                                                                    border: '1px solid #27272a',
                                                                                    opacity: 0,
                                                                                    transition: 'opacity 0.2s'
                                                                                }}
                                                                            >
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation()
                                                                                        setEditingShift({
                                                                                            isNew: false,
                                                                                            employee_name: row.name,
                                                                                            date: day.dateStr,
                                                                                            start_time: shift.start_time,
                                                                                            end_time: shift.end_time,
                                                                                            role: row.role,
                                                                                            color: shift.color,
                                                                                            note: shift.note || '',
                                                                                            shiftIndex: shift.originalIndex
                                                                                        })
                                                                                    }}
                                                                                    style={{
                                                                                        background: 'none',
                                                                                        border: 'none',
                                                                                        color: '#a1a1aa',
                                                                                        cursor: 'pointer',
                                                                                        padding: '2px 4px',
                                                                                        fontSize: '10px'
                                                                                    }}
                                                                                    title="Edit Shift"
                                                                                >
                                                                                    <i className="fa-solid fa-pencil" />
                                                                                </button>
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation()
                                                                                        handleDeleteShift(shift.originalIndex, row.name)
                                                                                    }}
                                                                                    style={{
                                                                                        background: 'none',
                                                                                        border: 'none',
                                                                                        color: '#ef4444',
                                                                                        cursor: 'pointer',
                                                                                        padding: '2px 4px',
                                                                                        fontSize: '10px'
                                                                                    }}
                                                                                    title="Delete Shift"
                                                                                >
                                                                                    <i className="fa-solid fa-trash" />
                                                                                </button>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )
                                                            })}

                                                            {shifts.length === 0 && !officeMode && (
                                                                <div style={{ color: '#3f3f46', fontSize: '0.8rem', textAlign: 'center', padding: '8px 0' }}>—</div>
                                                            )}

                                                            {officeMode && (
                                                                <button
                                                                    onClick={() => setEditingShift({
                                                                        isNew: true,
                                                                        employee_name: row.name,
                                                                        date: day.dateStr,
                                                                        start_time: '',
                                                                        end_time: '',
                                                                        role: row.role,
                                                                        color: null,
                                                                        note: ''
                                                                    })}
                                                                    className="add-shift-inline-btn"
                                                                    style={{
                                                                        border: '1px dashed #27272a',
                                                                        background: 'none',
                                                                        color: '#71717a',
                                                                        borderRadius: '6px',
                                                                        padding: '6px 8px',
                                                                        fontSize: '0.75rem',
                                                                        cursor: 'pointer',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        gap: '4px',
                                                                        transition: 'all 0.2s',
                                                                        marginTop: shifts.length > 0 ? '4px' : '0'
                                                                    }}
                                                                >
                                                                    <i className="fa-solid fa-plus" /> Add Shift
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                )
                                            })}
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                        
                        {officeMode && (
                            <div style={{ padding: '12px 16px', borderTop: '1px solid #27272a', background: 'rgba(0,0,0,0.1)' }}>
                                <button
                                    onClick={handleAddEmployeeRow}
                                    style={{
                                        background: 'rgba(249, 115, 22, 0.1)',
                                        border: '1px dashed rgba(249, 115, 22, 0.4)',
                                        color: '#f97316',
                                        borderRadius: '6px',
                                        padding: '8px 16px',
                                        fontSize: '0.85rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'rgba(249, 115, 22, 0.15)';
                                        e.currentTarget.style.borderColor = '#f97316';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'rgba(249, 115, 22, 0.1)';
                                        e.currentTarget.style.borderColor = 'rgba(249, 115, 22, 0.4)';
                                    }}
                                >
                                    <i className="fa-solid fa-user-plus" />
                                    <span>Add Employee Row</span>
                                </button>
                            </div>
                        )}
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
                                const flatDayShifts = []
                                employeeRows.forEach(row => {
                                    const shifts = row.shiftsByDate[targetDayStr] || []
                                    shifts.forEach(shift => {
                                        flatDayShifts.push({
                                            employeeName: row.name,
                                            employeeRole: row.role,
                                            employeeColor: row.color,
                                            shift: shift
                                        })
                                    })
                                })

                                if (flatDayShifts.length === 0) {
                                    return (
                                        <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#71717a' }}>
                                            <i className="fa-solid fa-mug-hot" style={{ fontSize: '1.5rem', marginBottom: '0.75rem', opacity: 0.5 }} />
                                            <p style={{ fontSize: '0.85rem' }}>No kitchen shifts scheduled for this day.</p>
                                        </div>
                                    )
                                }

                                return (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {flatDayShifts.map((item, idx) => {
                                            const shiftColor = getShiftColor(item.shift, item.employeeColor, item.employeeRole)
                                            const shiftColorMeta = shiftColor ? HIGHLIGHT_COLORS[shiftColor] : null
                                            return (
                                                <div 
                                                    key={`${item.employeeName}_${idx}`}
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
                                                    <div 
                                                        onClick={() => {
                                                            const fullRow = employeeRows.find(r => r.name === item.employeeName)
                                                            if (fullRow) {
                                                                setSelectedEmployeeSchedule(fullRow)
                                                            }
                                                        }}
                                                        style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
                                                        title="Click to view weekly schedule"
                                                    >
                                                        <h4 
                                                            style={{ 
                                                                fontSize: '0.9rem', 
                                                                fontWeight: 700, 
                                                                color: '#e4e4e7',
                                                                transition: 'color 0.15s ease'
                                                            }}
                                                            onMouseEnter={(e) => e.target.style.color = '#f97316'}
                                                            onMouseLeave={(e) => e.target.style.color = '#e4e4e7'}
                                                        >
                                                            {item.employeeName}
                                                        </h4>
                                                        <span style={{ fontSize: '11px', color: shiftColorMeta ? shiftColorMeta.solid : '#71717a', textTransform: 'uppercase', fontWeight: shiftColorMeta ? 600 : 400 }}>
                                                            {item.shift.role || item.employeeRole}
                                                        </span>
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
                        width: '95vw', maxWidth: '1250px', maxHeight: '90vh',
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
                                <div style={{ border: '1px solid #27272a', borderRadius: '8px', overflow: 'hidden', paddingBottom: '8px', display: 'flex', flexDirection: 'column' }} className="custom-scrollbar-wrapper">
                                    <div style={{ maxHeight: '450px', overflowY: 'auto' }} className="custom-scrollbar">
                                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
                                            <thead>
                                                <tr style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid #27272a' }}>
                                                    <th style={{ padding: '8px 12px', color: '#a1a1aa' }}>Name</th>
                                                    <th style={{ padding: '8px 12px', color: '#a1a1aa', width: '120px' }}>Role</th>
                                                    <th style={{ padding: '8px 12px', color: '#a1a1aa', width: '120px' }}>Highlight</th>
                                                    <th style={{ padding: '8px 12px', color: '#a1a1aa', width: '110px' }}>Shift Date</th>
                                                    <th style={{ padding: '8px 12px', color: '#a1a1aa', width: '180px' }}>Shift Hours</th>
                                                    <th style={{ padding: '8px 12px', color: '#a1a1aa', width: '120px' }}>Note</th>
                                                    <th style={{ padding: '8px 12px', color: '#a1a1aa', width: '50px', textAlign: 'center' }}>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(pendingData.shifts || []).map((sh, idx) => {
                                                    const colorMeta = sh.color ? HIGHLIGHT_COLORS[sh.color] : null
                                                    const cellInputStyles = {
                                                        background: '#0f1014',
                                                        border: '1px solid #27272a',
                                                        borderRadius: '4px',
                                                        color: '#e4e4e7',
                                                        padding: '4px 8px',
                                                        fontSize: '0.75rem',
                                                        outline: 'none',
                                                        width: '100%',
                                                        boxSizing: 'border-box'
                                                    }
                                                    return (
                                                        <tr key={sh.id || sh.tempId || idx} style={{ 
                                                            borderBottom: '1px solid #1f1f23', 
                                                            background: idx % 2 === 1 ? 'rgba(255,255,255,0.01)' : 'transparent',
                                                            borderLeft: colorMeta ? `3px solid ${colorMeta.solid}` : 'none'
                                                        }}>
                                                            <td style={{ padding: '4px 8px' }}>
                                                                <input
                                                                    type="text"
                                                                    value={sh.employee_name || ''}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value
                                                                        const updatedShifts = pendingData.shifts.map((s, sIdx) => {
                                                                            if (sIdx === idx) return { ...s, employee_name: val }
                                                                            return s
                                                                        })
                                                                        setPendingData({ ...pendingData, shifts: updatedShifts })
                                                                    }}
                                                                    style={cellInputStyles}
                                                                />
                                                            </td>
                                                            <td style={{ padding: '4px 8px' }}>
                                                                <input
                                                                    type="text"
                                                                    value={sh.role || ''}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value
                                                                        const updatedShifts = pendingData.shifts.map((s, sIdx) => {
                                                                            if (sIdx === idx) return { ...s, role: val }
                                                                            return s
                                                                        })
                                                                        setPendingData({ ...pendingData, shifts: updatedShifts })
                                                                    }}
                                                                    style={cellInputStyles}
                                                                    placeholder="Crew"
                                                                />
                                                            </td>
                                                            <td style={{ padding: '4px 8px' }}>
                                                                <select
                                                                    value={sh.color || ''}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value || null
                                                                        const updatedShifts = pendingData.shifts.map((s, sIdx) => {
                                                                            if (sIdx === idx) return { ...s, color: val }
                                                                            return s
                                                                        })
                                                                        setPendingData({ ...pendingData, shifts: updatedShifts })
                                                                    }}
                                                                    style={{
                                                                        ...cellInputStyles,
                                                                        color: sh.color ? (HIGHLIGHT_COLORS[sh.color]?.solid || '#e4e4e7') : '#a1a1aa',
                                                                        fontWeight: sh.color ? 700 : 500
                                                                    }}
                                                                >
                                                                    <option value="" style={{ color: '#71717a' }}>None</option>
                                                                    <option value="orange" style={{ color: HIGHLIGHT_COLORS.orange.solid, fontWeight: 'bold' }}>Orange</option>
                                                                    <option value="yellow" style={{ color: HIGHLIGHT_COLORS.yellow.solid, fontWeight: 'bold' }}>AM (Yellow)</option>
                                                                    <option value="blue" style={{ color: HIGHLIGHT_COLORS.blue.solid, fontWeight: 'bold' }}>Pool (Blue)</option>
                                                                    <option value="green" style={{ color: HIGHLIGHT_COLORS.green.solid, fontWeight: 'bold' }}>Dish (Green)</option>
                                                                    <option value="pink" style={{ color: HIGHLIGHT_COLORS.pink.solid, fontWeight: 'bold' }}>Banquet (Pink)</option>
                                                                </select>
                                                            </td>
                                                            <td style={{ padding: '4px 8px' }}>
                                                                <select
                                                                    value={sh.date || ''}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value
                                                                        const updatedShifts = pendingData.shifts.map((s, sIdx) => {
                                                                            if (sIdx === idx) return { ...s, date: val }
                                                                            return s
                                                                        })
                                                                        setPendingData({ ...pendingData, shifts: updatedShifts })
                                                                    }}
                                                                    style={cellInputStyles}
                                                                >
                                                                    {getModalWeekDays().map(day => (
                                                                        <option key={day.dateStr} value={day.dateStr}>
                                                                            {day.label}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </td>
                                                            <td style={{ padding: '4px 8px' }}>
                                                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                                    <input
                                                                        type="text"
                                                                        value={sh.start_time || ''}
                                                                        onChange={(e) => {
                                                                            const val = e.target.value
                                                                            const updatedShifts = pendingData.shifts.map((s, sIdx) => {
                                                                                if (sIdx === idx) return { ...s, start_time: val }
                                                                                return s
                                                                            })
                                                                            setPendingData({ ...pendingData, shifts: updatedShifts })
                                                                        }}
                                                                        style={{ ...cellInputStyles, flex: 1, minWidth: '60px' }}
                                                                        placeholder="Start"
                                                                    />
                                                                    <span style={{ color: '#71717a', fontSize: '0.75rem' }}>-</span>
                                                                    <input
                                                                        type="text"
                                                                        value={sh.end_time || ''}
                                                                        onChange={(e) => {
                                                                            const val = e.target.value
                                                                            const updatedShifts = pendingData.shifts.map((s, sIdx) => {
                                                                                if (sIdx === idx) return { ...s, end_time: val }
                                                                                return s
                                                                            })
                                                                            setPendingData({ ...pendingData, shifts: updatedShifts })
                                                                        }}
                                                                        style={{ ...cellInputStyles, flex: 1, minWidth: '60px' }}
                                                                        placeholder="End"
                                                                    />
                                                                </div>
                                                            </td>
                                                            <td style={{ padding: '4px 8px' }}>
                                                                <input
                                                                    type="text"
                                                                    value={sh.note || ''}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value
                                                                        const updatedShifts = pendingData.shifts.map((s, sIdx) => {
                                                                            if (sIdx === idx) return { ...s, note: val }
                                                                            return s
                                                                        })
                                                                        setPendingData({ ...pendingData, shifts: updatedShifts })
                                                                    }}
                                                                    style={cellInputStyles}
                                                                    placeholder="Note"
                                                                />
                                                            </td>
                                                            <td style={{ padding: '4px 8px', textAlign: 'center' }}>
                                                                <button
                                                                    onClick={() => {
                                                                        const updatedShifts = pendingData.shifts.filter((_, sIdx) => sIdx !== idx)
                                                                        setPendingData({ ...pendingData, shifts: updatedShifts })
                                                                    }}
                                                                    style={{
                                                                        background: 'rgba(239, 68, 68, 0.1)',
                                                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                                                        borderRadius: '4px',
                                                                        color: '#ef4444',
                                                                        padding: '4px 8px',
                                                                        cursor: 'pointer',
                                                                        fontSize: '11px',
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        transition: 'all 0.15s ease'
                                                                    }}
                                                                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)' }}
                                                                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)' }}
                                                                    title="Delete Shift"
                                                                >
                                                                    <i className="fa-solid fa-trash-can" />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div style={{ padding: '8px 12px 0 12px' }}>
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                const newShift = {
                                                    employee_name: '',
                                                    role: '',
                                                    color: null,
                                                    date: modalWeekStart || (pendingData && pendingData.week_start) || new Date().toISOString().split('T')[0],
                                                    start_time: '',
                                                    end_time: '',
                                                    note: '',
                                                    tempId: 'new_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5)
                                                };
                                                setPendingData({ ...pendingData, shifts: [newShift, ...(pendingData.shifts || [])] });
                                            }}
                                            style={{
                                                background: 'rgba(255, 255, 255, 0.04)',
                                                border: '1px solid #27272a',
                                                borderRadius: '6px',
                                                color: '#e4e4e7',
                                                padding: '6px 12px',
                                                fontSize: '0.75rem',
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                transition: 'all 0.15s ease'
                                            }}
                                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)' }}
                                            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)' }}
                                        >
                                            <i className="fa-solid fa-plus" />
                                            <span>Add Custom Shift Row</span>
                                        </button>
                                    </div>
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
            {/* EMPLOYEE WEEKLY SCHEDULE DETAIL POPUP MODAL */}
            {selectedEmployeeSchedule && (
                <div 
                    className="weekly-schedule-modal-overlay"
                    onClick={() => setSelectedEmployeeSchedule(null)}
                >
                    <div 
                        className="weekly-schedule-modal-card"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            borderTop: selectedEmployeeSchedule.color && HIGHLIGHT_COLORS[selectedEmployeeSchedule.color] 
                                ? `4px solid ${HIGHLIGHT_COLORS[selectedEmployeeSchedule.color].solid}`
                                : '4px solid #f97316'
                        }}
                    >
                        {/* Close Button */}
                        <button 
                            onClick={() => setSelectedEmployeeSchedule(null)}
                            style={{
                                position: 'absolute',
                                top: '20px',
                                right: '20px',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid #27272a',
                                borderRadius: '50%',
                                width: '32px',
                                height: '32px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#a1a1aa',
                                cursor: 'pointer',
                                fontSize: '1rem',
                                transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.color = '#fff';
                                e.currentTarget.style.background = 'rgba(248, 113, 113, 0.2)';
                                e.currentTarget.style.borderColor = '#f87171';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.color = '#a1a1aa';
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                e.currentTarget.style.borderColor = '#27272a';
                            }}
                        >
                            <i className="fa-solid fa-xmark" />
                        </button>

                        {/* Roster Modal Header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '10px',
                                background: selectedEmployeeSchedule.color && HIGHLIGHT_COLORS[selectedEmployeeSchedule.color]
                                    ? HIGHLIGHT_COLORS[selectedEmployeeSchedule.color].bg
                                    : 'rgba(249, 115, 22, 0.12)',
                                border: `1px solid ${selectedEmployeeSchedule.color && HIGHLIGHT_COLORS[selectedEmployeeSchedule.color]
                                    ? HIGHLIGHT_COLORS[selectedEmployeeSchedule.color].border
                                    : 'rgba(249, 115, 22, 0.3)'}`,
                                color: selectedEmployeeSchedule.color && HIGHLIGHT_COLORS[selectedEmployeeSchedule.color]
                                    ? HIGHLIGHT_COLORS[selectedEmployeeSchedule.color].solid
                                    : '#f97316',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.25rem'
                            }}>
                                <i className="fa-solid fa-user-clock" />
                            </div>
                            <div>
                                <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: '#fff' }}>
                                    {selectedEmployeeSchedule.name}
                                </h2>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                                    <span style={{ fontSize: '11px', color: '#a1a1aa', fontWeight: 600, textTransform: 'uppercase', background: 'rgba(255, 255, 255, 0.04)', padding: '2px 8px', borderRadius: '4px' }}>
                                        {selectedEmployeeSchedule.role || 'Crew'}
                                    </span>
                                    <span style={{ fontSize: '11px', color: '#71717a' }}>
                                        •
                                    </span>
                                    <span style={{ fontSize: '11px', color: '#f97316', fontWeight: 600 }}>
                                        {Object.values(selectedEmployeeSchedule.shiftsByDate).flat().filter(Boolean).length} Shifts Scheduled This Week
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* 7-Day Scroll-Free Grid View */}
                        <div className="weekly-schedule-modal-grid">
                            {weekDays.map(day => {
                                const shifts = selectedEmployeeSchedule.shiftsByDate[day.dateStr] || []
                                const isToday = day.dateStr === todayStr

                                return (
                                    <div 
                                        key={day.dayIndex} 
                                        className={`weekly-day-card ${shifts.length > 0 ? 'has-shift' : 'is-off'}`}
                                        style={{
                                            border: isToday 
                                                ? '1px solid rgba(249, 115, 22, 0.4)' 
                                                : '1px solid #27272a',
                                            borderTop: isToday
                                                ? '4px solid #f97316'
                                                : '1px solid #27272a',
                                            boxShadow: isToday ? '0 0 15px rgba(249, 115, 22, 0.1)' : 'none',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '8px',
                                            minHeight: '120px'
                                        }}
                                    >
                                        {/* Day Info */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <span style={{ 
                                                fontSize: '11px', 
                                                fontWeight: 800, 
                                                textTransform: 'uppercase', 
                                                color: isToday ? '#f97316' : '#a1a1aa'
                                            }}>
                                                {day.dayName}
                                            </span>
                                            <span style={{ 
                                                fontSize: '11px', 
                                                color: isToday ? '#e4e4e7' : '#71717a'
                                            }}>
                                                {new Date(day.dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                            </span>
                                        </div>

                                        {/* Shift Hours / Off Status */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, justifyContent: shifts.length > 0 ? 'flex-start' : 'center' }}>
                                            {shifts.length > 0 ? (
                                                shifts.map((sh, sIdx) => {
                                                    const shiftColor = getShiftColor(sh, selectedEmployeeSchedule.color, selectedEmployeeSchedule.role)
                                                    const shiftColorMeta = shiftColor ? HIGHLIGHT_COLORS[shiftColor] : null
                                                    return (
                                                        <div 
                                                            key={sIdx} 
                                                            style={{ 
                                                                display: 'flex', 
                                                                flexDirection: 'column', 
                                                                gap: '2px', 
                                                                background: shiftColorMeta ? shiftColorMeta.bg : 'rgba(255,255,255,0.02)',
                                                                border: shiftColorMeta ? `1px solid ${shiftColorMeta.border}` : '1px solid #27272a',
                                                                borderLeft: shiftColorMeta ? `3px solid ${shiftColorMeta.solid}` : '1px solid #27272a',
                                                                padding: '6px 8px',
                                                                borderRadius: '6px'
                                                            }}
                                                        >
                                                            <div style={{ 
                                                                fontSize: '0.8rem', 
                                                                fontWeight: 700, 
                                                                color: shiftColorMeta ? shiftColorMeta.solid : '#f97316' 
                                                            }}>
                                                                {sh.start_time} - {sh.end_time}
                                                            </div>
                                                            {sh.role && sh.role !== selectedEmployeeSchedule.role && (
                                                                <div style={{ fontSize: '9px', color: '#a1a1aa', textTransform: 'uppercase' }}>
                                                                    {sh.role}
                                                                </div>
                                                            )}
                                                            {sh.note && (
                                                                <div style={{ 
                                                                    fontSize: '9px', 
                                                                    color: '#e4e4e7', 
                                                                    fontStyle: 'italic'
                                                                }}>
                                                                    {sh.note}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )
                                                })
                                            ) : (
                                                <div style={{ 
                                                    fontSize: '0.75rem', 
                                                    fontWeight: 600, 
                                                    color: '#3f3f46', 
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '4px'
                                                }}>
                                                    <i className="fa-regular fa-calendar-xmark" style={{ fontSize: '0.85rem' }} />
                                                    <span>Scheduled Off</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Roster Action Details Footer */}
                        <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            marginTop: '4px', 
                            paddingTop: '16px', 
                            borderTop: '1px solid #27272a',
                            flexWrap: 'wrap',
                            gap: '12px'
                        }}>
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f97316' }} />
                                    <span style={{ fontSize: '11px', color: '#a1a1aa' }}>Week Starting: <strong>{new Date(activeWeekStart + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</strong></span>
                                </div>
                            </div>
                            
                            <button 
                                onClick={() => setSelectedEmployeeSchedule(null)}
                                style={{
                                    background: '#f97316',
                                    border: 'none',
                                    color: '#0f1014',
                                    padding: '8px 20px',
                                    borderRadius: '6px',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#ea580c';
                                    e.currentTarget.style.boxShadow = '0 0 12px rgba(249, 115, 22, 0.2)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = '#f97316';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            >
                                Close Week View
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* SHIFT EDITOR MODAL (Office mode only) */}
            {editingShift && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(15, 16, 20, 0.85)', backdropFilter: 'blur(12px)',
                    zIndex: 160, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '1rem'
                }} onClick={() => setEditingShift(null)}>
                    <div style={{
                        background: '#15161c',
                        border: editingShift.color && HIGHLIGHT_COLORS[editingShift.color] 
                            ? `1px solid ${HIGHLIGHT_COLORS[editingShift.color].border}` 
                            : '1px solid #27272a',
                        borderTop: editingShift.color && HIGHLIGHT_COLORS[editingShift.color]
                            ? `4px solid ${HIGHLIGHT_COLORS[editingShift.color].solid}`
                            : '4px solid #f97316',
                        borderRadius: '12px',
                        padding: '1.5rem',
                        width: '100%',
                        maxWidth: '460px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1.25rem',
                        position: 'relative',
                        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)'
                    }} onClick={(e) => e.stopPropagation()}>
                        
                        {/* Close Button */}
                        <button 
                            onClick={() => setEditingShift(null)}
                            style={{
                                position: 'absolute',
                                top: '16px',
                                right: '16px',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid #27272a',
                                borderRadius: '50%',
                                width: '30px',
                                height: '30px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#a1a1aa',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.color = '#fff';
                                e.currentTarget.style.background = 'rgba(248, 113, 113, 0.2)';
                                e.currentTarget.style.borderColor = '#f87171';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.color = '#a1a1aa';
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                e.currentTarget.style.borderColor = '#27272a';
                            }}
                        >
                            <i className="fa-solid fa-xmark" />
                        </button>

                        {/* Header */}
                        <div>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: '#fff' }}>
                                {editingShift.isNew ? 'Add New Shift' : 'Edit Shift'}
                            </h3>
                            <p style={{ fontSize: '0.85rem', color: '#a1a1aa', marginTop: '4px' }}>
                                For <strong>{editingShift.employee_name}</strong> on {editingShift.date ? new Date(editingShift.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) : ''}
                            </p>
                        </div>

                        {/* Fields */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {/* Time range */}
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#a1a1aa', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase' }}>
                                        Start Time
                                    </label>
                                    <input
                                        type="text"
                                        value={editingShift.start_time || ''}
                                        onChange={(e) => setEditingShift({ ...editingShift, start_time: e.target.value })}
                                        placeholder="e.g. 8:00 AM"
                                        autoFocus
                                        style={{
                                            width: '100%',
                                            background: '#0f1014',
                                            border: '1px solid #27272a',
                                            borderRadius: '6px',
                                            padding: '10px 12px',
                                            color: '#e4e4e7',
                                            fontSize: '0.9rem',
                                            outline: 'none'
                                        }}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#a1a1aa', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase' }}>
                                        End Time
                                    </label>
                                    <input
                                        type="text"
                                        value={editingShift.end_time || ''}
                                        onChange={(e) => setEditingShift({ ...editingShift, end_time: e.target.value })}
                                        placeholder="e.g. 4:00 PM"
                                        style={{
                                            width: '100%',
                                            background: '#0f1014',
                                            border: '1px solid #27272a',
                                            borderRadius: '6px',
                                            padding: '10px 12px',
                                            color: '#e4e4e7',
                                            fontSize: '0.9rem',
                                            outline: 'none'
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Role & Color */}
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#a1a1aa', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase' }}>
                                        Role
                                    </label>
                                    <input
                                        type="text"
                                        value={editingShift.role || ''}
                                        onChange={(e) => setEditingShift({ ...editingShift, role: e.target.value })}
                                        placeholder="e.g. Cook, Dishwasher"
                                        style={{
                                            width: '100%',
                                            background: '#0f1014',
                                            border: '1px solid #27272a',
                                            borderRadius: '6px',
                                            padding: '10px 12px',
                                            color: '#e4e4e7',
                                            fontSize: '0.9rem',
                                            outline: 'none'
                                        }}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#a1a1aa', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase' }}>
                                        Color Highlight
                                    </label>
                                    <select
                                        value={editingShift.color || ''}
                                        onChange={(e) => setEditingShift({ ...editingShift, color: e.target.value || null })}
                                        style={{
                                            width: '100%',
                                            background: '#0f1014',
                                            border: '1px solid #27272a',
                                            borderRadius: '6px',
                                            padding: '10px 12px',
                                            color: editingShift.color ? (HIGHLIGHT_COLORS[editingShift.color]?.solid || '#e4e4e7') : '#e4e4e7',
                                            fontSize: '0.9rem',
                                            fontWeight: editingShift.color ? 700 : 400,
                                            outline: 'none'
                                        }}
                                    >
                                        <option value="" style={{ color: '#71717a' }}>Clear / None</option>
                                        <option value="orange" style={{ color: HIGHLIGHT_COLORS.orange.solid, fontWeight: 'bold' }}>Orange</option>
                                        <option value="yellow" style={{ color: HIGHLIGHT_COLORS.yellow.solid, fontWeight: 'bold' }}>AM (Yellow)</option>
                                        <option value="blue" style={{ color: HIGHLIGHT_COLORS.blue.solid, fontWeight: 'bold' }}>Pool (Blue)</option>
                                        <option value="green" style={{ color: HIGHLIGHT_COLORS.green.solid, fontWeight: 'bold' }}>Dish (Green)</option>
                                        <option value="pink" style={{ color: HIGHLIGHT_COLORS.pink.solid, fontWeight: 'bold' }}>Banquet (Pink)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Shift Note */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: '#a1a1aa', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase' }}>
                                    Shift Note
                                </label>
                                <input
                                    type="text"
                                    value={editingShift.note || ''}
                                    onChange={(e) => setEditingShift({ ...editingShift, note: e.target.value })}
                                    placeholder="e.g. Banquet Prep, Pool Bar Opening"
                                    style={{
                                        width: '100%',
                                        background: '#0f1014',
                                        border: '1px solid #27272a',
                                        borderRadius: '6px',
                                        padding: '10px 12px',
                                        color: '#e4e4e7',
                                        fontSize: '0.9rem',
                                        outline: 'none'
                                    }}
                                />
                            </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px', borderTop: '1px solid #27272a', paddingTop: '16px' }}>
                            <button
                                onClick={() => setEditingShift(null)}
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
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveShift}
                                style={{
                                    background: '#f97316',
                                    border: '1px solid #f97316',
                                    color: '#0f1014',
                                    borderRadius: '6px',
                                    padding: '8px 18px',
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#ea580c';
                                    e.currentTarget.style.borderColor = '#ea580c';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = '#f97316';
                                    e.currentTarget.style.borderColor = '#f97316';
                                }}
                            >
                                Save Shift
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

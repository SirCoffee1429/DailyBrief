import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { localDateString } from '../lib/dates.js'

export default function EventsBanquetsPage({ readOnly = false }) {
    const location = useLocation()
    const isOffice = location.pathname.startsWith('/office')
    const isFOH = location.pathname.startsWith('/foh')
    const isKitchen = location.pathname.startsWith('/kitchen')

    const [notes, setNotes] = useState([])
    const [banquets, setBanquets] = useState([])
    const [beos, setBeos] = useState([])
    const [newText, setNewText] = useState('')
    const [authorName, setAuthorName] = useState(() => localStorage.getItem('mgmt_author') || '')
    const [posting, setPosting] = useState(false)
    const [loadingBanquets, setLoadingBanquets] = useState(true)
    const [uploadingBEO, setUploadingBEO] = useState(false)

    // Event tasks keyed by beo_id
    const [tasksByBeo, setTasksByBeo] = useState({})
    const [newTaskText, setNewTaskText] = useState({})

    // Track which BEO cards are expanded
    const [expandedBeos, setExpandedBeos] = useState({})

    // Office edit state: { [beoId]: editedDraft }
    const [editingBeo, setEditingBeo] = useState(null)
    const [editDraft, setEditDraft] = useState(null)
    const [savingEdit, setSavingEdit] = useState(false)

    // Per-event crew notes state
    const [notesOpen, setNotesOpen] = useState({})         // { [beoId]: boolean }
    const [notesDraft, setNotesDraft] = useState({})       // { [beoId]: string }
    const [savingNotes, setSavingNotes] = useState({})     // { [beoId]: boolean }

    // Per-event order list state (office-only)
    const [orderItemsByBeo, setOrderItemsByBeo] = useState({})  // { [beoId]: orderItem[] }
    const [generatingOrderFor, setGeneratingOrderFor] = useState(null)
    const [newOrderText, setNewOrderText] = useState({})        // { [beoId]: string }
    const [activeNoteId, setActiveNoteId] = useState(null)      // itemId currently in note-edit mode
    const [orderNoteDrafts, setOrderNoteDrafts] = useState({})  // { [itemId]: string }

    // Per-event prep list + subtask state
    const [generatingPrepFor, setGeneratingPrepFor] = useState(null)       // UUID | null — which BEO is generating prep
    const [expandedTasks, setExpandedTasks] = useState({})                  // { [taskId]: boolean } — subtask collapse state (default expanded)
    const [collapsedTaskPanels, setCollapsedTaskPanels] = useState({})      // { [beoId]: boolean } — true = collapsed, falsy/absent = expanded
    const [newSubtaskText, setNewSubtaskText] = useState({})                // { [taskId]: string } — subtask input value
    const [showSubtaskInputFor, setShowSubtaskInputFor] = useState({})      // { [taskId]: boolean } — show add-subtask input

    // Duplicate BEO confirmation state
    const [beoConflicts, setBeoConflicts] = useState([])       // [{ existing, incoming }]
    const [pendingBeoEvents, setPendingBeoEvents] = useState(null) // parsed events waiting for overwrite confirm

    const accent = '#60a5fa'
    const accentBg = 'rgba(96, 165, 250, 0.08)'
    const accentBorder = 'rgba(96, 165, 250, 0.2)'

    useEffect(() => {
        loadNotes()
        loadBanquets()
        loadBEOS()
    }, [])

    // Load event tasks and order items whenever BEOs change
    useEffect(() => {
        if (beos.length > 0 && !isFOH) {
            loadAllEventTasks()
            if (isOffice) loadOrderItems()
        }
    }, [beos])

    // Subscribe to live event_tasks changes so task status (in progress / done)
    // reflects across all devices in real time without a manual refresh.
    useEffect(() => {
        if (beos.length === 0 || isFOH) return
        const channel = supabase
            .channel('event_tasks_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'event_tasks' }, () => loadAllEventTasks())
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [beos])

    async function loadNotes() {
        const { data } = await supabase
            .from('management_notes')
            .select('*')
            .eq('category', 'events')
            .order('pinned', { ascending: false })
            .order('created_at', { ascending: false })
        setNotes(data || [])
    }

    async function loadBanquets() {
        try {
            const { data } = await supabase
                .from('upcoming_banquets')
                .select('*')
                // Local date, not UTC — toISOString() rolls over at 7pm Central, which dropped
                // the current day's events from the list five hours before the day was over.
                .gte('event_date', localDateString())
                .order('event_date', { ascending: true })
            setBanquets(data || [])
        } catch(err) {
            console.error('Error fetching banquets', err);
        } finally {
            setLoadingBanquets(false)
        }
    }

    async function loadBEOS() {
        const { data } = await supabase
            .from('banquet_event_orders')
            .select('*')
            .order('event_date', { ascending: true })
        setBeos(data || [])
    }

    // Fetch all event tasks for loaded BEOs
    async function loadAllEventTasks() {
        const beoIds = beos.map(b => b.id)
        const { data } = await supabase
            .from('event_tasks')
            .select('*')
            .in('beo_id', beoIds)
            .order('sort_order')
            .order('created_at')
        // Group tasks by beo_id
        const grouped = {}
        ;(data || []).forEach(t => {
            if (!grouped[t.beo_id]) grouped[t.beo_id] = []
            grouped[t.beo_id].push(t)
        })
        setTasksByBeo(grouped)
    }

    // Add a task to a specific BEO (office only)
    async function addEventTask(beoId) {
        const text = (newTaskText[beoId] || '').trim()
        if (!text) return
        const currentTasks = tasksByBeo[beoId] || []
        const nextOrder = currentTasks.length
        const { error } = await supabase
            .from('event_tasks')
            .insert({ beo_id: beoId, description: text, sort_order: nextOrder })
        if (!error) {
            setNewTaskText(prev => ({ ...prev, [beoId]: '' }))
            await loadAllEventTasks()
        }
    }

    // Add a manual subtask to an existing task (office only)
    async function addSubtask(parentId, beoId) {
        const text = (newSubtaskText[parentId] || '').trim()
        if (!text) return
        const siblings = (tasksByBeo[beoId] || []).filter(t => t.parent_id === parentId)
        const { error } = await supabase.from('event_tasks').insert({
            beo_id: beoId,
            parent_id: parentId,
            description: text,
            is_generated: false,
            sort_order: siblings.length,
        })
        if (error) {
            console.error('Failed to add subtask:', error)
            alert('Failed to save subtask. Please try again.')
            return
        }
        setNewSubtaskText(prev => ({ ...prev, [parentId]: '' }))
        setShowSubtaskInputFor(prev => ({ ...prev, [parentId]: false }))
        await loadAllEventTasks()
    }

    // Toggle task completion (kitchen + office) with hierarchical syncing
    async function toggleEventTask(taskId, isCompleted) {
        const newCompleted = !isCompleted

        // Find if this task is a parent task or a subtask
        let subtaskIds = []
        let parentTask = null
        let siblingTasks = []
        let parentId = null

        for (const tasks of Object.values(tasksByBeo)) {
            const task = tasks.find(t => t.id === taskId)
            if (task) {
                parentId = task.parent_id
                if (!parentId) {
                    // This is a parent task. Find its children.
                    subtaskIds = tasks.filter(t => t.parent_id === taskId).map(t => t.id)
                } else {
                    // This is a subtask. Find its parent and sibling subtasks.
                    parentTask = tasks.find(t => t.id === parentId)
                    siblingTasks = tasks.filter(t => t.parent_id === parentId)
                }
                break
            }
        }

        const promises = []
        // 1. Update the clicked task itself in Supabase
        promises.push(
            supabase
                .from('event_tasks')
                .update({ is_completed: newCompleted, in_progress: false })
                .eq('id', taskId)
        )

        // 2. If it's a parent task, update all of its subtasks to the same status in Supabase
        if (subtaskIds.length > 0) {
            promises.push(
                supabase
                    .from('event_tasks')
                    .update({ is_completed: newCompleted, in_progress: false })
                    .in('id', subtaskIds)
            )
        }

        // 3. If it's a subtask, check if we need to auto-update the parent's status in Supabase
        let autoParentCompleted = null
        if (parentId && parentTask) {
            const updatedSiblings = siblingTasks.map(t =>
                t.id === taskId ? { ...t, is_completed: newCompleted } : t
            )
            const allSiblingsCompleted = updatedSiblings.every(t => t.is_completed)

            if (allSiblingsCompleted && !parentTask.is_completed) {
                autoParentCompleted = true
            } else if (!newCompleted && parentTask.is_completed) {
                autoParentCompleted = false
            }

            if (autoParentCompleted !== null) {
                promises.push(
                    supabase
                        .from('event_tasks')
                        .update({ is_completed: autoParentCompleted, in_progress: false })
                        .eq('id', parentId)
                )
            }
        }

        await Promise.all(promises)

        // 4. Update the local React state
        setTasksByBeo(prev => {
            const updated = {}
            for (const [beoId, tasks] of Object.entries(prev)) {
                updated[beoId] = tasks.map(t => {
                    if (t.id === taskId) {
                        return { ...t, is_completed: newCompleted, in_progress: false }
                    }
                    if (subtaskIds.includes(t.id)) {
                        return { ...t, is_completed: newCompleted, in_progress: false }
                    }
                    if (autoParentCompleted !== null && t.id === parentId) {
                        return { ...t, is_completed: autoParentCompleted, in_progress: false }
                    }
                    return t
                })
            }
            return updated
        })
    }

    // Toggle a single task's "being worked on" (in progress) state.
    // Independent per row — no parent/subtask cascade (a parent never reflects a subtask's progress).
    async function toggleInProgress(taskId, current) {
        const newVal = !current
        // Optimistic local update for instant feedback; the realtime subscription confirms across devices.
        setTasksByBeo(prev => {
            const updated = {}
            for (const [beoId, tasks] of Object.entries(prev)) {
                updated[beoId] = tasks.map(t => t.id === taskId ? { ...t, in_progress: newVal } : t)
            }
            return updated
        })
        const { error } = await supabase
            .from('event_tasks')
            .update({ in_progress: newVal })
            .eq('id', taskId)
        if (error) {
            console.error('Failed to toggle in-progress state:', error)
            // Revert to authoritative state on failure.
            await loadAllEventTasks()
        }
    }

    // Delete a task (office only)
    async function deleteEventTask(taskId) {
        await supabase.from('event_tasks').delete().eq('id', taskId)
        setTasksByBeo(prev => {
            const updated = {}
            for (const [beoId, tasks] of Object.entries(prev)) {
                updated[beoId] = tasks.filter(t => t.id !== taskId && t.parent_id !== taskId)
            }
            return updated
        })
    }

    // Fetch all order items for loaded BEOs (office-only)
    async function loadOrderItems() {
        const beoIds = beos.map(b => b.id)
        const { data } = await supabase
            .from('event_order_items')
            .select('*')
            .in('beo_id', beoIds)
            .order('sort_order')
            .order('created_at')
        const grouped = {}
        ;(data || []).forEach(item => {
            if (!grouped[item.beo_id]) grouped[item.beo_id] = []
            grouped[item.beo_id].push(item)
        })
        setOrderItemsByBeo(grouped)
    }

    // Call Gemini to break BEO food items into purchasable ingredients, then persist them
    async function generateOrderItems(beo) {
        if (!beo.sections || beo.sections.length === 0) {
            alert('This BEO has no menu sections to generate from.')
            return
        }
        setGeneratingOrderFor(beo.id)
        try {
            const { data, error } = await supabase.functions.invoke('generate-order-items', {
                body: { sections: beo.sections },
            })
            if (error) throw error

            const dishes = data?.items || []
            if (dishes.length === 0) {
                alert('No food items found in this BEO to generate from.')
                return
            }

            // Clear old AI-generated items, leave manual ones untouched
            await supabase
                .from('event_order_items')
                .delete()
                .eq('beo_id', beo.id)
                .eq('is_manual', false)

            // Flatten dish → ingredients into insert rows, preserving dish grouping via sort_order
            const rows = []
            dishes.forEach((dish, dishIdx) => {
                ;(dish.ingredients || []).forEach((ingredient, ingIdx) => {
                    rows.push({
                        beo_id: beo.id,
                        item_name: ingredient,
                        source_dish: dish.source_dish,
                        is_ordered: false,
                        is_manual: false,
                        sort_order: dishIdx * 100 + ingIdx,
                    })
                })
            })

            if (rows.length > 0) {
                await supabase.from('event_order_items').insert(rows)
            }

            await loadOrderItems()
        } catch (err) {
            console.error('Error generating order items:', err)
            alert('Failed to generate order list. Check console for details.')
        } finally {
            setGeneratingOrderFor(null)
        }
    }

    // Call Gemini to generate kitchen prep tasks from BEO food items, insert into event_tasks
    async function generatePrepTasks(beo) {
        if (!beo.sections || beo.sections.length === 0) {
            alert('This BEO has no menu sections to generate from.')
            return
        }
        setGeneratingPrepFor(beo.id)
        try {
            const meal_types = [...new Set(
                (beo.sections || []).map(s => s.meal_type).filter(Boolean)
            )]
            const { data, error } = await supabase.functions.invoke('generate-prep-tasks', {
                body: { sections: beo.sections, event_name: beo.event_name || '', meal_types },
            })
            if (error) throw error

            const tasks = data?.tasks || []
            if (tasks.length === 0) {
                alert('No prep tasks could be generated from this BEO.')
                return
            }

            // Delete AI-generated root tasks only — ON DELETE CASCADE handles their subtasks automatically
            await supabase
                .from('event_tasks')
                .delete()
                .eq('beo_id', beo.id)
                .eq('is_generated', true)
                .is('parent_id', null)

            // Insert each parent task then its subtasks (sequential — need parent ID before inserting children)
            for (let i = 0; i < tasks.length; i++) {
                const { task: description, subtasks } = tasks[i]

                const { data: parentRow, error: insertErr } = await supabase
                    .from('event_tasks')
                    .insert({
                        beo_id: beo.id,
                        description,
                        is_generated: true,
                        sort_order: i * 100,
                        parent_id: null,
                    })
                    .select()
                    .single()

                if (insertErr || !parentRow) continue

                if (subtasks && subtasks.length > 0) {
                    const subtaskRows = subtasks.map((s, j) => ({
                        beo_id: beo.id,
                        parent_id: parentRow.id,
                        description: s,
                        is_generated: true,
                        sort_order: i * 100 + j + 1,
                    }))
                    const { error: subErr } = await supabase.from('event_tasks').insert(subtaskRows)
                    if (subErr) console.error('Failed to insert subtasks for task:', parentRow.id, subErr)
                }
            }

            await loadAllEventTasks()
        } catch (err) {
            console.error('Error generating prep tasks:', err)
            alert('Failed to generate prep list. Please try again.')
        } finally {
            setGeneratingPrepFor(null)
        }
    }

    // Toggle ordered status on a single order item
    async function toggleOrderItem(itemId, isOrdered) {
        await supabase
            .from('event_order_items')
            .update({ is_ordered: !isOrdered })
            .eq('id', itemId)
        setOrderItemsByBeo(prev => {
            const updated = {}
            for (const [beoId, items] of Object.entries(prev)) {
                updated[beoId] = items.map(i =>
                    i.id === itemId ? { ...i, is_ordered: !isOrdered } : i
                )
            }
            return updated
        })
    }

    // Toggle ordered status for all ingredients under a specific source dish group
    async function toggleAllOrderItemsForDish(beoId, dishName, currentAllChecked) {
        const newVal = !currentAllChecked
        await supabase
            .from('event_order_items')
            .update({ is_ordered: newVal })
            .eq('beo_id', beoId)
            .eq('source_dish', dishName)
            .eq('is_manual', false)

        setOrderItemsByBeo(prev => {
            const updated = {}
            for (const [id, items] of Object.entries(prev)) {
                if (id === beoId) {
                    updated[id] = items.map(i =>
                        (i.source_dish === dishName && !i.is_manual) ? { ...i, is_ordered: newVal } : i
                    )
                } else {
                    updated[id] = items
                }
            }
            return updated
        })
    }

    // Toggle ordered status for all custom (manual) order items
    async function toggleAllOrderItemsForCustom(beoId, currentAllChecked) {
        const newVal = !currentAllChecked
        await supabase
            .from('event_order_items')
            .update({ is_ordered: newVal })
            .eq('beo_id', beoId)
            .eq('is_manual', true)

        setOrderItemsByBeo(prev => {
            const updated = {}
            for (const [id, items] of Object.entries(prev)) {
                if (id === beoId) {
                    updated[id] = items.map(i =>
                        i.is_manual ? { ...i, is_ordered: newVal } : i
                    )
                } else {
                    updated[id] = items
                }
            }
            return updated
        })
    }

    // Manually add a custom order item to a BEO
    async function addOrderItem(beoId) {
        const text = (newOrderText[beoId] || '').trim()
        if (!text) return
        const currentItems = orderItemsByBeo[beoId] || []
        const { error } = await supabase.from('event_order_items').insert({
            beo_id: beoId,
            item_name: text,
            source_dish: null,
            is_ordered: false,
            is_manual: true,
            sort_order: currentItems.length * 100,
        })
        if (!error) {
            setNewOrderText(prev => ({ ...prev, [beoId]: '' }))
            await loadOrderItems()
        }
    }

    // Delete a single order item
    async function deleteOrderItem(itemId) {
        await supabase.from('event_order_items').delete().eq('id', itemId)
        setOrderItemsByBeo(prev => {
            const updated = {}
            for (const [beoId, items] of Object.entries(prev)) {
                updated[beoId] = items.filter(i => i.id !== itemId)
            }
            return updated
        })
    }

    // Save an inline note on a single order item; no-op if value unchanged
    async function saveOrderItemNote(itemId, note) {
        setActiveNoteId(null)
        const trimmed = note.trim() || null
        let currentNote = null
        for (const items of Object.values(orderItemsByBeo)) {
            const found = items.find(i => i.id === itemId)
            if (found) { currentNote = found.note || null; break }
        }
        if (trimmed === currentNote) return
        await supabase.from('event_order_items').update({ note: trimmed }).eq('id', itemId)
        setOrderItemsByBeo(prev => {
            const updated = {}
            for (const [beoId, items] of Object.entries(prev)) {
                updated[beoId] = items.map(i => i.id === itemId ? { ...i, note: trimmed } : i)
            }
            return updated
        })
    }

    async function handlePost() {
        const content = newText.trim()
        if (!content) return
        setPosting(true)
        const author = authorName.trim() || 'Manager'
        localStorage.setItem('mgmt_author', author)
        const { error } = await supabase
            .from('management_notes')
            .insert({ content, author, category: 'events', pinned: false })
        if (!error) {
            setNewText('')
            await loadNotes()
        }
        setPosting(false)
    }

    async function handleDelete(id) {
        await supabase.from('management_notes').delete().eq('id', id)
        setNotes(prev => prev.filter(n => n.id !== id))
    }

    async function handleBEOUpload(e) {
        const file = e.target.files?.[0];
        if (!file) return;
        // Reset the input so the same file can be re-selected after a cancel
        e.target.value = '';

        setUploadingBEO(true);
        try {
            const base64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result.split(',')[1]);
                reader.onerror = () => reject(new Error('Failed to read file'));
                reader.readAsDataURL(file);
            });

            const { data, error } = await supabase.functions.invoke('process-beo', {
                body: { pdfBase64: base64 }
            });

            if (error) throw error;

            // Duplicate detected — hold parsed events and show confirmation UI
            if (data?.needsConfirmation) {
                setBeoConflicts(data.conflicts || []);
                setPendingBeoEvents(data.parsedEvents || []);
                return;
            }

            await loadBEOS();
            alert("BEO Parsed Successfully!");
        } catch (err) {
            console.error("Error uploading BEO:", err);
            const errMsg = err?.message || String(err);
            if (errMsg.includes('504') || errMsg.toLowerCase().includes('timeout') || errMsg.toLowerCase().includes('abort')) {
                alert("Timeout Error: The BEO parsing request took too long. The Gemini AI model may be temporarily congested, or the PDF is too large/complex. Please try uploading again in a moment.");
            } else {
                alert(`Failed to parse BEO. Details: ${errMsg}`);
            }
        } finally {
            setUploadingBEO(false);
        }
    }

    // Called when user confirms overwriting the conflicting BEOs
    async function handleBeoOverwriteConfirm() {
        if (!pendingBeoEvents) return;
        setUploadingBEO(true);
        try {
            const { data, error } = await supabase.functions.invoke('process-beo', {
                body: { parsedEvents: pendingBeoEvents, overwrite: true }
            });

            if (error) throw error;

            setBeoConflicts([]);
            setPendingBeoEvents(null);
            await loadBEOS();
            const updated = data?.updated ?? 0;
            const inserted = data?.inserted ?? 0;
            const parts = [];
            if (updated > 0) parts.push(`${updated} BEO${updated > 1 ? 's' : ''} updated`);
            if (inserted > 0) parts.push(`${inserted} new BEO${inserted > 1 ? 's' : ''} added`);
            alert(`${parts.join(', ')}. Tasks, notes, and order items preserved.`);
        } catch (err) {
            console.error("Error overwriting BEO:", err);
            const errMsg = err?.message || String(err);
            if (errMsg.includes('504') || errMsg.toLowerCase().includes('timeout') || errMsg.toLowerCase().includes('abort')) {
                alert("Timeout Error: The BEO overwrite confirmation took too long. The system may be temporarily overloaded. Please try again in a moment.");
            } else {
                alert(`Failed to overwrite BEO. Details: ${errMsg}`);
            }
        } finally {
            setUploadingBEO(false);
        }
    }

    function handleBeoOverwriteCancel() {
        setBeoConflicts([]);
        setPendingBeoEvents(null);
    }

    async function togglePin(id, currentPinned) {
        await supabase.from('management_notes').update({ pinned: !currentPinned }).eq('id', id)
        await loadNotes()
    }

    async function handleDeleteBEO(id) {
        await supabase.from('banquet_event_orders').delete().eq('id', id)
        setBeos(prev => prev.filter(b => b.id !== id))
    }

    async function handleClearAllBEOs() {
        if (!confirm('Are you sure you want to clear all BEOs? This cannot be undone.')) return
        const ids = beos.map(b => b.id)
        await supabase.from('banquet_event_orders').delete().in('id', ids)
        setBeos([])
    }

    async function toggleBEOComplete(id, currentCompleted) {
        const newVal = !currentCompleted
        await supabase.from('banquet_event_orders').update({ completed: newVal }).eq('id', id)
        setBeos(prev => prev.map(b => b.id === id ? { ...b, completed: newVal } : b))
    }

    function timeAgo(dateStr) {
        const diff = Date.now() - new Date(dateStr).getTime()
        const mins = Math.floor(diff / 60000)
        if (mins < 1) return 'Just now'
        if (mins < 60) return `${mins}m ago`
        const hrs = Math.floor(mins / 60)
        if (hrs < 24) return `${hrs}h ago`
        const days = Math.floor(hrs / 24)
        if (days === 1) return 'Yesterday'
        return `${days}d ago`
    }

    function handleKeyDown(e) {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            handlePost()
        }
    }

    // Whether to show event tasks (kitchen + office, not FOH)
    const showTasks = !isFOH

    function toggleExpand(beoId) {
        setExpandedBeos(prev => ({ ...prev, [beoId]: !prev[beoId] }))
    }

    function formatEventDateRange(b) {
        const start = new Date(b.event_date + 'T12:00:00')
        const startStr = start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
        if (b.event_end_date && b.event_end_date !== b.event_date) {
            const end = new Date(b.event_end_date + 'T12:00:00')
            const endStr = end.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
            return `${startStr} – ${endStr}`
        }
        return startStr
    }

    function startEdit(b) {
        setEditingBeo(b.id)
        setEditDraft({
            event_name: b.event_name || '',
            event_date: b.event_date || '',
            event_end_date: b.event_end_date || '',
            start_time: b.start_time || '',
            guest_count: b.guest_count || 0,
            location: b.location || '',
            timeline: JSON.parse(JSON.stringify(b.timeline || [])),
            sections: JSON.parse(JSON.stringify(b.sections || [])),
            notes_text: b.notes_text || '',
        })
    }

    function cancelEdit() {
        setEditingBeo(null)
        setEditDraft(null)
    }

    // Toggle the per-event notes panel; seed draft from saved value the first time
    function toggleNotes(b) {
        setNotesDraft(prev => ({ ...prev, [b.id]: prev[b.id] !== undefined ? prev[b.id] : (b.crew_notes || '') }))
        setNotesOpen(prev => ({ ...prev, [b.id]: !prev[b.id] }))
        // Auto-expand the card so the panel is visible
        if (!expandedBeos[b.id]) {
            setExpandedBeos(prev => ({ ...prev, [b.id]: true }))
        }
    }

    // Persist crew notes for a single event (kitchen + office both allowed)
    async function saveCrewNotes(beoId) {
        const text = (notesDraft[beoId] ?? '').trim() ? notesDraft[beoId] : null
        setSavingNotes(prev => ({ ...prev, [beoId]: true }))
        const { error } = await supabase
            .from('banquet_event_orders')
            .update({ crew_notes: text })
            .eq('id', beoId)
        setSavingNotes(prev => ({ ...prev, [beoId]: false }))
        if (error) {
            alert('Failed to save notes: ' + error.message)
            return
        }
        setBeos(prev => prev.map(x => x.id === beoId ? { ...x, crew_notes: text } : x))
    }

    async function saveEdit(beoId) {
        if (!editDraft) return
        setSavingEdit(true)
        const payload = {
            event_name: editDraft.event_name || 'Unknown Event',
            event_date: editDraft.event_date,
            event_end_date: editDraft.event_end_date || null,
            start_time: editDraft.start_time || '',
            guest_count: parseInt(editDraft.guest_count) || 0,
            location: editDraft.location || null,
            timeline: editDraft.timeline || [],
            sections: editDraft.sections || [],
            notes_text: editDraft.notes_text || null,
        }
        const { error } = await supabase.from('banquet_event_orders').update(payload).eq('id', beoId)
        setSavingEdit(false)
        if (!error) {
            setBeos(prev => prev.map(x => x.id === beoId ? { ...x, ...payload } : x))
            cancelEdit()
        } else {
            alert('Failed to save: ' + error.message)
        }
    }

    // Render a single BEO card (collapsed header + expanded body)
    function renderBeoCard(b) {
        const expanded = !!expandedBeos[b.id]
        const isEditing = editingBeo === b.id
        const accentBlue = '#3b82f6'

        return (
            <div
                key={b.id}
                style={{
                    background: b.completed ? 'rgba(100,100,100,0.05)' : 'rgba(59, 130, 246, 0.04)',
                    border: `1px solid ${b.completed ? 'var(--border-color)' : 'rgba(59, 130, 246, 0.18)'}`,
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    opacity: b.completed ? 0.55 : 1,
                    transition: 'opacity 0.2s ease',
                }}
            >
                {/* Collapsed Header — always visible */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: 'var(--space-4)',
                    }}
                >
                    {/* Expand/collapse click zone */}
                    <div
                        role="button"
                        aria-expanded={expanded}
                        onClick={() => toggleExpand(b.id)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            flex: 1,
                            minWidth: 0,
                            cursor: 'pointer',
                        }}
                    >
                        <i
                            className="fa-solid fa-chevron-right"
                            style={{
                                color: accentBlue,
                                fontSize: '0.85rem',
                                transition: 'transform 0.25s ease',
                                transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                flexShrink: 0,
                            }}
                        />
                        {isOffice && (
                            <input
                                type="checkbox"
                                className="beo-check"
                                checked={!!b.completed}
                                onChange={() => toggleBEOComplete(b.id, b.completed)}
                                onClick={(e) => e.stopPropagation()}
                                title={b.completed ? 'Mark incomplete' : 'Mark complete'}
                                style={{ flexShrink: 0 }}
                            />
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.01em', textDecoration: b.completed ? 'line-through' : 'none' }}>
                                {b.event_name}
                            </div>
                            <div style={{ display: 'flex', gap: '16px', fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '4px', flexWrap: 'wrap' }}>
                                <span><i className="fa-regular fa-calendar" style={{ marginRight: '5px', color: accentBlue }} />
                                    {formatEventDateRange(b)}
                                </span>
                                {b.start_time && (
                                    <span><i className="fa-regular fa-clock" style={{ marginRight: '5px', color: accentBlue }} />{b.start_time}</span>
                                )}
                                {b.guest_count > 0 && (
                                    <span><i className="fa-solid fa-users" style={{ marginRight: '5px', color: accentBlue }} />{b.guest_count} guests</span>
                                )}
                                {b.location && (
                                    <span><i className="fa-solid fa-location-dot" style={{ marginRight: '5px', color: accentBlue }} />{b.location}</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Action buttons — siblings of the expand zone, not nested inside it */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        {isOffice && !isEditing && (
                            <>
                                <button
                                    className="wb-act-btn"
                                    onClick={() => { startEdit(b); setExpandedBeos(prev => ({ ...prev, [b.id]: true })) }}
                                    title="Edit BEO"
                                    style={{ fontSize: '0.85rem' }}
                                >
                                    <i className="fa-solid fa-pen" />
                                </button>
                                <button
                                    className="wb-act-btn wb-act-delete"
                                    onClick={() => handleDeleteBEO(b.id)}
                                    title="Delete this BEO"
                                    style={{ fontSize: '0.9rem' }}
                                >
                                    <i className="fa-solid fa-xmark" />
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Expanded Body — animated drop down */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateRows: expanded ? '1fr' : '0fr',
                        transition: 'grid-template-rows 0.3s ease',
                    }}
                >
                    <div style={{ overflow: 'hidden' }}>
                        <div style={{ padding: '0 var(--space-4) var(--space-4)' }}>
                            {isEditing ? (
                                renderBeoEditor(b)
                            ) : isKitchen ? (
                                // Kitchen: two-column layout — BEO details left, tasks + notes right
                                <div className="beo-two-col">
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        {renderBeoDetails(b)}
                                    </div>
                                    <div className="beo-right-panel-kitchen">
                                        {renderBeoTasks(b)}
                                        {renderCrewNotesPanel(b, true)}
                                    </div>
                                </div>
                            ) : (
                                // Office: two-column layout — BEO details left, tasks + notes right; order list below
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                                    <div className="beo-two-col">
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            {renderBeoDetails(b)}
                                        </div>
                                        <div className="beo-right-panel">
                                            {renderBeoTasks(b)}
                                            {renderCrewNotesPanel(b, true)}
                                        </div>
                                    </div>
                                    {renderOrderItems(b)}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // Read-only BEO body matching the PDF layout
    function renderBeoDetails(b) {
        const accentBlue = '#3b82f6'
        const cellBorder = '1px solid var(--border-color)'
        const headerBg = 'rgba(59,130,246,0.10)'
        const subHeaderBg = 'rgba(255,255,255,0.04)'

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', fontSize: '0.92rem' }}>
                {/* Event summary table — mirrors top of PDF */}
                <div style={{ border: cellBorder, borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                    <div className="beo-summary-grid">
                        <div className="beo-cell-label" style={{ borderBottom: cellBorder, borderRight: cellBorder }}>Event Headcount</div>
                        <div className="beo-cell-value" style={{ borderBottom: cellBorder }}>{b.guest_count || '—'}</div>
                        <div className="beo-cell-label" style={{ borderBottom: cellBorder, borderRight: cellBorder }}>Event Date(s)</div>
                        <div className="beo-cell-value" style={{ borderBottom: cellBorder }}>
                            {b.event_date ? new Date(b.event_date + 'T12:00:00').toLocaleDateString('en-US') : '—'}
                            {b.event_end_date && b.event_end_date !== b.event_date && ` – ${new Date(b.event_end_date + 'T12:00:00').toLocaleDateString('en-US')}`}
                        </div>
                        <div className="beo-cell-label" style={{ borderRight: cellBorder }}>Event Location(s)</div>
                        <div className="beo-cell-value">{b.location || '—'}</div>
                    </div>

                    {/* Timeline table */}
                    {(b.timeline || []).length > 0 && (
                        <div style={{ borderTop: cellBorder }}>
                            <div className="beo-timeline-header-row" style={{ background: headerBg, fontWeight: 700 }}>
                                <div className="beo-tl-date" style={{ borderRight: cellBorder }}>Start Date</div>
                                <div className="beo-tl-time" style={{ borderRight: cellBorder }}>Start Time</div>
                                <div className="beo-tl-item" style={{ borderRight: cellBorder }}>Timeline Item</div>
                                <div className="beo-tl-desc">Description</div>
                            </div>
                            {(b.timeline || []).map((row, idx) => (
                                <div key={idx} className="beo-timeline-data-row" style={{ borderTop: cellBorder }}>
                                    <div className="beo-tl-date" style={{ borderRight: cellBorder }}>{row.date ? new Date(row.date + 'T12:00:00').toLocaleDateString('en-US') : ''}</div>
                                    <div className="beo-tl-time" style={{ borderRight: cellBorder }}>{row.time || ''}</div>
                                    <div className="beo-tl-item" style={{ borderRight: cellBorder }}>{row.item || ''}</div>
                                    <div className="beo-tl-desc">{row.description || ''}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Sections — one block per meal/activity */}
                {(b.sections || []).map((section, sIdx) => (
                    <div key={sIdx} style={{ border: cellBorder, borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                        {/* Section header row */}
                        <div className="beo-section-header-row" style={{ background: headerBg, fontWeight: 700 }}>
                            <div className="beo-section-day" style={{ borderRight: cellBorder }}>{section.day_label || section.date}</div>
                            <div className="beo-section-meal" style={{ borderRight: cellBorder }}>
                                {[section.meal_type, section.time, section.location].filter(Boolean).join(' · ')}
                            </div>
                            <div className="beo-section-qty-hdr">Qty</div>
                        </div>
                        {(section.categories || []).map((cat, cIdx) => (
                            <div key={cIdx} style={{ borderTop: cellBorder }}>
                                <div style={{ background: subHeaderBg, padding: '6px 12px', textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                    {cat.name}
                                </div>
                                {(cat.items || []).map((item, iIdx) => (
                                    <div key={iIdx} className="beo-item-row" style={{ borderTop: cellBorder }}>
                                        <div className="beo-item-label" style={{ borderRight: cellBorder }}>{item.label || ''}</div>
                                        <div className="beo-item-description" style={{ borderRight: cellBorder }}>{item.description || ''}</div>
                                        <div className="beo-item-qty" style={{ color: accentBlue }}>{item.qty || ''}</div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                ))}

                {/* Notes */}
                {b.notes_text && (
                    <div style={{ border: cellBorder, borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                        <div style={{ background: headerBg, padding: '8px 12px', fontWeight: 700, textAlign: 'center' }}>Notes</div>
                        <div style={{ padding: '12px', whiteSpace: 'pre-wrap', borderTop: cellBorder }}>{b.notes_text}</div>
                    </div>
                )}
            </div>
        )
    }

    // Office editor — structured form controls (no JSON editing required)
    function renderBeoEditor(b) {
        if (!editDraft) return null
        const inputStyle = { width: '100%', padding: '6px 10px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)' }
        const labelStyle = { fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', display: 'block' }
        const sectionLabelStyle = { fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }

        const setDraft = (patch) => setEditDraft(prev => ({ ...prev, ...patch }))

        // Timeline row helpers
        function updateTimelineRow(idx, field, val) {
            setDraft({ timeline: editDraft.timeline.map((row, i) => i === idx ? { ...row, [field]: val } : row) })
        }
        function addTimelineRow() {
            setDraft({ timeline: [...editDraft.timeline, { date: '', time: '', item: '', description: '' }] })
        }
        function removeTimelineRow(idx) {
            setDraft({ timeline: editDraft.timeline.filter((_, i) => i !== idx) })
        }

        // Section helpers
        function updateSection(sIdx, field, val) {
            setDraft({ sections: editDraft.sections.map((s, i) => i === sIdx ? { ...s, [field]: val } : s) })
        }
        function addSection() {
            setDraft({ sections: [...editDraft.sections, { day_label: '', date: '', meal_type: '', time: '', location: '', categories: [] }] })
        }
        function removeSection(sIdx) {
            setDraft({ sections: editDraft.sections.filter((_, i) => i !== sIdx) })
        }

        // Category helpers
        function updateCategory(sIdx, cIdx, field, val) {
            setDraft({
                sections: editDraft.sections.map((s, i) => i !== sIdx ? s : {
                    ...s, categories: s.categories.map((c, j) => j === cIdx ? { ...c, [field]: val } : c)
                })
            })
        }
        function addCategory(sIdx) {
            setDraft({
                sections: editDraft.sections.map((s, i) => i !== sIdx ? s : {
                    ...s, categories: [...(s.categories || []), { name: '', items: [] }]
                })
            })
        }
        function removeCategory(sIdx, cIdx) {
            setDraft({
                sections: editDraft.sections.map((s, i) => i !== sIdx ? s : {
                    ...s, categories: s.categories.filter((_, j) => j !== cIdx)
                })
            })
        }

        // Item helpers
        function updateItem(sIdx, cIdx, iIdx, field, val) {
            setDraft({
                sections: editDraft.sections.map((s, si) => si !== sIdx ? s : {
                    ...s, categories: s.categories.map((c, ci) => ci !== cIdx ? c : {
                        ...c, items: c.items.map((item, ii) => ii !== iIdx ? item : { ...item, [field]: val })
                    })
                })
            })
        }
        function addItem(sIdx, cIdx) {
            setDraft({
                sections: editDraft.sections.map((s, si) => si !== sIdx ? s : {
                    ...s, categories: s.categories.map((c, ci) => ci !== cIdx ? c : {
                        ...c, items: [...(c.items || []), { label: '', description: '', qty: '' }]
                    })
                })
            })
        }
        function removeItem(sIdx, cIdx, iIdx) {
            setDraft({
                sections: editDraft.sections.map((s, si) => si !== sIdx ? s : {
                    ...s, categories: s.categories.map((c, ci) => ci !== cIdx ? c : {
                        ...c, items: c.items.filter((_, ii) => ii !== iIdx)
                    })
                })
            })
        }

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '0.9rem' }}>

                {/* Basic event fields */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div style={{ gridColumn: '1 / -1' }}>
                        <label style={labelStyle}>Event Name</label>
                        <input style={inputStyle} value={editDraft.event_name} onChange={e => setDraft({ event_name: e.target.value })} />
                    </div>
                    <div>
                        <label style={labelStyle}>Start Date</label>
                        <input type="date" style={inputStyle} value={editDraft.event_date} onChange={e => setDraft({ event_date: e.target.value })} />
                    </div>
                    <div>
                        <label style={labelStyle}>End Date</label>
                        <input type="date" style={inputStyle} value={editDraft.event_end_date} onChange={e => setDraft({ event_end_date: e.target.value })} />
                    </div>
                    <div>
                        <label style={labelStyle}>Start Time</label>
                        <input style={inputStyle} value={editDraft.start_time} onChange={e => setDraft({ start_time: e.target.value })} placeholder="7:00 PM" />
                    </div>
                    <div>
                        <label style={labelStyle}>Headcount</label>
                        <input type="number" style={inputStyle} value={editDraft.guest_count} onChange={e => setDraft({ guest_count: e.target.value })} />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                        <label style={labelStyle}>Location</label>
                        <input style={inputStyle} value={editDraft.location} onChange={e => setDraft({ location: e.target.value })} />
                    </div>
                </div>

                {/* Notes */}
                <div>
                    <label style={labelStyle}>Notes</label>
                    <textarea
                        style={{ ...inputStyle, minHeight: '80px', fontFamily: 'inherit', resize: 'vertical' }}
                        value={editDraft.notes_text}
                        onChange={e => setDraft({ notes_text: e.target.value })}
                        placeholder="Any additional event notes..."
                    />
                </div>

                {/* Timeline editor */}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <label style={{ ...labelStyle, marginBottom: 0 }}>Event Timeline</label>
                        <button className="btn btn-secondary btn-sm" onClick={addTimelineRow} style={{ fontSize: '0.75rem' }}>+ Add Row</button>
                    </div>
                    {editDraft.timeline.length === 0 ? (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', padding: '8px 0' }}>No timeline entries. Click "+ Add Row" to add one.</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '130px 90px 1fr 1.5fr 28px', gap: '6px' }}>
                                <span style={sectionLabelStyle}>Start Date</span>
                                <span style={sectionLabelStyle}>Start Time</span>
                                <span style={sectionLabelStyle}>Item</span>
                                <span style={sectionLabelStyle}>Description</span>
                                <span />
                            </div>
                            {editDraft.timeline.map((row, idx) => (
                                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '130px 90px 1fr 1.5fr 28px', gap: '6px', alignItems: 'center' }}>
                                    <input type="date" style={inputStyle} value={row.date || ''} onChange={e => updateTimelineRow(idx, 'date', e.target.value)} />
                                    <input style={inputStyle} value={row.time || ''} onChange={e => updateTimelineRow(idx, 'time', e.target.value)} placeholder="7:00 PM" />
                                    <input style={inputStyle} value={row.item || ''} onChange={e => updateTimelineRow(idx, 'item', e.target.value)} placeholder="Cocktail Hour" />
                                    <input style={inputStyle} value={row.description || ''} onChange={e => updateTimelineRow(idx, 'description', e.target.value)} placeholder="Details..." />
                                    <button className="wb-act-btn wb-act-delete" onClick={() => removeTimelineRow(idx)} title="Remove row" style={{ fontSize: '0.8rem', flexShrink: 0 }}>
                                        <i className="fa-solid fa-xmark" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Sections editor */}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <label style={{ ...labelStyle, marginBottom: 0 }}>Menu Sections</label>
                        <button className="btn btn-secondary btn-sm" onClick={addSection} style={{ fontSize: '0.75rem' }}>+ Add Section</button>
                    </div>
                    {editDraft.sections.length === 0 ? (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', padding: '8px 0' }}>No menu sections. Click "+ Add Section" to add one.</div>
                    ) : (
                        editDraft.sections.map((section, sIdx) => (
                            <div key={sIdx} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', marginBottom: '10px', overflow: 'hidden' }}>

                                {/* Section header fields */}
                                <div style={{ background: 'rgba(59,130,246,0.08)', padding: '10px 12px', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
                                    <span style={{ ...sectionLabelStyle, minWidth: '52px' }}>Day Label</span>
                                    <input style={{ ...inputStyle, maxWidth: '120px', flex: 1 }} value={section.day_label || ''} onChange={e => updateSection(sIdx, 'day_label', e.target.value)} placeholder="Friday" />
                                    <span style={sectionLabelStyle}>Date</span>
                                    <input type="date" style={{ ...inputStyle, maxWidth: '150px' }} value={section.date || ''} onChange={e => updateSection(sIdx, 'date', e.target.value)} />
                                    <span style={sectionLabelStyle}>Meal</span>
                                    <input style={{ ...inputStyle, maxWidth: '110px', flex: 1 }} value={section.meal_type || ''} onChange={e => updateSection(sIdx, 'meal_type', e.target.value)} placeholder="Dinner" />
                                    <span style={sectionLabelStyle}>Time</span>
                                    <input style={{ ...inputStyle, maxWidth: '90px' }} value={section.time || ''} onChange={e => updateSection(sIdx, 'time', e.target.value)} placeholder="6:00 PM" />
                                    <span style={sectionLabelStyle}>Location</span>
                                    <input style={{ ...inputStyle, maxWidth: '130px', flex: 1 }} value={section.location || ''} onChange={e => updateSection(sIdx, 'location', e.target.value)} placeholder="Ballroom" />
                                    <button className="wb-act-btn wb-act-delete" onClick={() => removeSection(sIdx)} title="Remove section" style={{ marginLeft: 'auto', flexShrink: 0 }}>
                                        <i className="fa-solid fa-xmark" />
                                    </button>
                                </div>

                                {/* Categories */}
                                <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {(section.categories || []).map((cat, cIdx) => (
                                        <div key={cIdx} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>

                                            {/* Category name */}
                                            <div style={{ background: 'rgba(255,255,255,0.04)', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)' }}>
                                                <span style={{ ...sectionLabelStyle, flexShrink: 0 }}>Category</span>
                                                <input style={{ ...inputStyle, flex: 1 }} value={cat.name || ''} onChange={e => updateCategory(sIdx, cIdx, 'name', e.target.value)} placeholder="Appetizers" />
                                                <button className="wb-act-btn wb-act-delete" onClick={() => removeCategory(sIdx, cIdx)} title="Remove category" style={{ fontSize: '0.75rem', flexShrink: 0 }}>
                                                    <i className="fa-solid fa-xmark" />
                                                </button>
                                            </div>

                                            {/* Items */}
                                            <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                                {(cat.items || []).length > 0 && (
                                                    <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr 56px 28px', gap: '6px' }}>
                                                        <span style={sectionLabelStyle}>Label</span>
                                                        <span style={sectionLabelStyle}>Description</span>
                                                        <span style={sectionLabelStyle}>Qty</span>
                                                        <span />
                                                    </div>
                                                )}
                                                {(cat.items || []).map((item, iIdx) => (
                                                    <div key={iIdx} style={{ display: 'grid', gridTemplateColumns: '150px 1fr 56px 28px', gap: '6px', alignItems: 'center' }}>
                                                        <input style={inputStyle} value={item.label || ''} onChange={e => updateItem(sIdx, cIdx, iIdx, 'label', e.target.value)} placeholder="Caesar Salad" />
                                                        <input style={inputStyle} value={item.description || ''} onChange={e => updateItem(sIdx, cIdx, iIdx, 'description', e.target.value)} placeholder="With croutons" />
                                                        <input style={inputStyle} value={item.qty || ''} onChange={e => updateItem(sIdx, cIdx, iIdx, 'qty', e.target.value)} placeholder="25" />
                                                        <button className="wb-act-btn wb-act-delete" onClick={() => removeItem(sIdx, cIdx, iIdx)} title="Remove item" style={{ fontSize: '0.75rem' }}>
                                                            <i className="fa-solid fa-xmark" />
                                                        </button>
                                                    </div>
                                                ))}
                                                <button className="btn btn-secondary btn-sm" onClick={() => addItem(sIdx, cIdx)} style={{ fontSize: '0.75rem', alignSelf: 'flex-start', marginTop: '2px' }}>+ Add Item</button>
                                            </div>
                                        </div>
                                    ))}
                                    <button className="btn btn-secondary btn-sm" onClick={() => addCategory(sIdx)} style={{ fontSize: '0.75rem', alignSelf: 'flex-start' }}>+ Add Category</button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button className="btn btn-secondary btn-sm" onClick={cancelEdit} disabled={savingEdit}>Cancel</button>
                    <button className="btn btn-primary btn-sm" style={{ background: '#3b82f6', borderColor: '#3b82f6' }} onClick={() => saveEdit(b.id)} disabled={savingEdit}>
                        {savingEdit ? 'Saving…' : 'Save Changes'}
                    </button>
                </div>
            </div>
        )
    }

    // Per-event crew notes — read/write for both Kitchen and Office (hidden on FOH)
    // forceOpen bypasses the toggle so notes always render (used in kitchen side panel)
    function renderCrewNotesPanel(b, forceOpen = false) {
        if (isFOH) return null
        const open = forceOpen || !!notesOpen[b.id]
        if (!open) return null
        const draft = notesDraft[b.id] ?? (b.crew_notes || '')
        const dirty = (draft || '') !== (b.crew_notes || '')
        const saving = !!savingNotes[b.id]
        const noteAccent = '#facc15'

        return (
            <div
                style={{
                    border: '1px solid rgba(250, 204, 21, 0.35)',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(250, 204, 21, 0.06)',
                    overflow: 'hidden',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid rgba(250, 204, 21, 0.25)' }}>
                    <span style={{ fontWeight: 700, color: noteAccent, fontSize: '0.9rem' }}>
                        <i className="fa-regular fa-note-sticky" style={{ marginRight: '6px' }} />
                        Crew Notes
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Visible on Kitchen + Office</span>
                </div>
                <textarea
                    ref={el => {
                        if (el) {
                            el.style.height = 'auto'
                            el.style.height = el.scrollHeight + 'px'
                        }
                    }}
                    value={draft}
                    onChange={e => {
                        setNotesDraft(prev => ({ ...prev, [b.id]: e.target.value }))
                        e.target.style.height = 'auto'
                        e.target.style.height = e.target.scrollHeight + 'px'
                    }}
                    placeholder="Add prep reminders, allergies, last-minute changes..."
                    style={{
                        width: '100%',
                        minHeight: '80px',
                        padding: '10px 12px',
                        background: 'var(--bg-input)',
                        border: 'none',
                        color: 'var(--text-primary)',
                        fontFamily: 'inherit',
                        fontSize: '0.95rem',
                        lineHeight: '1.6',
                        resize: 'none',
                        overflow: 'hidden',
                        outline: 'none',
                        boxSizing: 'border-box',
                    }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '8px 12px', borderTop: '1px solid rgba(250, 204, 21, 0.25)' }}>
                    <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                            setNotesDraft(prev => ({ ...prev, [b.id]: b.crew_notes || '' }))
                        }}
                        disabled={saving || !dirty}
                    >
                        Reset
                    </button>
                    <button
                        className="btn btn-primary btn-sm"
                        style={{ background: noteAccent, borderColor: noteAccent, color: '#1f2937' }}
                        onClick={() => saveCrewNotes(b.id)}
                        disabled={saving || !dirty}
                    >
                        {saving ? 'Saving…' : 'Save Notes'}
                    </button>
                </div>
            </div>
        )
    }

    // Renders the tasks section for a BEO — supports subtasks and AI prep list generation
    function renderBeoTasks(beo) {
        if (!showTasks) return null
        const beoId = beo.id
        const allTasks = tasksByBeo[beoId] || []

        // Separate root tasks from subtasks for hierarchical rendering
        const rootTasks = allTasks.filter(t => !t.parent_id)
        const subtasksByParent = {}
        allTasks.filter(t => t.parent_id).forEach(t => {
            if (!subtasksByParent[t.parent_id]) subtasksByParent[t.parent_id] = []
            subtasksByParent[t.parent_id].push(t)
        })

        const completedCount = allTasks.filter(t => t.is_completed).length
        const isGenerating = generatingPrepFor === beoId
        const isCollapsed = collapsedTaskPanels[beoId] === true

        return (
            <div className="event-tasks-section">
                <div className="event-tasks-header">
                    <span className="event-tasks-label">
                        <i className="fa-solid fa-list-check" style={{ marginRight: '6px', color: accent }} />
                        Tasks
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
                        {allTasks.length > 0 && (
                            <span className="event-tasks-count">{completedCount}/{allTasks.length}</span>
                        )}
                        {isOffice && (
                            <button
                                className="btn btn-sm"
                                style={{ fontSize: '0.72rem', padding: '2px 8px', background: 'transparent', border: `1px solid ${accentBorder}`, color: accent, flexShrink: 0 }}
                                onClick={() => generatePrepTasks(beo)}
                                disabled={isGenerating}
                                title="Generate prep list from BEO"
                            >
                                {isGenerating
                                    ? <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '4px' }} />Generating...</>
                                    : <><i className="fa-solid fa-wand-magic-sparkles" style={{ marginRight: '4px' }} />Prep List</>
                                }
                            </button>
                        )}
                        <button
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: accent, padding: '2px 4px', flexShrink: 0 }}
                            onClick={() => setCollapsedTaskPanels(prev => ({ ...prev, [beoId]: !isCollapsed }))}
                            title={isCollapsed ? 'Expand tasks' : 'Collapse tasks'}
                            aria-label={isCollapsed ? 'Expand tasks' : 'Collapse tasks'}
                        >
                            <i className={`fa-solid fa-chevron-${isCollapsed ? 'down' : 'up'}`} />
                        </button>
                    </div>
                </div>

                {!isCollapsed && (
                    <>
                        {rootTasks.length > 0 && (
                            <div className="event-tasks-list">
                                {rootTasks.map(task => {
                                    const subs = subtasksByParent[task.id] || []
                                    // undefined means not yet toggled — default to expanded
                                    const isExpanded = expandedTasks[task.id] !== false
                                    const showInput = showSubtaskInputFor[task.id]

                                    return (
                                        <div key={task.id}>
                                            <label className={`event-task-row ${task.in_progress && !task.is_completed ? 'in-progress' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <input
                                                    type="checkbox"
                                                    className="task-box"
                                                    checked={task.is_completed}
                                                    onChange={() => toggleEventTask(task.id, task.is_completed)}
                                                />
                                                {!task.is_completed && (
                                                    <button
                                                        type="button"
                                                        className="event-progress-btn"
                                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleInProgress(task.id, task.in_progress) }}
                                                        title={task.in_progress ? 'Working on it — tap to clear' : 'Mark as being worked on'}
                                                        aria-label={task.in_progress ? 'Clear in-progress' : 'Mark as being worked on'}
                                                    >
                                                        <i className="fa-solid fa-person-running" />
                                                    </button>
                                                )}
                                                <span
                                                    className={`task-label ${task.is_completed ? 'completed' : ''}`}
                                                    style={{ flex: 1, cursor: subs.length > 0 ? 'pointer' : 'default' }}
                                                    onClick={subs.length > 0 ? (e) => {
                                                        e.preventDefault()
                                                        setExpandedTasks(prev => ({ ...prev, [task.id]: !isExpanded }))
                                                    } : undefined}
                                                >
                                                    {subs.length > 0 && (
                                                        <i
                                                            className={`fa-solid fa-chevron-${isExpanded ? 'down' : 'right'}`}
                                                            style={{ fontSize: '0.6rem', marginRight: '5px', color: 'var(--text-muted)' }}
                                                        />
                                                    )}
                                                    {task.description}
                                                </span>
                                                {isOffice && (
                                                    <>
                                                        <button
                                                            className="wb-act-btn"
                                                            onClick={(e) => {
                                                                e.preventDefault()
                                                                setShowSubtaskInputFor(prev => ({ ...prev, [task.id]: !showInput }))
                                                                if (!showInput) setExpandedTasks(prev => ({ ...prev, [task.id]: true }))
                                                            }}
                                                            title="Add subtask"
                                                            style={{ fontSize: '0.7rem', color: accent, flexShrink: 0 }}
                                                        >
                                                            <i className="fa-solid fa-plus" />
                                                        </button>
                                                        <button
                                                            className="wb-act-btn wb-act-delete"
                                                            onClick={(e) => { e.preventDefault(); deleteEventTask(task.id) }}
                                                            title="Delete task"
                                                            style={{ marginLeft: 0, fontSize: '0.75rem', flexShrink: 0 }}
                                                        >
                                                            <i className="fa-solid fa-xmark" />
                                                        </button>
                                                    </>
                                                )}
                                            </label>

                                            {subs.length > 0 && isExpanded && (
                                                <div style={{ paddingLeft: '22px' }}>
                                                    {subs.map(sub => (
                                                        <label key={sub.id} className={`event-task-row ${sub.in_progress && !sub.is_completed ? 'in-progress' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <input
                                                                type="checkbox"
                                                                className="task-box"
                                                                checked={sub.is_completed}
                                                                onChange={() => toggleEventTask(sub.id, sub.is_completed)}
                                                            />
                                                            {!sub.is_completed && (
                                                                <button
                                                                    type="button"
                                                                    className="event-progress-btn"
                                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleInProgress(sub.id, sub.in_progress) }}
                                                                    title={sub.in_progress ? 'Working on it — tap to clear' : 'Mark as being worked on'}
                                                                    aria-label={sub.in_progress ? 'Clear in-progress' : 'Mark as being worked on'}
                                                                >
                                                                    <i className="fa-solid fa-person-running" />
                                                                </button>
                                                            )}
                                                            <span className={`task-label ${sub.is_completed ? 'completed' : ''}`} style={{ flex: 1 }}>
                                                                {sub.description}
                                                            </span>
                                                            {isOffice && (
                                                                <button
                                                                    className="wb-act-btn wb-act-delete"
                                                                    onClick={(e) => { e.preventDefault(); deleteEventTask(sub.id) }}
                                                                    title="Delete subtask"
                                                                    style={{ marginLeft: 0, fontSize: '0.75rem', flexShrink: 0 }}
                                                                >
                                                                    <i className="fa-solid fa-xmark" />
                                                                </button>
                                                            )}
                                                        </label>
                                                    ))}
                                                </div>
                                            )}

                                            {isOffice && showInput && (
                                                <div style={{ paddingLeft: '22px', display: 'flex', gap: '6px', marginTop: '4px', marginBottom: '2px' }}>
                                                    <input
                                                        className="input"
                                                        type="text"
                                                        placeholder="Add a subtask..."
                                                        value={newSubtaskText[task.id] || ''}
                                                        onChange={e => setNewSubtaskText(prev => ({ ...prev, [task.id]: e.target.value }))}
                                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSubtask(task.id, beoId) } }}
                                                        style={{ fontSize: '0.82rem' }}
                                                        autoFocus
                                                    />
                                                    <button
                                                        className="btn btn-sm"
                                                        style={{ background: accent, color: '#fff', borderColor: accent, flexShrink: 0 }}
                                                        onClick={() => addSubtask(task.id, beoId)}
                                                        disabled={!(newSubtaskText[task.id] || '').trim()}
                                                    >
                                                        Add
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        {isOffice && (
                            <div className="event-task-add">
                                <input
                                    className="input"
                                    type="text"
                                    placeholder="Add a task..."
                                    value={newTaskText[beoId] || ''}
                                    onChange={e => setNewTaskText(prev => ({ ...prev, [beoId]: e.target.value }))}
                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addEventTask(beoId) } }}
                                    style={{ fontSize: '0.85rem' }}
                                />
                                <button
                                    className="btn btn-sm"
                                    style={{ background: accent, color: '#fff', borderColor: accent, flexShrink: 0 }}
                                    onClick={() => addEventTask(beoId)}
                                    disabled={!(newTaskText[beoId] || '').trim()}
                                >
                                    Add
                                </button>
                            </div>
                        )}

                        {rootTasks.length === 0 && !isOffice && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '0.25rem 0' }}>No tasks assigned</div>
                        )}
                    </>
                )}
            </div>
        )
    }

    // Single order item row — checkbox, name, inline note, delete button
    function renderOrderItemRow(item) {
        const isEditingNote = activeNoteId === item.id
        const noteDraft = orderNoteDrafts[item.id] ?? (item.note || '')

        return (
            <div
                key={item.id}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '3px 2px' }}
            >
                <input
                    type="checkbox"
                    className="task-box"
                    checked={item.is_ordered}
                    onChange={() => toggleOrderItem(item.id, item.is_ordered)}
                    style={{ flexShrink: 0, width: '12px', height: '12px', cursor: 'pointer' }}
                />
                <span style={{
                    flex: 1,
                    fontSize: '0.88rem',
                    color: item.is_ordered ? 'var(--text-muted)' : 'var(--text-primary)',
                    textDecoration: item.is_ordered ? 'line-through' : 'none',
                    transition: 'color 0.2s, text-decoration 0.2s',
                }}>
                    {item.item_name}
                </span>

                {/* Inline note — click to edit, auto-saves on blur */}
                {isEditingNote ? (
                    <input
                        autoFocus
                        type="text"
                        value={noteDraft}
                        onChange={e => setOrderNoteDrafts(prev => ({ ...prev, [item.id]: e.target.value }))}
                        onBlur={() => saveOrderItemNote(item.id, noteDraft)}
                        onKeyDown={e => { if (e.key === 'Enter') e.target.blur() }}
                        placeholder="Add a note..."
                        style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-secondary)',
                            background: 'var(--bg-input)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '4px',
                            padding: '2px 6px',
                            width: '140px',
                            flexShrink: 0,
                            outline: 'none',
                        }}
                    />
                ) : (
                    <span
                        onClick={() => {
                            setActiveNoteId(item.id)
                            setOrderNoteDrafts(prev => ({ ...prev, [item.id]: item.note || '' }))
                        }}
                        title={item.note ? 'Click to edit note' : 'Click to add a note'}
                        style={{
                            fontSize: '0.75rem',
                            fontStyle: item.note ? 'normal' : 'italic',
                            color: 'var(--text-muted)',
                            opacity: item.note ? 0.75 : 0.45,
                            cursor: 'pointer',
                            flexShrink: 0,
                            maxWidth: '140px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {item.note || 'Add note...'}
                    </span>
                )}

                <button
                    className="wb-act-btn wb-act-delete"
                    onClick={e => { e.preventDefault(); deleteOrderItem(item.id) }}
                    title="Remove item"
                    style={{ fontSize: '0.75rem', flexShrink: 0 }}
                >
                    <i className="fa-solid fa-xmark" />
                </button>
            </div>
        )
    }

    // Order list panel — office-only, rendered inside each expanded BEO card
    function renderOrderItems(beo) {
        if (!isOffice) return null
        const items = orderItemsByBeo[beo.id] || []
        const orderedCount = items.filter(i => i.is_ordered).length
        const isGenerating = generatingOrderFor === beo.id
        const orderAccent = '#34d399'
        const borderColor = 'rgba(52, 211, 153, 0.25)'
        const dividerColor = 'rgba(52, 211, 153, 0.18)'

        // Split AI-generated (grouped by source dish) from manual items
        const autoItems = items.filter(i => !i.is_manual)
        const manualItems = items.filter(i => i.is_manual)

        // Unique source dishes in insertion order
        const dishes = []
        const seenDishes = new Set()
        autoItems.forEach(item => {
            if (item.source_dish && !seenDishes.has(item.source_dish)) {
                seenDishes.add(item.source_dish)
                dishes.push(item.source_dish)
            }
        })

        const dishLabelStyle = {
            fontSize: '0.72rem',
            fontWeight: 700,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '3px',
            paddingLeft: '2px',
        }

        return (
            <div style={{
                border: `1px solid ${borderColor}`,
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(52, 211, 153, 0.04)',
                overflow: 'hidden',
            }}>
                {/* Section header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: `1px solid ${dividerColor}` }}>
                    <span style={{ fontWeight: 700, color: orderAccent, fontSize: '0.9rem' }}>
                        <i className="fa-solid fa-cart-shopping" style={{ marginRight: '6px' }} />
                        Order List
                        {items.length > 0 && (
                            <span style={{ marginLeft: '8px', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                                {orderedCount}/{items.length} ordered
                            </span>
                        )}
                    </span>
                    <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => generateOrderItems(beo)}
                        disabled={isGenerating}
                        style={{ fontSize: '0.75rem' }}
                    >
                        {isGenerating ? (
                            <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '4px' }} />Generating...</>
                        ) : autoItems.length > 0 ? (
                            <><i className="fa-solid fa-arrows-rotate" style={{ marginRight: '4px' }} />Regenerate</>
                        ) : (
                            <><i className="fa-solid fa-wand-magic-sparkles" style={{ marginRight: '4px' }} />Generate from BEO</>
                        )}
                    </button>
                </div>

                {/* Item list */}
                {items.length > 0 && (
                    <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {/* AI-generated items grouped by source dish */}
                        {dishes.map(dish => {
                            const dishItems = autoItems.filter(i => i.source_dish === dish)
                            const areAllOrdered = dishItems.length > 0 && dishItems.every(i => i.is_ordered)

                            return (
                                <div key={dish} style={{ marginBottom: '6px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                                        <input
                                            type="checkbox"
                                            className="task-box"
                                            checked={areAllOrdered}
                                            onChange={() => toggleAllOrderItemsForDish(beo.id, dish, areAllOrdered)}
                                            style={{ width: '18px', height: '18px', margin: 0, cursor: 'pointer', flexShrink: 0 }}
                                        />
                                        <span style={{ ...dishLabelStyle, marginBottom: 0 }}>{dish}</span>
                                    </div>
                                    {dishItems.map(item => renderOrderItemRow(item))}
                                </div>
                            )
                        })}

                        {/* Manual items */}
                        {manualItems.length > 0 && (
                            <div style={{ marginBottom: '4px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: dishes.length > 0 ? '4px' : '0px', marginBottom: '3px' }}>
                                    <input
                                        type="checkbox"
                                        className="task-box"
                                        checked={manualItems.every(i => i.is_ordered)}
                                        onChange={() => toggleAllOrderItemsForCustom(beo.id, manualItems.every(i => i.is_ordered))}
                                        style={{ width: '18px', height: '18px', margin: 0, cursor: 'pointer', flexShrink: 0 }}
                                    />
                                    <span style={{ ...dishLabelStyle, marginBottom: 0 }}>Custom</span>
                                </div>
                                {manualItems.map(item => renderOrderItemRow(item))}
                            </div>
                        )}
                    </div>
                )}

                {items.length === 0 && !isGenerating && (
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', padding: '10px 12px' }}>
                        No order items yet. Click "Generate from BEO" or add items manually below.
                    </div>
                )}

                {/* Manual add input */}
                <div style={{
                    display: 'flex',
                    gap: '6px',
                    padding: '8px 12px',
                    borderTop: items.length > 0 ? `1px solid ${dividerColor}` : 'none',
                }}>
                    <input
                        className="input"
                        type="text"
                        placeholder="Add item to order..."
                        value={newOrderText[beo.id] || ''}
                        onChange={e => setNewOrderText(prev => ({ ...prev, [beo.id]: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addOrderItem(beo.id) } }}
                        style={{ fontSize: '0.85rem' }}
                    />
                    <button
                        className="btn btn-sm"
                        style={{ background: orderAccent, color: '#111', borderColor: orderAccent, flexShrink: 0 }}
                        onClick={() => addOrderItem(beo.id)}
                        disabled={!(newOrderText[beo.id] || '').trim()}
                    >
                        Add
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <div className="header-left">
                    <h1 className="header-title"><i className="fa-solid fa-champagne-glasses title-icon" style={{ color: accent }} /> Events & Catering</h1>
                    <p className="header-date">Upcoming banquets and special event coordination</p>
                </div>
                <div className="header-actions">
                    {!readOnly && (
                        <label className={`btn btn-primary btn-sm ${uploadingBEO ? 'disabled' : ''}`} style={{ background: '#3b82f6', borderColor: '#3b82f6', cursor: 'pointer' }}>
                            <i className={`fa-solid ${uploadingBEO ? 'fa-spinner fa-spin' : 'fa-file-pdf'}`} />
                            {uploadingBEO ? 'Parsing...' : 'Upload BEO'}
                            <input type="file" accept=".pdf" style={{ display: 'none' }} onChange={handleBEOUpload} disabled={uploadingBEO} />
                        </label>
                    )}
                    <Link to={isOffice ? '/office' : isFOH ? '/foh' : '/kitchen'} className="btn btn-secondary btn-sm"><i className="fa-solid fa-arrow-left" /> Back</Link>
                </div>
            </header>

            {/* Duplicate BEO confirmation banner */}
            {beoConflicts.length > 0 && (
                <div style={{
                    margin: '0 0 var(--space-4)',
                    padding: 'var(--space-4) var(--space-5)',
                    background: 'rgba(251, 191, 36, 0.08)',
                    border: '1px solid rgba(251, 191, 36, 0.35)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-3)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
                        <i className="fa-solid fa-triangle-exclamation" style={{ color: '#fbbf24', marginTop: '2px', flexShrink: 0 }} />
                        <div>
                            <p style={{ margin: 0, fontWeight: 600, color: '#fbbf24', fontSize: 'var(--font-size-sm)' }}>
                                Duplicate BEO{beoConflicts.length > 1 ? 's' : ''} Detected
                            </p>
                            <p style={{ margin: '4px 0 0', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                                The following event{beoConflicts.length > 1 ? 's' : ''} already exist. The BEO data will be updated with the new PDF, but your tasks, order items, and crew notes will be preserved.
                            </p>
                            <ul style={{ margin: '6px 0 0', paddingLeft: '16px', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                {beoConflicts.map((c, i) => (
                                    <li key={i}>
                                        <strong>{c.existing.event_name}</strong> — {c.existing.event_date}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
                        <button
                            className="btn btn-secondary btn-sm"
                            onClick={handleBeoOverwriteCancel}
                            disabled={uploadingBEO}
                        >
                            Cancel
                        </button>
                        <button
                            className="btn btn-primary btn-sm"
                            style={{ background: '#f59e0b', borderColor: '#f59e0b' }}
                            onClick={handleBeoOverwriteConfirm}
                            disabled={uploadingBEO}
                        >
                            <i className={`fa-solid ${uploadingBEO ? 'fa-spinner fa-spin' : 'fa-rotate'}`} />
                            {uploadingBEO ? 'Replacing...' : 'Replace Existing'}
                        </button>
                    </div>
                </div>
            )}

            <div className={isOffice ? 'events-page-grid' : ''} style={isOffice ? undefined : { display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-6)', alignItems: 'start' }}>

                {/* Left Panel: Parsed upcoming banquets & BEOs */}
                <div className="card-column" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

                    {/* BEO Details Card */}
                    {beos.length > 0 && (
                        <div className="card">
                            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h2 className="card-title"><i className="fa-solid fa-file-invoice" style={{ color: '#3b82f6', marginRight: '8px' }}/> Banquet Event Orders</h2>
                                {isOffice && (
                                    <button
                                        className="btn btn-secondary btn-sm"
                                        style={{ fontSize: 'var(--font-size-xs)', color: '#f87171', borderColor: 'rgba(248,113,113,0.3)' }}
                                        onClick={handleClearAllBEOs}
                                        title="Clear all BEOs"
                                    >
                                        <i className="fa-solid fa-trash-can" /> Clear All
                                    </button>
                                )}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', padding: 'var(--space-4)' }}>
                                {beos.map(b => renderBeoCard(b))}
                            </div>
                        </div>
                    )}

                    <div className="card">
                        <div className="card-header">
                            <h2 className="card-title"><i className="fa-solid fa-calendar-days" style={{ color: accent, marginRight: '8px' }}/> Upcoming Banquets (Summary)</h2>
                        </div>
                        {loadingBanquets ? (
                            <div className="shimmer" style={{ height: '200px', borderRadius: 'var(--radius-md)' }}></div>
                        ) : banquets.length === 0 ? (
                            <div className="empty-task-list">No upcoming banquets found. Forward "Upcoming in Banquets" PDFs to populate this board.</div>
                        ) : (
                            <div className="data-table-wrapper" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                                <table className="data-table">
                                    <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                                        <tr>
                                            <th>Date</th>
                                            <th>Time</th>
                                            <th>Event Name</th>
                                            <th>Location</th>
                                            <th>Guests</th>
                                            <th>Type</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {banquets.map(b => {
                                            const eventDate = new Date(b.event_date + 'T12:00:00')
                                            return (
                                                <tr key={b.id}>
                                                    <td style={{ whiteSpace: 'nowrap' }}>{eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })}</td>
                                                    <td style={{ whiteSpace: 'nowrap' }}>{b.start_time || '-'}</td>
                                                    <td style={{ fontWeight: 500 }}>{b.event_name}</td>
                                                    <td>{b.location || '-'}</td>
                                                    <td>{b.guest_count > 0 ? b.guest_count : '-'}</td>
                                                    <td>{b.event_type || '-'}</td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel: Single Whiteboard Column for coordination */}
                {isOffice && (
                <div className="wb-column" style={{ background: 'var(--bg-card)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
                    <div className="wb-author-bar" style={{ marginBottom: 'var(--space-4)' }}>
                        <i className="fa-solid fa-user-pen" />
                        <input
                            className="wb-author-input"
                            type="text"
                            placeholder="Your name..."
                            value={authorName}
                            onChange={e => setAuthorName(e.target.value)}
                            onBlur={() => localStorage.setItem('mgmt_author', authorName)}
                        />
                    </div>

                    <div className="wb-col-header" style={{ borderBottomColor: accentBorder }}>
                        <h3 className="wb-col-title">
                            <i className="fa-solid fa-comments" style={{ color: accent }} />
                            Event Coordination
                        </h3>
                        <span className="wb-col-count" style={{ background: accentBg, color: accent }}>
                            {notes.length}
                        </span>
                    </div>

                    <div className="wb-col-feed" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                        {notes.length === 0 ? (
                            <div className="wb-empty">No coordination notes yet</div>
                        ) : (
                            notes.map(note => (
                                <div
                                    key={note.id}
                                    className={`wb-note ${note.pinned ? 'wb-note-pinned' : ''}`}
                                    style={{
                                        background: note.pinned ? accentBg : undefined,
                                        borderColor: note.pinned ? accentBorder : undefined,
                                    }}
                                >
                                    <div className="wb-note-header">
                                        <span className="wb-note-author" style={{ color: accent }}>{note.author}</span>
                                        <span className="wb-note-time">{timeAgo(note.created_at)}</span>
                                    </div>
                                    <p className="wb-note-body">{note.content}</p>
                                    {note.pinned && (
                                        <span className="wb-pinned-tag" style={{ background: accentBg, color: accent }}>
                                            <i className="fa-solid fa-thumbtack" /> Pinned
                                        </span>
                                    )}
                                    <div className="wb-note-actions">
                                        <button
                                            className={`wb-act-btn ${note.pinned ? 'active' : ''}`}
                                            style={{ '--act-color': accent }}
                                            onClick={() => togglePin(note.id, note.pinned)}
                                            title={note.pinned ? 'Unpin' : 'Pin'}
                                        >
                                            <i className="fa-solid fa-thumbtack" />
                                        </button>
                                        <button
                                            className="wb-act-btn wb-act-delete"
                                            onClick={() => handleDelete(note.id)}
                                            title="Delete"
                                        >
                                            <i className="fa-solid fa-trash-can" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="wb-col-input" style={{ marginTop: 'var(--space-4)' }}>
                        <div className="wb-input-row">
                            <input
                                className="wb-text-input"
                                type="text"
                                placeholder="Write a note..."
                                value={newText}
                                onChange={e => setNewText(e.target.value)}
                                onKeyDown={handleKeyDown}
                            />
                            <button
                                className="wb-send-btn"
                                style={{ background: accent }}
                                onClick={handlePost}
                                disabled={posting || !newText.trim()}
                            >
                                {posting
                                    ? <i className="fa-solid fa-spinner fa-spin" />
                                    : <i className="fa-solid fa-paper-plane" />}
                            </button>
                        </div>
                    </div>
                </div>
                )}

            </div>
        </div>
    )
}

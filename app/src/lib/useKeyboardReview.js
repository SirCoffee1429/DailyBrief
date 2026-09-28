import { useEffect, useRef } from 'react'

// Keyboard review for a draft/confirm list: j/k or arrows to move, e to edit, plus any
// single-key actions the page supplies (`actions: { c: item => ..., p: item => ... }`),
// each called with the selected item.
//
// Shared by the menu, dish-ingredient and ingredient-product reviews — the confirmation
// volume there is the risk the design names as the one that kills the feature, so all
// three work the same way from the keyboard.
//
// Bound to the window rather than to a row so the list is navigable without clicking
// into it first, and disabled while an edit form is open so typing a "c" into a field
// does not confirm anything.
export function useKeyboardReview({ items, selected, setSelected, editingId, setEditingId, busy, actions }) {
    // Everything the handler reads goes through a ref so the listener binds once on
    // mount instead of being torn down and re-added on every render.
    const state = useRef({})
    state.current = { items, selected, editingId, busy, actions }

    // Confirming the last row in a filtered list shortens the list underneath the
    // cursor, which would otherwise leave it pointing past the end with nothing selected.
    useEffect(() => {
        if (selected > items.length - 1) setSelected(Math.max(items.length - 1, 0))
    }, [items.length, selected, setSelected])

    useEffect(() => {
        function onKeyDown(e) {
            const { items, selected, editingId, busy, actions } = state.current
            const tag = e.target.tagName
            if (editingId || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
                if (e.key === 'Escape') setEditingId(null)
                return
            }
            if (busy || items.length === 0) return

            if (e.key === 'j' || e.key === 'ArrowDown') {
                e.preventDefault()
                setSelected(i => Math.min(i + 1, items.length - 1))
            } else if (e.key === 'k' || e.key === 'ArrowUp') {
                e.preventDefault()
                setSelected(i => Math.max(i - 1, 0))
            } else if (e.key === 'e') {
                e.preventDefault()
                const item = items[selected]
                if (item) setEditingId(item.id)
            } else if (actions?.[e.key]) {
                const item = items[selected]
                if (item) actions[e.key](item)
            }
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [setSelected, setEditingId])
}

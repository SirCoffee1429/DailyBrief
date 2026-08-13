import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOfficeNotifications } from '../lib/useOfficeNotifications.js'
import { NOTIFICATION_KINDS, formatRelativeTime } from '../lib/notifications.js'

// Icon and phrasing per notification kind. Icons match the sidebar links the
// items navigate to, so the visual cue and the destination agree.
const KIND_DISPLAY = {
    [NOTIFICATION_KINDS.TIME_OFF_CREATED]: {
        icon: 'fa-regular fa-calendar',
        label: name => `${name} — time off request`,
    },
    [NOTIFICATION_KINDS.TIME_OFF_CANCELLED]: {
        icon: 'fa-solid fa-calendar-xmark',
        label: name => `${name} — request cancelled`,
    },
    [NOTIFICATION_KINDS.AVAILABILITY_CHANGED]: {
        icon: 'fa-solid fa-clock',
        label: name => `${name} changed availability`,
    },
    [NOTIFICATION_KINDS.BEO_EMAIL_RECEIVED]: {
        icon: 'fa-solid fa-calendar-alt',
        label: name => `${name} emailed an updated BEO`,
    },
    [NOTIFICATION_KINDS.BEO_EMAIL_FAILED]: {
        icon: 'fa-solid fa-triangle-exclamation',
        label: name => `${name} — BEO could not be read`,
    },
}

// Bell + unread count in the office topbar, opening a dropdown of recent crew
// activity. Lives in the topbar rather than the sidebar because the sidebar
// collapses behind a hamburger on mobile.
export default function NotificationBell() {
    const { items, unreadCount, lastSeen, markAllRead } = useOfficeNotifications()
    const [open, setOpen] = useState(false)
    const wrapperRef = useRef(null)
    const navigate = useNavigate()

    // Close on outside click and on Escape.
    useEffect(() => {
        if (!open) return

        function handlePointerDown(e) {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setOpen(false)
            }
        }
        function handleKeyDown(e) {
            if (e.key === 'Escape') setOpen(false)
        }

        document.addEventListener('mousedown', handlePointerDown)
        document.addEventListener('keydown', handleKeyDown)
        return () => {
            document.removeEventListener('mousedown', handlePointerDown)
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [open])

    function handleItemClick(item) {
        setOpen(false)
        markAllRead()
        navigate(item.link)
    }

    return (
        <div className="notif-bell-wrapper" ref={wrapperRef}>
            <button
                className="notif-bell-btn"
                onClick={() => setOpen(prev => !prev)}
                aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
            >
                <i className="fa-regular fa-bell" />
                {unreadCount > 0 && (
                    <span className="notif-bell-count">{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
            </button>

            {open && (
                <div className="notif-panel">
                    <div className="notif-panel-header">
                        <span className="notif-panel-title">Notifications</span>
                        {unreadCount > 0 && (
                            <button className="notif-mark-read" onClick={markAllRead}>
                                Mark read
                            </button>
                        )}
                    </div>

                    {items.length === 0 ? (
                        <p className="notif-empty">Nothing new from the crew.</p>
                    ) : (
                        <ul className="notif-list custom-scrollbar">
                            {items.map(item => {
                                const display = KIND_DISPLAY[item.kind]
                                if (!display) return null
                                return (
                                    <li key={item.id}>
                                        <button
                                            className={`notif-item${item.created_at > lastSeen ? ' unread' : ''}`}
                                            onClick={() => handleItemClick(item)}
                                        >
                                            <i className={`${display.icon} notif-item-icon`} />
                                            <span className="notif-item-text">
                                                <span className="notif-item-label">
                                                    {display.label(item.actor_name)}
                                                </span>
                                                <span className="notif-item-meta">
                                                    {item.summary} · {formatRelativeTime(item.created_at)}
                                                </span>
                                            </span>
                                        </button>
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </div>
            )}
        </div>
    )
}

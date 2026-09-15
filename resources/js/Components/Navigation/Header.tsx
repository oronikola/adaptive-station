import { PageProps } from '@/types';
import { Link, usePage, usePoll } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { useTheme } from '@/Components/Theme/ThemeProvider';

interface HeaderProps {
    user: {
        name: string;
        role: string;
    };
    /** Current school name — Admin (tenant) roles only. */
    schoolLabel?: string;
    /** Platform super admin manages every school, so there's no single
     * "current school" to show — a static Platform label fills the slot
     * instead. */
    isPlatform: boolean;
}

const ROLE_LABELS: Record<string, string> = {
    platform_super_admin: 'Super Admin',
    tenant_admin: 'Admin',
    tenant_operator: 'Operator',
    adaptivestation_admin: 'Adaptive Station Admin',
};

function formatRelativeTime(value: string): string {
    const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;

    return `${Math.floor(seconds / 86400)}d ago`;
}

/** Shared global top bar rendered alongside the sidebar in AppShell. */
export default function Header({
    user,
    schoolLabel,
    isPlatform,
}: HeaderProps) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const notificationsRef = useRef<HTMLDivElement>(null);
    const roleLabel = ROLE_LABELS[user.role] ?? user.role;
    const { theme, toggleTheme } = useTheme();
    const { webNotifications } = usePage<PageProps>().props;
    const unreadCount = webNotifications?.unread_count ?? 0;

    usePoll(30000, { only: ['webNotifications'] });

    useEffect(() => {
        if (!menuOpen && !notificationsOpen) {
            return;
        }

        function handleClickOutside(event: MouseEvent) {
            const target = event.target as Node;
            if (menuRef.current && !menuRef.current.contains(target)) {
                setMenuOpen(false);
            }
            if (notificationsRef.current && !notificationsRef.current.contains(target)) {
                setNotificationsOpen(false);
            }
        }

        function handleEscape(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setMenuOpen(false);
                setNotificationsOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [menuOpen, notificationsOpen]);

    return (
        <header className="pf-topbar">
            {/* <div className="pf-topbar-left">
                {isPlatform ? (
                    <span className="pf-topbar-badge">Platform</span>
                ) : (
                    schoolLabel && (
                        <span className="pf-topbar-school">
                            {schoolLabel}
                        </span>
                    )
                )}
            </div> */}

            <div className="pf-topbar-right">
                <button
                    type="button"
                    className="pf-topbar-icon-btn"
                    onClick={toggleTheme}
                    title={
                        theme === 'dark'
                            ? 'Switch to light mode'
                            : 'Switch to dark mode'
                    }
                    aria-label={
                        theme === 'dark'
                            ? 'Switch to light mode'
                            : 'Switch to dark mode'
                    }
                    aria-pressed={theme === 'dark'}
                >
                    <span className="pf-theme-icon" aria-hidden="true">
                        <svg
                            className={
                                'pf-theme-icon-sun' +
                                (theme === 'dark' ? '' : ' pf-theme-icon--visible')
                            }
                            viewBox="0 0 24 24"
                        >
                            <circle cx="12" cy="12" r="4.2" />
                            <path d="M12 3v2.2M12 18.8V21M4.9 4.9l1.55 1.55M17.55 17.55l1.55 1.55M3 12h2.2M18.8 12H21M4.9 19.1l1.55-1.55M17.55 6.45l1.55-1.55" />
                        </svg>
                        <svg
                            className={
                                'pf-theme-icon-moon' +
                                (theme === 'dark' ? ' pf-theme-icon--visible' : '')
                            }
                            viewBox="0 0 24 24"
                        >
                            <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2Z" />
                        </svg>
                    </span>
                </button>

                <div className="pf-topbar-menu" ref={notificationsRef}>
                    <button
                        type="button"
                        className="pf-topbar-icon-btn"
                        aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications'}
                        aria-haspopup="menu"
                        aria-expanded={notificationsOpen}
                        onClick={() => {
                            setNotificationsOpen((open) => !open);
                            setMenuOpen(false);
                        }}
                    >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M6 9a6 6 0 1 1 12 0c0 4 1.4 5.6 2 6.2H4c.6-.6 2-2.2 2-6.2Z" />
                            <path d="M9.6 19a2.4 2.4 0 0 0 4.8 0" />
                        </svg>
                        {unreadCount > 0 && (
                            <span className="pf-topbar-notification-count" aria-hidden="true">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {notificationsOpen && (
                        <div className="pf-notification-dropdown" role="menu">
                            <div className="pf-notification-dropdown-header">
                                <div>
                                    <strong>Notifications</strong>
                                    <span>{unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}</span>
                                </div>
                                {unreadCount > 0 && (
                                    <Link href={route('notifications.read-all')} method="patch" as="button" preserveScroll>
                                        Mark all read
                                    </Link>
                                )}
                            </div>

                            <div className="pf-notification-list">
                                {(webNotifications?.recent.length ?? 0) === 0 ? (
                                    <p className="pf-notification-empty">No notifications yet.</p>
                                ) : webNotifications?.recent.map((notification) => (
                                    <Link
                                        key={notification.id}
                                        href={notification.read_at ? notification.action_url : route('notifications.read', notification.id)}
                                        method={notification.read_at ? 'get' : 'patch'}
                                        as={notification.read_at ? 'a' : 'button'}
                                        className={`pf-notification-item pf-notification-item--${notification.severity}${notification.read_at ? '' : ' pf-notification-item--unread'}`}
                                        role="menuitem"
                                        onClick={() => setNotificationsOpen(false)}
                                    >
                                        <span className="pf-notification-severity" aria-hidden="true" />
                                        <span className="pf-notification-content">
                                            <strong>{notification.title}</strong>
                                            <span>{notification.message}</span>
                                            <small>
                                                {notification.tenant_name && `${notification.tenant_name} · `}
                                                {formatRelativeTime(notification.created_at)}
                                            </small>
                                        </span>
                                    </Link>
                                ))}
                            </div>

                            <Link
                                href={route('notifications.index')}
                                className="pf-notification-view-all"
                                onClick={() => setNotificationsOpen(false)}
                            >
                                View all notifications
                            </Link>
                        </div>
                    )}
                </div>

                <div className="pf-topbar-divider" aria-hidden="true" />

                <div className="pf-topbar-menu" ref={menuRef}>
                    <button
                        type="button"
                        className="pf-topbar-trigger"
                        onClick={() => setMenuOpen((open) => !open)}
                        aria-haspopup="menu"
                        aria-expanded={menuOpen}
                        aria-label="Open account menu"
                    >
                        <span className="pf-topbar-avatar">
                            {user.name.charAt(0).toUpperCase()}
                        </span>
                        <span className="pf-topbar-user">
                            <span className="pf-topbar-user-name">
                                {user.name}
                            </span>
                            <span className="pf-topbar-user-role">
                                {roleLabel}
                            </span>
                        </span>
                        <svg
                            className={
                                'pf-topbar-chevron' +
                                (menuOpen ? ' pf-topbar-chevron--open' : '')
                            }
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                        >
                            <path d="m6 9 6 6 6-6" />
                        </svg>
                    </button>

                    {menuOpen && (
                        <div className="pf-topbar-dropdown" role="menu">
                            <Link
                                href={route('profile.edit')}
                                className="pf-topbar-dropdown-item"
                                role="menuitem"
                                onClick={() => setMenuOpen(false)}
                            >
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <circle cx="12" cy="8" r="3.2" />
                                    <path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" />
                                </svg>
                                My Profile
                            </Link>
                            {/* TODO: point at a dedicated settings page once
                                one exists — profile-edit is a placeholder. */}
                            <Link
                                href={route('profile.edit')}
                                className="pf-topbar-dropdown-item"
                                role="menuitem"
                                onClick={() => setMenuOpen(false)}
                            >
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <circle cx="12" cy="12" r="2.6" />
                                    <path d="M12 4.5v1.6M12 17.9v1.6M19.5 12h-1.6M6.1 12H4.5M17.1 6.9l-1.1 1.1M8 15l-1.1 1.1M17.1 17.1 16 16M8 9 6.9 7.9" />
                                </svg>
                                Settings
                            </Link>
                            <div
                                className="pf-topbar-dropdown-divider"
                                aria-hidden="true"
                            />
                            <Link
                                href={route('logout')}
                                method="post"
                                as="button"
                                className="pf-topbar-dropdown-item pf-topbar-dropdown-item--danger"
                                role="menuitem"
                            >
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M15 4H8a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7" />
                                    <path d="M10 12h11m0 0-3.5-3.5M21 12l-3.5 3.5" />
                                </svg>
                                Logout
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}

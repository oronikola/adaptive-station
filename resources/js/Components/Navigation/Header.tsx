import { BellIcon } from '@/Components/icons/bell';
import { ChevronDownIcon } from '@/Components/icons/chevron-down';
import { LogoutIcon } from '@/Components/icons/logout';
import { MoonIcon } from '@/Components/icons/moon';
import { SettingsIcon } from '@/Components/icons/settings';
import { SunIcon } from '@/Components/icons/sun';
import { UserIcon } from '@/Components/icons/user';
import { useTheme } from '@/Components/Theme/ThemeProvider';
import { PageProps } from '@/types';
import { Link, usePage, usePoll } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

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
                        {theme === 'dark' ? <SunIcon size={18} /> : <MoonIcon size={18} />}
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
                        <BellIcon size={18} aria-hidden="true" />
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
                        <ChevronDownIcon
                            size={16}
                            className={
                                'pf-topbar-chevron' +
                                (menuOpen ? ' pf-topbar-chevron--open' : '')
                            }
                            aria-hidden="true"
                        />
                    </button>

                    {menuOpen && (
                        <div className="pf-topbar-dropdown" role="menu">
                            <Link
                                href={route('profile.edit')}
                                className="pf-topbar-dropdown-item"
                                role="menuitem"
                                onClick={() => setMenuOpen(false)}
                            >
                                <UserIcon size={16} aria-hidden="true" />
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
                                <SettingsIcon size={16} aria-hidden="true" />
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
                                <LogoutIcon size={16} aria-hidden="true" />
                                Logout
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}

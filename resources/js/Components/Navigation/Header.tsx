import { Link } from '@inertiajs/react';
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
    /** TODO: wire to a real notifications source once one exists; for now
     * this always renders the bell with no unread indicator. */
    hasUnreadNotifications?: boolean;
}

const ROLE_LABELS: Record<string, string> = {
    platform_super_admin: 'Super Admin',
    tenant_admin: 'Admin',
    tenant_operator: 'Operator',
};

/** Shared global top bar rendered alongside the sidebar in AppShell. */
export default function Header({
    user,
    schoolLabel,
    isPlatform,
    hasUnreadNotifications = false,
}: HeaderProps) {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const roleLabel = ROLE_LABELS[user.role] ?? user.role;

    useEffect(() => {
        if (!menuOpen) {
            return;
        }

        function handleClickOutside(event: MouseEvent) {
            if (
                menuRef.current &&
                !menuRef.current.contains(event.target as Node)
            ) {
                setMenuOpen(false);
            }
        }

        function handleEscape(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setMenuOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [menuOpen]);

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
                    title="Theme switching coming soon"
                    aria-label="Toggle theme (coming soon)"
                >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <circle cx="12" cy="12" r="4.2" />
                        <path d="M12 3v2.2M12 18.8V21M4.9 4.9l1.55 1.55M17.55 17.55l1.55 1.55M3 12h2.2M18.8 12H21M4.9 19.1l1.55-1.55M17.55 6.45l1.55-1.55" />
                    </svg>
                </button>

                <button
                    type="button"
                    className="pf-topbar-icon-btn"
                    aria-label={
                        hasUnreadNotifications
                            ? 'Notifications (unread)'
                            : 'Notifications'
                    }
                >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M6 9a6 6 0 1 1 12 0c0 4 1.4 5.6 2 6.2H4c.6-.6 2-2.2 2-6.2Z" />
                        <path d="M9.6 19a2.4 2.4 0 0 0 4.8 0" />
                    </svg>
                    {hasUnreadNotifications && (
                        <span
                            className="pf-topbar-badge-dot"
                            aria-hidden="true"
                        />
                    )}
                </button>

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

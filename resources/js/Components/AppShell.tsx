import ApplicationLogo from '@/Components/ApplicationLogo';
import { classifyFlashMessage, useToast } from '@/Components/toast/ToastProvider';
import { Link, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { NavItem, PageProps } from '@/types';
import '../../css/app-shell.css';

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'as-sidebar-collapsed';

function ProfileIcon() {
    return (
        <svg viewBox="0 0 24 24">
            <circle cx="12" cy="8" r="3.2" />
            <path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" />
        </svg>
    );
}

function LogoutIcon() {
    return (
        <svg viewBox="0 0 24 24">
            <path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" />
            <path d="M15 16l4-4-4-4" />
            <path d="M19 12H9" />
        </svg>
    );
}

function CollapseIcon() {
    return (
        <svg viewBox="0 0 24 24">
            <path d="M14 6l-6 6 6 6" />
        </svg>
    );
}

interface TooltipState {
    visible: boolean;
    text: string;
    top: number;
    left: number;
    variant: 'default' | 'danger';
}

function SidebarContent({
    brand,
    brandHref,
    items,
    user,
    tenantLabel,
    collapsed = false,
    onToggleCollapsed,
    onShowTooltip,
    onHideTooltip,
}: {
    brand: string;
    brandHref: string;
    items: NavItem[];
    user?: { name?: string; email?: string } | null;
    tenantLabel?: string;
    collapsed?: boolean;
    onToggleCollapsed?: () => void;
    onShowTooltip?: (e: React.MouseEvent<HTMLElement>, text: string, variant?: 'default' | 'danger') => void;
    onHideTooltip?: () => void;
}) {
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    return (
        <>
            <div className="pf-sidebar-header">
                <Link
                    href={brandHref}
                    className="pf-sidebar-logo"
                    title={collapsed ? undefined : brand}
                    onMouseEnter={(e) => onShowTooltip?.(e, brand)}
                    onMouseLeave={onHideTooltip}
                    onClick={onHideTooltip}
                >
                    <span className="pf-sidebar-logo-badge">
                        <ApplicationLogo className="pf-sidebar-logo-icon" />
                    </span>
                    <span className="pf-sidebar-logo-text">{brand}</span>
                </Link>
                {onToggleCollapsed && (
                    <button
                        type="button"
                        className="pf-sidebar-collapse-toggle"
                        onClick={() => {
                            onHideTooltip?.();
                            onToggleCollapsed();
                        }}
                        onMouseEnter={(e) =>
                            onShowTooltip?.(
                                e,
                                collapsed ? 'Expand sidebar' : 'Collapse sidebar',
                            )
                        }
                        onMouseLeave={onHideTooltip}
                        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        aria-pressed={collapsed}
                        title={collapsed ? undefined : (collapsed ? 'Expand sidebar' : 'Collapse sidebar')}
                    >
                        <span className={collapsed ? 'pf-sidebar-collapse-icon pf-sidebar-collapse-icon--flipped' : 'pf-sidebar-collapse-icon'}>
                            <CollapseIcon />
                        </span>
                    </button>
                )}
                {tenantLabel && (
                    <p className="pf-sidebar-tenant">{tenantLabel}</p>
                )}
            </div>

            <nav className="pf-sidebar-nav">
                {items.map((item) => {
                    const isActive = route().current(item.activePattern);
                    return (
                        <Link
                            key={item.name}
                            href={route(item.route)}
                            title={collapsed ? undefined : item.label}
                            onMouseEnter={(e) => onShowTooltip?.(e, item.label)}
                            onMouseLeave={onHideTooltip}
                            onClick={onHideTooltip}
                            className={
                                'pf-sidebar-link' +
                                (isActive ? ' pf-sidebar-link--active' : '')
                            }
                        >
                            <span className="pf-sidebar-icon">{item.icon}</span>
                            <span className="pf-sidebar-label">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className="pf-sidebar-footer">
                <div
                    className="pf-sidebar-user"
                    onMouseEnter={(e) =>
                        onShowTooltip?.(e, `${user?.name || 'User'} • ${user?.email || ''}`)
                    }
                    onMouseLeave={onHideTooltip}
                >
                    <span className="pf-sidebar-avatar">
                        {(user?.name?.charAt(0) || 'U').toUpperCase()}
                    </span>
                    <div className="pf-sidebar-user-info">
                        <p className="pf-sidebar-user-name">{user?.name || 'User'}</p>
                        <p className="pf-sidebar-user-email">{user?.email || ''}</p>
                    </div>
                </div>
                <div className="pf-sidebar-footer-links">
                    <Link
                        href={route('profile.edit')}
                        title={collapsed ? undefined : 'Profile'}
                        onMouseEnter={(e) => onShowTooltip?.(e, 'Profile')}
                        onMouseLeave={onHideTooltip}
                        onClick={onHideTooltip}
                        className={
                            'pf-sidebar-footer-link' +
                            (route().current('profile.edit')
                                ? ' pf-sidebar-footer-link--active'
                                : '')
                        }
                    >
                        <span className="pf-sidebar-footer-icon">
                            <ProfileIcon />
                        </span>
                        <span className="pf-sidebar-label">Profile</span>
                    </Link>
                    <Link
                        href={route('logout')}
                        method="post"
                        as="button"
                        title={collapsed ? undefined : 'Log out'}
                        onMouseEnter={(e) => onShowTooltip?.(e, 'Log Out', 'danger')}
                        onMouseLeave={onHideTooltip}
                        onClick={() => {
                            onHideTooltip?.();
                            setIsLoggingOut(true);
                        }}
                        className={
                            'pf-sidebar-footer-link pf-sidebar-footer-link--logout' +
                            (isLoggingOut ? ' is-logging-out' : '')
                        }
                    >
                        <span className="pf-sidebar-footer-icon">
                            <LogoutIcon />
                        </span>
                        <span className="pf-sidebar-label">
                            {isLoggingOut ? 'Logging out...' : 'Log Out'}
                        </span>
                    </Link>
                </div>
            </div>
        </>
    );
}

/**
 * Shared sidebar + shell used by both the superadmin/platform layout
 * (`PlatformLayout`) and the tenant admin portal layout (`AdminLayout`).
 * Each layout supplies its own `brand`, `brandHref`, and `items` (nav
 * entries with `name`, `label`, `route`, `activePattern`, and `icon`).
 */
export default function AppShell({
    brand = 'Adaptive Station',
    brandHref,
    items,
    header,
    children,
}: {
    brand?: string;
    brandHref: string;
    items: NavItem[];
    header?: React.ReactNode;
    children: React.ReactNode;
}) {
    const { auth, tenant, flash } = usePage<PageProps>().props;
    const user = auth?.user ?? null;

    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(() => {
        if (typeof window === 'undefined') {
            return false;
        }

        return window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === '1';
    });

    const [tooltip, setTooltip] = useState<TooltipState>({
        visible: false,
        text: '',
        top: 0,
        left: 0,
        variant: 'default',
    });

    const handleShowTooltip = (
        e: React.MouseEvent<HTMLElement>,
        text: string,
        variant: 'default' | 'danger' = 'default',
    ) => {
        if (!collapsed) {
            return;
        }
        const rect = e.currentTarget.getBoundingClientRect();
        setTooltip({
            visible: true,
            text,
            top: Math.round(rect.top + rect.height / 2),
            left: Math.round(rect.right + 12),
            variant,
        });
    };

    const handleHideTooltip = () => {
        setTooltip((previous) => (previous.visible ? { ...previous, visible: false } : previous));
    };

    useEffect(() => {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, collapsed ? '1' : '0');
    }, [collapsed]);

    // Automatically hide tooltip on scroll or resize
    useEffect(() => {
        if (!tooltip.visible) {
            return;
        }
        const handleDismiss = () => handleHideTooltip();
        window.addEventListener('scroll', handleDismiss, true);
        window.addEventListener('resize', handleDismiss);
        return () => {
            window.removeEventListener('scroll', handleDismiss, true);
            window.removeEventListener('resize', handleDismiss);
        };
    }, [tooltip.visible]);

    // Every CRUD controller already flashes `success`/`error` on redirect
    // (see HandleInertiaRequests) — surface those as toasts automatically
    // so most screens get feedback for free. classifyFlashMessage() is a
    // best-effort guess at create/update/delete from the message text;
    // call useToast() directly from a screen when you need an exact type.
    const { showToast } = useToast();

    useEffect(() => {
        if (flash?.success && !flash?.activationCode) {
            showToast({ type: classifyFlashMessage(flash.success), message: flash.success });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [flash?.success, flash?.activationCode]);

    useEffect(() => {
        if (flash?.error) {
            showToast({ type: 'error', message: flash.error });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [flash?.error]);

    return (
        <div className="pf-shell">
            <aside className={'pf-sidebar' + (collapsed ? ' pf-sidebar--collapsed' : '')}>
                <SidebarContent
                    brand={brand}
                    brandHref={brandHref}
                    items={items}
                    user={user}
                    tenantLabel={tenant?.name}
                    collapsed={collapsed}
                    onToggleCollapsed={() => {
                        handleHideTooltip();
                        setCollapsed((previous) => !previous);
                    }}
                    onShowTooltip={handleShowTooltip}
                    onHideTooltip={handleHideTooltip}
                />
            </aside>

            {/* Global Tooltip for Floating Collapsed Sidebar */}
            <div
                role="tooltip"
                aria-hidden={!tooltip.visible}
                className={
                    'pf-global-tooltip' +
                    (tooltip.visible ? ' pf-global-tooltip--visible' : '') +
                    (tooltip.variant === 'danger' ? ' pf-global-tooltip--danger' : '')
                }
                style={{
                    top: `${tooltip.top}px`,
                    left: `${tooltip.left}px`,
                }}
            >
                <span className="pf-global-tooltip-arrow" aria-hidden="true" />
                <span className="pf-global-tooltip-text">{tooltip.text}</span>
            </div>

            {mobileNavOpen && (
                <div
                    className="pf-sidebar-overlay"
                    onClick={() => setMobileNavOpen(false)}
                >
                    <aside
                        className="pf-sidebar pf-sidebar--mobile"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <SidebarContent
                            brand={brand}
                            brandHref={brandHref}
                            items={items}
                            user={user}
                            tenantLabel={tenant?.name}
                        />
                    </aside>
                </div>
            )}

            <div className="pf-shell-main">
                <div className="pf-mobile-topbar">
                    <button
                        type="button"
                        className="pf-mobile-toggle"
                        onClick={() => setMobileNavOpen((previous) => !previous)}
                    >
                        {mobileNavOpen ? (
                            <svg viewBox="0 0 24 24">
                                <path d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        ) : (
                            <svg viewBox="0 0 24 24">
                                <path d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        )}
                    </button>
                    <Link href={brandHref} className="pf-sidebar-logo">
                        <span className="pf-sidebar-logo-badge">
                            <ApplicationLogo className="pf-sidebar-logo-icon" />
                        </span>
                        <span className="pf-sidebar-logo-text">{brand}</span>
                    </Link>
                </div>

                {header && <div className="pf-shell-header">{header}</div>}

                <main className="pf-shell-content">{children}</main>
            </div>
        </div>
    );
}

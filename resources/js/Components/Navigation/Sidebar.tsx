import ApplicationLogo from '@/Components/Branding/ApplicationLogo';
import { ChevronLeftIcon } from '@/Components/icons/chevron-left';
import { LogoutIcon } from '@/Components/icons/logout';
import { MoonIcon } from '@/Components/icons/moon';
import { SunIcon } from '@/Components/icons/sun';
import { UserIcon } from '@/Components/icons/user';
import NotificationBell from '@/Components/Navigation/NotificationBell';
import { useTheme } from '@/Components/Theme/ThemeProvider';
import { NavItem } from '@/types';
import { Link } from '@inertiajs/react';
import { useState } from 'react';

interface SidebarProps {
    brand: string;
    brandHref: string;
    items: NavItem[];
    user?: { name?: string; email?: string } | null;
    tenantLabel?: string;
    collapsed?: boolean;
    onToggleCollapsed?: () => void;
    onShowTooltip?: (
        e: React.MouseEvent<HTMLElement>,
        text: string,
        variant?: 'default' | 'danger',
    ) => void;
    onHideTooltip?: () => void;
}

export default function Sidebar({
    brand,
    brandHref,
    items,
    user,
    tenantLabel,
    collapsed = false,
    onToggleCollapsed,
    onShowTooltip,
    onHideTooltip,
}: SidebarProps) {
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const { theme, toggleTheme } = useTheme();
    const themeActionLabel =
        theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';

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
                        <ApplicationLogo
                            className="pf-sidebar-logo-icon"
                            alt=""
                        />
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
                                collapsed
                                    ? 'Expand sidebar'
                                    : 'Collapse sidebar',
                            )
                        }
                        onMouseLeave={onHideTooltip}
                        aria-label={
                            collapsed ? 'Expand sidebar' : 'Collapse sidebar'
                        }
                        aria-pressed={collapsed}
                    >
                        <span
                            className={
                                collapsed
                                    ? 'pf-sidebar-collapse-icon pf-sidebar-collapse-icon--flipped'
                                    : 'pf-sidebar-collapse-icon'
                            }
                        >
                            <ChevronLeftIcon size={18} />
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
                    const className =
                        'pf-sidebar-link' +
                        (isActive ? ' pf-sidebar-link--active' : '');
                    const inner = (
                        <>
                            <span className="pf-sidebar-icon">{item.icon}</span>
                            <span className="pf-sidebar-label">
                                {item.label}
                            </span>
                            {item.badge != null && (
                                <span className="pf-sidebar-badge">
                                    {item.badge}
                                </span>
                            )}
                        </>
                    );

                    return item.external ? (
                        <a
                            key={item.name}
                            href={route(item.route)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={collapsed ? undefined : item.label}
                            onMouseEnter={(e) =>
                                onShowTooltip?.(e, item.label)
                            }
                            onMouseLeave={onHideTooltip}
                            onClick={onHideTooltip}
                            className={className}
                        >
                            {inner}
                        </a>
                    ) : (
                        <Link
                            key={item.name}
                            href={route(item.route)}
                            title={collapsed ? undefined : item.label}
                            onMouseEnter={(e) =>
                                onShowTooltip?.(e, item.label)
                            }
                            onMouseLeave={onHideTooltip}
                            onClick={onHideTooltip}
                            className={className}
                        >
                            {inner}
                        </Link>
                    );
                })}
            </nav>

            <div className="pf-sidebar-footer">
                <div
                    className="pf-sidebar-user"
                    onMouseEnter={(e) =>
                        onShowTooltip?.(
                            e,
                            `${user?.name || 'User'} • ${user?.email || ''}`,
                        )
                    }
                    onMouseLeave={onHideTooltip}
                >
                    <span className="pf-sidebar-avatar">
                        {(user?.name?.charAt(0) || 'U').toUpperCase()}
                    </span>
                    <div className="pf-sidebar-user-info">
                        <p className="pf-sidebar-user-name">
                            {user?.name || 'User'}
                        </p>
                        <p className="pf-sidebar-user-email">
                            {user?.email || ''}
                        </p>
                    </div>
                </div>
                <div className="pf-sidebar-footer-links">
                    <NotificationBell
                        collapsed={collapsed}
                        onShowTooltip={onShowTooltip}
                        onHideTooltip={onHideTooltip}
                    />
                    <button
                        type="button"
                        className="pf-sidebar-footer-link"
                        onClick={() => {
                            onHideTooltip?.();
                            toggleTheme();
                        }}
                        onMouseEnter={(e) =>
                            onShowTooltip?.(e, themeActionLabel)
                        }
                        onMouseLeave={onHideTooltip}
                        aria-label={themeActionLabel}
                        aria-pressed={theme === 'dark'}
                    >
                        <span className="pf-sidebar-footer-icon pf-theme-icon">
                            {theme === 'dark' ? <SunIcon size={18} /> : <MoonIcon size={18} />}
                        </span>
                        <span className="pf-sidebar-label">Darkmode</span>
                    </button>
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
                            <UserIcon size={18} />
                        </span>
                        <span className="pf-sidebar-label">Profile</span>
                    </Link>
                    <Link
                        href={route('logout')}
                        method="post"
                        as="button"
                        title={collapsed ? undefined : 'Log out'}
                        onMouseEnter={(e) =>
                            onShowTooltip?.(e, 'Log Out', 'danger')
                        }
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
                            <LogoutIcon size={18} />
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

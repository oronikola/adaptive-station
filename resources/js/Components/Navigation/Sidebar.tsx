import ApplicationLogo from '@/Components/Branding/ApplicationLogo';
import { Link } from '@inertiajs/react';
import { NavItem } from '@/types';

interface SidebarProps {
    brand: string;
    brandHref: string;
    items: NavItem[];
    tenantLabel?: string;
    /** Icon-only collapsed rail. Omit both this and onToggleCollapse to
     * always render expanded with no toggle — used for the mobile drawer,
     * which is already a compact overlay. */
    collapsed?: boolean;
    onToggleCollapse?: () => void;
}

export default function Sidebar({
    brand,
    brandHref,
    items,
    tenantLabel,
    collapsed = false,
    onToggleCollapse,
}: SidebarProps) {
    return (
        <>
            <div className="pf-sidebar-header">
                <Link href={brandHref} className="pf-sidebar-logo">
                    <ApplicationLogo className="pf-sidebar-logo-mark" alt="" />
                    <span className="pf-sidebar-logo-text">{brand}</span>
                </Link>
                {tenantLabel && (
                    <p className="pf-sidebar-tenant">{tenantLabel}</p>
                )}
            </div>

            <nav className="pf-sidebar-nav">
                {items.map((item) =>
                    item.external ? (
                        <a
                            key={item.name}
                            href={route(item.route)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="pf-sidebar-link"
                            title={collapsed ? item.label : undefined}
                        >
                            <span className="pf-sidebar-icon">{item.icon}</span>
                            <span className="pf-sidebar-link-label">{item.label}</span>
                        </a>
                    ) : (
                        <Link
                            key={item.name}
                            href={route(item.route)}
                            title={collapsed ? item.label : undefined}
                            className={
                                'pf-sidebar-link' +
                                (route().current(item.activePattern)
                                    ? ' pf-sidebar-link--active'
                                    : '')
                            }
                        >
                            <span className="pf-sidebar-icon">{item.icon}</span>
                            <span className="pf-sidebar-link-label">{item.label}</span>
                            {item.badge != null && (
                                <span className="pf-sidebar-badge">{item.badge}</span>
                            )}
                        </Link>
                    ),
                )}
            </nav>

            {/* Pinned below the (possibly scrollable) nav list — stays put
                regardless of how many nav items there are or how tall the
                page content is. */}
            {onToggleCollapse && (
                <div className="pf-sidebar-footer">
                    <button
                        type="button"
                        className="pf-sidebar-collapse-btn"
                        onClick={onToggleCollapse}
                        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        aria-expanded={!collapsed}
                    >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M14 6l-6 6 6 6" />
                        </svg>
                    </button>
                </div>
            )}
        </>
    );
}

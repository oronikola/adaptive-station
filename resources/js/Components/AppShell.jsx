import ApplicationLogo from '@/Components/ApplicationLogo';
import { Link, usePage } from '@inertiajs/react';
import { useState } from 'react';
import '../../css/app-shell.css';

function SidebarContent({ brand, brandHref, items, user, tenantLabel }) {
    return (
        <>
            <div className="pf-sidebar-header">
                <Link href={brandHref} className="pf-sidebar-logo">
                    <ApplicationLogo className="pf-sidebar-logo-mark" />
                    <span className="pf-sidebar-logo-text">{brand}</span>
                </Link>
                {tenantLabel && (
                    <p className="pf-sidebar-tenant">{tenantLabel}</p>
                )}
            </div>

            <nav className="pf-sidebar-nav">
                {items.map((item) => (
                    <Link
                        key={item.name}
                        href={route(item.route)}
                        className={
                            'pf-sidebar-link' +
                            (route().current(item.activePattern)
                                ? ' pf-sidebar-link--active'
                                : '')
                        }
                    >
                        <span className="pf-sidebar-icon">{item.icon}</span>
                        <span>{item.label}</span>
                    </Link>
                ))}
            </nav>

            <div className="pf-sidebar-footer">
                <div className="pf-sidebar-user">
                    <span className="pf-sidebar-avatar">
                        {user.name.charAt(0).toUpperCase()}
                    </span>
                    <div className="pf-sidebar-user-info">
                        <p className="pf-sidebar-user-name">{user.name}</p>
                        <p className="pf-sidebar-user-email">{user.email}</p>
                    </div>
                </div>
                <div className="pf-sidebar-footer-links">
                    <Link
                        href={route('profile.edit')}
                        className="pf-sidebar-footer-link"
                    >
                        Profile
                    </Link>
                    <Link
                        href={route('logout')}
                        method="post"
                        as="button"
                        className="pf-sidebar-footer-link"
                    >
                        Log Out
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
}) {
    const { auth, tenant, flash } = usePage().props;
    const user = auth.user;

    const [mobileNavOpen, setMobileNavOpen] = useState(false);

    return (
        <div className="pf-shell">
            <aside className="pf-sidebar">
                <SidebarContent
                    brand={brand}
                    brandHref={brandHref}
                    items={items}
                    user={user}
                    tenantLabel={tenant?.name}
                />
            </aside>

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
                        <ApplicationLogo className="pf-sidebar-logo-mark" />
                        <span className="pf-sidebar-logo-text">{brand}</span>
                    </Link>
                </div>

                {header && <div className="pf-shell-header">{header}</div>}

                <main className="pf-shell-content">
                    {flash?.success && (
                        <div className="pf-flash-success">{flash.success}</div>
                    )}

                    {children}
                </main>
            </div>
        </div>
    );
}

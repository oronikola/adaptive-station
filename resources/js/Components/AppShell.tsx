import ApplicationLogo from '@/Components/ApplicationLogo';
import { classifyFlashMessage, useToast } from '@/Components/toast/ToastProvider';
import { Link, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { NavItem, PageProps } from '@/types';
import '../../css/app-shell.css';

function SidebarContent({ brand, brandHref, items, user, tenantLabel }: { brand: string; brandHref: string; items: NavItem[]; user: { name: string; email: string }; tenantLabel?: string }) {
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
                        >
                            <span className="pf-sidebar-icon">{item.icon}</span>
                            <span>{item.label}</span>
                        </a>
                    ) : (
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
                    ),
                )}
            </nav>

            <div className="pf-sidebar-footer">
                <div className="pf-sidebar-account">
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
                        <svg viewBox="0 0 24 24">
                            <circle cx="12" cy="8" r="3.2" />
                            <path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" />
                        </svg>
                        Profile
                    </Link>
                    <Link
                        href={route('logout')}
                        method="post"
                        as="button"
                        className="pf-sidebar-footer-link pf-sidebar-footer-link--danger"
                    >
                        <svg viewBox="0 0 24 24">
                            <path d="M15 4H8a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7" />
                            <path d="M10 12h11m0 0-3.5-3.5M21 12l-3.5 3.5" />
                        </svg>
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
}: {
    brand?: string;
    brandHref: string;
    items: NavItem[];
    header?: React.ReactNode;
    children: React.ReactNode;
}) {
    const { auth, tenant, flash } = usePage<PageProps>().props;
    const user = auth.user;

    const [mobileNavOpen, setMobileNavOpen] = useState(false);

    // Every CRUD controller already flashes `success`/`error` on redirect
    // (see HandleInertiaRequests) — surface those as toasts automatically
    // so most screens get feedback for free. classifyFlashMessage() is a
    // best-effort guess at create/update/delete from the message text;
    // call useToast() directly from a screen when you need an exact type.
    const { showToast } = useToast();

    useEffect(() => {
        if (flash?.success) {
            showToast({ type: classifyFlashMessage(flash.success), message: flash.success });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [flash?.success]);

    useEffect(() => {
        if (flash?.error) {
            showToast({ type: 'error', message: flash.error });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [flash?.error]);

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
                        <ApplicationLogo className="pf-sidebar-logo-mark" alt="" />
                        <span className="pf-sidebar-logo-text">{brand}</span>
                    </Link>
                </div>

                {header && <div className="pf-shell-header">{header}</div>}

                <main className="pf-shell-content">{children}</main>
            </div>
        </div>
    );
}

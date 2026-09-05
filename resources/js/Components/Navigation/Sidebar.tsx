import ApplicationLogo from '@/Components/Branding/ApplicationLogo';
import { Link } from '@inertiajs/react';
import { NavItem } from '@/types';

interface SidebarProps {
    brand: string;
    brandHref: string;
    items: NavItem[];
    user: {
        name: string;
        email: string;
    };
    tenantLabel?: string;
}

export default function Sidebar({
    brand,
    brandHref,
    items,
    user,
    tenantLabel,
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

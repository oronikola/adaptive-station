import ApplicationLogo from '@/Components/Branding/ApplicationLogo';
import Sidebar from '@/Components/Navigation/Sidebar';
import {
    classifyFlashMessage,
    useToast,
} from '@/Components/Toast/ToastProvider';
import { Link, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { NavItem, PageProps } from '@/types';
import '../../../css/components/navigation.css';

interface AppShellProps {
    brand?: string;
    brandHref: string;
    items: NavItem[];
    header?: React.ReactNode;
    children: React.ReactNode;
}

/** Shared application shell used by the platform and tenant portals. */
export default function AppShell({
    brand = 'Adaptive Station',
    brandHref,
    items,
    header,
    children,
}: AppShellProps) {
    const { auth, tenant, flash } = usePage<PageProps>().props;
    const user = auth.user;
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const { showToast } = useToast();

    useEffect(() => {
        if (flash?.success) {
            showToast({
                type: classifyFlashMessage(flash.success),
                message: flash.success,
            });
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
                <Sidebar
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
                        onClick={(event) => event.stopPropagation()}
                    >
                        <Sidebar
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
                        onClick={() =>
                            setMobileNavOpen((previous) => !previous)
                        }
                        aria-label={
                            mobileNavOpen
                                ? 'Close navigation menu'
                                : 'Open navigation menu'
                        }
                        aria-expanded={mobileNavOpen}
                    >
                        {mobileNavOpen ? (
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        ) : (
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        )}
                    </button>
                    <Link href={brandHref} className="pf-sidebar-logo">
                        <ApplicationLogo
                            className="pf-sidebar-logo-mark"
                            alt=""
                        />
                        <span className="pf-sidebar-logo-text">{brand}</span>
                    </Link>
                </div>

                {header && <div className="pf-shell-header">{header}</div>}

                <main className="pf-shell-content">{children}</main>
            </div>
        </div>
    );
}

import ApplicationLogo from '@/Components/Branding/ApplicationLogo';
import { MenuIcon } from '@/Components/icons/menu';
import { XIcon } from '@/Components/icons/x';
import PageTransition from '@/Components/Navigation/PageTransition';
import Sidebar from '@/Components/Navigation/Sidebar';
import {
    classifyFlashMessage,
    useToast,
} from '@/Components/toast/ToastProvider';
import { Link, usePage, usePoll } from '@inertiajs/react';
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

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'as-sidebar-collapsed';
const LEGACY_SIDEBAR_COLLAPSED_STORAGE_KEY = 'pf-sidebar-collapsed';

interface TooltipState {
    visible: boolean;
    text: string;
    top: number;
    left: number;
    variant: 'default' | 'danger';
}

function readStoredCollapsed(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }

    try {
        const stored =
            window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) ??
            window.localStorage.getItem(LEGACY_SIDEBAR_COLLAPSED_STORAGE_KEY);

        return stored === '1';
    } catch {
        return false;
    }
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
    const user = auth?.user ?? null;
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(readStoredCollapsed);
    const [tooltip, setTooltip] = useState<TooltipState>({
        visible: false,
        text: '',
        top: 0,
        left: 0,
        variant: 'default',
    });
    const { showToast } = useToast();

    usePoll(30000, { only: ['webNotifications'] });

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
        setTooltip((previous) =>
            previous.visible ? { ...previous, visible: false } : previous,
        );
    };

    useEffect(() => {
        try {
            window.localStorage.setItem(
                SIDEBAR_COLLAPSED_STORAGE_KEY,
                collapsed ? '1' : '0',
            );
        } catch {
            // Private browsing / storage disabled — toggle still works
            // for this session.
        }
    }, [collapsed]);

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

    useEffect(() => {
        if (flash?.success && !flash?.activationCode) {
            showToast({
                type: classifyFlashMessage(flash.success),
                message: flash.success,
            });
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
            <a href="#main-content" className="pf-skip-link">
                Skip to content
            </a>

            <aside
                aria-label="Main navigation"
                className={
                    'pf-sidebar' + (collapsed ? ' pf-sidebar--collapsed' : '')
                }
            >
                <Sidebar
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

            <div
                role="tooltip"
                aria-hidden={!tooltip.visible}
                className={
                    'pf-global-tooltip' +
                    (tooltip.visible ? ' pf-global-tooltip--visible' : '') +
                    (tooltip.variant === 'danger'
                        ? ' pf-global-tooltip--danger'
                        : '')
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
                        aria-label="Navigation menu"
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
                            <XIcon size={20} />
                        ) : (
                            <MenuIcon size={20} />
                        )}
                    </button>
                    <Link href={brandHref} className="pf-sidebar-logo">
                        <span className="pf-sidebar-logo-badge">
                            <ApplicationLogo
                                className="pf-sidebar-logo-icon"
                                alt=""
                            />
                        </span>
                        <span className="pf-sidebar-logo-text">{brand}</span>
                    </Link>
                </div>

                <PageTransition
                    withExit={false}
                    className="pf-page-transition pf-page-transition--shell"
                >
                    {header && <div className="pf-shell-header">{header}</div>}

                    <main id="main-content" className="pf-shell-content">
                        {children}
                    </main>
                </PageTransition>
            </div>
        </div>
    );
}

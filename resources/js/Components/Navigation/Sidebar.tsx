import ApplicationLogo from '@/Components/Branding/ApplicationLogo';
import { NavItem } from '@/types';
import { Link } from '@inertiajs/react';
import { motion } from 'motion/react';

interface SidebarProps {
    brand: string;
    brandHref: string;
    items: NavItem[];
    tenantLabel?: string;
    collapsed?: boolean;
    onToggleCollapse?: () => void;
}

const SPRING = { type: 'spring' as const, stiffness: 520, damping: 42, mass: 0.75 };
const OPACITY = { type: 'spring' as const, stiffness: 600, damping: 50, mass: 0.5 };

function AnimatedLabel({
    collapsed,
    children,
    className,
    maxW = 180,
}: {
    collapsed: boolean;
    children: React.ReactNode;
    className?: string;
    maxW?: number;
}) {
    return (
        <motion.span
            className={className}
            animate={{
                opacity: collapsed ? 0 : 1,
                maxWidth: collapsed ? 0 : maxW,
            }}
            transition={SPRING}
            style={{ overflow: 'hidden', whiteSpace: 'nowrap', display: 'block', minWidth: 0 }}
            aria-hidden={collapsed ? true : undefined}
        >
            {children}
        </motion.span>
    );
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
                    <AnimatedLabel
                        collapsed={collapsed}
                        className="pf-sidebar-logo-text"
                        maxW={160}
                    >
                        {brand}
                    </AnimatedLabel>
                </Link>
                {tenantLabel && (
                    <AnimatedLabel
                        collapsed={collapsed}
                        className="pf-sidebar-tenant"
                        maxW={220}
                    >
                        {tenantLabel}
                    </AnimatedLabel>
                )}
            </div>

            <nav className="pf-sidebar-nav">
                {items.map((item) => {
                    const isActive = route().current(item.activePattern);
                    const linkClass =
                        'pf-sidebar-link' + (isActive ? ' pf-sidebar-link--active' : '');

                    const inner = (
                        <>
                            <span className="pf-sidebar-icon">{item.icon}</span>
                            <AnimatedLabel collapsed={collapsed} maxW={180}>
                                {item.label}
                            </AnimatedLabel>
                            {item.badge != null && (
                                <motion.span
                                    className="pf-sidebar-badge"
                                    animate={{
                                        opacity: collapsed ? 0 : 1,
                                        maxWidth: collapsed ? 0 : 40,
                                        marginLeft: collapsed ? 0 : 'auto',
                                    }}
                                    transition={OPACITY}
                                    style={{ overflow: 'hidden', minWidth: 0, flexShrink: 0 }}
                                >
                                    {item.badge}
                                </motion.span>
                            )}
                        </>
                    );

                    return item.external ? (
                        <a
                            key={item.name}
                            href={route(item.route)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={linkClass}
                            title={collapsed ? item.label : undefined}
                        >
                            {inner}
                        </a>
                    ) : (
                        <Link
                            key={item.name}
                            href={route(item.route)}
                            className={linkClass}
                            title={collapsed ? item.label : undefined}
                        >
                            {inner}
                        </Link>
                    );
                })}
            </nav>

            {onToggleCollapse && (
                <div className="pf-sidebar-footer">
                    <button
                        type="button"
                        className="pf-sidebar-collapse-btn"
                        onClick={onToggleCollapse}
                        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        aria-expanded={!collapsed}
                        title={collapsed ? 'Expand sidebar' : undefined}
                    >
                        <span className="pf-sidebar-collapse-icon">
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M14 6l-6 6 6 6" />
                            </svg>
                        </span>
                        <AnimatedLabel
                            collapsed={collapsed}
                            className="pf-sidebar-collapse-label"
                            maxW={130}
                        >
                            Collapse sidebar
                        </AnimatedLabel>
                    </button>
                </div>
            )}
        </>
    );
}

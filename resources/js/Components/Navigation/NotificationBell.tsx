import { BellIcon } from '@/Components/icons/bell';
import { PageProps } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface NotificationBellProps {
    collapsed?: boolean;
    onShowTooltip?: (
        e: React.MouseEvent<HTMLElement>,
        text: string,
        variant?: 'default' | 'danger',
    ) => void;
    onHideTooltip?: () => void;
}

function formatRelativeTime(value: string): string {
    const seconds = Math.max(
        0,
        Math.floor((Date.now() - new Date(value).getTime()) / 1000),
    );

    if (seconds < 60) {
        return 'Just now';
    }

    if (seconds < 3600) {
        return `${Math.floor(seconds / 60)}m ago`;
    }

    if (seconds < 86400) {
        return `${Math.floor(seconds / 3600)}h ago`;
    }

    return `${Math.floor(seconds / 86400)}d ago`;
}

function unreadLabel(count: number): string {
    return count > 0 ? `Notifications (${count} unread)` : 'Notifications';
}

export default function NotificationBell({
    collapsed = false,
    onShowTooltip,
    onHideTooltip,
}: NotificationBellProps) {
    const { webNotifications } = usePage<PageProps>().props;
    const unreadCount = webNotifications?.unread_count ?? 0;
    const recent = webNotifications?.recent ?? [];
    const [open, setOpen] = useState(false);
    const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
    const buttonRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    const updatePanelPosition = () => {
        const button = buttonRef.current;

        if (!button) {
            return;
        }

        const rect = button.getBoundingClientRect();
        const width = 320;
        const estimatedHeight = 400;
        const gap = 12;
        let left = rect.right + gap;

        if (left + width > window.innerWidth - 8) {
            left = Math.max(8, rect.left - width - gap);
        }

        let top = rect.top;

        if (top + estimatedHeight > window.innerHeight - 8) {
            top = Math.max(8, window.innerHeight - estimatedHeight - 8);
        }

        setPanelStyle({ top: `${Math.round(top)}px`, left: `${Math.round(left)}px` });
    };

    useEffect(() => {
        if (!open) {
            return;
        }

        updatePanelPosition();

        function handlePointerDown(event: MouseEvent) {
            const target = event.target as Node;

            if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) {
                return;
            }

            setOpen(false);
        }

        function handleEscape(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setOpen(false);
                buttonRef.current?.focus();
            }
        }

        function handleReposition() {
            updatePanelPosition();
        }

        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('keydown', handleEscape);
        window.addEventListener('resize', handleReposition);

        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('keydown', handleEscape);
            window.removeEventListener('resize', handleReposition);
        };
    }, [open]);

    const countText = unreadCount > 9 ? '9+' : String(unreadCount);

    return (
        <div className="pf-sidebar-notification">
            <button
                ref={buttonRef}
                type="button"
                className={
                    'pf-sidebar-footer-link' +
                    (open ? ' pf-sidebar-footer-link--active' : '')
                }
                aria-label={unreadLabel(unreadCount)}
                aria-haspopup="menu"
                aria-expanded={open}
                title={collapsed ? undefined : unreadLabel(unreadCount)}
                onMouseEnter={(event) =>
                    onShowTooltip?.(event, unreadLabel(unreadCount))
                }
                onMouseLeave={onHideTooltip}
                onClick={() => {
                    onHideTooltip?.();
                    setOpen((previous) => !previous);
                }}
            >
                <span className="pf-sidebar-footer-icon pf-sidebar-notification-icon">
                    <BellIcon size={18} />
                    {unreadCount > 0 && (
                        <span className="pf-sidebar-notification-count" aria-hidden="true">
                            {countText}
                        </span>
                    )}
                </span>
                <span className="pf-sidebar-label">Notifications</span>
                {unreadCount > 0 && (
                    <span className="pf-sidebar-badge">{countText}</span>
                )}
            </button>

            {open &&
                createPortal(
                    <div
                        ref={panelRef}
                        className="pf-notification-dropdown"
                        role="menu"
                        aria-label="Notifications"
                        style={panelStyle}
                    >
                        <div className="pf-notification-dropdown-header">
                            <div>
                                <strong>Notifications</strong>
                                <span>
                                    {unreadCount > 0
                                        ? `${unreadCount} unread`
                                        : 'All caught up'}
                                </span>
                            </div>
                            {unreadCount > 0 && (
                                <Link
                                    href={route('notifications.read-all')}
                                    method="patch"
                                    as="button"
                                    preserveScroll
                                >
                                    Mark all read
                                </Link>
                            )}
                        </div>

                        <div className="pf-notification-list">
                            {recent.length === 0 ? (
                                <p className="pf-notification-empty">
                                    No notifications yet.
                                </p>
                            ) : (
                                recent.map((notification) => (
                                    <Link
                                        key={notification.id}
                                        href={
                                            notification.read_at
                                                ? notification.action_url
                                                : route(
                                                      'notifications.read',
                                                      notification.id,
                                                  )
                                        }
                                        method={notification.read_at ? 'get' : 'patch'}
                                        as={notification.read_at ? 'a' : 'button'}
                                        className={
                                            `pf-notification-item pf-notification-item--${notification.severity}` +
                                            (notification.read_at
                                                ? ''
                                                : ' pf-notification-item--unread')
                                        }
                                        role="menuitem"
                                        onClick={() => setOpen(false)}
                                    >
                                        <span
                                            className="pf-notification-severity"
                                            aria-hidden="true"
                                        />
                                        <span className="pf-notification-content">
                                            <strong>{notification.title}</strong>
                                            <span>{notification.message}</span>
                                            <small>
                                                {notification.tenant_name &&
                                                    `${notification.tenant_name} · `}
                                                {formatRelativeTime(
                                                    notification.created_at,
                                                )}
                                            </small>
                                        </span>
                                    </Link>
                                ))
                            )}
                        </div>

                        <Link
                            href={route('notifications.index')}
                            className="pf-notification-view-all"
                            onClick={() => setOpen(false)}
                        >
                            View all notifications
                        </Link>
                    </div>,
                    document.body,
                )}
        </div>
    );
}

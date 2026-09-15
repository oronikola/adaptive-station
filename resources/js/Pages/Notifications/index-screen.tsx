import Pagination from '@/Components/admin/Pagination';
import AdminLayout from '@/Layouts/AdminLayout';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { PageProps, PaginatedData, WebNotification } from '@/types';
import { FormEvent } from 'react';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import '../../../css/platform-dashboard.css';
import '../../../css/platform-overview.css';
import '../../../css/notifications.css';

interface NotificationsIndexProps {
    notifications: PaginatedData<WebNotification>;
    filters: { category: string; severity: string };
    categoryOptions: Record<string, string>;
    preferences: {
        categories: Record<string, boolean>;
    };
}

function formatDateTime(value: string): string {
    return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(value));
}

const preferenceDescriptions: Record<string, string> = {
    stations: 'Offline and recovery updates for station devices.',
    sms_gateway: 'Connectivity updates for the SMS gateway fleet.',
    sms_delivery: 'Delayed, failed, and recovered message delivery.',
    imports: 'Import failures and records that require review.',
};

const notificationCategoryLabels: Record<string, string> = {
    station_offline: 'Station health',
    station_recovered: 'Station health',
    gateway_offline: 'SMS gateway',
    gateway_recovered: 'SMS gateway',
    sms_backlog_delayed: 'SMS delivery',
    sms_backlog_recovered: 'SMS delivery',
    sms_delivery_failed: 'SMS delivery',
    import_failed: 'Import',
    import_needs_review: 'Import',
};

const severityLabels: Record<WebNotification['severity'], string> = {
    error: 'Critical',
    warning: 'Warning',
    success: 'Resolved',
    info: 'Information',
};

export default function NotificationsIndex({ notifications, filters, categoryOptions, preferences }: NotificationsIndexProps) {
    const { auth, webNotifications } = usePage<PageProps>().props;
    const Layout = auth.user.role === 'platform_super_admin' ? PlatformLayout : AdminLayout;
    const filterForm = useForm(filters);
    const preferenceForm = useForm(preferences);

    function applyFilters(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        router.get(route('notifications.index'), filterForm.data, { preserveState: true, replace: true });
    }

    function savePreferences(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        preferenceForm.patch(route('notifications.preferences.update'), { preserveScroll: true });
    }

    return (
        <Layout>
            <Head title="Notifications" />

            <div className="pf-dashboard pft-page notifications-page">
                <div className="pft-hero notifications-hero">
                    <div className="pft-hero-main">
                        <span className="pft-hero-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24">
                                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                                <path d="M10 21h4" />
                            </svg>
                        </span>
                        <div>
                            <h1 className="pft-hero-title">Notifications</h1>
                            <p className="pft-hero-subtitle">Monitor station health, message delivery, and import activity from one place.</p>
                        </div>
                    </div>
                    <div className="pft-hero-actions">
                        <span className="notifications-unread-summary">
                            <span aria-hidden="true" />
                            {webNotifications?.unread_count ?? 0} unread
                        </span>
                        {(webNotifications?.unread_count ?? 0) > 0 && (
                            <Link href={route('notifications.read-all')} method="patch" as="button" className="pf-btn pf-btn-secondary">
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>
                                <span>Mark all as read</span>
                            </Link>
                        )}
                    </div>
                </div>

                <section className="pf-panel notifications-settings" aria-labelledby="notification-preferences-title">
                    <div className="pf-panel-header notifications-section-header">
                        <div className="notifications-section-heading">
                            <span className="notifications-section-icon" aria-hidden="true">
                                <svg viewBox="0 0 24 24"><path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M6 14v6" /></svg>
                            </span>
                            <div>
                                <h2 id="notification-preferences-title" className="pf-panel-title">Notification preferences</h2>
                                <p className="pf-panel-count">Choose which alerts appear in your web portal.</p>
                            </div>
                        </div>
                    </div>
                    <form onSubmit={savePreferences} className="notifications-preferences-form">
                        <div className="notifications-preference-grid">
                            {Object.entries(categoryOptions).map(([category, label]) => (
                                <label key={category} className="notifications-check">
                                    <span className="notifications-check-copy">
                                        <strong>{label}</strong>
                                        <small>{preferenceDescriptions[category]}</small>
                                    </span>
                                    <span className="notifications-switch">
                                        <input
                                            type="checkbox"
                                            checked={preferenceForm.data.categories[category]}
                                            onChange={(event) => preferenceForm.setData('categories', {
                                                ...preferenceForm.data.categories,
                                                [category]: event.target.checked,
                                            })}
                                        />
                                        <span aria-hidden="true" />
                                    </span>
                                </label>
                            ))}
                        </div>
                        <div className="notifications-preferences-footer">
                            <p>{preferenceForm.isDirty ? 'You have unsaved changes.' : 'Your preferences are up to date.'}</p>
                            <button type="submit" className={'pf-btn pf-btn-primary' + (preferenceForm.processing ? ' pf-btn--loading' : '')} disabled={preferenceForm.processing || !preferenceForm.isDirty}>
                                <span>Save preferences</span>
                            </button>
                        </div>
                    </form>
                </section>

                <form onSubmit={applyFilters} className="pf-filter-bar notifications-filters" role="search">
                    <div className="pf-field">
                        <label htmlFor="notification-category">Category</label>
                        <select id="notification-category" value={filterForm.data.category} onChange={(event) => filterForm.setData('category', event.target.value)}>
                                <option value="">All categories</option>
                                {Object.entries(categoryOptions).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                    </div>
                    <div className="pf-field">
                        <label htmlFor="notification-severity">Severity</label>
                        <select id="notification-severity" value={filterForm.data.severity} onChange={(event) => filterForm.setData('severity', event.target.value)}>
                                <option value="">All severities</option>
                                <option value="error">Critical</option>
                                <option value="warning">Warning</option>
                                <option value="success">Recovered</option>
                                <option value="info">Information</option>
                        </select>
                    </div>
                    <div className="pf-filter-bar-actions">
                        <button type="submit" className="pf-btn pf-btn-primary">
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16l-6 7v5l-4 2v-7z" /></svg>
                            <span>Apply filters</span>
                        </button>
                        {(filters.category || filters.severity) && <Link href={route('notifications.index')} className="pf-btn pf-btn-secondary">Reset</Link>}
                    </div>
                </form>

                <section className="pf-panel notifications-panel" aria-label="Notification history">
                    <div className="pf-panel-header notifications-section-header">
                        <div>
                            <h2 className="pf-panel-title">Recent activity</h2>
                            <p className="pf-panel-count">
                                {notifications.from !== null ? `Showing ${notifications.from}–${notifications.to} of ${notifications.total}` : 'No notifications'}
                            </p>
                        </div>
                    </div>

                    {notifications.data.length === 0 ? (
                        <div className="notifications-empty">
                            <span aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg></span>
                            <h3>No notifications found</h3>
                            <p>There are no alerts matching your current filters.</p>
                        </div>
                    ) : notifications.data.map((notification) => (
                        <article
                            key={notification.id}
                            className={`notifications-row notifications-row--${notification.severity}${notification.read_at ? '' : ' notifications-row--unread'}`}
                        >
                            <span className="notifications-row-icon" aria-hidden="true">
                                {notification.severity === 'success' ? (
                                    <svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6" /></svg>
                                ) : (
                                    <svg viewBox="0 0 24 24"><path d="M12 9v4M12 17h.01M10.3 4.6 2.8 18a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.6a2 2 0 0 0-3.4 0Z" /></svg>
                                )}
                            </span>
                            <div className="notifications-row-body">
                                <div className="notifications-row-heading">
                                    <h3 className="notifications-row-title">{notification.title}</h3>
                                    {!notification.read_at && <span className="notifications-new-pill">New</span>}
                                </div>
                                <p className="notifications-row-message">{notification.message}</p>
                                <div className="notifications-row-meta">
                                    <span className={`notifications-severity notifications-severity--${notification.severity}`}>{severityLabels[notification.severity]}</span>
                                    <span>{notificationCategoryLabels[notification.category] ?? 'System'}</span>
                                    {notification.tenant_name && <span>{notification.tenant_name}</span>}
                                    <time dateTime={notification.created_at}>{formatDateTime(notification.created_at)}</time>
                                </div>
                            </div>
                            <Link
                                href={notification.read_at ? notification.action_url : route('notifications.read', notification.id)}
                                method={notification.read_at ? 'get' : 'patch'}
                                as={notification.read_at ? 'a' : 'button'}
                                className="notifications-row-action"
                            >
                                <span>View details</span>
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
                            </Link>
                        </article>
                    ))}

                    {notifications.links.length > 3 && (
                        <div className="notifications-pagination">
                            <Pagination links={notifications.links} />
                        </div>
                    )}
                </section>
            </div>
        </Layout>
    );
}

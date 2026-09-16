import Pagination from '@/Components/admin/Pagination';
import PremiumSelect from '@/Components/PremiumSelect';
import { BadgeAlertIcon } from '@/Components/icons/badge-alert';
import { BellIcon } from '@/Components/icons/bell';
import { CheckIcon } from '@/Components/icons/check';
import { ChevronRightIcon } from '@/Components/icons/chevron-right';
import { SlidersHorizontalIcon } from '@/Components/icons/sliders-horizontal';
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
                            <BellIcon size={22} />
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
                                <CheckIcon size={16} />
                                <span>Mark all as read</span>
                            </Link>
                        )}
                    </div>
                </div>

                <section className="pf-panel notifications-settings" aria-labelledby="notification-preferences-title">
                    <div className="pf-panel-header notifications-section-header">
                        <div className="notifications-section-heading">
                            <span className="notifications-section-icon" aria-hidden="true">
                                <SlidersHorizontalIcon size={18} />
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
                        <PremiumSelect
                            id="notification-category"
                            value={filterForm.data.category}
                            onChange={(value) => filterForm.setData('category', value)}
                            options={[
                                { value: '', label: 'All categories' },
                                ...Object.entries(categoryOptions).map(([value, label]) => ({
                                    value,
                                    label,
                                })),
                            ]}
                            placeholder="All categories"
                        />
                    </div>
                    <div className="pf-field">
                        <label htmlFor="notification-severity">Severity</label>
                        <PremiumSelect
                            id="notification-severity"
                            value={filterForm.data.severity}
                            onChange={(value) => filterForm.setData('severity', value)}
                            options={[
                                { value: '', label: 'All severities' },
                                { value: 'error', label: 'Critical' },
                                { value: 'warning', label: 'Warning' },
                                { value: 'success', label: 'Recovered' },
                                { value: 'info', label: 'Information' },
                            ]}
                            placeholder="All severities"
                        />
                    </div>
                    <div className="pf-filter-bar-actions">
                        <button type="submit" className="pf-btn pf-btn-primary">
                            <SlidersHorizontalIcon size={16} />
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
                            <span aria-hidden="true"><BellIcon size={28} /></span>
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
                                    <CheckIcon size={16} />
                                ) : (
                                    <BadgeAlertIcon size={16} />
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
                                <ChevronRightIcon size={16} />
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

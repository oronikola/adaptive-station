import Pagination from '@/Components/admin/Pagination';
import { useToast } from '@/Components/toast/ToastProvider';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { PageProps, PaginatedData } from '@/types';
import '../../../../css/platform-dashboard.css';
import '../../../../css/platform-overview.css';

interface SmsOutboxRow {
    id: string;
    phone_number: string;
    message: string;
    status: string;
    attempts: number;
    sent_at: string | null;
    delivered_at: string | null;
    last_error: string | null;
    created_at: string;
}

interface Filters {
    status?: string;
    phone_number?: string;
    date_from?: string;
    date_to?: string;
}

interface Stats {
    total: number;
    pending: number;
    sent: number;
    delivered: number;
    failed: number;
}

interface SmsLogListScreenProps {
    messages: PaginatedData<SmsOutboxRow>;
    filters: Filters;
    stats: Stats;
}

const STATUS_PILL_CLASS: Record<string, string> = {
    sent: 'pf-pill--active',
    delivered: 'pf-pill--active',
    pending: 'pf-pill--inactive',
    claimed: 'pf-pill--inactive',
    failed: 'pf-pill--danger',
    expired: 'pf-pill--danger',
};

interface StatCardProps {
    label: string;
    value: number;
    icon: React.ReactNode;
    tone: 'blue' | 'amber' | 'violet' | 'green' | 'red';
}

function StatCard({ label, value, icon, tone }: StatCardProps) {
    return (
        <div className="pft-stat-card">
            <div className="pft-stat-card-top">
                <p className="pft-stat-label">{label}</p>
                <span className={`pft-stat-icon pft-stat-icon--${tone}`}>{icon}</span>
            </div>
            <p className="pft-stat-value">{value}</p>
        </div>
    );
}

const ICON_TOTAL = (
    <svg viewBox="0 0 24 24">
        <rect x="7" y="2" width="10" height="20" rx="2" />
        <path d="M11 18h2" />
    </svg>
);
const ICON_PENDING = (
    <svg viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5V12l3 2" />
    </svg>
);
const ICON_SENT = (
    <svg viewBox="0 0 24 24">
        <path d="M4 11l16-7-6 16-3-6-6-3z" />
    </svg>
);
const ICON_DELIVERED = (
    <svg viewBox="0 0 24 24">
        <path d="M20 6L9 17l-5-5" />
    </svg>
);
const ICON_FAILED = (
    <svg viewBox="0 0 24 24">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
);

// hour12 explicit, not left to the browser locale default — some locales
// (e.g. en-GB) render toLocaleString()'s time in 24-hour "military" format
// otherwise.
function formatDateTime(value: string | Date): string {
    return new Date(value).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
}

export default function SmsLogListScreen({ messages, filters, stats }: SmsLogListScreenProps) {
    const { tenant } = usePage<PageProps>().props;
    const { showToast } = useToast();
    const [isFiltering, setIsFiltering] = useState(false);
    const [phoneNumberError, setPhoneNumberError] = useState(false);
    const hasFilters = Boolean(filters.status || filters.phone_number || filters.date_from || filters.date_to);
    const { data, setData } = useForm({
        status: filters.status ?? '',
        phone_number: filters.phone_number ?? '',
        date_from: filters.date_from ?? '',
        date_to: filters.date_to ?? '',
    });

    // Guard: prevent date_to before date_from, same pattern as Audit Log.
    const today = new Date().toISOString().slice(0, 10);

    function handleDateFrom(value: string) {
        setData((d) => ({
            ...d,
            date_from: value,
            date_to: d.date_to && d.date_to < value ? '' : d.date_to,
        }));
    }

    function submit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsFiltering(true);
        router.get(route('portal.sms-log.index'), data, {
            preserveState: true,
            onFinish: () => setIsFiltering(false),
        });
    }

    // Opens a standalone preview in a new tab (not window.print() on this
    // page) so the admin can review the report first — printing/saving as
    // PDF happens from a button on that page, not immediately on click.
    // Always clickable (not disabled) so the validation message below
    // actually gets a chance to show — a disabled button never fires
    // onClick at all.
    function handlePrint() {
        const phoneNumber = data.phone_number.trim();
        if (!phoneNumber) {
            setPhoneNumberError(true);
            showToast({
                type: 'error',
                message: 'Put a phone number first.',
                description: 'Printing needs one specific number\'s log — enter it above, then try again.',
            });
            return;
        }

        setPhoneNumberError(false);
        const params = new URLSearchParams();
        params.set('phone_number', phoneNumber);
        if (data.date_from) params.set('date_from', data.date_from);
        if (data.date_to) params.set('date_to', data.date_to);

        window.open(`${route('portal.sms-log.print')}?${params.toString()}`, '_blank');
    }

    return (
        <AdminLayout>
            <Head title="SMS Delivery Log" />

            <div className="pf-dashboard pft-page">
                <div className="pft-hero">
                    <div className="pft-hero-main">
                        <span className="pft-hero-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24">
                                <rect x="7" y="2" width="10" height="20" rx="2" />
                                <path d="M11 18h2" />
                            </svg>
                        </span>
                        <div>
                            <h1 className="pft-hero-title">SMS Delivery Log</h1>
                            <p className="pft-hero-subtitle">
                                Every tap-alert SMS attempted for {tenant?.name ?? 'this school'} —
                                which phone numbers were sent/delivered vs. still pending or failed.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="pft-stat-grid">
                    <StatCard label="Total" value={stats.total} icon={ICON_TOTAL} tone="blue" />
                    <StatCard label="Pending" value={stats.pending} icon={ICON_PENDING} tone="amber" />
                    <StatCard label="Sent" value={stats.sent} icon={ICON_SENT} tone="violet" />
                    <StatCard label="Delivered" value={stats.delivered} icon={ICON_DELIVERED} tone="green" />
                    <StatCard label="Failed" value={stats.failed} icon={ICON_FAILED} tone="red" />
                </div>

                <form onSubmit={submit} className="pf-filter-bar" role="search">
                    <div className="pf-field">
                        <label htmlFor="status">Status</label>
                        <select
                            id="status"
                            value={data.status}
                            onChange={(e) => setData('status', e.target.value)}
                        >
                            <option value="">All</option>
                            <option value="pending">Pending</option>
                            <option value="claimed">Claimed</option>
                            <option value="sent">Sent</option>
                            <option value="delivered">Delivered</option>
                            <option value="failed">Failed</option>
                            <option value="expired">Expired</option>
                        </select>
                    </div>

                    <div className={'pf-field' + (phoneNumberError ? ' pf-field--error' : '')}>
                        <label htmlFor="phone_number">Phone number</label>
                        <input
                            id="phone_number"
                            type="text"
                            value={data.phone_number}
                            onChange={(e) => {
                                setData('phone_number', e.target.value);
                                if (phoneNumberError) setPhoneNumberError(false);
                            }}
                            placeholder="e.g. 0917..."
                            aria-invalid={phoneNumberError}
                        />
                    </div>

                    <div className="pf-field">
                        <label htmlFor="date_from">From</label>
                        <input
                            id="date_from"
                            type="date"
                            value={data.date_from}
                            max={today}
                            onChange={(e) => handleDateFrom(e.target.value)}
                        />
                    </div>

                    <div className="pf-field">
                        <label htmlFor="date_to">To</label>
                        <input
                            id="date_to"
                            type="date"
                            value={data.date_to}
                            min={data.date_from || undefined}
                            max={today}
                            onChange={(e) => setData('date_to', e.target.value)}
                        />
                    </div>

                    <div className="pf-filter-bar-actions">
                        <button
                            type="submit"
                            className={'pf-btn pf-btn-primary' + (isFiltering ? ' pf-btn--loading' : '')}
                            disabled={isFiltering}
                        >
                            Filter
                        </button>
                        {hasFilters && (
                            <Link
                                href={route('portal.sms-log.index')}
                                className="pf-btn pf-btn-secondary"
                            >
                                Reset
                            </Link>
                        )}
                    </div>
                </form>

                <div className="pf-panel">
                    <div className="pf-panel-header">
                        <div>
                            <h2 className="pf-panel-title">Messages</h2>
                            <p className="pf-panel-count">
                                {messages.from !== null ? `${messages.from}–${messages.to} of ${messages.total}` : 'No results'}
                            </p>
                        </div>
                        <button
                            type="button"
                            className="pf-btn pf-btn-secondary"
                            onClick={handlePrint}
                        >
                            <svg viewBox="0 0 24 24">
                                <path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v7H6z" />
                            </svg>
                            Print
                        </button>
                    </div>

                    <div className="pf-table-wrap">
                        <table className="pf-table">
                            <thead>
                                <tr>
                                    <th scope="col">When</th>
                                    <th scope="col">Phone Number</th>
                                    <th scope="col">Status</th>
                                    <th scope="col">Attempts</th>
                                    <th scope="col">Sent</th>
                                    <th scope="col">Delivered</th>
                                    <th scope="col">Error</th>
                                </tr>
                            </thead>
                            <tbody>
                                {messages.data.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="pf-empty">
                                            {hasFilters
                                                ? 'No messages match these filters.'
                                                : 'No SMS messages yet.'}
                                        </td>
                                    </tr>
                                )}

                                {messages.data.map((row) => (
                                    <tr key={row.id}>
                                        <td>{formatDateTime(row.created_at)}</td>
                                        <td className="font-mono">{row.phone_number}</td>
                                        <td>
                                            <span
                                                className={
                                                    'pf-pill ' +
                                                    (STATUS_PILL_CLASS[row.status] ?? 'pf-pill--inactive')
                                                }
                                            >
                                                {row.status}
                                            </span>
                                        </td>
                                        <td className="font-mono">{row.attempts}</td>
                                        <td>{row.sent_at ? formatDateTime(row.sent_at) : '—'}</td>
                                        <td>{row.delivered_at ? formatDateTime(row.delivered_at) : '—'}</td>
                                        <td style={{ color: row.last_error ? 'var(--as-danger)' : undefined, fontSize: 12.5 }}>
                                            {row.last_error ?? '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <Pagination links={messages.links} />
                </div>
            </div>
        </AdminLayout>
    );
}

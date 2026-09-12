import Pagination from '@/Components/admin/Pagination';
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

export default function SmsLogListScreen({ messages, filters, stats }: SmsLogListScreenProps) {
    const { tenant } = usePage<PageProps>().props;
    const [isFiltering, setIsFiltering] = useState(false);
    const hasFilters = Boolean(filters.status || filters.phone_number);
    const { data, setData } = useForm({
        status: filters.status ?? '',
        phone_number: filters.phone_number ?? '',
    });

    function submit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsFiltering(true);
        router.get(route('portal.sms-log.index'), data, {
            preserveState: true,
            onFinish: () => setIsFiltering(false),
        });
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

                    <div className="pf-field">
                        <label htmlFor="phone_number">Phone number</label>
                        <input
                            id="phone_number"
                            type="text"
                            value={data.phone_number}
                            onChange={(e) => setData('phone_number', e.target.value)}
                            placeholder="e.g. 0917..."
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
                                        <td>{new Date(row.created_at).toLocaleString()}</td>
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
                                        <td>{row.sent_at ? new Date(row.sent_at).toLocaleString() : '—'}</td>
                                        <td>{row.delivered_at ? new Date(row.delivered_at).toLocaleString() : '—'}</td>
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

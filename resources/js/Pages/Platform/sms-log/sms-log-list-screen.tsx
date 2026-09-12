import Pagination from '@/Components/admin/Pagination';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { PaginatedData } from '@/types';
import '../../../../css/platform-dashboard.css';
import '../../../../css/platform-overview.css';

interface SmsOutboxRow {
    id: string;
    tenant?: { name: string } | null;
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
    tenant_id?: string;
    status?: string;
    phone_number?: string;
}

interface SmsLogListScreenProps {
    messages: PaginatedData<SmsOutboxRow>;
    tenants: { id: string; name: string }[];
    filters: Filters;
}

const STATUS_PILL_CLASS: Record<string, string> = {
    sent: 'pf-pill--active',
    delivered: 'pf-pill--active',
    pending: 'pf-pill--inactive',
    claimed: 'pf-pill--inactive',
    failed: 'pf-pill--danger',
    expired: 'pf-pill--danger',
};

export default function SmsLogListScreen({ messages, tenants, filters }: SmsLogListScreenProps) {
    const [isFiltering, setIsFiltering] = useState(false);
    const hasFilters = Boolean(filters.tenant_id || filters.status || filters.phone_number);
    const { data, setData } = useForm({
        tenant_id: filters.tenant_id ?? '',
        status: filters.status ?? '',
        phone_number: filters.phone_number ?? '',
    });

    function submit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsFiltering(true);
        router.get(route('platform.sms-log.index'), data, {
            preserveState: true,
            onFinish: () => setIsFiltering(false),
        });
    }

    return (
        <PlatformLayout>
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
                                Every tap-alert SMS attempted, across every school — which
                                phone numbers were sent/delivered vs. still pending or failed.
                            </p>
                        </div>
                    </div>
                </div>

                <form onSubmit={submit} className="pf-filter-bar" role="search">
                    <div className="pf-field">
                        <label htmlFor="tenant_id">School</label>
                        <select
                            id="tenant_id"
                            value={data.tenant_id}
                            onChange={(e) => setData('tenant_id', e.target.value)}
                        >
                            <option value="">All schools</option>
                            {tenants.map((tenant) => (
                                <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
                            ))}
                        </select>
                    </div>

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
                                href={route('platform.sms-log.index')}
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
                                    <th scope="col">School</th>
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
                                        <td colSpan={8} className="pf-empty">
                                            {hasFilters
                                                ? 'No messages match these filters.'
                                                : 'No SMS messages yet.'}
                                        </td>
                                    </tr>
                                )}

                                {messages.data.map((row) => (
                                    <tr key={row.id}>
                                        <td>{new Date(row.created_at).toLocaleString()}</td>
                                        <td>{row.tenant?.name ?? '—'}</td>
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
        </PlatformLayout>
    );
}

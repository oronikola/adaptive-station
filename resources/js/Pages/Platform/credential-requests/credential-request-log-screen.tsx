import Pagination from '@/Components/admin/Pagination';
import PremiumSelect from '@/Components/PremiumSelect';
import PremiumDatePicker from '@/Components/PremiumDatePicker';
import { BadgeAlertIcon } from '@/Components/icons/badge-alert';
import { CheckIcon } from '@/Components/icons/check';
import { ClockIcon } from '@/Components/icons/clock';
import { GraduationCapIcon } from '@/Components/icons/graduation-cap';
import { KeyIcon } from '@/Components/icons/key';
import { PhoneIcon } from '@/Components/icons/phone';
import { UserIcon } from '@/Components/icons/user';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { PaginatedData } from '@/types';
import '../../../../css/platform-dashboard.css';
import '../../../../css/platform-overview.css';

interface CredentialRequestRow {
    id: string;
    tenant: { name: string } | null;
    outcome: string;
    parent_name: string | null;
    masked_phone: string | null;
    created_at: string;
}

interface Filters {
    tenant_id?: string;
    outcome?: string;
    date_from?: string;
    date_to?: string;
}

interface Stats {
    total: number;
    queued: number;
    duplicate: number;
    no_phone: number;
    no_students_linked: number;
    rate_limited: number;
}

interface CredentialRequestLogScreenProps {
    requests: PaginatedData<CredentialRequestRow>;
    tenants: { id: string; name: string }[];
    filters: Filters;
    stats: Stats;
}

const OUTCOME_OPTIONS = [
    { value: '', label: 'All outcomes' },
    { value: 'queued', label: 'Queued (sent)' },
    { value: 'duplicate', label: 'Duplicate request' },
    { value: 'no_phone', label: 'No phone on file' },
    { value: 'no_students_linked', label: 'No students linked' },
    { value: 'rate_limited', label: 'Rate limited' },
];

const OUTCOME_LABEL: Record<string, string> = {
    queued: 'Queued',
    duplicate: 'Duplicate request',
    no_phone: 'No phone on file',
    no_students_linked: 'No students linked',
    rate_limited: 'Rate limited',
};

const OUTCOME_PILL_CLASS: Record<string, string> = {
    queued: 'pf-pill--active',
    duplicate: 'pf-pill--inactive',
    no_phone: 'pf-pill--danger',
    no_students_linked: 'pf-pill--danger',
    rate_limited: 'pf-pill--danger',
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

// hour12 explicit, not left to the browser locale default — some locales
// (e.g. en-GB) render toLocaleString()'s time in 24-hour "military" format
// otherwise.
function formatDateTime(value: string): string {
    return new Date(value).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
}

export default function CredentialRequestLogScreen({ requests, tenants, filters, stats }: CredentialRequestLogScreenProps) {
    const [isFiltering, setIsFiltering] = useState(false);
    const hasFilters = Boolean(filters.tenant_id || filters.outcome || filters.date_from || filters.date_to);
    const { data, setData } = useForm({
        tenant_id: filters.tenant_id ?? '',
        outcome: filters.outcome ?? '',
        date_from: filters.date_from ?? '',
        date_to: filters.date_to ?? '',
    });

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
        router.get(route('platform.credential-requests.index'), data, {
            preserveState: true,
            onFinish: () => setIsFiltering(false),
        });
    }

    return (
        <PlatformLayout>
            <Head title="Credential Requests" />

            <div className="pf-dashboard pft-page">
                <div className="pft-hero">
                    <div className="pft-hero-main">
                        <span className="pft-hero-icon" aria-hidden="true">
                            <KeyIcon size={22} />
                        </span>
                        <div>
                            <h1 className="pft-hero-title">Credential Requests</h1>
                            <p className="pft-hero-subtitle">
                                Every attempt on the parent self-service credential
                                lookup, across every school — including why one
                                didn&apos;t go through.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="pft-stat-grid">
                    <StatCard label="Queued" value={stats.queued} icon={<CheckIcon size={18} />} tone="green" />
                    <StatCard label="Duplicate" value={stats.duplicate} icon={<ClockIcon size={18} />} tone="amber" />
                    <StatCard label="No phone on file" value={stats.no_phone} icon={<PhoneIcon size={18} />} tone="red" />
                    <StatCard label="No students linked" value={stats.no_students_linked} icon={<BadgeAlertIcon size={18} />} tone="red" />
                    <StatCard label="Rate limited" value={stats.rate_limited} icon={<BadgeAlertIcon size={18} />} tone="red" />
                </div>

                <form onSubmit={submit} className="pf-filter-bar" role="search">
                    <div className="pf-field">
                        <label htmlFor="tenant_id">School</label>
                        <PremiumSelect
                            id="tenant_id"
                            value={data.tenant_id}
                            onChange={(value) => setData('tenant_id', value)}
                            options={[
                                { value: '', label: 'All schools' },
                                ...tenants.map((tenant) => ({ value: String(tenant.id), label: tenant.name })),
                            ]}
                            placeholder="All schools"
                        />
                    </div>

                    <div className="pf-field">
                        <label htmlFor="outcome">Outcome</label>
                        <PremiumSelect
                            id="outcome"
                            value={data.outcome}
                            onChange={(value) => setData('outcome', value)}
                            options={OUTCOME_OPTIONS}
                            placeholder="All outcomes"
                        />
                    </div>

                    <div className="pf-field">
                        <label htmlFor="date_from">From</label>
                        <PremiumDatePicker
                            id="date_from"
                            value={data.date_from}
                            max={today}
                            onChange={handleDateFrom}
                            placeholder="Start date"
                        />
                    </div>

                    <div className="pf-field">
                        <label htmlFor="date_to">To</label>
                        <PremiumDatePicker
                            id="date_to"
                            value={data.date_to}
                            min={data.date_from || undefined}
                            max={today}
                            onChange={(value) => setData('date_to', value)}
                            placeholder="End date"
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
                            <Link href={route('platform.credential-requests.index')} className="pf-btn pf-btn-secondary">
                                Reset
                            </Link>
                        )}
                    </div>
                </form>

                <div className="pf-panel">
                    <div className="pf-panel-header">
                        <div>
                            <h2 className="pf-panel-title">Requests</h2>
                            <p className="pf-panel-count">
                                {requests.from !== null ? `${requests.from}–${requests.to} of ${requests.total}` : `${stats.total} total`}
                            </p>
                        </div>
                    </div>

                    {requests.data.length === 0 ? (
                        <div className="pf-empty-state">
                            <span className="pf-empty-state-icon">
                                <KeyIcon size={26} />
                            </span>
                            <div>
                                <strong>{hasFilters ? 'No matching requests' : 'No credential requests yet'}</strong>
                                <p>
                                    {hasFilters
                                        ? 'Try clearing filters or widening the date range.'
                                        : 'Attempts on the parent self-service credential lookup will appear here.'}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="pf-table-wrap">
                            <table className="pf-table sms-log-table">
                                <thead>
                                    <tr>
                                        <th scope="col">When</th>
                                        <th scope="col">School</th>
                                        <th scope="col">Guardian</th>
                                        <th scope="col">Phone</th>
                                        <th scope="col">Outcome</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {requests.data.map((row) => (
                                        <tr key={row.id}>
                                            <td>
                                                <span className="sms-log-meta">
                                                    <ClockIcon size={14} aria-hidden="true" />
                                                    {formatDateTime(row.created_at)}
                                                </span>
                                            </td>
                                            <td>
                                                {row.tenant ? (
                                                    <span className="pfs-meta-pill pfs-meta-pill--school">
                                                        <GraduationCapIcon size={13} aria-hidden="true" />
                                                        {row.tenant.name}
                                                    </span>
                                                ) : (
                                                    <span className="sms-log-empty-value">Unknown school</span>
                                                )}
                                            </td>
                                            <td>
                                                <span className="sms-log-phone">
                                                    <UserIcon size={14} aria-hidden="true" />
                                                    {row.parent_name ?? 'Unknown'}
                                                </span>
                                            </td>
                                            <td>
                                                {row.masked_phone ? (
                                                    <span className="sms-log-phone">
                                                        <PhoneIcon size={14} aria-hidden="true" />
                                                        {row.masked_phone}
                                                    </span>
                                                ) : (
                                                    <span className="sms-log-empty-value">No phone on file</span>
                                                )}
                                            </td>
                                            <td>
                                                <span className={'pf-pill ' + (OUTCOME_PILL_CLASS[row.outcome] ?? 'pf-pill--inactive')}>
                                                    {OUTCOME_LABEL[row.outcome] ?? row.outcome}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <Pagination links={requests.links} />
                </div>
            </div>
        </PlatformLayout>
    );
}

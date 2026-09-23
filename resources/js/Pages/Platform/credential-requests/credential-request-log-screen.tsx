import Pagination from '@/Components/admin/Pagination';
import PremiumSelect from '@/Components/PremiumSelect';
import PremiumDatePicker from '@/Components/PremiumDatePicker';
import { ClockIcon } from '@/Components/icons/clock';
import { GraduationCapIcon } from '@/Components/icons/graduation-cap';
import { KeyIcon } from '@/Components/icons/key';
import { PhoneIcon } from '@/Components/icons/phone';
import { UserIcon } from '@/Components/icons/user';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
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
    success_rate: number;
}

interface SchoolAnalyticsRow {
    id: string;
    name: string;
    total: number;
    queued: number;
    success_rate: number;
}

interface CredentialRequestLogScreenProps {
    requests: PaginatedData<CredentialRequestRow>;
    tenants: { id: string; name: string }[];
    filters: Filters;
    stats: Stats;
    schoolAnalytics: SchoolAnalyticsRow[];
}

const OUTCOME_OPTIONS = [
    { value: '', label: 'All outcomes' },
    { value: 'queued', label: 'Queued (sent)' },
    { value: 'duplicate', label: 'Duplicate request' },
    { value: 'no_phone', label: 'No phone on file' },
    { value: 'no_students_linked', label: 'No students linked' },
    { value: 'rate_limited', label: 'Rate limited' },
];

const OUTCOMES = ['queued', 'duplicate', 'no_phone', 'no_students_linked', 'rate_limited'] as const;

const OUTCOME_LABEL: Record<string, string> = {
    queued: 'Queued (sent)',
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

// Lockstep with the platform dashboard's SMS status palette — green for the
// outcome that means a message actually went out, amber/red for the various
// dead-ends, violet for a structural blocker rather than a transient one.
const OUTCOME_COLORS: Record<string, string> = {
    queued: '#1a8a4c',
    duplicate: '#c1791f',
    no_phone: '#d84a3f',
    no_students_linked: '#6c47c9',
    rate_limited: '#7a8699',
};

interface TooltipEntry {
    dataKey: string;
    name: string;
    value: number;
    color: string;
}

function ChartTooltip({
    active,
    payload,
    label,
}: {
    active?: boolean;
    payload?: TooltipEntry[];
    label?: string;
}) {
    if (!active || !payload || payload.length === 0) {
        return null;
    }

    return (
        <div className="pf-chart-tooltip">
            <p className="pf-chart-tooltip-label">{label}</p>
            {payload.map((entry) => (
                <div key={entry.dataKey} className="pf-chart-tooltip-row">
                    <span style={{ color: entry.color }}>
                        <span className="pf-chart-tooltip-swatch" />
                        {entry.name}
                    </span>
                    <span>{entry.value.toLocaleString()}</span>
                </div>
            ))}
        </div>
    );
}

function RequestOutcomesChart({ stats }: { stats: Stats }) {
    const chartData = OUTCOMES.map((outcome) => ({
        outcome,
        name: OUTCOME_LABEL[outcome],
        value: stats[outcome],
    }));

    return (
        <>
            <div className="pf-chart-legend">
                {OUTCOMES.map((outcome) => (
                    <span key={outcome} className="pf-chart-legend-item">
                        <span className="pf-chart-legend-dot" style={{ background: OUTCOME_COLORS[outcome] }} />
                        {OUTCOME_LABEL[outcome]}
                    </span>
                ))}
            </div>
            {stats.total === 0 ? (
                <p className="pf-empty pft-panel-empty">No credential requests in this window.</p>
            ) : (
                <div className="pf-chart-body">
                    <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={chartData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }} barCategoryGap="28%">
                            <CartesianGrid stroke="var(--as-border-light)" vertical={false} />
                            <XAxis
                                dataKey="name"
                                tick={{ fontSize: 11, fill: 'var(--as-text-muted)' }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                tick={{ fontSize: 11, fill: 'var(--as-text-muted)' }}
                                axisLine={false}
                                tickLine={false}
                                allowDecimals={false}
                            />
                            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--as-surface-active)' }} />
                            <Bar dataKey="value" name="Requests" maxBarSize={64} radius={[8, 8, 2, 2]}>
                                {chartData.map((entry) => (
                                    <Cell key={entry.outcome} fill={OUTCOME_COLORS[entry.outcome]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </>
    );
}

function SchoolAnalyticsPanel({ rows }: { rows: SchoolAnalyticsRow[] }) {
    if (rows.length === 0) {
        return <p className="pf-empty pft-panel-empty">No school activity in this window.</p>;
    }

    return (
        <ul className="pft-school-rank-list">
            {rows.map((row) => (
                <li key={row.id} className="pft-school-rank-row">
                    <div className="pft-school-rank-main">
                        <span className="pft-school-rank-name">{row.name}</span>
                        <span className="pft-school-rank-count">
                            {row.total} request{row.total === 1 ? '' : 's'}
                        </span>
                    </div>
                    <div className="pft-school-rank-meta">
                        <div className="pft-school-rank-track" role="img" aria-label={`${row.success_rate}% of requests queued`}>
                            <span style={{ width: `${Math.min(100, row.success_rate)}%` }} />
                        </div>
                        <span className="pft-school-rank-pct">{row.success_rate}% queued</span>
                    </div>
                </li>
            ))}
        </ul>
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

export default function CredentialRequestLogScreen({ requests, tenants, filters, stats, schoolAnalytics }: CredentialRequestLogScreenProps) {
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

                <section className="pf-panel" aria-labelledby="cred-outcomes-title">
                    <div className="pf-panel-header">
                        <div>
                            <h2 id="cred-outcomes-title" className="pf-panel-title">Request outcomes</h2>
                            <p className="pf-panel-count">
                                {stats.total.toLocaleString()} attempt{stats.total === 1 ? '' : 's'} in this range · {stats.success_rate}% queued
                            </p>
                        </div>
                    </div>
                    <RequestOutcomesChart stats={stats} />
                </section>

                <section className="pf-panel pft-growth-panel" aria-labelledby="school-analytics-title">
                    <div className="pf-panel-header">
                        <div>
                            <h2 id="school-analytics-title" className="pf-panel-title">By school</h2>
                            <p className="pf-panel-count">Top schools by request volume · share that queued</p>
                        </div>
                    </div>
                    <SchoolAnalyticsPanel rows={schoolAnalytics} />
                </section>

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
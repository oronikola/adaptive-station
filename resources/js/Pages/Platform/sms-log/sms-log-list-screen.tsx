import Pagination from '@/Components/admin/Pagination';
import PremiumSelect from '@/Components/PremiumSelect';
import { BadgeAlertIcon } from '@/Components/icons/badge-alert';
import { ClockIcon } from '@/Components/icons/clock';
import { GraduationCapIcon } from '@/Components/icons/graduation-cap';
import { PhoneIcon } from '@/Components/icons/phone';
import { SmartphoneNfcIcon } from '@/Components/icons/smartphone-nfc';
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

interface SmsOutboxRow {
    id: string;
    tenant?: { name: string } | null;
    device?: { id: string; label: string } | null;
    phone_number: string;
    message: string;
    status: string;
    attempts: number;
    sent_at: string | null;
    delivered_at: string | null;
    last_error: string | null;
    failure_category: string | null;
    android_result_code: number | null;
    carrier_error_code: number | null;
    gateway_app_version: string | null;
    created_at: string;
    // 0 or 1 (SIM 1 / SIM 2) — only present once the fleet phone's app
    // build is new enough to report which SIM it sent from; null on an
    // older build's message, not a data problem.
    sim_slot: number | null;
}

interface Filters {
    tenant_id?: string;
    device_id?: string;
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

interface DeviceStat {
    id: string;
    label: string;
    sent: number;
    delivered: number;
    attempted: number;
    stuck_rate: number;
}

interface SmsLogListScreenProps {
    messages: PaginatedData<SmsOutboxRow>;
    tenants: { id: string; name: string }[];
    devices: { id: string; label: string }[];
    filters: Filters;
    stats: Stats;
    failureSummary: { category: string; count: number }[];
    deviceStats: DeviceStat[];
}

const STATUS_PILL_CLASS: Record<string, string> = {
    sent: 'pf-pill--active',
    delivered: 'pf-pill--active',
    pending: 'pf-pill--inactive',
    claimed: 'pf-pill--inactive',
    failed: 'pf-pill--danger',
    expired: 'pf-pill--danger',
};

// This palette is used by both the chart bars and the legend.
const STATUS_BAR_COLORS: Record<string, string> = {
    pending: '#f38b22',
    sent: '#4ade80',
    failed: '#d84a3f',
};

interface ChartTooltipEntry {
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
    payload?: ChartTooltipEntry[];
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

function failureReason(row: SmsOutboxRow): string {
    if (row.last_error) {
        return row.last_error;
    }

    if (row.status === 'failed' || row.status === 'expired') {
        return 'The SMS gateway did not provide a reason.';
    }

    return 'No error';
}

export default function SmsLogListScreen({ messages, tenants, devices, filters, stats, failureSummary }: SmsLogListScreenProps) {
    const [isFiltering, setIsFiltering] = useState(false);
    const hasFilters = Boolean(filters.tenant_id || filters.device_id || filters.status || filters.phone_number);
    const { data, setData } = useForm({
        tenant_id: filters.tenant_id ?? '',
        device_id: filters.device_id ?? '',
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
                            <SmartphoneNfcIcon size={22} />
                        </span>
                        <div>
                            <h1 className="pft-hero-title">SMS Delivery Log</h1>
                            <p className="pft-hero-subtitle">
                                Every tap-alert SMS attempted, across every school and every
                                fleet phone — which numbers were sent/delivered vs. still
                                pending or failed.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="pf-panel">
                    <div className="pf-panel-header">
                        <div>
                            <h2 className="pf-panel-title">Delivery analytics</h2>
                            <p className="pf-panel-count">Message volume by final status — hover a bar for exact counts</p>
                        </div>
                    </div>
                    <div className="pf-chart-legend">
                        {(['pending', 'sent', 'failed'] as const).map((status) => (
                            <span key={status} className="pf-chart-legend-item">
                                <span
                                    className="pf-chart-legend-dot"
                                    style={{ background: STATUS_BAR_COLORS[status] }}
                                />
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                            </span>
                        ))}
                    </div>
                    {stats.total === 0 ? (
                        <p className="pf-empty pft-panel-empty">
                            No SMS activity yet — bars appear once fleet phones start claiming and sending tap alerts.
                        </p>
                    ) : (
                        <div className="pf-chart-body">
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart
                                    data={[
                                        { name: 'Pending', value: stats.pending, tone: 'pending' },
                                        { name: 'Sent', value: stats.sent, tone: 'sent' },
                                        { name: 'Failed', value: stats.failed, tone: 'failed' },
                                    ]}
                                    margin={{ top: 8, right: 12, left: -12, bottom: 0 }}
                                    barCategoryGap="28%"
                                >
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
                                    <Bar dataKey="value" name="Messages" maxBarSize={64} radius={[8, 8, 2, 2]}>
                                        {(['pending', 'sent', 'failed'] as const).map((status) => (
                                            <Cell key={status} fill={STATUS_BAR_COLORS[status]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                <div className="grid gap-6">
                    {failureSummary.length > 0 && (
                        <div className="pf-panel">
                            <div className="pf-panel-header">
                                <div>
                                    <h2 className="pf-panel-title">Current failure reasons</h2>
                                    <p className="pf-panel-count">Dead-lettered messages across all schools</p>
                                </div>
                            </div>
                            <div className="pfs-meta-row">
                                {failureSummary.map((failure) => (
                                    <span key={failure.category} className="pfs-meta-pill pfs-meta-pill--school">
                                        <BadgeAlertIcon size={13} aria-hidden="true" />
                                        {failure.category}: {failure.count}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    <form onSubmit={submit} className="pf-filter-bar" role="search">
                    <div className="pf-field">
                        <label htmlFor="tenant_id">School</label>
                        <PremiumSelect
                            id="tenant_id"
                            value={data.tenant_id}
                            onChange={(value) => setData('tenant_id', value)}
                            options={[
                                { value: '', label: 'All schools' },
                                ...tenants.map((tenant) => ({
                                    value: String(tenant.id),
                                    label: tenant.name,
                                })),
                            ]}
                            placeholder="All schools"
                        />
                    </div>

                    <div className="pf-field">
                        <label htmlFor="device_id">Phone</label>
                        <PremiumSelect
                            id="device_id"
                            value={data.device_id}
                            onChange={(value) => setData('device_id', value)}
                            options={[
                                { value: '', label: 'All phones' },
                                ...devices.map((device) => ({
                                    value: String(device.id),
                                    label: device.label,
                                })),
                            ]}
                            placeholder="All phones"
                        />
                    </div>

                    <div className="pf-field">
                        <label htmlFor="status">Status</label>
                        <PremiumSelect
                            id="status"
                            value={data.status}
                            onChange={(value) => setData('status', value)}
                            options={[
                                { value: '', label: 'All' },
                                { value: 'pending', label: 'Pending' },
                                { value: 'claimed', label: 'Claimed' },
                                { value: 'sent', label: 'Sent' },
                                { value: 'delivered', label: 'Delivered' },
                                { value: 'failed', label: 'Failed' },
                                { value: 'expired', label: 'Expired' },
                            ]}
                            placeholder="All"
                        />
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
                </div>

                <div className="pf-panel">
                    <div className="pf-panel-header">
                        <div>
                            <h2 className="pf-panel-title">Messages</h2>
                            <p className="pf-panel-count">
                                {messages.from !== null ? `${messages.from}–${messages.to} of ${messages.total}` : `${stats.total} total`}
                            </p>
                        </div>
                    </div>

                    {messages.data.length === 0 ? (
                        <div className="pf-empty-state">
                            <span className="pf-empty-state-icon">
                                <SmartphoneNfcIcon size={26} />
                            </span>
                            <div>
                                <strong>{hasFilters ? 'No matching messages' : 'No SMS messages yet'}</strong>
                                <p>
                                    {hasFilters
                                        ? 'Try clearing filters or searching a different phone number.'
                                        : 'Tap alerts will appear here as fleet phones claim and send them.'}
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
                                    <th scope="col">Phone</th>
                                    <th scope="col">Device</th>
                                    <th scope="col">SIM</th>
                                    <th scope="col">Status</th>
                                    <th scope="col">Error</th>
                                </tr>
                            </thead>
                            <tbody>
                                {messages.data.map((row) => (
                                    <tr key={row.id}>
                                        <td><span className="sms-log-meta"><ClockIcon size={14} aria-hidden="true" />{formatDateTime(row.created_at)}</span></td>
                                        <td>{row.tenant ? <span className="pfs-meta-pill pfs-meta-pill--school"><GraduationCapIcon size={13} aria-hidden="true" />{row.tenant.name}</span> : <span className="sms-log-empty-value">Unknown school</span>}</td>
                                        <td><span className="sms-log-phone"><PhoneIcon size={14} aria-hidden="true" />{row.phone_number}</span></td>
                                        <td>{row.device ? <span className="sms-log-device"><span className="sms-log-device-icon" aria-hidden="true"><SmartphoneNfcIcon size={15} /></span>{row.device.label}</span> : <span className="sms-log-empty-value">Unassigned</span>}</td>
                                        <td>{row.sim_slot !== null ? <span className="sms-log-sim">SIM {row.sim_slot + 1}</span> : <span className="sms-log-empty-value">—</span>}</td>
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
                                        <td>
                                            {row.last_error ? (
                                                <span className="sms-log-error">
                                                    <BadgeAlertIcon size={14} aria-hidden="true" />
                                                    {row.failure_category ? `${row.failure_category}: ` : ''}{row.last_error}
                                                    {row.carrier_error_code !== null ? ` (carrier code ${row.carrier_error_code})` : ''}
                                                </span>
                                            ) : <span className="sms-log-empty-value">{failureReason(row)}</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    )}

                    <Pagination links={messages.links} />
                </div>
            </div>
        </PlatformLayout>
    );
}

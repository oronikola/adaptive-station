import Pagination from '@/Components/admin/Pagination';
import PremiumSelect from '@/Components/PremiumSelect';
import PremiumDatePicker from '@/Components/PremiumDatePicker';
import { ActivityIcon } from '@/Components/icons/activity';
import { CalendarDaysIcon } from '@/Components/icons/calendar-days';
import { GraduationCapIcon } from '@/Components/icons/graduation-cap';
import { HistoryIcon } from '@/Components/icons/history';
import { MonitorCogIcon } from '@/Components/icons/monitor-cog';
import { ServerIcon } from '@/Components/icons/server';
import { UserCheckIcon } from '@/Components/icons/user-check';
import { UserIcon } from '@/Components/icons/user';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { PaginatedData } from '@/types';
import '../../../../css/platform-dashboard.css';
import '../../../../css/platform-overview.css';

interface AuditLog {
    id: string;
    tenant?: { name: string } | null;
    actor_type: string;
    action: string;
    entity_type: string | null;
    entity_id: string | null;
    created_at: string;
}

interface Filters {
    search?: string;
    actor_type?: string;
    date_from?: string;
    date_to?: string;
}

interface Stats {
    total: number;
    user: number;
    station: number;
    parent_account: number;
    system: number;
}

interface TrendPoint {
    bucket: string;
    total: number;
    user: number;
    station: number;
    parent_account: number;
    system: number;
}

interface Trend {
    granularity: 'day' | 'month';
    range: { date_from: string; date_to: string };
    points: TrendPoint[];
}

interface SchoolAnalyticsRow {
    id: string;
    name: string;
    total: number;
    share: number;
}

interface AuditLogListScreenProps {
    logs: PaginatedData<AuditLog>;
    filters: Filters;
    stats: Stats;
    trend: Trend;
    schoolAnalytics: SchoolAnalyticsRow[];
}

const KNOWN_ACTION_GROUPS: { label: string; actions: string[] }[] = [
    {
        label: 'Tenant',
        actions: ['tenant.created', 'tenant.status_updated', 'tenant.purged'],
    },
    {
        label: 'User',
        actions: ['user.created', 'user.updated', 'user.reactivated', 'user.deactivated'],
    },
    {
        label: 'Station',
        actions: [
            'station.created',
            'station.activated',
            'station.configuration_updated',
            'station.reset_to_pending',
            'station.legacy_placeholder_created',
            'station_credential.issued',
            'station_credential.revoked',
        ],
    },
    {
        label: 'Person',
        actions: ['person.created', 'person.updated', 'person.deactivated', 'person.reactivated'],
    },
    {
        label: 'RFID Card',
        actions: ['rfid_card.assigned', 'rfid_card.replaced', 'rfid_card.deactivated'],
    },
    {
        label: 'Parent',
        actions: [
            'parent.created',
            'parent.updated',
            'parent.reactivated',
            'parent.deactivated',
            'parent.login',
            'parent.logout',
        ],
    },
    {
        label: 'Credential Request',
        actions: [
            'parent.credentials_self_service_queued',
            'parent.credentials_self_service_duplicate',
            'parent.credentials_self_service_no_phone',
            'parent.credentials_self_service_no_students_linked',
            'parent.credentials_self_service_rate_limited',
        ],
    },
    {
        label: 'Integration',
        actions: [
            'integration_profile.created',
            'integration_profile.config_updated',
            'integration_profile.status_updated',
        ],
    },
    {
        label: 'Import',
        actions: ['import_exception.resolved'],
    },
    {
        label: 'SMS Gateway',
        actions: [
            'sms_gateway_device.created',
            'sms_gateway_device.login',
            'sms_gateway_device.logout',
            'sms_gateway_device.password_reset',
            'sms_gateway_device_token.issued',
            'sms_gateway_device_token.revoked',
        ],
    },
];

const ACTION_OPTIONS = [
    { value: '', label: 'All actions' },
    ...KNOWN_ACTION_GROUPS.flatMap((group) =>
        group.actions.map((action) => ({
            value: action,
            label: `${group.label} · ${action.split('.').at(-1)?.replaceAll('_', ' ')}`,
        })),
    ),
];

const ACTOR_OPTIONS = [
    { value: '', label: 'All actor types' },
    { value: 'user', label: 'User' },
    { value: 'station', label: 'Station' },
    { value: 'parent_account', label: 'Parent account' },
    { value: 'system', label: 'System' },
];

const ACTORS = ['user', 'parent_account', 'station', 'system'] as const;

const ACTOR_LABEL: Record<string, string> = {
    user: 'User',
    parent_account: 'Parent account',
    station: 'Station',
    system: 'System',
};

// Flat, distinct fill colors — the platform dashboard's SMS status palette
// plus the brand blue, so stacked segments read apart at a glance.
const ACTOR_COLORS: Record<string, string> = {
    user: '#234ef4',
    parent_account: '#6c47c9',
    station: '#c1791f',
    system: '#7a8699',
};

interface StatCardProps {
    label: string;
    value: number;
    icon: React.ReactNode;
    tone: 'blue' | 'amber' | 'violet' | 'green' | 'red';
    pill?: { value: string; text: string; tone?: string };
}

function StatCard({ label, value, icon, tone, pill }: StatCardProps) {
    return (
        <div className="pft-stat-card">
            <div className="pft-stat-card-top">
                <p className="pft-stat-label">{label}</p>
                <span className={`pft-stat-icon pft-stat-icon--${tone}`}>{icon}</span>
            </div>
            <p className="pft-stat-value">{value}</p>
            {pill && (
                <div className="pft-stat-pills">
                    <span className={`pft-stat-pill ${pill.tone ? `pft-stat-pill--${pill.tone}` : ''}`}>
                        <strong>{pill.value}</strong> {pill.text}
                    </span>
                </div>
            )}
        </div>
    );
}

function sharePct(part: number, total: number): string {
    return total > 0 ? `${Math.round((part / total) * 100)}%` : '0%';
}

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

function AuditTrendChart({ trend }: { trend: Trend }) {
    const granularity = trend.granularity;
    const chartData = trend.points.map((point) => ({
        ...point,
        label:
            granularity === 'day'
                ? new Date(`${point.bucket}T12:00:00`).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                  })
                : new Date(`${point.bucket}-01T12:00:00`).toLocaleDateString(undefined, {
                      month: 'short',
                      year: 'numeric',
                  }),
    }));

    const hasData = chartData.some((point) => point.total > 0);

    return (
        <>
            <div className="pf-chart-legend">
                {ACTORS.map((actor) => (
                    <span key={actor} className="pf-chart-legend-item">
                        <span className="pf-chart-legend-dot" style={{ background: ACTOR_COLORS[actor] }} />
                        {ACTOR_LABEL[actor]}
                    </span>
                ))}
            </div>
            {!hasData ? (
                <p className="pf-empty pft-panel-empty">No audit entries in this window.</p>
            ) : (
                <div className="pf-chart-body">
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart
                            data={chartData}
                            margin={{ top: 8, right: 12, left: -12, bottom: 0 }}
                            barCategoryGap="20%"
                        >
                            <CartesianGrid stroke="var(--as-border-light)" vertical={false} />
                            <XAxis
                                dataKey="label"
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
                            {ACTORS.map((actor) => (
                                <Bar
                                    key={actor}
                                    dataKey={actor}
                                    stackId="audit-entries"
                                    name={ACTOR_LABEL[actor]}
                                    fill={ACTOR_COLORS[actor]}
                                    maxBarSize={44}
                                    radius={actor === 'system' ? [3, 3, 0, 0] : [0, 0, 0, 0]}
                                />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </>
    );
}

function SchoolRankPanel({ rows }: { rows: SchoolAnalyticsRow[] }) {
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
                            {row.total} entr{row.total === 1 ? 'y' : 'ies'}
                        </span>
                    </div>
                    <div className="pft-school-rank-meta">
                        <div className="pft-school-rank-track" role="img" aria-label={`${row.share}% of all entries`}>
                            <span style={{ width: `${Math.min(100, row.share)}%` }} />
                        </div>
                        <span className="pft-school-rank-pct">{row.share}%</span>
                    </div>
                </li>
            ))}
        </ul>
    );
}

function formatAction(action: string): string {
    return action.replaceAll('.', ' · ').replaceAll('_', ' ');
}

function actionTone(action: string): string {
    return action.split('.')[0] ?? 'system';
}

export default function AuditLogListScreen({ logs, filters, stats, trend, schoolAnalytics }: AuditLogListScreenProps) {
    const [isFiltering, setIsFiltering] = useState(false);
    const hasFilters = Boolean(filters.search || filters.actor_type || filters.date_from || filters.date_to);
    const { data, setData } = useForm({
        search: filters.search ?? '',
        actor_type: filters.actor_type ?? '',
        date_from: filters.date_from ?? '',
        date_to: filters.date_to ?? '',
    });

    // Guard: prevent date_to before date_from
    const today = new Date().toISOString().slice(0, 10);

    function handleDateFrom(value: string) {
        setData((d) => ({
            ...d,
            date_from: value,
            // Clear date_to if it would precede the new from date
            date_to: d.date_to && d.date_to < value ? '' : d.date_to,
        }));
    }

    function submit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsFiltering(true);
        router.get(route('platform.audit-log.index'), data, {
            preserveState: true,
            onFinish: () => setIsFiltering(false),
        });
    }

    return (
        <PlatformLayout>
            <Head title="Audit Log" />

            <div className="pf-dashboard pft-page">
                <div className="pft-hero">
                    <div className="pft-hero-main">
                        <span className="pft-hero-icon" aria-hidden="true">
                            <HistoryIcon size={22} />
                        </span>
                        <div>
                            <h1 className="pft-hero-title">Audit Log</h1>
                            <p className="pft-hero-subtitle">
                                Every sensitive action taken across the platform, most
                                recent first.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="pft-stat-grid">
                    <StatCard
                        label="User actions"
                        value={stats.user}
                        icon={<UserIcon size={18} />}
                        tone="blue"
                        pill={{ value: sharePct(stats.user, stats.total), text: 'of entries' }}
                    />
                    <StatCard
                        label="Station actions"
                        value={stats.station}
                        icon={<MonitorCogIcon size={18} />}
                        tone="amber"
                        pill={{ value: sharePct(stats.station, stats.total), text: 'of entries' }}
                    />
                    <StatCard
                        label="Parent actions"
                        value={stats.parent_account}
                        icon={<UserCheckIcon size={18} />}
                        tone="violet"
                        pill={{ value: sharePct(stats.parent_account, stats.total), text: 'of entries' }}
                    />
                    <StatCard
                        label="System actions"
                        value={stats.system}
                        icon={<ServerIcon size={18} />}
                        tone="green"
                        pill={{ value: sharePct(stats.system, stats.total), text: 'of entries' }}
                    />
                </div>

                <div className="pft-grid-2 pft-analytics-grid">
                    <section className="pf-panel pft-growth-panel" aria-labelledby="audit-trend-title">
                        <div className="pf-panel-header">
                            <div>
                                <h2 id="audit-trend-title" className="pf-panel-title">Activity over time</h2>
                                <p className="pf-panel-count">
                                    {stats.total} entr{stats.total === 1 ? 'y' : 'ies'} in window · {trend.range.date_from} → {trend.range.date_to}
                                </p>
                            </div>
                        </div>
                        <AuditTrendChart trend={trend} />
                    </section>

                    <section className="pf-panel pft-growth-panel" aria-labelledby="school-analytics-title">
                        <div className="pf-panel-header">
                            <div>
                                <h2 id="school-analytics-title" className="pf-panel-title">By school</h2>
                                <p className="pf-panel-count">Top schools by audit volume · share of all entries</p>
                            </div>
                        </div>
                        <SchoolRankPanel rows={schoolAnalytics} />
                    </section>
                </div>

                <form onSubmit={submit} className="pf-filter-bar pal-audit-filters" role="search">
                    <div className="pf-field pal-audit-filter pal-audit-filter--action">
                        <label htmlFor="search">Action</label>
                        <PremiumSelect
                            id="search"
                            value={data.search}
                            onChange={(value) => setData('search', value)}
                            options={ACTION_OPTIONS}
                            className="pal-audit-select"
                        />
                    </div>

                    <div className="pf-field pal-audit-filter">
                        <label htmlFor="actor_type">Actor type</label>
                        <PremiumSelect
                            id="actor_type"
                            value={data.actor_type}
                            onChange={(value) => setData('actor_type', value)}
                            options={ACTOR_OPTIONS}
                            className="pal-audit-select"
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
                            className="pal-audit-select"
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
                            className="pal-audit-select"
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
                                href={route('platform.audit-log.index')}
                                className="pf-btn pf-btn-secondary"
                            >
                                Reset
                            </Link>
                        )}
                    </div>
                </form>

                <div className="pf-panel pal-audit-panel">
                    <div className="pf-panel-header">
                        <div>
                            <h2 className="pf-panel-title">Recent Activity</h2>
                            <p className="pf-panel-count">
                                {logs.from !== null ? `${logs.from}–${logs.to} of ${logs.total}` : 'No results'}
                            </p>
                        </div>
                    </div>

                    <div className="pf-table-wrap pal-audit-table-wrap">
                        <table className="pf-table pal-audit-table">
                            <thead>
                                <tr>
                                    <th scope="col">When</th>
                                    <th scope="col">School</th>
                                    <th scope="col">Actor</th>
                                    <th scope="col">Action</th>
                                    <th scope="col">Entity</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.data.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="pf-empty">
                                            <div className="pf-empty-state">
                                                <span className="pf-empty-state-icon" aria-hidden="true"><HistoryIcon size={34} /></span>
                                            {hasFilters
                                                ? 'No entries match these filters.'
                                                : 'No audit log entries yet.'}
                                            </div>
                                        </td>
                                    </tr>
                                )}

                                {logs.data.map((log) => (
                                    <tr key={log.id}>
                                        <td>
                                            <span className="pal-audit-meta pal-audit-meta--time">
                                                <CalendarDaysIcon size={13} aria-hidden="true" />
                                                {new Date(log.created_at).toLocaleString()}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="pal-audit-meta pal-audit-meta--client">
                                                <GraduationCapIcon size={13} aria-hidden="true" />
                                                {log.tenant?.name ?? 'Platform-wide'}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`pal-actor-pill pal-actor-pill--${log.actor_type}`}>
                                                {log.actor_type === 'system' ? (
                                                    <ServerIcon size={13} aria-hidden="true" />
                                                ) : (
                                                    <UserIcon size={13} aria-hidden="true" />
                                                )}
                                                {log.actor_type.replaceAll('_', ' ')}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`pal-action-pill pal-action-pill--${actionTone(log.action)}`}>
                                                <ActivityIcon size={13} aria-hidden="true" />
                                                {formatAction(log.action)}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="pal-entity-pill">
                                                <span>{log.entity_type?.replaceAll('_', ' ') ?? 'No entity'}</span>
                                                {log.entity_id && <code>{log.entity_id.slice(0, 8)}</code>}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <Pagination links={logs.links} />
                </div>
            </div>
        </PlatformLayout>
    );
}
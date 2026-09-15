import { ChevronRightIcon } from '@/Components/icons/chevron-right';
import { ClockIcon } from '@/Components/icons/clock';
import { HomeIcon } from '@/Components/icons/home';
import { LayoutGridIcon } from '@/Components/icons/layout-grid';
import { MonitorCogIcon } from '@/Components/icons/monitor-cog';
import { PlusIcon } from '@/Components/icons/plus';
import { ZapIcon } from '@/Components/icons/zap';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Head, Link } from '@inertiajs/react';
import { Tenant } from '@/types';
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import '../../../../css/platform-dashboard.css';
import '../../../../css/platform-overview.css';

interface StatCardProps {
    label: string;
    value: number;
    icon: string;
    tone: string;
    pills: Array<{ label: string; value: number | string; tone?: string }>;
}

const STAT_ICONS: Record<string, React.ReactNode> = {
    tenants: <HomeIcon size={19} />,
    activeTenants: <HomeIcon size={19} />,
    stations: <MonitorCogIcon size={19} />,
    activeStations: <ZapIcon size={19} />,
};

function StatCard({ label, value, icon, tone, pills }: StatCardProps) {
    return (
        <div className="pft-stat-card">
            <div className="pft-stat-card-top">
                <p className="pft-stat-label">{label}</p>
                <span className={`pft-stat-icon pft-stat-icon--${tone}`}>
                    {STAT_ICONS[icon]}
                </span>
            </div>
            <p className="pft-stat-value">{value}</p>
            <div className="pft-stat-pills">
                {pills.map((pill) => (
                    <span key={pill.label} className={`pft-stat-pill pft-stat-pill--${pill.tone ?? 'neutral'}`}>
                        <strong>{pill.value}</strong> {pill.label}
                    </span>
                ))}
            </div>
        </div>
    );
}

/** Radial "percent of total" gauge — used for a real ratio we already have
 * (e.g. active vs. total stations), not a fabricated trend. */
function ActivationGauge({
    label,
    value,
    total,
    pending,
    disabled,
}: {
    label: string;
    value: number;
    total: number;
    pending: number;
    disabled: number;
}) {
    const pct = total > 0 ? Math.round((value / total) * 100) : 0;

    return (
        <div className="pft-gauge-card">
            <div className="pft-gauge-summary">
                <div>
                    <span className="pft-gauge-pct">{pct}%</span>
                    <p className="pft-gauge-caption">{label}</p>
                </div>
                <strong>{value}<span> / {total}</span></strong>
            </div>
            <div className="pft-activation-track" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={total || 1} aria-valuenow={value}>
                <span style={{ width: `${Math.min(100, pct)}%` }} />
            </div>
            <div className="pft-activation-pills">
                <span><i className="pft-dot pft-dot--pending" />{pending} awaiting activation</span>
                <span><i className="pft-dot pft-dot--disabled" />{disabled} disabled or retired</span>
            </div>
        </div>
    );
}

interface GrowthPoint {
    date: string;
    total: number;
    active: number;
}

interface StatusCounts {
    active: number;
    suspended: number;
    archived: number;
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

function ClientGrowthChart({ growth }: { growth: GrowthPoint[] }) {
    const chartData = growth.map((point) => ({
        ...point,
        label: new Date(`${point.date}T12:00:00`).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
        }),
    }));

    if (chartData.length === 0) {
        return <p className="pf-empty pft-panel-empty">No clients onboarded yet.</p>;
    }

    return (
        <>
            <div className="pf-chart-legend">
                <span className="pf-chart-legend-item pf-chart-legend-item--blue">
                    <span className="pf-chart-legend-dot" />
                    Clients onboarded
                </span>
                <span className="pf-chart-legend-item pf-chart-legend-item--green">
                    <span className="pf-chart-legend-dot" />
                    Active clients
                </span>
            </div>
            <div className="pf-chart-body pft-growth-chart">
                <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={chartData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                        <defs>
                            <linearGradient id="growthTotalFill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#234ef4" stopOpacity={0.28} />
                                <stop offset="100%" stopColor="#234ef4" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="growthActiveFill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#188352" stopOpacity={0.26} />
                                <stop offset="100%" stopColor="#188352" stopOpacity={0} />
                            </linearGradient>
                        </defs>
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
                        <Tooltip content={<ChartTooltip />} />
                        <Area
                            type="monotone"
                            dataKey="total"
                            name="Clients onboarded"
                            stroke="#234ef4"
                            strokeWidth={2.5}
                            fill="url(#growthTotalFill)"
                            activeDot={{ r: 5, strokeWidth: 0 }}
                        />
                        <Area
                            type="monotone"
                            dataKey="active"
                            name="Active clients"
                            stroke="#188352"
                            strokeWidth={2.5}
                            fill="url(#growthActiveFill)"
                            activeDot={{ r: 5, strokeWidth: 0 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </>
    );
}

function ClientStatusChart({ counts }: { counts: StatusCounts }) {
    const total = counts.active + counts.suspended + counts.archived;
    const segments = [
        { key: 'active', label: 'Active', value: counts.active },
        { key: 'suspended', label: 'Suspended', value: counts.suspended },
        { key: 'archived', label: 'Archived', value: counts.archived },
    ];

    if (total === 0) {
        return <p className="pf-empty pft-panel-empty">No client workspaces yet.</p>;
    }

    return (
        <div className="pft-status-chart">
            <div className="pft-status-track" role="img" aria-label={`Active ${counts.active}, suspended ${counts.suspended}, archived ${counts.archived}`}>
                {segments.map((segment) => (
                    segment.value > 0 ? (
                        <div
                            key={segment.key}
                            className={`pft-status-seg pft-status-seg--${segment.key}`}
                            style={{ flexGrow: segment.value, flexBasis: 0 }}
                        />
                    ) : null
                ))}
            </div>
            <ul className="pft-status-legend">
                {segments.map((segment) => (
                    <li key={segment.key} className={`pft-status-legend-item pft-status-legend-item--${segment.key}`}>
                        <span className="pft-status-legend-dot" />
                        <span>{segment.label}</span>
                        <strong>{segment.value} <small>{Math.round((segment.value / total) * 100)}%</small></strong>
                    </li>
                ))}
            </ul>
        </div>
    );
}

const STATUS_PILL_CLASS: Record<Tenant['status'], string> = {
    active: 'pf-pill--active',
    suspended: 'pf-pill--suspended',
    archived: 'pf-pill--archived',
};

interface ActivityLog {
    id: string;
    tenant?: { name: string } | null;
    actor_type: 'user' | 'station' | 'system';
    action: string;
    entity_type: string | null;
    entity_id: string | null;
    created_at: string;
}

function feedDotTone(action: string): string {
    if (action.includes('provision') || action.includes('created')) return 'green';
    if (action.includes('fail') || action.includes('delete') || action.includes('purge')) return 'red';
    if (action.includes('status')) return 'amber';
    if (action.includes('tenant')) return 'blue';
    return 'gray';
}

function describeAction(log: ActivityLog): string {
    return log.action
        .replace(/[._]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

function timeAgo(value: string): string {
    const seconds = Math.max(0, (Date.now() - new Date(value).getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`;
    return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

interface DashboardScreenProps {
    stats: {
        tenant_count: number;
        active_tenant_count: number;
        inactive_tenant_count: number;
        new_tenant_count: number;
        station_count: number;
        active_station_count: number;
        pending_station_count: number;
        disabled_station_count: number;
        retired_station_count: number;
    };
    statusCounts: StatusCounts;
    growth: GrowthPoint[];
    recentActivity: ActivityLog[];
    recentClients: Tenant[];
}

export default function DashboardScreen({ stats, statusCounts, growth, recentActivity, recentClients }: DashboardScreenProps) {
    return (
        <PlatformLayout>
            <Head title="Dashboard" />

            <div className="pf-dashboard pft-page pft-dashboard">
                <div className="pft-hero">
                    <div className="pft-hero-main">
                        <span className="pft-hero-icon" aria-hidden="true">
                            <LayoutGridIcon size={22} />
                        </span>
                        <div>
                            <h1 className="pft-hero-title">Dashboard</h1>
                            <p className="pft-hero-subtitle">
                                Everything happening across Adaptive Station, at a
                                glance.
                            </p>
                        </div>
                    </div>
                    <div className="pft-hero-actions">
                        <span className="pft-hero-updated">
                            <ClockIcon size={13} />
                            Live directory
                        </span>
                        <Link href={route('platform.tenants.index', { add: 1 })} className="pf-btn pf-btn-primary">
                            <PlusIcon size={16} />
                            Add Client
                        </Link>
                    </div>
                </div>

                <div className="pft-stat-grid">
                    <StatCard
                        label="Clients"
                        value={stats.tenant_count}
                        icon="tenants"
                        tone="blue"
                        pills={[
                            { label: 'new in 30 days', value: stats.new_tenant_count, tone: 'blue' },
                            { label: 'inactive', value: stats.inactive_tenant_count },
                        ]}
                    />
                    <StatCard
                        label="Active Clients"
                        value={stats.active_tenant_count}
                        icon="activeTenants"
                        tone="green"
                        pills={[
                            { label: 'of all clients', value: `${stats.tenant_count > 0 ? Math.round((stats.active_tenant_count / stats.tenant_count) * 100) : 0}%`, tone: 'green' },
                            { label: 'need review', value: stats.inactive_tenant_count },
                        ]}
                    />
                    <StatCard
                        label="Stations"
                        value={stats.station_count}
                        icon="stations"
                        tone="violet"
                        pills={[
                            { label: 'active', value: stats.active_station_count, tone: 'green' },
                            { label: 'awaiting setup', value: stats.pending_station_count, tone: 'amber' },
                        ]}
                    />
                    <StatCard
                        label="Active Stations"
                        value={stats.active_station_count}
                        icon="activeStations"
                        tone="amber"
                        pills={[
                            { label: 'activation rate', value: `${stats.station_count > 0 ? Math.round((stats.active_station_count / stats.station_count) * 100) : 0}%`, tone: 'green' },
                            { label: 'disabled or retired', value: stats.disabled_station_count + stats.retired_station_count },
                        ]}
                    />
                </div>

                <div className="pf-panel pft-growth-panel">
                    <div className="pf-panel-header">
                        <div>
                            <h2 className="pf-panel-title">Client growth</h2>
                            <p className="pf-panel-count">Cumulative onboarded vs active, last 8 weeks</p>
                        </div>
                    </div>
                    <ClientGrowthChart growth={growth} />
                </div>

                <div className="pft-widgets-grid">
                    <div className="pft-widgets-main">
                        <div className="pf-panel">
                            <div className="pf-panel-header">
                                <div>
                                    <h2 className="pf-panel-title">Recent Activity</h2>
                                    <p className="pf-panel-count">Latest platform-level events</p>
                                </div>
                            </div>
                            <div className="pft-panel-body">
                                {recentActivity.length === 0 ? (
                                    <p className="pf-empty pft-panel-empty">
                                        No activity recorded yet.
                                    </p>
                                ) : (
                                    <ul className="pft-feed">
                                        {recentActivity.map((log) => (
                                            <li key={log.id} className="pft-feed-item">
                                                <span className={`pft-feed-dot pft-feed-dot--${feedDotTone(log.action)}`} />
                                                <span className="pft-feed-text">
                                                    {describeAction(log)}
                                                    {log.tenant?.name && <span> — {log.tenant.name}</span>}
                                                </span>
                                                <span className="pft-feed-time">{timeAgo(log.created_at)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>

                        <div className="pf-panel">
                            <div className="pf-panel-header">
                                <div>
                                    <h2 className="pf-panel-title">Recent Clients</h2>
                                    <p className="pf-panel-count">
                                        {stats.tenant_count} client{stats.tenant_count === 1 ? '' : 's'} registered
                                    </p>
                                </div>
                                <Link href={route('platform.tenants.index')} className="pft-panel-link">
                                    Manage all clients
                                    <ChevronRightIcon size={14} />
                                </Link>
                            </div>
                            <div className="pft-panel-body">
                                {recentClients.length === 0 ? (
                                    <p className="pf-empty pft-panel-empty">
                                        No client workspaces registered yet.
                                    </p>
                                ) : (
                                    <ul className="pft-recent-list">
                                        {recentClients.map((tenant) => (
                                            <li key={tenant.id}>
                                                <Link
                                                    href={route('platform.tenants.show', tenant.code)}
                                                    className="pft-recent-item"
                                                >
                                                    <div className="pft-recent-main">
                                                        <span className="pft-tenant-avatar">
                                                            {tenant.name.charAt(0).toUpperCase()}
                                                        </span>
                                                        <div className="pft-recent-copy">
                                                            <p className="pft-recent-name">{tenant.name}</p>
                                                            <p className="pft-recent-meta">{tenant.timezone}</p>
                                                        </div>
                                                    </div>
                                                    <span className={'pf-pill ' + STATUS_PILL_CLASS[tenant.status]}>
                                                        {tenant.status}
                                                    </span>
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="pft-widgets-side">
                        <div className="pf-panel">
                            <div className="pf-panel-header">
                                <div>
                                    <h2 className="pf-panel-title">Station Activation</h2>
                                    <p className="pf-panel-count">Share of stations currently active</p>
                                </div>
                            </div>
                            <ActivationGauge
                                label="Stations active"
                                value={stats.active_station_count}
                                total={stats.station_count}
                                pending={stats.pending_station_count}
                                disabled={stats.disabled_station_count + stats.retired_station_count}
                            />
                        </div>

                        <div className="pf-panel">
                            <div className="pf-panel-header">
                                <div>
                                    <h2 className="pf-panel-title">Clients by Status</h2>
                                    <p className="pf-panel-count">Active vs. inactive workspaces</p>
                                </div>
                            </div>
                            <ClientStatusChart counts={statusCounts} />
                        </div>
                    </div>
                </div>
            </div>
        </PlatformLayout>
    );
}

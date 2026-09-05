import PlatformLayout from '@/Layouts/PlatformLayout';
import { Head, Link } from '@inertiajs/react';
import { Tenant } from '@/types';
import '../../../../css/platform-dashboard.css';
import '../../../../css/platform-overview.css';

interface StatCardProps {
    label: string;
    value: number;
    icon: string;
    tone: string;
    meta?: string;
}

const STAT_ICONS: Record<string, React.ReactNode> = {
    tenants: (
        <svg viewBox="0 0 24 24">
            <polygon points="12,3 19,9 5,9" />
            <rect x="4" y="9" width="16" height="12" rx="1.6" />
        </svg>
    ),
    activeTenants: (
        <svg viewBox="0 0 24 24">
            <polygon points="12,3 19,9 5,9" />
            <rect x="4" y="9" width="16" height="12" rx="1.6" />
        </svg>
    ),
    stations: (
        <svg viewBox="0 0 24 24">
            <rect x="4" y="5" width="16" height="10" rx="1.6" />
            <rect x="9.5" y="17" width="5" height="2" rx="1" />
            <rect x="7" y="19.4" width="10" height="1.6" rx="0.8" />
        </svg>
    ),
    activeStations: (
        <svg viewBox="0 0 24 24">
            <path d="M7 2v11h3v9l7-12h-4l4-8z" />
        </svg>
    ),
};

function StatCard({ label, value, icon, tone, meta }: StatCardProps) {
    return (
        <div className="pft-stat-card">
            <div className="pft-stat-card-top">
                <p className="pft-stat-label">{label}</p>
                <span className={`pft-stat-icon pft-stat-icon--${tone}`}>
                    {STAT_ICONS[icon]}
                </span>
            </div>
            <p className="pft-stat-value">{value}</p>
            {meta && <p className="pft-stat-meta">{meta}</p>}
        </div>
    );
}

/** Radial "percent of total" gauge — used for a real ratio we already have
 * (e.g. active vs. total stations), not a fabricated trend. */
function ActivationGauge({
    label,
    value,
    total,
}: {
    label: string;
    value: number;
    total: number;
}) {
    const pct = total > 0 ? Math.round((value / total) * 100) : 0;
    const radius = 54;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (Math.min(100, pct) / 100) * circumference;

    return (
        <div className="pft-gauge-card">
            <div className="pft-gauge">
                <svg viewBox="0 0 130 130" className="pft-gauge-svg" aria-hidden="true">
                    <circle cx="65" cy="65" r={radius} className="pft-gauge-track" />
                    <circle
                        cx="65"
                        cy="65"
                        r={radius}
                        className="pft-gauge-value"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                    />
                </svg>
                <div className="pft-gauge-center">
                    <span className="pft-gauge-pct">{pct}%</span>
                </div>
            </div>
            <p className="pft-gauge-caption">{label}</p>
            <p className="pft-gauge-meta">
                {value} of {total} active
            </p>
        </div>
    );
}

/** Two-category bar comparison (active vs. inactive clients) — the closest
 * real equivalent we have to a categorical bar chart; there's no per-day
 * usage data yet to power a "most active day" style breakdown. */
function StatusBarChart({ active, inactive }: { active: number; inactive: number }) {
    const max = Math.max(active, inactive, 1);

    return (
        <div className="pft-bars">
            <div className="pft-bar-col">
                <span className="pft-bar-value">{active}</span>
                <div className="pft-bar-track">
                    <div
                        className="pft-bar pft-bar--active"
                        style={{ height: `${(active / max) * 100}%` }}
                    />
                </div>
                <span className="pft-bar-label">Active</span>
            </div>
            <div className="pft-bar-col">
                <span className="pft-bar-value">{inactive}</span>
                <div className="pft-bar-track">
                    <div
                        className="pft-bar pft-bar--muted"
                        style={{ height: `${(inactive / max) * 100}%` }}
                    />
                </div>
                <span className="pft-bar-label">Inactive</span>
            </div>
        </div>
    );
}

const STATUS_PILL_CLASS: Record<Tenant['status'], string> = {
    active: 'pf-pill--active',
    suspended: 'pft-pill--suspended',
    archived: 'pft-pill--archived',
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
        station_count: number;
        active_station_count: number;
    };
    recentActivity: ActivityLog[];
    recentClients: Tenant[];
}

export default function DashboardScreen({ stats, recentActivity, recentClients }: DashboardScreenProps) {
    return (
        <PlatformLayout>
            <Head title="Dashboard" />

            <div className="pf-dashboard pft-page">
                <div className="pft-hero">
                    <div className="pft-hero-main">
                        <span className="pft-hero-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24">
                                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                                <rect x="14" y="14" width="7" height="7" rx="1.5" />
                            </svg>
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
                            <svg viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="9" />
                                <path d="M12 7v5l3.2 2" />
                            </svg>
                            Updated {new Date().toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </span>
                        <Link href={route('platform.tenants.index')} className="pf-btn pf-btn-primary">
                            <svg viewBox="0 0 24 24">
                                <path d="M12 5v14M5 12h14" />
                            </svg>
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
                    />
                    <StatCard
                        label="Active Clients"
                        value={stats.active_tenant_count}
                        icon="activeTenants"
                        tone="green"
                        meta={
                            stats.tenant_count > 0
                                ? `${Math.round((stats.active_tenant_count / stats.tenant_count) * 100)}% of all clients`
                                : undefined
                        }
                    />
                    <StatCard
                        label="Stations"
                        value={stats.station_count}
                        icon="stations"
                        tone="violet"
                    />
                    <StatCard
                        label="Active Stations"
                        value={stats.active_station_count}
                        icon="activeStations"
                        tone="amber"
                    />
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
                            <div style={{ padding: '4px 24px 20px' }}>
                                {recentActivity.length === 0 ? (
                                    <p className="pf-empty" style={{ padding: '32px 0' }}>
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
                                    <svg viewBox="0 0 24 24">
                                        <path d="M9 6l6 6-6 6" />
                                    </svg>
                                </Link>
                            </div>
                            <div style={{ padding: '4px 24px 20px' }}>
                                {recentClients.length === 0 ? (
                                    <p className="pf-empty" style={{ padding: '32px 0' }}>
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
                                                        <div style={{ minWidth: 0 }}>
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
                            />
                        </div>

                        <div className="pf-panel">
                            <div className="pf-panel-header">
                                <div>
                                    <h2 className="pf-panel-title">Clients by Status</h2>
                                    <p className="pf-panel-count">Active vs. inactive workspaces</p>
                                </div>
                            </div>
                            <StatusBarChart
                                active={stats.active_tenant_count}
                                inactive={Math.max(0, stats.tenant_count - stats.active_tenant_count)}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </PlatformLayout>
    );
}

import PlatformLayout from '@/Layouts/PlatformLayout';
import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';
import { Tenant } from '@/types';
import ManageSchoolModal from '../tenants/ManageSchoolModal';
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

interface OverviewStats {
    tenant_count: number;
    active_tenant_count: number;
    station_count: number;
    active_station_count: number;
}

interface GrowthPoint {
    date: string;
    total: number;
    active: number;
}

interface RecentTenant {
    id: string;
    name: string;
    code: string;
    status: string;
    created_at: string;
    station_count: number;
    timezone?: string;
}

interface StatCardProps {
    label: string;
    value: number;
    icon: 'tenants' | 'activeTenants' | 'stations' | 'activeStations';
    tone: 'blue' | 'green' | 'violet' | 'amber';
}

const STAT_ICONS: Record<StatCardProps['icon'], React.ReactNode> = {
    tenants: (
        <svg viewBox="0 0 24 24">
            <path d="M4 21V7l8-4 8 4v14M9 21v-6h6v6M4 11h16" />
        </svg>
    ),
    activeTenants: (
        <svg viewBox="0 0 24 24">
            <path d="m5 12 4.5 4.5L19 7" />
        </svg>
    ),
    stations: (
        <svg viewBox="0 0 24 24">
            <rect x="4" y="5" width="16" height="13" rx="2" />
            <path d="M8 21h8M9 9h6M9 13h4" />
        </svg>
    ),
    activeStations: (
        <svg viewBox="0 0 24 24">
            <path d="M12 3v6M8.5 6.5a6.5 6.5 0 1 0 7 0" />
        </svg>
    ),
};

function StatCard({ label, value, icon, tone }: StatCardProps) {
    return (
        <div className="pf-stat-card">
            <span className={`pf-stat-icon pf-stat-icon--${tone}`}>
                {STAT_ICONS[icon]}
            </span>
            <div>
                <p className="pf-stat-label">{label}</p>
                <p className="pf-stat-value">{value.toLocaleString()}</p>
            </div>
        </div>
    );
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

interface RecencyInfo {
    tier: 'now' | 'today' | 'yesterday' | 'week' | 'older';
    label: string;
    exact: string;
    fullDate: string;
}

function getRecencyInfo(dateString: string): RecencyInfo {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.max(0, Math.floor(diffMs / 1000));
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    const exact = date.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });

    const fullDate = date.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'medium',
    });

    // Tier 1: Under 1 hour (< 60 minutes)
    if (diffMin < 1) {
        return { tier: 'now', label: 'Just now', exact, fullDate };
    }
    if (diffHour < 1) {
        return { tier: 'now', label: `${diffMin}m ago`, exact, fullDate };
    }

    // Tier 2: Today (calendar day match or < 24 hours)
    const isToday =
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear();

    if (isToday || diffHour < 24) {
        return { tier: 'today', label: `${diffHour}h ago`, exact, fullDate };
    }

    // Tier 3: Yesterday (diffDay === 1 or < 48 hours)
    if (diffDay === 1 || diffHour < 48) {
        return { tier: 'yesterday', label: 'Yesterday', exact, fullDate };
    }

    // Tier 4: This week (< 7 days)
    if (diffDay < 7) {
        return { tier: 'week', label: `${diffDay}d ago`, exact, fullDate };
    }

    // Tier 5: Older
    const shortDate = date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
    return { tier: 'older', label: shortDate, exact, fullDate };
}

function CreatedCell({ dateString }: { dateString: string }) {
    const info = getRecencyInfo(dateString);

    return (
        <div className="pf-when-cell" title={info.fullDate}>
            <span className={`pf-when-pill pf-when-pill--${info.tier}`}>
                <span className="pf-when-dot" aria-hidden="true" />
                <span>{info.label}</span>
            </span>
            <span className="pf-when-exact">
                {info.exact}
            </span>
        </div>
    );
}

function StationCell({ count }: { count: number }) {
    if (count === 0) {
        return (
            <span className="pf-station-empty" title="No stations registered yet">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                    <rect x="4" y="5" width="16" height="13" rx="2" strokeWidth="1.8" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M8 21h8M9 9h6M9 13h4" />
                </svg>
                <span>0 stations</span>
            </span>
        );
    }

    const maxVisible = 3;
    const displayedCount = Math.min(count, maxVisible);
    const overflow = count - maxVisible;

    return (
        <div
            className="pf-tooltip-wrap"
            tabIndex={0}
            role="group"
            aria-label={`${count} total ${count === 1 ? 'station' : 'stations'}`}
        >
            <div className="pf-station-icons" title={`Total: ${count} ${count === 1 ? 'station' : 'stations'}`}>
                {Array.from({ length: displayedCount }).map((_, index) => (
                    <span
                        key={index}
                        className="pf-station-icon-badge"
                        aria-hidden="true"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <rect x="4" y="5" width="16" height="13" rx="2" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 21h8M9 9h6M9 13h4" />
                        </svg>
                    </span>
                ))}

                {overflow > 0 && (
                    <span className="pf-station-overflow-badge" aria-hidden="true">
                        +{overflow}
                    </span>
                )}
            </div>

            {/* Hover tooltip showing total count */}
            <div className="pf-station-tooltip" role="tooltip">
                <div className="pf-station-tooltip-body">
                    <svg className="w-3.5 h-3.5 text-violet-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <rect x="4" y="5" width="16" height="13" rx="2" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 21h8M9 9h6M9 13h4" />
                    </svg>
                    <span>
                        Total: <strong>{count}</strong> {count === 1 ? 'station' : 'stations'}
                    </span>
                </div>
                <div className="pf-station-tooltip-arrow" />
            </div>
        </div>
    );
}

interface OverviewScreenProps {
    stats: OverviewStats;
    growth: GrowthPoint[];
    recentTenants: RecentTenant[];
}

export default function OverviewScreen({ stats, growth, recentTenants }: OverviewScreenProps) {
    const [manageTenant, setManageTenant] = useState<Tenant | null>(null);

    const chartData = growth.map((point) => ({
        ...point,
        label: new Date(point.date).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
        }),
    }));

    return (
        <PlatformLayout>
            <Head title="Overview" />

            <div className="pf-dashboard">
                <div className="pf-dashboard-header">
                    <div>
                        <h1 className="pf-dashboard-title">Overview</h1>
                        <p className="pf-dashboard-subtitle">
                            School onboarding and station health across the platform.
                        </p>
                    </div>
                    <Link href={route('platform.tenants.index')} className="pf-btn pf-btn-secondary">
                        View Schools
                        <svg viewBox="0 0 24 24">
                            <path d="M9 6l6 6-6 6" />
                        </svg>
                    </Link>
                </div>

                <div className="pf-stat-grid">
                    <StatCard label="Schools" value={stats.tenant_count} icon="tenants" tone="blue" />
                    <StatCard
                        label="Active Schools"
                        value={stats.active_tenant_count}
                        icon="activeTenants"
                        tone="green"
                    />
                    <StatCard label="Stations" value={stats.station_count} icon="stations" tone="violet" />
                    <StatCard
                        label="Active Stations"
                        value={stats.active_station_count}
                        icon="activeStations"
                        tone="amber"
                    />
                </div>

                <div className="pf-panel">
                    <div className="pf-panel-header">
                        <div>
                            <h2 className="pf-panel-title">School growth</h2>
                            <p className="pf-panel-count">Cumulative, last 8 weeks</p>
                        </div>
                    </div>

                    {chartData.length === 0 ? (
                        <p className="pf-empty">No schools onboarded yet.</p>
                    ) : (
                        <>
                            <div className="pf-chart-legend">
                                <span className="pf-chart-legend-item pf-chart-legend-item--blue">
                                    <span className="pf-chart-legend-dot" />
                                    Schools Onboarded
                                </span>
                                <span className="pf-chart-legend-item pf-chart-legend-item--green">
                                    <span className="pf-chart-legend-dot" />
                                    Active Schools
                                </span>
                            </div>
                            <div className="pf-chart-body">
                                <ResponsiveContainer width="100%" height={280}>
                                    <AreaChart data={chartData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                                        <defs>
                                             <linearGradient id="growthTotalFill" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#234ef4" stopOpacity={0.22} />
                                                <stop offset="100%" stopColor="#234ef4" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="growthActiveFill" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#188352" stopOpacity={0.22} />
                                                <stop offset="100%" stopColor="#188352" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid stroke="#eef1f6" vertical={false} />
                                        <XAxis
                                            dataKey="label"
                                            tick={{ fontSize: 11, fill: '#94a3b8' }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <YAxis
                                            tick={{ fontSize: 11, fill: '#94a3b8' }}
                                            axisLine={false}
                                            tickLine={false}
                                            allowDecimals={false}
                                        />
                                        <Tooltip content={<ChartTooltip />} />
                                        <Area
                                            type="monotone"
                                            dataKey="total"
                                            name="Schools Onboarded"
                                            stroke="#234ef4"
                                            strokeWidth={2.5}
                                            fill="url(#growthTotalFill)"
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="active"
                                            name="Active Schools"
                                            stroke="#188352"
                                            strokeWidth={2.5}
                                            fill="url(#growthActiveFill)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </>
                    )}
                </div>

                <div className="pf-panel">
                    <div className="pf-panel-header">
                        <div>
                            <h2 className="pf-panel-title">Recently added schools</h2>
                            <p className="pf-panel-count">{recentTenants.length} shown</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-400">
                                <span className="text-[10.5px] font-semibold uppercase tracking-wider mr-1">Recency:</span>
                                <span className="pf-when-pill pf-when-pill--now !py-0.5 !px-2 text-[10px]">
                                    <span className="pf-when-dot" aria-hidden="true" /> Live
                                </span>
                                <span className="pf-when-pill pf-when-pill--today !py-0.5 !px-2 text-[10px]">
                                    <span className="pf-when-dot" aria-hidden="true" /> Today
                                </span>
                                <span className="pf-when-pill pf-when-pill--older !py-0.5 !px-2 text-[10px]">
                                    <span className="pf-when-dot" aria-hidden="true" /> Past
                                </span>
                            </div>
                            <Link href={route('platform.tenants.index')} className="pf-row-action">
                                View all
                                <svg viewBox="0 0 24 24">
                                    <path d="M9 6l6 6-6 6" />
                                </svg>
                            </Link>
                        </div>
                    </div>

                    <div className="pf-table-wrap">
                        <table className="pf-table">
                            <thead>
                                <tr>
                                    <th scope="col">School</th>
                                    <th scope="col">Status</th>
                                    <th scope="col">Stations</th>
                                    <th scope="col">Created</th>
                                    <th scope="col">
                                        <span className="sr-only">Actions</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentTenants.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="pf-empty">
                                            No schools yet.
                                        </td>
                                    </tr>
                                )}

                                {recentTenants.map((tenant) => (
                                    <tr key={tenant.id}>
                                        <td>
                                            <div className="pf-tenant-cell">
                                                <span className="pf-tenant-avatar">
                                                    {tenant.name.charAt(0).toUpperCase()}
                                                </span>
                                                <span>
                                                    <span className="pf-tenant-name">{tenant.name}</span>
                                                    <span className="pf-tenant-code">{tenant.code}</span>
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <span
                                                className={
                                                    'pf-pill ' +
                                                    (tenant.status === 'active'
                                                        ? 'pf-pill--active'
                                                        : 'pf-pill--inactive')
                                                }
                                            >
                                                {tenant.status}
                                            </span>
                                        </td>
                                        <td>
                                            <StationCell count={tenant.station_count} />
                                        </td>
                                        <td>
                                            <CreatedCell dateString={tenant.created_at} />
                                        </td>
                                        <td>
                                            <button
                                                type="button"
                                                onClick={() => setManageTenant(tenant as unknown as Tenant)}
                                                className="pf-row-action"
                                            >
                                                Manage
                                                <svg viewBox="0 0 24 24">
                                                    <path d="M9 6l6 6-6 6" />
                                                </svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <ManageSchoolModal
                tenant={manageTenant}
                show={manageTenant !== null}
                onClose={() => setManageTenant(null)}
                onUpdated={(updated) => setManageTenant(updated)}
            />
        </PlatformLayout>
    );
}

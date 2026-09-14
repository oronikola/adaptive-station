import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link } from '@inertiajs/react';
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
    station_count: number;
    active_station_count: number;
    taps_today: number;
    people_today: number;
    pending_sync: number;
}

interface DailyPerformancePoint {
    date: string;
    total: number;
    unique_people: number;
}

interface OverviewStation {
    id: string;
    name: string;
    status: string;
    last_seen_at: string | null;
    last_pending_count: number | null;
    is_online: boolean;
}

interface StatCardProps {
    label: string;
    value: number;
    hint: string;
    icon: 'stations' | 'taps' | 'people' | 'sync';
    tone: 'blue' | 'green' | 'violet' | 'amber';
}

const STAT_ICONS: Record<StatCardProps['icon'], React.ReactNode> = {
    stations: (
        <svg viewBox="0 0 24 24">
            <rect x="4" y="5" width="16" height="13" rx="2" />
            <path d="M8 21h8M9 9h6M9 13h4" />
        </svg>
    ),
    taps: (
        <svg viewBox="0 0 24 24">
            <path d="M8.5 8.5a5 5 0 0 1 0 7M12 5a10 10 0 0 1 0 14M5 11a1.5 1.5 0 0 1 0 2" />
        </svg>
    ),
    people: (
        <svg viewBox="0 0 24 24">
            <circle cx="9" cy="8" r="3" />
            <path d="M3.5 19.5c0-3.3 2.5-5.5 5.5-5.5s5.5 2.2 5.5 5.5" />
            <path d="M16 8.3a2.6 2.6 0 1 0 0-5.2" />
            <path d="M15 14.3c2.4.5 4.2 2.4 4.6 5.2" />
        </svg>
    ),
    sync: (
        <svg viewBox="0 0 24 24">
            <path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3" />
            <path d="M18 4v4h-4M6 20v-4h4" />
        </svg>
    ),
};

function StatCard({ label, value, hint, icon, tone }: StatCardProps) {
    return (
        <div className="pf-stat-card">
            <span className={`pf-stat-icon pf-stat-icon--${tone}`}>
                {STAT_ICONS[icon]}
            </span>
            <div>
                <p className="pf-stat-label">{label}</p>
                <p className="pf-stat-value">{value.toLocaleString()}</p>
                <p className="pf-stat-hint">{hint}</p>
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

interface OverviewScreenProps {
    stats: OverviewStats;
    dailyPerformance: DailyPerformancePoint[];
    stations: OverviewStation[];
}

export default function OverviewScreen({ stats, dailyPerformance, stations }: OverviewScreenProps) {
    const chartData = dailyPerformance.map((point) => ({
        ...point,
        label: new Date(point.date).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
        }),
    }));

    return (
        <AdminLayout>
            <Head title="Overview" />

            <div className="pf-dashboard">
                <div className="pf-dashboard-header">
                    <div>
                        <p className="pf-dashboard-kicker">Admin overview</p>
                        <h1 className="pf-dashboard-title">Overview</h1>
                        <p className="pf-dashboard-subtitle">
                            Attendance activity and station health across your school.
                        </p>
                    </div>
                    <Link href={route('portal.attendance.index')} className="pf-btn pf-btn-secondary">
                        View Attendance
                        <svg viewBox="0 0 24 24">
                            <path d="M9 6l6 6-6 6" />
                        </svg>
                    </Link>
                </div>

                <div className="pf-stat-grid">
                    <StatCard
                        label="Active Stations"
                        value={stats.active_station_count}
                        hint={`of ${stats.station_count} total`}
                        icon="stations"
                        tone="blue"
                    />
                    <StatCard
                        label="Taps Today"
                        value={stats.taps_today}
                        hint="RFID scans recorded"
                        icon="taps"
                        tone="green"
                    />
                    <StatCard
                        label="Checked In Today"
                        value={stats.people_today}
                        hint="unique people"
                        icon="people"
                        tone="violet"
                    />
                    <StatCard
                        label="Pending Sync"
                        value={stats.pending_sync}
                        hint="events awaiting cloud sync"
                        icon="sync"
                        tone="amber"
                    />
                </div>

                <div className="pf-panel">
                    <div className="pf-panel-header">
                        <div>
                            <h2 className="pf-panel-title">Daily attendance</h2>
                            <p className="pf-panel-count">Last 14 days</p>
                        </div>
                    </div>

                    {chartData.length === 0 ? (
                        <p className="pf-empty">No attendance recorded in the last 14 days.</p>
                    ) : (
                        <>
                            <div className="pf-chart-legend">
                                <span className="pf-chart-legend-item pf-chart-legend-item--blue">
                                    <span className="pf-chart-legend-dot" />
                                    Taps Recorded
                                </span>
                                <span className="pf-chart-legend-item pf-chart-legend-item--green">
                                    <span className="pf-chart-legend-dot" />
                                    Unique People
                                </span>
                            </div>
                            <div className="pf-chart-body">
                                <ResponsiveContainer width="100%" height={280}>
                                    <AreaChart data={chartData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="overviewTapsFill" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#234ef4" stopOpacity={0.22} />
                                                <stop offset="100%" stopColor="#234ef4" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="overviewPeopleFill" x1="0" y1="0" x2="0" y2="1">
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
                                            name="Taps Recorded"
                                            stroke="#234ef4"
                                            strokeWidth={2.5}
                                            fill="url(#overviewTapsFill)"
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="unique_people"
                                            name="Unique People"
                                            stroke="#188352"
                                            strokeWidth={2.5}
                                            fill="url(#overviewPeopleFill)"
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
                            <h2 className="pf-panel-title">Stations</h2>
                            <p className="pf-panel-count">{stations.length} shown</p>
                        </div>
                        <Link href={route('portal.stations.index')} className="pf-row-action">
                            View all
                            <svg viewBox="0 0 24 24">
                                <path d="M9 6l6 6-6 6" />
                            </svg>
                        </Link>
                    </div>

                    <div className="pf-table-wrap">
                        <table className="pf-table">
                            <thead>
                                <tr>
                                    <th scope="col">Station</th>
                                    <th scope="col">Status</th>
                                    <th scope="col">Pending sync</th>
                                    <th scope="col">Last seen</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stations.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="pf-empty">
                                            No stations registered yet.
                                        </td>
                                    </tr>
                                )}

                                {stations.map((station) => (
                                    <tr key={station.id}>
                                        <td className="pf-tenant-name">{station.name}</td>
                                        <td>
                                            <span
                                                className={
                                                    'pf-pill ' +
                                                    (station.is_online ? 'pf-pill--active' : 'pf-pill--inactive')
                                                }
                                            >
                                                {station.is_online ? 'online' : 'offline'}
                                            </span>
                                        </td>
                                        <td>{station.last_pending_count ?? 0}</td>
                                        <td>
                                            {station.last_seen_at
                                                ? new Date(station.last_seen_at).toLocaleString()
                                                : 'Never'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}

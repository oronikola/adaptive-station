import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link } from '@inertiajs/react';
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
    people: (
        <svg viewBox="0 0 24 24">
            <circle cx="12" cy="8" r="3.2" />
            <path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" />
        </svg>
    ),
    stations: (
        <svg viewBox="0 0 24 24">
            <rect x="4" y="5" width="16" height="13" rx="2" />
            <path d="M8 21h8M9 9h6M9 13h4" />
        </svg>
    ),
    rfid: (
        <svg viewBox="0 0 24 24">
            <rect x="3" y="6" width="18" height="12" rx="2" />
            <path d="M3 10h18" />
            <rect x="6" y="13" width="4" height="2.4" rx="0.5" />
        </svg>
    ),
    taps: (
        <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="8.5" />
            <path d="M12 7.5V12l3 2" />
        </svg>
    ),
};

function StatCard({ label, value, icon, tone, meta }: StatCardProps) {
    return (
        <div className="pft-stat-card">
            <span className={`pft-stat-icon pft-stat-icon--${tone}`}>
                {STAT_ICONS[icon]}
            </span>
            <div>
                <p className="pft-stat-label">{label}</p>
                <p className="pft-stat-value">{value}</p>
                {meta && <p className="pft-stat-meta">{meta}</p>}
            </div>
        </div>
    );
}

interface ActivityLog {
    id: string;
    actor_type: 'user' | 'station' | 'system';
    action: string;
    entity_type: string | null;
    entity_id: string | null;
    created_at: string;
}

function feedDotTone(action: string): string {
    if (action.includes('created') || action.includes('reactivated')) return 'green';
    if (action.includes('deactivated') || action.includes('deleted') || action.includes('revoke')) return 'red';
    if (action.includes('updated') || action.includes('configuration')) return 'amber';
    if (action.includes('station') || action.includes('credential')) return 'blue';
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

function formatWeekday(value: string): string {
    return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    });
}

interface WeeklyAttendanceRow {
    attendance_date_local: string;
    total: number;
    unique_people: number;
}

interface DashboardScreenProps {
    stats: {
        person_count: number;
        active_person_count: number;
        station_count: number;
        active_station_count: number;
        rfid_card_count: number;
        active_rfid_card_count: number;
        taps_today: number;
    };
    recentActivity: ActivityLog[];
    weeklyAttendance: WeeklyAttendanceRow[];
}

export default function DashboardScreen({ stats, recentActivity, weeklyAttendance }: DashboardScreenProps) {
    return (
        <AdminLayout>
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
                            <p className="pft-hero-kicker">School overview</p>
                            <h1 className="pft-hero-title">Dashboard</h1>
                            <p className="pft-hero-subtitle">
                                Your school's own people, stations, and attendance —
                                nothing beyond this workspace.
                            </p>
                        </div>
                    </div>
                    <div className="pft-hero-actions">
                        <span className="pft-hero-updated">
                            <svg viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="9" />
                                <path d="M12 7v5l3.2 2" />
                            </svg>
                            {stats.taps_today} tap{stats.taps_today === 1 ? '' : 's'} today
                        </span>
                    </div>
                </div>

                <div className="pft-stat-grid">
                    <StatCard
                        label="People"
                        value={stats.person_count}
                        icon="people"
                        tone="blue"
                        meta={`${stats.active_person_count} active`}
                    />
                    <StatCard
                        label="Stations"
                        value={stats.station_count}
                        icon="stations"
                        tone="violet"
                        meta={`${stats.active_station_count} active`}
                    />
                    <StatCard
                        label="RFID Cards"
                        value={stats.rfid_card_count}
                        icon="rfid"
                        tone="green"
                        meta={`${stats.active_rfid_card_count} active`}
                    />
                    <StatCard
                        label="Taps Today"
                        value={stats.taps_today}
                        icon="taps"
                        tone="amber"
                    />
                </div>

                <div className="pft-grid-2">
                    <div className="pf-panel">
                        <div className="pf-panel-header">
                            <div>
                                <h2 className="pf-panel-title">Recent Activity</h2>
                                <p className="pf-panel-count">This school's latest events</p>
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
                                            <span className="pft-feed-text">{describeAction(log)}</span>
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
                                <h2 className="pf-panel-title">This Week's Attendance</h2>
                                <p className="pf-panel-count">Taps per day, last 7 days</p>
                            </div>
                            <Link href={route('portal.attendance.summary')} className="pft-panel-link">
                                Full summary
                                <svg viewBox="0 0 24 24">
                                    <path d="M9 6l6 6-6 6" />
                                </svg>
                            </Link>
                        </div>
                        <div className="pf-table-wrap">
                            <table className="pf-table">
                                <thead>
                                    <tr>
                                        <th scope="col">Date</th>
                                        <th scope="col">Taps</th>
                                        <th scope="col">Unique people</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {weeklyAttendance.length === 0 && (
                                        <tr>
                                            <td colSpan={3} className="pf-empty">
                                                No attendance recorded this week.
                                            </td>
                                        </tr>
                                    )}

                                    {weeklyAttendance.map((row) => (
                                        <tr key={row.attendance_date_local}>
                                            <td>{formatWeekday(row.attendance_date_local)}</td>
                                            <td>{row.total}</td>
                                            <td>{row.unique_people}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}

import AdminLayout from '@/Layouts/AdminLayout';
import { ClockIcon } from '@/Components/icons/clock';
import { CreditCardIcon } from '@/Components/icons/credit-card';
import { GraduationCapIcon } from '@/Components/icons/graduation-cap';
import { LayoutGridIcon } from '@/Components/icons/layout-grid';
import { BadgeAlertIcon } from '@/Components/icons/badge-alert';
import { MessageSquareIcon } from '@/Components/icons/message-square';
import { MonitorCheckIcon } from '@/Components/icons/monitor-check';
import { UsersIcon } from '@/Components/icons/users';
import { Head, Link, usePoll } from '@inertiajs/react';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import '../../../../css/platform-dashboard.css';
import '../../../../css/platform-overview.css';
import '../../../../css/school-dashboard.css';

interface DashboardScreenProps {
    today: string;
    timezone: string;
    updatedAt: string;
    stats: {
        person_count: number;
        active_person_count: number;
        station_count: number;
        active_station_count: number;
        online_station_count: number;
        offline_station_count: number;
        rfid_card_count: number;
        active_rfid_card_count: number;
        taps_today: number;
        people_today: number;
        sms_failures: number | null;
        open_attendance_exception_count: number;
        pending_station_event_count: number;
    };
    stationHealth: {
        threshold_minutes: number;
        last_attendance_sync_at: string | null;
        offline_stations: { id: string; name: string; station_code: string; last_seen_at: string | null }[];
    };
    recentActivity: { id: string; action: string; created_at: string }[];
    weeklyAttendance: { attendance_date_local: string; total: number; unique_people: number; in: number; out: number }[];
    smsHealth: {
        total: number;
        pending: number;
        sent: number;
        delivered: number;
        failed: number;
        topFailure: { category: string; count: number } | null;
    } | null;
    stationVolume: { id: string; name: string; station_code: string; total: number }[];
}

function formatDay(value: string, short = false): string {
    return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, short
        ? { weekday: 'short' }
        : { weekday: 'short', month: 'short', day: 'numeric' });
}

interface MetricPill {
    value: number | string;
    label: string;
    tone?: 'green' | 'amber' | 'neutral';
}

function Metric({ label, value, pills, href, icon, tone, warning = false }: {
    label: string;
    value: number;
    pills: MetricPill[];
    href: string;
    icon: React.ReactNode;
    tone: 'blue' | 'green' | 'violet' | 'amber';
    warning?: boolean;
}) {
    const iconTone = warning ? 'amber' : tone;

    return (
        <Link href={href} className="pft-stat-card school-metric">
            <span className="pft-stat-card-top">
                <span className="pft-stat-label">{label}</span>
                <span className={`pft-stat-icon pft-stat-icon--${iconTone}`} aria-hidden="true">{icon}</span>
            </span>
            <strong className="pft-stat-value">{value.toLocaleString()}</strong>
            <span className="pft-stat-pills">
                {pills.map((pill) => (
                    <span key={`${pill.label}-${pill.value}`} className={`pft-stat-pill pft-stat-pill--${pill.tone ?? 'neutral'}`}>
                        <strong>{typeof pill.value === 'number' ? pill.value.toLocaleString() : pill.value}</strong> {pill.label}
                    </span>
                ))}
            </span>
        </Link>
    );
}

interface AttendanceTooltipEntry {
    dataKey: string;
    name: string;
    value: number;
    color: string;
}

function AttendanceTooltip({
    active,
    payload,
    label,
}: {
    active?: boolean;
    payload?: AttendanceTooltipEntry[];
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

function AttendanceChart({ weeklyAttendance }: { weeklyAttendance: DashboardScreenProps['weeklyAttendance'] }) {
    const chartData = weeklyAttendance.map((day) => ({
        ...day,
        label: new Date(`${day.attendance_date_local}T12:00:00`).toLocaleDateString(undefined, {
            weekday: 'short',
            day: 'numeric',
        }),
    }));

    return (
        <>
            <div className="pf-chart-legend">
                <span className="pf-chart-legend-item pf-chart-legend-item--blue">
                    <span className="pf-chart-legend-dot" />
                    Tapped In
                </span>
                <span className="pf-chart-legend-item pf-chart-legend-item--amber">
                    <span className="pf-chart-legend-dot" />
                    Tapped Out
                </span>
                <span className="pf-chart-legend-item pf-chart-legend-item--green">
                    <span className="pf-chart-legend-dot" />
                    Unique people
                </span>
            </div>
            <div className="pf-chart-body pft-growth-chart">
                <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={chartData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                        <defs>
                            <linearGradient id="attendanceInFill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#234ef4" stopOpacity={0.28} />
                                <stop offset="100%" stopColor="#234ef4" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="attendanceOutFill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#c1791f" stopOpacity={0.24} />
                                <stop offset="100%" stopColor="#c1791f" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="attendancePeopleFill" x1="0" y1="0" x2="0" y2="1">
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
                        <Tooltip content={<AttendanceTooltip />} />
                        <Area
                            type="monotone"
                            dataKey="in"
                            name="Tapped In"
                            stroke="#234ef4"
                            strokeWidth={2.5}
                            fill="url(#attendanceInFill)"
                            activeDot={{ r: 5, strokeWidth: 0 }}
                        />
                        <Area
                            type="monotone"
                            dataKey="out"
                            name="Tapped Out"
                            stroke="#c1791f"
                            strokeWidth={2.5}
                            fill="url(#attendanceOutFill)"
                            activeDot={{ r: 5, strokeWidth: 0 }}
                        />
                        <Area
                            type="monotone"
                            dataKey="unique_people"
                            name="Unique people"
                            stroke="#188352"
                            strokeWidth={2.5}
                            fill="url(#attendancePeopleFill)"
                            activeDot={{ r: 5, strokeWidth: 0 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </>
    );
}

// Status palette in lockstep with the sms-log page's own bar chart, plus the
// green "delivered" tone this dashboard adds.
const SMS_STATUS_COLORS: Record<string, string> = {
    pending: '#c1791f',
    sent: '#6c47c9',
    delivered: '#1a8a4c',
    failed: '#d84a3f',
};

function SmsDeliveryHealthPanel({ smsHealth }: { smsHealth: NonNullable<DashboardScreenProps['smsHealth']> }) {
    const chartData = [
        { name: 'Pending', value: smsHealth.pending, tone: 'pending' },
        { name: 'Sent', value: smsHealth.sent, tone: 'sent' },
        { name: 'Delivered', value: smsHealth.delivered, tone: 'delivered' },
        { name: 'Failed', value: smsHealth.failed, tone: 'failed' },
    ];

    return (
        <section className="pf-panel" aria-labelledby="sms-health-title">
            <div className="pf-panel-header">
                <div>
                    <h2 id="sms-health-title" className="pf-panel-title">SMS delivery health</h2>
                    <p className="pf-panel-count">Tap-alert delivery for this school, all-time</p>
                </div>
                <Link href={route('portal.sms-log.index')} className="pft-panel-link">Full delivery log →</Link>
            </div>
            <div className="pf-chart-legend">
                {(['pending', 'sent', 'delivered', 'failed'] as const).map((status) => (
                    <span key={status} className="pf-chart-legend-item">
                        <span className="pf-chart-legend-dot" style={{ background: SMS_STATUS_COLORS[status] }} />
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                    </span>
                ))}
            </div>
            {smsHealth.total === 0 ? (
                <p className="pf-empty pft-panel-empty">
                    No SMS activity yet — tap alerts appear once fleet phones start sending them.
                </p>
            ) : (
                <div className="pf-chart-body">
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart
                            data={chartData}
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
                            <Tooltip content={<AttendanceTooltip />} cursor={{ fill: 'var(--as-surface-active)' }} />
                            <Bar dataKey="value" name="Messages" maxBarSize={64} radius={[8, 8, 2, 2]}>
                                {chartData.map((bar) => (
                                    <Cell key={bar.name} fill={SMS_STATUS_COLORS[bar.tone]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
            {smsHealth.topFailure && (
                <p className="school-sms-failure">
                    <BadgeAlertIcon size={14} aria-hidden="true" />
                    Top failure reason: <strong>{smsHealth.topFailure.category}</strong> · {smsHealth.topFailure.count} message{smsHealth.topFailure.count === 1 ? '' : 's'}
                </p>
            )}
        </section>
    );
}

function shortenStationName(name: string): string {
    return name.length > 18 ? `${name.slice(0, 17)}…` : name;
}

function StationVolumePanel({ stationVolume }: { stationVolume: DashboardScreenProps['stationVolume'] }) {
    return (
        <section className="pf-panel" aria-labelledby="station-volume-title">
            <div className="pf-panel-header">
                <div>
                    <h2 id="station-volume-title" className="pf-panel-title">Tap volume by station</h2>
                    <p className="pf-panel-count">Activity per station, last 7 days</p>
                </div>
                <Link href={route('portal.stations.index')} className="pft-panel-link">View stations →</Link>
            </div>
            <div className="pf-chart-body">
                <ResponsiveContainer width="100%" height={Math.max(240, stationVolume.length * 46)}>
                    <BarChart
                        data={stationVolume}
                        layout="vertical"
                        margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
                        barCategoryGap="32%"
                    >
                        <CartesianGrid stroke="var(--as-border-light)" horizontal={false} />
                        <XAxis
                            type="number"
                            tick={{ fontSize: 11, fill: 'var(--as-text-muted)' }}
                            axisLine={false}
                            tickLine={false}
                            allowDecimals={false}
                        />
                        <YAxis
                            type="category"
                            dataKey="name"
                            width={110}
                            tick={{ fontSize: 11, fill: 'var(--as-text-muted)' }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={shortenStationName}
                        />
                        <Tooltip content={<AttendanceTooltip />} cursor={{ fill: 'var(--as-surface-active)' }} />
                        <Bar dataKey="total" name="Taps" fill="#234ef4" maxBarSize={24} radius={[0, 8, 8, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </section>
    );
}

export default function DashboardScreen({ today, timezone, updatedAt, stats, stationHealth, recentActivity, weeklyAttendance, smsHealth, stationVolume }: DashboardScreenProps) {
    usePoll(30000, { only: ['today', 'timezone', 'updatedAt', 'stats', 'stationHealth', 'recentActivity', 'weeklyAttendance', 'smsHealth', 'stationVolume'] });
    const attendanceHref = route('portal.attendance.index', { date_from: today, date_to: today });
    const stationsHref = route('portal.stations.index');
    const peopleHref = route('portal.people.index');
    const weekTotal = weeklyAttendance.reduce((sum, day) => sum + day.total, 0);
    const weekPeople = weeklyAttendance.reduce((sum, day) => sum + day.unique_people, 0);
    const weekIn = weeklyAttendance.reduce((sum, day) => sum + day.in, 0);
    const weekOut = weeklyAttendance.reduce((sum, day) => sum + day.out, 0);
    const attentionCount = stats.offline_station_count + (stats.sms_failures ?? 0) + stats.open_attendance_exception_count + stats.pending_station_event_count;
    const formatTime = (value: string) => new Date(value).toLocaleString(undefined, {
        timeZone: timezone, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    });

    return (
        <AdminLayout>
            <Head title="Dashboard" />
            <div className="pf-dashboard pft-page pft-dashboard school-dashboard">
                <header className="pft-hero">
                    <div className="pft-hero-main">
                        <span className="pft-hero-icon" aria-hidden="true"><LayoutGridIcon size={22} /></span>
                        <div>
                            <h1 className="pft-hero-title">School dashboard</h1>
                            <p className="pft-hero-subtitle">Attendance, station health, and operational alerts for {formatDay(today)}.</p>
                        </div>
                    </div>
                    <div className="pft-hero-actions">
                        <span className="pft-hero-updated"><ClockIcon size={13} />Updated {formatTime(updatedAt)} · every 30s</span>
                        <Link href={attendanceHref} className="pf-btn pf-btn-primary">View today's attendance</Link>
                    </div>
                </header>

                <section className="pft-stat-grid" aria-label="Today's overview">
                    <Metric
                        label="People today"
                        value={stats.people_today}
                        tone="blue"
                        href={attendanceHref}
                        icon={<UsersIcon size={19} />}
                        pills={[
                            { value: stats.taps_today, label: 'taps', tone: 'green' },
                            { value: timezone, label: '' },
                        ]}
                    />
                    <Metric
                        label="Stations online"
                        value={stats.online_station_count}
                        tone="violet"
                        href={stationsHref}
                        icon={<MonitorCheckIcon size={19} />}
                        warning={stats.offline_station_count > 0}
                        pills={[
                            { value: stats.active_station_count, label: 'enabled', tone: 'green' },
                            { value: stats.offline_station_count, label: 'offline', tone: stats.offline_station_count > 0 ? 'amber' : 'neutral' },
                        ]}
                    />
                    <Metric
                        label="Total people"
                        value={stats.person_count}
                        tone="green"
                        href={peopleHref}
                        icon={<GraduationCapIcon size={19} />}
                        pills={[
                            { value: stats.active_person_count, label: 'active', tone: 'green' },
                            { value: stats.person_count - stats.active_person_count, label: 'inactive' },
                        ]}
                    />
                    {stats.sms_failures !== null ? (
                        <Metric
                            label="Failed SMS"
                            value={stats.sms_failures}
                            tone="amber"
                            href={route('portal.sms-log.index', { status: 'failed' })}
                            icon={<MessageSquareIcon size={19} />}
                            warning={stats.sms_failures > 0}
                            pills={[
                                { value: stats.sms_failures > 0 ? 'Needs review' : 'All clear', label: '', tone: stats.sms_failures > 0 ? 'amber' : 'green' },
                                { value: 'Delivery', label: 'log' },
                            ]}
                        />
                    ) : (
                        <Metric
                            label="RFID cards"
                            value={stats.rfid_card_count}
                            tone="amber"
                            href={peopleHref}
                            icon={<CreditCardIcon size={19} />}
                            pills={[
                                { value: stats.active_rfid_card_count, label: 'active', tone: 'green' },
                                { value: stats.station_count, label: 'stations' },
                            ]}
                        />
                    )}
                </section>

                <section className="pf-panel school-attention" aria-labelledby="attention-title">
                    <div className="pf-panel-header">
                        <div>
                            <h2 id="attention-title" className="pf-panel-title">Needs attention</h2>
                            <p className="pf-panel-count">{attentionCount > 0 ? 'Review these issues to keep attendance and notifications moving.' : 'No issues in the checks available to your account.'}</p>
                        </div>
                        <span className={`school-status ${attentionCount > 0 ? 'school-status--warning' : ''}`}>{attentionCount > 0 ? `${attentionCount} to review` : 'No alerts'}</span>
                    </div>
                    {stats.offline_station_count > 0 && <div className="school-alert-row">
                        <div><strong>{stats.offline_station_count} enabled station{stats.offline_station_count === 1 ? '' : 's'} offline</strong><p>No heartbeat within {stationHealth.threshold_minutes} minutes. Attendance may still be saved on the device.</p></div>
                        <Link href={stationsHref} className="pf-btn pf-btn-secondary">Review stations</Link>
                    </div>}
                    {stats.sms_failures !== null && stats.sms_failures > 0 && <div className="school-alert-row">
                        <div><strong>{stats.sms_failures} failed SMS message{stats.sms_failures === 1 ? '' : 's'}</strong><p>Review delivery errors and resend eligible messages.</p></div>
                        <Link href={route('portal.sms-log.index', { status: 'failed' })} className="pf-btn pf-btn-secondary">Review failed SMS</Link>
                    </div>}
                    {stats.pending_station_event_count > 0 && <div className="school-alert-row">
                        <div><strong>{stats.pending_station_event_count} tap{stats.pending_station_event_count === 1 ? '' : 's'} waiting to sync</strong><p>These taps are safely stored on kiosks. Review the affected station and its connection.</p></div>
                        <Link href={stationsHref} className="pf-btn pf-btn-secondary">Review station sync</Link>
                    </div>}
                    {stats.open_attendance_exception_count > 0 && <div className="school-alert-row">
                        <div><strong>{stats.open_attendance_exception_count} attendance exception{stats.open_attendance_exception_count === 1 ? '' : 's'} open</strong><p>Resolve verified absences, late arrivals, or missing exit records.</p></div>
                        <Link href={route('portal.attendance.operations.index')} className="pf-btn pf-btn-secondary">Review exceptions</Link>
                    </div>}
                    {stats.station_count === 0 && <p className="school-empty">No stations have been added to this school yet.</p>}
                </section>

                <section className="pf-panel pft-growth-panel" aria-labelledby="week-title">
                    <div className="pf-panel-header">
                        <div>
                            <h2 id="week-title" className="pf-panel-title">Attendance over 7 days</h2>
                            <p className="pf-panel-count">{weekIn.toLocaleString()} tapped in · {weekOut.toLocaleString()} tapped out · {weekPeople.toLocaleString()} unique check-ins · includes today</p>
                        </div>
                        <Link href={route('portal.attendance.summary')} className="pft-panel-link">Full summary →</Link>
                    </div>
                    {weekTotal === 0 && <p className="pf-empty pft-panel-empty">No attendance recorded in the last 7 days.</p>}
                    <AttendanceChart weeklyAttendance={weeklyAttendance} />
                    <details className="school-chart-details">
                        <summary>View exact daily totals</summary>
                        <div className="pf-table-wrap"><table className="pf-table">
                            <caption className="sr-only">Daily attendance tapped-in, tapped-out, and distinct identified people</caption>
                            <thead><tr><th scope="col">Date</th><th scope="col">Tapped In</th><th scope="col">Tapped Out</th><th scope="col">Unique people</th></tr></thead>
                            <tbody>{weeklyAttendance.map((day) => <tr key={day.attendance_date_local}><th scope="row">{formatDay(day.attendance_date_local)}</th><td>{day.in.toLocaleString()}</td><td>{day.out.toLocaleString()}</td><td>{day.unique_people.toLocaleString()}</td></tr>)}</tbody>
                        </table></div>
                    </details>
                </section>

                {smsHealth && stationVolume.length > 0 && (
                    <div className="pft-grid-2">
                        <SmsDeliveryHealthPanel smsHealth={smsHealth} />
                        <StationVolumePanel stationVolume={stationVolume} />
                    </div>
                )}
                {smsHealth && stationVolume.length === 0 && (
                    <SmsDeliveryHealthPanel smsHealth={smsHealth} />
                )}
                {!smsHealth && stationVolume.length > 0 && (
                    <StationVolumePanel stationVolume={stationVolume} />
                )}

                <div className="pft-widgets-grid">
                    <div className="pft-widgets-main">
                        <section className="pf-panel" aria-labelledby="activity-title">
                            <div className="pf-panel-header"><div><h2 id="activity-title" className="pf-panel-title">Recent activity</h2><p className="pf-panel-count">Latest changes in your school</p></div></div>
                            <div className="pft-panel-body">
                                {recentActivity.length === 0 ? <p className="pf-empty pft-panel-empty">No activity recorded yet.</p> : <ul className="school-activity-list">
                                    {recentActivity.map((log) => <li key={log.id}><span>{log.action.replace(/[._]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())}</span><time dateTime={log.created_at}>{formatTime(log.created_at)}</time></li>)}
                                </ul>}
                            </div>
                        </section>
                    </div>

                    <div className="pft-widgets-side">
                        <section className="pf-panel" aria-labelledby="health-title">
                            <div className="pf-panel-header"><div><h2 id="health-title" className="pf-panel-title">Station health</h2><p className="pf-panel-count">Online means a heartbeat within {stationHealth.threshold_minutes} minutes.</p></div></div>
                            <div className="pft-panel-body">
                                <dl className="school-health-facts">
                                    <div><dt>Enabled</dt><dd>{stats.active_station_count} / {stats.station_count}</dd></div>
                                    <div><dt>Online</dt><dd>{stats.online_station_count}</dd></div>
                                    <div><dt>Offline among enabled</dt><dd>{stats.offline_station_count}</dd></div>
                                    <div className="school-sync-fact"><dt>Last attendance sync</dt><dd>{stationHealth.last_attendance_sync_at ? <time dateTime={stationHealth.last_attendance_sync_at}>{formatTime(stationHealth.last_attendance_sync_at)}</time> : 'No attendance received yet'}</dd></div>
                                </dl>
                                <p className="school-health-note">Latest attendance record received from a station. A heartbeat does not confirm that attendance has synced.</p>
                                {stationHealth.offline_stations.length > 0 && <ul className="school-station-list" aria-label="Offline stations">
                                    {stationHealth.offline_stations.map((station) => <li key={station.id}>
                                        <Link href={route('portal.stations.show', station.station_code)}>{station.name}</Link>
                                        <span>{station.last_seen_at ? `Last seen ${formatTime(station.last_seen_at)}` : 'No heartbeat received yet'}</span>
                                    </li>)}
                                </ul>}
                                <Link href={stationsHref} className="school-panel-footer">View all {stats.station_count} stations →</Link>
                            </div>
                        </section>
                    </div>
                </div>

                <section className="pf-panel school-inventory" aria-labelledby="inventory-title">
                    <div className="pf-panel-header">
                        <div>
                            <h2 id="inventory-title" className="pf-panel-title">School inventory</h2>
                            <p className="pf-panel-count">People, cards, and stations in this school</p>
                        </div>
                    </div>
                    <dl>
                        <div><dt>People</dt><dd>{stats.person_count.toLocaleString()} <span>{stats.active_person_count.toLocaleString()} active</span></dd></div>
                        <div><dt>RFID cards</dt><dd>{stats.rfid_card_count.toLocaleString()} <span>{stats.active_rfid_card_count.toLocaleString()} active</span></dd></div>
                        <div><dt>Stations</dt><dd>{stats.station_count.toLocaleString()} <span>{stats.active_station_count.toLocaleString()} enabled</span></dd></div>
                    </dl>
                </section>
            </div>
        </AdminLayout>
    );
}

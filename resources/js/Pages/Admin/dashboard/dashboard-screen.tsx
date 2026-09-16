import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, usePoll } from '@inertiajs/react';
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
    };
    stationHealth: {
        threshold_minutes: number;
        last_attendance_sync_at: string | null;
        offline_stations: { id: string; name: string; station_code: string; last_seen_at: string | null }[];
    };
    recentActivity: { id: string; action: string; created_at: string }[];
    weeklyAttendance: { attendance_date_local: string; total: number; unique_people: number }[];
}

function formatDay(value: string, short = false): string {
    return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, short
        ? { weekday: 'short' }
        : { weekday: 'short', month: 'short', day: 'numeric' });
}

function Metric({ label, value, detail, href, warning = false }: {
    label: string; value: number; detail: string; href: string; warning?: boolean;
}) {
    return (
        <Link href={href} className={`school-metric${warning ? ' school-metric--warning' : ''}`}>
            <span className="school-eyebrow">{label}</span>
            <strong className="school-metric-value">{value.toLocaleString()}</strong>
            <span className="school-metric-detail">{detail}<span aria-hidden="true">↗</span></span>
        </Link>
    );
}

export default function DashboardScreen({ today, timezone, updatedAt, stats, stationHealth, recentActivity, weeklyAttendance }: DashboardScreenProps) {
    usePoll(30000, { only: ['today', 'timezone', 'updatedAt', 'stats', 'stationHealth', 'recentActivity', 'weeklyAttendance'] });
    const attendanceHref = route('portal.attendance.index', { date_from: today, date_to: today });
    const stationsHref = route('portal.stations.index');
    const maxTaps = Math.max(1, ...weeklyAttendance.map((day) => day.total));
    const weekTotal = weeklyAttendance.reduce((sum, day) => sum + day.total, 0);
    const attentionCount = stats.offline_station_count + (stats.sms_failures ?? 0);
    const formatTime = (value: string) => new Date(value).toLocaleString(undefined, {
        timeZone: timezone, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    });

    return (
        <AdminLayout>
            <Head title="Dashboard" />
            <div className="pf-dashboard school-dashboard">
                <header className="pft-hero">
                    <div className="pft-hero-main">
                        <div>
                            <p className="school-eyebrow">{formatDay(today)} · {timezone}</p>
                            <h1 className="pft-hero-title">Today at your school</h1>
                            <p className="pft-hero-subtitle">Attendance, station health, and what needs your attention.</p>
                        </div>
                    </div>
                    <div className="pft-hero-actions">
                        <span className="pft-hero-updated">Updated {formatTime(updatedAt)} · refreshes every 30s</span>
                        <Link href={attendanceHref} className="pf-btn pf-btn-primary">View today's attendance</Link>
                    </div>
                </header>

                <section className="school-metrics" aria-label="Today's overview">
                    <Metric label="People recorded today" value={stats.people_today} detail={`${stats.taps_today.toLocaleString()} attendance taps today`} href={attendanceHref} />
                    <Metric label="Stations online" value={stats.online_station_count} detail={`${stats.active_station_count} enabled · ${stats.offline_station_count} offline`} href={stationsHref} warning={stats.offline_station_count > 0} />
                    {stats.sms_failures !== null && <Metric label="Failed SMS" value={stats.sms_failures} detail="Messages currently marked failed" href={route('portal.sms-log.index', { status: 'failed' })} warning={stats.sms_failures > 0} />}
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
                    {stats.station_count === 0 && <p className="school-empty">No stations have been added to this school yet.</p>}
                </section>

                <div className="school-content-grid">
                    <section className="pf-panel" aria-labelledby="week-title">
                        <div className="pf-panel-header">
                            <div><h2 id="week-title" className="pf-panel-title">Attendance over 7 days</h2><p className="pf-panel-count">{weekTotal.toLocaleString()} taps · includes today</p></div>
                            <Link href={route('portal.attendance.summary')} className="school-text-link">Full summary →</Link>
                        </div>
                        {weekTotal === 0 && <p className="school-empty">No attendance recorded in the last 7 days.</p>}
                        <div className="school-week-chart" role="img" aria-label={`Attendance taps over seven days: ${weeklyAttendance.map((day) => `${formatDay(day.attendance_date_local)}: ${day.total}`).join('; ')}. Exact values follow below.`}>
                            {weeklyAttendance.map((day) => <div key={day.attendance_date_local} className="school-chart-column" aria-hidden="true">
                                <span className="school-chart-value">{day.total.toLocaleString()}</span>
                                <div className="school-chart-track"><div className={`school-chart-bar${day.attendance_date_local === today ? ' school-chart-bar--today' : ''}`} style={{ height: `${day.total / maxTaps * 100}%` }} /></div>
                                <span className="school-chart-label">{day.attendance_date_local === today ? 'Today' : formatDay(day.attendance_date_local, true)}</span>
                            </div>)}
                        </div>
                        <details className="school-chart-details">
                            <summary>View exact daily totals</summary>
                            <div className="pf-table-wrap"><table className="pf-table">
                                <caption className="sr-only">Daily attendance taps and distinct identified people</caption>
                                <thead><tr><th scope="col">Date</th><th scope="col">Taps</th><th scope="col">Unique people</th></tr></thead>
                                <tbody>{weeklyAttendance.map((day) => <tr key={day.attendance_date_local}><th scope="row">{formatDay(day.attendance_date_local)}</th><td>{day.total.toLocaleString()}</td><td>{day.unique_people.toLocaleString()}</td></tr>)}</tbody>
                            </table></div>
                        </details>
                    </section>

                    <section className="pf-panel" aria-labelledby="health-title">
                        <div className="pf-panel-header"><div><h2 id="health-title" className="pf-panel-title">Station health</h2><p className="pf-panel-count">Online means a heartbeat within {stationHealth.threshold_minutes} minutes.</p></div></div>
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
                    </section>
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

                <section className="pf-panel" aria-labelledby="activity-title">
                    <div className="pf-panel-header"><div><h2 id="activity-title" className="pf-panel-title">Recent activity</h2><p className="pf-panel-count">Latest changes in your school</p></div></div>
                    {recentActivity.length === 0 ? <p className="school-empty">No activity recorded yet.</p> : <ul className="school-activity-list">
                        {recentActivity.map((log) => <li key={log.id}><span>{log.action.replace(/[._]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())}</span><time dateTime={log.created_at}>{formatTime(log.created_at)}</time></li>)}
                    </ul>}
                </section>
            </div>
        </AdminLayout>
    );
}

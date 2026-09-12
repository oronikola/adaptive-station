import AdminLayout from '@/Layouts/AdminLayout';
import { Head } from '@inertiajs/react';
import '../../../../css/platform-dashboard.css';
import '../../../../css/platform-overview.css';

interface SimStat {
    sim_slot: number;
    sent_today: number;
    delivered_today: number;
    failed_today: number;
    cap_status: 'ok' | 'near' | 'at';
}

interface DeviceRow {
    id: string;
    label: string;
    username: string | null;
    is_active: boolean;
    last_seen_at: string | null;
    sent_today: number;
    delivered_today: number;
    failed_today: number;
    is_stale: boolean;
    daily_send_cap: number;
    cap_status: 'ok' | 'near' | 'at';
    // Empty until this device's app build has reported at least one
    // sim_slot-tagged send — an older, not-yet-updated phone has none yet.
    sim_stats: SimStat[];
}

const CAP_STATUS_COLOR: Record<SimStat['cap_status'], string> = {
    ok: 'var(--as-brand-blue)',
    near: 'var(--as-warning, #c1791f)',
    at: 'var(--as-danger)',
};

interface StatCardProps {
    label: string;
    value: number | string;
    icon: keyof typeof STAT_ICONS;
    tone: 'blue' | 'green' | 'violet' | 'amber' | 'red';
    meta?: string;
}

const STAT_ICONS = {
    devices: (
        <>
            <rect x="7" y="2" width="10" height="20" rx="2.4" />
            <rect x="10" y="17.6" width="4" height="1.6" rx="0.8" fill="#fff" opacity={0.9} />
        </>
    ),
    sent: <path d="M2 21l21-9L2 3v7l15 2-15 2z" />,
    delivered: <path d="M9 16.2l-3.5-3.5L4 14.2l5 5 11-11-1.5-1.5z" />,
    failed: <path d="M12 2L1 21h22L12 2zm0 6a1 1 0 011 1v6a1 1 0 01-2 0V9a1 1 0 011-1zm0 10a1.25 1.25 0 110 2.5 1.25 1.25 0 010-2.5z" />,
    pending: <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 10.4l3.6 2.6-1 1.4-4.6-3.4V6h2v6.4z" />,
    claimed: <path d="M12 3a1 1 0 011 1v9.6l3-3 1.4 1.4-5.4 5.4-5.4-5.4L8 10.6l3 3V4a1 1 0 011-1zM5 19h14v2H5z" />,
} as const;

function StatCard({ label, value, icon, tone, meta }: StatCardProps) {
    return (
        <div className="pft-stat-card">
            <div className="pft-stat-card-top">
                <p className="pft-stat-label">{label}</p>
                <span className={`pft-stat-icon pft-stat-icon--${tone}`}>
                    <svg viewBox="0 0 24 24">{STAT_ICONS[icon]}</svg>
                </span>
            </div>
            <p className="pft-stat-value">{value}</p>
            {meta && <p className="pft-stat-meta">{meta}</p>}
        </div>
    );
}

interface Backlog {
    pending: number;
    claimed: number;
    failed_last_24h: number;
    oldest_pending_age_seconds: number;
}

function formatAge(seconds: number): string {
    if (seconds < 60) return '<1m';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
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

/**
 * Read-only mirror of the Platform Fleet screen, for adaptivestation_admin —
 * no Add Device/Reset Password/Deactivate here, those stay exclusive to
 * platform_super_admin. Shows the whole fleet regardless of which school is
 * currently selected, since the phones are shared across every school.
 */
export default function SmsGatewayDevicesScreen({
    devices,
    backlog,
}: {
    devices: DeviceRow[];
    backlog: Backlog;
}) {
    const backlogIsHigh = backlog.oldest_pending_age_seconds > 30 * 60;
    const onlineCount = devices.filter((d) => d.is_active && !d.is_stale).length;
    const sentToday = devices.reduce((sum, d) => sum + d.sent_today, 0);
    const deliveredToday = devices.reduce((sum, d) => sum + d.delivered_today, 0);
    const failedToday = devices.reduce((sum, d) => sum + d.failed_today, 0);

    return (
        <AdminLayout>
            <Head title="SMS Gateway Fleet" />

            <div className="pf-dashboard pft-page">
                <div className="pft-hero">
                    <div className="pft-hero-main">
                        <span className="pft-hero-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24">
                                <rect x="6" y="3" width="12" height="18" rx="2" />
                                <path d="M10 18h4" />
                            </svg>
                        </span>
                        <div>
                            <h1 className="pft-hero-title">SMS Gateway Fleet</h1>
                            <p className="pft-hero-subtitle">
                                Every dual-SIM phone that claims and sends parent tap
                                alerts, across every school, from one shared queue.
                                Read-only — device management stays on the platform side.
                            </p>
                        </div>
                    </div>
                </div>

                {backlogIsHigh && (
                    <div
                        className="pf-panel"
                        style={{
                            marginBottom: 16,
                            padding: '14px 20px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            background: 'color-mix(in srgb, var(--as-warning, #c1791f) 8%, var(--as-surface))',
                        }}
                        role="alert"
                    >
                        <svg viewBox="0 0 24 24" style={{ width: 20, height: 20, flexShrink: 0, color: 'var(--as-warning, #c1791f)' }} fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                            <line x1="12" y1="9" x2="12" y2="13" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                        <div>
                            <strong style={{ display: 'block', marginBottom: 2 }}>Queue backlogged</strong>
                            <span className="pf-field-hint" style={{ margin: 0 }}>
                                Oldest pending message is{' '}
                                <strong>{formatAge(backlog.oldest_pending_age_seconds)}</strong> old.
                                Check for offline devices in the fleet below.
                            </span>
                        </div>
                    </div>
                )}

                <h2 className="pft-section-title">Fleet health</h2>
                <div className="pft-stat-grid">
                    <StatCard
                        label="Devices"
                        value={devices.length}
                        icon="devices"
                        tone="blue"
                        meta={`${onlineCount} online now`}
                    />
                    <StatCard label="Sent today" value={sentToday} icon="sent" tone="violet" />
                    <StatCard label="Delivered" value={deliveredToday} icon="delivered" tone="green" />
                    <StatCard
                        label="Failed"
                        value={failedToday}
                        icon="failed"
                        tone="red"
                        meta={failedToday > 0 ? 'Needs attention' : undefined}
                    />
                </div>

                <h2 className="pft-section-title">Queue</h2>
                <div className="pft-stat-grid">
                    <StatCard label="Pending" value={backlog.pending} icon="pending" tone="amber" />
                    <StatCard label="Claimed" value={backlog.claimed} icon="claimed" tone="blue" />
                    <StatCard label="Failed (24h)" value={backlog.failed_last_24h} icon="failed" tone="red" />
                    <StatCard
                        label="Oldest pending"
                        value={formatAge(backlog.oldest_pending_age_seconds)}
                        icon="pending"
                        tone={backlogIsHigh ? 'red' : 'green'}
                        meta={backlogIsHigh ? 'Queue is backlogged' : 'Draining normally'}
                    />
                </div>

                <div className="pf-panel">
                    <div className="pf-panel-header">
                        <div>
                            <h2 className="pf-panel-title">Devices</h2>
                            <p className="pf-panel-count">{devices.length} in the fleet</p>
                        </div>
                    </div>

                    <div className="pf-table-wrap">
                        <table className="pf-table">
                            <thead>
                                <tr>
                                    <th scope="col">Device</th>
                                    <th scope="col">Status</th>
                                    <th scope="col">Last seen</th>
                                    <th scope="col">Capacity (today)</th>
                                    <th scope="col">Delivered</th>
                                    <th scope="col">Failed</th>
                                </tr>
                            </thead>
                            <tbody>
                                {devices.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="pft-empty">
                                            <svg viewBox="0 0 24 24">
                                                <rect x="7" y="2" width="10" height="20" rx="2.4" />
                                            </svg>
                                            No devices registered yet.
                                        </td>
                                    </tr>
                                )}

                                {devices.map((device) => {
                                    const capPct = Math.min(100, Math.round((device.sent_today / device.daily_send_cap) * 100));
                                    return (
                                    <tr key={device.id}>
                                        <td>
                                            <div className="pft-device-cell">
                                                <span className="pft-device-avatar">
                                                    <svg viewBox="0 0 24 24">
                                                        <rect x="7" y="2" width="10" height="20" rx="2.4" />
                                                        <rect x="10" y="17.6" width="4" height="1.6" rx="0.8" fill="#fff" opacity={0.9} />
                                                    </svg>
                                                </span>
                                                <div className="pft-device-info">
                                                    <p className="pft-device-label">{device.label}</p>
                                                    <p className="pft-device-username font-mono">{device.username ?? '—'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span
                                                className={
                                                    'pf-pill ' +
                                                    (!device.is_active
                                                        ? 'pf-pill--inactive'
                                                        : device.is_stale
                                                          ? 'pf-pill--warning'
                                                          : 'pf-pill--active')
                                                }
                                            >
                                                {!device.is_active
                                                    ? 'Deactivated'
                                                    : device.is_stale
                                                      ? 'Offline'
                                                      : 'Online'}
                                            </span>
                                        </td>
                                        <td>
                                            {device.last_seen_at
                                                ? formatDateTime(device.last_seen_at)
                                                : 'Never'}
                                        </td>
                                        <td style={{ minWidth: 150 }}>
                                            <div
                                                className="font-mono"
                                                style={{ color: CAP_STATUS_COLOR[device.cap_status], fontWeight: device.cap_status !== 'ok' ? 700 : undefined }}
                                            >
                                                {device.sent_today} / {device.daily_send_cap}
                                                {device.cap_status === 'at' && ' ⚠ At Cap'}
                                                {device.cap_status === 'near' && ' ⚠ Near Cap'}
                                            </div>
                                            <div className="pft-cap-bar">
                                                <div
                                                    className="pft-cap-bar-fill"
                                                    style={{ width: `${capPct}%`, background: CAP_STATUS_COLOR[device.cap_status] }}
                                                />
                                            </div>
                                            {device.sim_stats.length > 0 ? (
                                                <div className="pft-sim-badges">
                                                    {device.sim_stats.map((sim) => (
                                                        <span
                                                            key={sim.sim_slot}
                                                            className="pft-sim-badge"
                                                            style={{ color: CAP_STATUS_COLOR[sim.cap_status] }}
                                                        >
                                                            SIM {sim.sim_slot + 1}: {sim.sent_today}/{device.daily_send_cap}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div style={{ fontSize: 11, color: 'var(--as-text-muted)', marginTop: 6 }}>
                                                    Per-SIM not reported yet
                                                </div>
                                            )}
                                        </td>
                                        <td className="font-mono">{device.delivered_today}</td>
                                        <td className="font-mono" style={{ color: device.failed_today > 0 ? 'var(--as-danger)' : undefined }}>{device.failed_today}</td>
                                    </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}

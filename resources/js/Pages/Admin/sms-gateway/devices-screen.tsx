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

const CAP_STATUS_COLOR: Record<SimStat['cap_status'], string | undefined> = {
    ok: undefined,
    near: 'var(--as-warning, #c1791f)',
    at: 'var(--as-danger)',
};

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

                <div className="pf-panel" style={{ marginBottom: 16 }}>
                    <div className="pf-panel-header">
                        <div>
                            <h2 className="pf-panel-title">Backlog</h2>
                            <p className="pf-panel-count">
                                {backlogIsHigh ? 'Queue is backlogged.' : 'Queue is draining normally.'}
                            </p>
                        </div>
                    </div>
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                            gap: 16,
                            padding: '0 24px 20px',
                        }}
                    >
                        <div>
                            <div className="pf-panel-count">Pending</div>
                            <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.2, marginTop: 4 }}>{backlog.pending}</div>
                        </div>
                        <div>
                            <div className="pf-panel-count">Claimed</div>
                            <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.2, marginTop: 4 }}>{backlog.claimed}</div>
                        </div>
                        <div>
                            <div className="pf-panel-count">Failed (24h)</div>
                            <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.2, marginTop: 4 }}>{backlog.failed_last_24h}</div>
                        </div>
                        <div>
                            <div className="pf-panel-count">Oldest pending</div>
                            <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.2, marginTop: 4, color: backlogIsHigh ? 'var(--as-warning, #c1791f)' : undefined }}>
                                {formatAge(backlog.oldest_pending_age_seconds)}
                            </div>
                        </div>
                    </div>
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
                                    <th scope="col">Label</th>
                                    <th scope="col">Username</th>
                                    <th scope="col">Status</th>
                                    <th scope="col">Last seen</th>
                                    <th scope="col">Sent (today)</th>
                                    <th scope="col">Delivered</th>
                                    <th scope="col">Failed</th>
                                </tr>
                            </thead>
                            <tbody>
                                {devices.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="pf-empty">
                                            No devices registered yet.
                                        </td>
                                    </tr>
                                )}

                                {devices.map((device) => (
                                    <tr key={device.id}>
                                        <td className="pf-tenant-name">{device.label}</td>
                                        <td className="font-mono">{device.username ?? '—'}</td>
                                        <td>
                                            <span
                                                className={
                                                    'pf-pill ' +
                                                    (!device.is_active
                                                        ? 'pf-pill--inactive'
                                                        : device.is_stale
                                                          ? 'pf-pill--inactive'
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
                                        <td>
                                            <div
                                                className="font-mono"
                                                style={{ color: CAP_STATUS_COLOR[device.cap_status], fontWeight: device.cap_status !== 'ok' ? 700 : undefined }}
                                            >
                                                {device.sent_today} / {device.daily_send_cap}
                                                {device.cap_status === 'at' && ' ⚠ At Cap'}
                                                {device.cap_status === 'near' && ' ⚠ Near Cap'}
                                            </div>
                                            {device.sim_stats.length > 0 ? (
                                                <div style={{ fontSize: 11, color: 'var(--as-text-muted)', marginTop: 2 }}>
                                                    {device.sim_stats.map((sim) => (
                                                        <span key={sim.sim_slot} style={{ marginRight: 8, color: CAP_STATUS_COLOR[sim.cap_status] }}>
                                                            SIM {sim.sim_slot + 1}: {sim.sent_today}/{device.daily_send_cap}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div style={{ fontSize: 11, color: 'var(--as-text-muted)', marginTop: 2 }}>
                                                    Per-SIM not reported yet
                                                </div>
                                            )}
                                        </td>
                                        <td className="font-mono">{device.delivered_today}</td>
                                        <td className="font-mono" style={{ color: device.failed_today > 0 ? 'var(--as-danger)' : undefined }}>{device.failed_today}</td>
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

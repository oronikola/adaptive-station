import { BadgeAlertIcon } from '@/Components/icons/badge-alert';
import { CheckIcon } from '@/Components/icons/check';
import { ClockIcon } from '@/Components/icons/clock';
import { LayoutGridIcon } from '@/Components/icons/layout-grid';
import { MenuIcon } from '@/Components/icons/menu';
import { SmartphoneNfcIcon } from '@/Components/icons/smartphone-nfc';
import SmsDevicePhone from '@/Components/SmsDevicePhone';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head } from '@inertiajs/react';
import { useEffect, useState } from 'react';
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
    devices: <SmartphoneNfcIcon size={18} />,
    delivered: <CheckIcon size={18} />,
    failed: <BadgeAlertIcon size={18} />,
    pending: <ClockIcon size={18} />,
} as const;

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
    const [viewMode, setViewMode] = useState<'gallery' | 'table'>(() => {
        if (typeof window === 'undefined') {
            return 'gallery';
        }

        const saved = window.localStorage.getItem('as-sms-fleet-view');

        return saved === 'table' || saved === 'gallery' ? saved : 'gallery';
    });

    useEffect(() => {
        window.localStorage.setItem('as-sms-fleet-view', viewMode);
    }, [viewMode]);

    const backlogIsHigh = backlog.oldest_pending_age_seconds > 30 * 60;
    const onlineCount = devices.filter((d) => d.is_active && !d.is_stale).length;
    const deliveredToday = devices.reduce((sum, d) => sum + d.delivered_today, 0);
    const failedToday = devices.reduce((sum, d) => sum + d.failed_today, 0);

    return (
        <AdminLayout>
            <Head title="SMS Gateway Fleet" />

            <div className="pf-dashboard pft-page">
                <div className="pft-hero">
                    <div className="pft-hero-main">
                        <span className="pft-hero-icon" aria-hidden="true">
                            <SmartphoneNfcIcon size={22} />
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
                        <BadgeAlertIcon size={20} style={{ flexShrink: 0, color: 'var(--as-warning, #c1791f)' }} />
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

                <div className="pft-stat-grid">
                    <StatCard
                        label="Online"
                        value={`${onlineCount}/${devices.length}`}
                        icon="devices"
                        tone="blue"
                        meta="Phones currently claiming"
                    />
                    <StatCard
                        label="Pending"
                        value={backlog.pending}
                        icon="pending"
                        tone="amber"
                        meta={backlogIsHigh ? `Oldest ${formatAge(backlog.oldest_pending_age_seconds)}` : 'Queue'}
                    />
                    <StatCard label="Delivered today" value={deliveredToday} icon="delivered" tone="green" />
                    <StatCard
                        label="Failed today"
                        value={failedToday}
                        icon="failed"
                        tone="red"
                        meta={failedToday > 0 ? 'Needs attention' : undefined}
                    />
                </div>

                <div className="pf-panel">
                    <div className="pf-panel-header">
                        <div>
                            <h2 className="pf-panel-title">Devices</h2>
                            <p className="pf-panel-count">{devices.length} in the fleet</p>
                        </div>
                        <div className="pf-view-toggle" role="group" aria-label="View mode">
                            <button
                                type="button"
                                className={`pf-view-toggle-btn ${viewMode === 'gallery' ? 'pf-view-toggle-btn--active' : ''}`}
                                onClick={() => setViewMode('gallery')}
                                aria-pressed={viewMode === 'gallery'}
                            >
                                <LayoutGridIcon size={16} />
                                Gallery
                            </button>
                            <button
                                type="button"
                                className={`pf-view-toggle-btn ${viewMode === 'table' ? 'pf-view-toggle-btn--active' : ''}`}
                                onClick={() => setViewMode('table')}
                                aria-pressed={viewMode === 'table'}
                            >
                                <MenuIcon size={16} />
                                Table
                            </button>
                        </div>
                    </div>

                    {devices.length === 0 ? (
                        <div className="pf-empty-state">
                            <span className="pf-empty-state-icon">
                                <SmartphoneNfcIcon size={26} />
                            </span>
                            <div>
                                <strong>No phones in the fleet yet</strong>
                                <p>Fleet phones are added from the platform console.</p>
                            </div>
                        </div>
                    ) : viewMode === 'gallery' ? (
                        <div className="sms-device-gallery">
                            {devices.map((device) => (
                                <SmsDevicePhone key={device.id} device={device} />
                            ))}
                        </div>
                    ) : (
                    <div className="pf-table-wrap">
                        <table className="pf-table">
                            <thead>
                                <tr>
                                    <th scope="col">Device</th>
                                    <th scope="col">Status</th>
                                    <th scope="col">Last seen</th>
                                    <th scope="col">Today</th>
                                    <th scope="col">Failed</th>
                                </tr>
                            </thead>
                            <tbody>
                                {devices.map((device) => {
                                    const capPct = Math.min(100, Math.round((device.sent_today / device.daily_send_cap) * 100));
                                    return (
                                    <tr key={device.id}>
                                        <td>
                                            <div className="pft-device-cell">
                                                <span className="pft-device-avatar">
                                                    <SmartphoneNfcIcon size={18} />
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
                                        <td style={{ minWidth: 140 }}>
                                            <div className="font-mono">{device.sent_today} / {device.daily_send_cap}</div>
                                            <div className="pft-cap-bar">
                                                <div
                                                    className="pft-cap-bar-fill"
                                                    style={{ width: `${capPct}%`, background: CAP_STATUS_COLOR[device.cap_status] }}
                                                />
                                            </div>
                                        </td>
                                        <td className="font-mono" style={{ color: device.failed_today > 0 ? 'var(--as-danger)' : undefined }}>{device.failed_today}</td>
                                    </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}

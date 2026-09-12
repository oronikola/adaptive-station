import InputError from '@/Components/InputError';
import Modal from '@/Components/Modal';
import SecretOnceCallout from '@/Components/SecretOnceCallout';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { PageProps } from '@/types';
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

interface PagePropsWithFlash {
    flash?: {
        deviceUsername?: string;
        devicePassword?: string;
    };
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

export default function SmsGatewayDevicesScreen({
    devices,
    backlog,
}: {
    devices: DeviceRow[];
    backlog: Backlog;
}) {
    const { flash } = usePage().props as PagePropsWithFlash;
    const { auth } = usePage<PageProps>().props;
    const canManage = auth.user.role === 'platform_super_admin';
    const [createOpen, setCreateOpen] = useState(false);
    const [revokingDevice, setRevokingDevice] = useState<DeviceRow | null>(null);
    const [resettingDevice, setResettingDevice] = useState<DeviceRow | null>(null);
    const { data, setData, post, processing, errors, reset } = useForm({ label: '', username: '', password: '' });
    const revokeForm = useForm({});
    const resetPasswordForm = useForm({ password: '' });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post(route('platform.sms-gateway.devices.store'), {
            onSuccess: () => {
                setCreateOpen(false);
                reset();
            },
        });
    }

    function submitRevoke(e: React.FormEvent) {
        e.preventDefault();
        if (!revokingDevice) return;
        revokeForm.patch(route('platform.sms-gateway.devices.revoke', revokingDevice.id), {
            onSuccess: () => setRevokingDevice(null),
        });
    }

    function submitResetPassword(e: React.FormEvent) {
        e.preventDefault();
        if (!resettingDevice) return;
        resetPasswordForm.patch(route('platform.sms-gateway.devices.reset-password', resettingDevice.id), {
            onSuccess: () => {
                setResettingDevice(null);
                resetPasswordForm.reset();
            },
        });
    }

    const backlogIsHigh = backlog.oldest_pending_age_seconds > 30 * 60;
    const onlineCount = devices.filter((d) => d.is_active && !d.is_stale).length;
    const sentToday = devices.reduce((sum, d) => sum + d.sent_today, 0);
    const deliveredToday = devices.reduce((sum, d) => sum + d.delivered_today, 0);
    const failedToday = devices.reduce((sum, d) => sum + d.failed_today, 0);

    return (
        <PlatformLayout>
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
                            </p>
                        </div>
                    </div>
                    {canManage && (
                        <div className="pft-hero-actions">
                            <button
                                type="button"
                                className="pf-btn pf-btn-primary"
                                onClick={() => setCreateOpen(true)}
                            >
                                <svg viewBox="0 0 24 24">
                                    <path d="M12 5v14M5 12h14" />
                                </svg>
                                Add Device
                            </button>
                        </div>
                    )}
                </div>

                {flash?.devicePassword && (
                    <div className="pf-panel" style={{ marginBottom: 16, padding: 16 }}>
                        <p className="pf-field-hint" style={{ marginBottom: 8 }}>
                            Log into the app on the phone with these credentials —
                            the password is shown only once.
                        </p>
                        <p style={{ marginBottom: 4 }}>
                            <strong>Username:</strong> <span className="font-mono">{flash.deviceUsername}</span>
                        </p>
                        <SecretOnceCallout label="Password" value={flash.devicePassword} />
                    </div>
                )}

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
                                    <th scope="col">Password</th>
                                    <th scope="col">Status</th>
                                    <th scope="col">Last seen</th>
                                    <th scope="col">Capacity (today)</th>
                                    <th scope="col">Delivered</th>
                                    <th scope="col">Failed</th>
                                    <th scope="col">
                                        <span className="sr-only">Actions</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {devices.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="pft-empty">
                                            <svg viewBox="0 0 24 24">
                                                <rect x="7" y="2" width="10" height="20" rx="2.4" />
                                            </svg>
                                            No devices registered yet.
                                        </td>
                                    </tr>
                                )}

                                {devices.map((device) => {
                                    const hasNewPassword =
                                        flash?.deviceUsername &&
                                        flash.deviceUsername === device.username &&
                                        flash?.devicePassword;
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
                                            {hasNewPassword ? (
                                                <span
                                                    className="font-mono"
                                                    style={{ fontSize: 12, background: '#fefce8', border: '1px solid #fde68a', borderRadius: 4, padding: '2px 6px', color: '#92400e' }}
                                                    title="New password — save it now"
                                                >
                                                    {flash!.devicePassword}
                                                </span>
                                            ) : (
                                                <span style={{ color: 'var(--as-text-muted)' }}>—</span>
                                            )}
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
                                        <td>
                                            {canManage && device.is_active && (
                                                <div className="pft-row-actions">
                                                    <button
                                                        type="button"
                                                        className="pf-row-action"
                                                        onClick={() => setResettingDevice(device)}
                                                    >
                                                        Reset Password
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="pf-row-action pf-row-action--danger"
                                                        onClick={() => setRevokingDevice(device)}
                                                    >
                                                        Deactivate
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Add Device modal */}
            <Modal show={createOpen} onClose={() => setCreateOpen(false)}>
                <form onSubmit={submit} className="pf-modal">
                    <div className="pf-modal-header">
                        <div>
                            <h3 className="pf-modal-title">Add Device</h3>
                            <p className="pf-field-hint">
                                Log into the app on the phone with this username and
                                the password shown next — the password is shown only
                                once.
                            </p>
                        </div>
                        <button
                            type="button"
                            className="pf-modal-close"
                            onClick={() => setCreateOpen(false)}
                            aria-label="Close"
                        >
                            <svg viewBox="0 0 24 24">
                                <path d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="pf-field">
                        <label htmlFor="label">Label</label>
                        <input
                            id="label"
                            type="text"
                            value={data.label}
                            onChange={(e) => setData('label', e.target.value)}
                            placeholder="e.g. Phone 07 - SIM A/B"
                            autoFocus
                            required
                        />
                        <InputError message={errors.label} className="mt-2" />
                    </div>

                    <div className="pf-field">
                        <label htmlFor="username">Username</label>
                        <input
                            id="username"
                            type="text"
                            value={data.username}
                            onChange={(e) => setData('username', e.target.value)}
                            placeholder="e.g. phone07"
                            className="font-mono"
                            required
                        />
                        <p className="pf-field-hint">Lowercase letters and numbers only. Used to log the app in on this device.</p>
                        <InputError message={errors.username} className="mt-2" />
                    </div>

                    <div className="pf-field">
                        <label htmlFor="password">Password (optional)</label>
                        <input
                            id="password"
                            type="text"
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            placeholder="Leave blank to auto-generate one"
                            className="font-mono"
                            minLength={8}
                        />
                        <p className="pf-field-hint">At least 8 characters. Leave blank and one will be generated for you.</p>
                        <InputError message={errors.password} className="mt-2" />
                    </div>

                    <div className="pf-modal-footer">
                        <button
                            type="button"
                            className="pf-btn pf-btn-secondary"
                            onClick={() => setCreateOpen(false)}
                        >
                            Cancel
                        </button>
                        <button type="submit" className="pf-btn pf-btn-primary" disabled={processing}>
                            Add
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Deactivate device modal */}
            <Modal show={revokingDevice !== null} onClose={() => setRevokingDevice(null)}>
                <form onSubmit={submitRevoke} className="pf-modal">
                    <div className="pf-modal-header">
                        <div>
                            <h3 className="pf-modal-title">Deactivate Device</h3>
                        </div>
                        <button
                            type="button"
                            className="pf-modal-close"
                            onClick={() => setRevokingDevice(null)}
                            aria-label="Close"
                        >
                            <svg viewBox="0 0 24 24">
                                <path d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <p style={{ padding: '0 0 8px' }}>
                        Deactivate <strong>{revokingDevice?.label}</strong>? It will immediately
                        stop claiming messages from the queue and can no longer send SMS.
                        This cannot be undone from the UI — you'll need to add a replacement device.
                    </p>

                    <div className="pf-modal-footer">
                        <button
                            type="button"
                            className="pf-btn pf-btn-secondary"
                            onClick={() => setRevokingDevice(null)}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="pf-btn pf-btn-danger"
                            disabled={revokeForm.processing}
                        >
                            Deactivate
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Reset Password modal */}
            <Modal show={resettingDevice !== null} onClose={() => setResettingDevice(null)}>
                <form onSubmit={submitResetPassword} className="pf-modal">
                    <div className="pf-modal-header">
                        <div>
                            <h3 className="pf-modal-title">Reset Device Password</h3>
                        </div>
                        <button
                            type="button"
                            className="pf-modal-close"
                            onClick={() => setResettingDevice(null)}
                            aria-label="Close"
                        >
                            <svg viewBox="0 0 24 24">
                                <path d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <p style={{ padding: '0 0 8px' }}>
                        Reset the password for <strong>{resettingDevice?.label}</strong>?
                        Its current password will stop working immediately. You'll need to
                        log into the app again with the new credentials shown after this step.
                    </p>

                    <div className="pf-field">
                        <label htmlFor="reset_password">New password (optional)</label>
                        <input
                            id="reset_password"
                            type="text"
                            value={resetPasswordForm.data.password}
                            onChange={(e) => resetPasswordForm.setData('password', e.target.value)}
                            placeholder="Leave blank to auto-generate one"
                            className="font-mono"
                            minLength={8}
                        />
                        <p className="pf-field-hint">At least 8 characters. Leave blank and one will be generated for you.</p>
                        <InputError message={resetPasswordForm.errors.password} className="mt-2" />
                    </div>

                    <div className="pf-modal-footer">
                        <button
                            type="button"
                            className="pf-btn pf-btn-secondary"
                            onClick={() => setResettingDevice(null)}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="pf-btn pf-btn-primary"
                            disabled={resetPasswordForm.processing}
                        >
                            Reset Password
                        </button>
                    </div>
                </form>
            </Modal>
        </PlatformLayout>
    );
}

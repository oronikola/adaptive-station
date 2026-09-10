import InputError from '@/Components/InputError';
import Modal from '@/Components/Modal';
import SecretOnceCallout from '@/Components/SecretOnceCallout';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import '../../../../css/platform-dashboard.css';
import '../../../../css/platform-overview.css';

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

export default function SmsGatewayDevicesScreen({
    devices,
    backlog,
}: {
    devices: DeviceRow[];
    backlog: Backlog;
}) {
    const { flash } = usePage().props as PagePropsWithFlash;
    const [createOpen, setCreateOpen] = useState(false);
    const [revokingDevice, setRevokingDevice] = useState<DeviceRow | null>(null);
    const [resettingDevice, setResettingDevice] = useState<DeviceRow | null>(null);
    const { data, setData, post, processing, errors, reset } = useForm({ label: '', username: '' });
    const revokeForm = useForm({});
    const resetPasswordForm = useForm({});

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
            onSuccess: () => setResettingDevice(null),
        });
    }

    const backlogIsHigh = backlog.oldest_pending_age_seconds > 30 * 60;

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
                                    <th scope="col">Password</th>
                                    <th scope="col">Status</th>
                                    <th scope="col">Last seen</th>
                                    <th scope="col">Sent</th>
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
                                        <td colSpan={9} className="pf-empty">
                                            No devices registered yet.
                                        </td>
                                    </tr>
                                )}

                                {devices.map((device) => {
                                    const hasNewPassword =
                                        flash?.deviceUsername &&
                                        flash.deviceUsername === device.username &&
                                        flash?.devicePassword;
                                    return (
                                    <tr key={device.id}>
                                        <td className="pf-tenant-name">{device.label}</td>
                                        <td className="font-mono">{device.username ?? '—'}</td>
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
                                                ? new Date(device.last_seen_at).toLocaleString()
                                                : 'Never'}
                                        </td>
                                        <td className="font-mono">{device.sent_today}</td>
                                        <td className="font-mono">{device.delivered_today}</td>
                                        <td className="font-mono" style={{ color: device.failed_today > 0 ? 'var(--as-danger)' : undefined }}>{device.failed_today}</td>
                                        <td>
                                            {device.is_active && (
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

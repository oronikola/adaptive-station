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

export default function SmsGatewayDevicesScreen({
    devices,
    backlog,
}: {
    devices: DeviceRow[];
    backlog: Backlog;
}) {
    const { flash } = usePage().props as PagePropsWithFlash;
    const [createOpen, setCreateOpen] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({ label: '', username: '' });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post(route('platform.sms-gateway.devices.store'), {
            onSuccess: () => {
                setCreateOpen(false);
                reset();
            },
        });
    }

    function revoke(device: DeviceRow) {
        if (!confirm(`Deactivate "${device.label}"? It will stop being able to claim or send messages.`)) {
            return;
        }
        router.patch(route('platform.sms-gateway.devices.revoke', device.id));
    }

    function resetPassword(device: DeviceRow) {
        if (!confirm(`Reset the password for "${device.label}"? Its current password will stop working immediately.`)) {
            return;
        }
        router.patch(route('platform.sms-gateway.devices.reset-password', device.id));
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

                <div className="pf-panel" style={{ marginBottom: 16 }}>
                    <div className="pf-panel-header">
                        <div>
                            <h2 className="pf-panel-title">Backlog</h2>
                            <p className="pf-panel-count">
                                {backlogIsHigh
                                    ? 'Oldest pending message is over 30 minutes old — check for offline devices below.'
                                    : 'Queue is draining normally.'}
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
                            <div className="pft-hero-title" style={{ fontSize: 24 }}>{backlog.pending}</div>
                        </div>
                        <div>
                            <div className="pf-panel-count">Claimed</div>
                            <div className="pft-hero-title" style={{ fontSize: 24 }}>{backlog.claimed}</div>
                        </div>
                        <div>
                            <div className="pf-panel-count">Failed (24h)</div>
                            <div className="pft-hero-title" style={{ fontSize: 24 }}>{backlog.failed_last_24h}</div>
                        </div>
                        <div>
                            <div className="pf-panel-count">Oldest pending</div>
                            <div className="pft-hero-title" style={{ fontSize: 24 }}>
                                {Math.round(backlog.oldest_pending_age_seconds / 60)}m
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
                                    <th scope="col">Sent today</th>
                                    <th scope="col">Delivered today</th>
                                    <th scope="col">Failed today</th>
                                    <th scope="col">
                                        <span className="sr-only">Actions</span>
                                    </th>
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
                                                ? new Date(device.last_seen_at).toLocaleString()
                                                : 'Never'}
                                        </td>
                                        <td>{device.sent_today}</td>
                                        <td>{device.delivered_today}</td>
                                        <td>{device.failed_today}</td>
                                        <td>
                                            {device.is_active && (
                                                <div className="pft-row-actions">
                                                    <button
                                                        type="button"
                                                        className="pf-row-action"
                                                        onClick={() => resetPassword(device)}
                                                    >
                                                        Reset Password
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="pf-row-action pf-row-action--danger"
                                                        onClick={() => revoke(device)}
                                                    >
                                                        Deactivate
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

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
        </PlatformLayout>
    );
}

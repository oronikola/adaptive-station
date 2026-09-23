import InputError from '@/Components/InputError';
import { BadgeAlertIcon } from '@/Components/icons/badge-alert';
import { CheckIcon } from '@/Components/icons/check';
import { ClockIcon } from '@/Components/icons/clock';
import { CopyIcon } from '@/Components/icons/copy';
import { LayoutGridIcon } from '@/Components/icons/layout-grid';
import { LockIcon } from '@/Components/icons/lock';
import { MenuIcon } from '@/Components/icons/menu';
import { PlusIcon } from '@/Components/icons/plus';
import { SmartphoneNfcIcon } from '@/Components/icons/smartphone-nfc';
import { XIcon } from '@/Components/icons/x';
import Modal, { ModalHero } from '@/Components/Modal';
import SecretOnceCallout from '@/Components/SecretOnceCallout';
import SmsDevicePhone from '@/Components/SmsDevicePhone';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { PageProps } from '@/types';
import '../../../../css/platform-dashboard.css';
import '../../../../css/platform-overview.css';

interface SimStat {
    sim_slot: number;
    sent_today: number;
    reserved_today: number;
    delivered_today: number;
    failed_today: number;
    cap_status: 'ok' | 'near' | 'at';
}

interface SimStatus {
    sim_slot: number;
    carrier: 'smart';
    status: 'has_load' | 'no_load' | 'unknown' | 'paused';
    balance_centavos: number | null;
    source: 'manual' | 'ussd';
    checked_at: string | null;
    last_error: string | null;
}

interface DeviceRow {
    id: string;
    label: string;
    username: string | null;
    is_active: boolean;
    last_seen_at: string | null;
    sent_today: number;
    reserved_today: number;
    delivered_today: number;
    failed_today: number;
    is_stale: boolean;
    // When the device's currently-active session logged in / was last used
    // — null once it's been logged out (or, before this device ever logged
    // in at all). Only ever one active session at a time: logging in again
    // revokes whatever session existed before (see SmsGatewayDeviceToken::
    // issueFor()'s docblock), so this is "who's holding this phone right
    // now," not a history of every login.
    session_signed_in_at: string | null;
    session_last_used_at: string | null;
    daily_send_cap: number;
    device_daily_send_cap: number;
    cap_status: 'ok' | 'near' | 'at';
    // Empty until this device's app build has reported at least one
    // sim_slot-tagged send — an older, not-yet-updated phone has none yet.
    sim_stats: SimStat[];
    sim_statuses: SimStatus[];
}

const CAP_STATUS_COLOR: Record<SimStat['cap_status'], string> = {
    ok: 'var(--as-brand-blue)',
    near: 'var(--as-warning, #c1791f)',
    at: 'var(--as-danger)',
};

// This palette is used by both the chart bars and the legend.
const FLEET_BAR_COLORS: Record<'pending' | 'delivered' | 'failed', string> = {
    pending: '#f38b22',
    delivered: '#229a5b',
    failed: '#d84a3f',
};

interface ChartTooltipEntry {
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
    payload?: ChartTooltipEntry[];
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

function timeAgo(value: string): string {
    const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
    if (seconds < 60) return 'just now';
    return `${formatAge(seconds)} ago`;
}

function simLoadLabel(status: SimStatus | undefined): string {
    if (!status) return 'Not reported';
    if (status.status === 'has_load') return status.balance_centavos === null ? 'Has load' : `₱${(status.balance_centavos / 100).toFixed(2)}`;
    if (status.status === 'no_load') return 'No load';
    if (status.status === 'paused') return 'Paused';

    return 'Unknown';
}

function simLoadTone(status: SimStatus): string {
    if (status.status === 'no_load' || status.status === 'paused') return 'pf-pill--inactive';

    return 'pf-pill--inactive';
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
    const [usernameCopied, setUsernameCopied] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [revokingDevice, setRevokingDevice] = useState<DeviceRow | null>(null);
    const [resettingDevice, setResettingDevice] = useState<DeviceRow | null>(null);
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

    function copyUsername() {
        const value = flash?.deviceUsername;
        if (!value) {
            return;
        }

        try {
            if (navigator?.clipboard?.writeText) {
                navigator.clipboard.writeText(value);
            } else {
                const textArea = document.createElement('textarea');
                textArea.value = value;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }
            setUsernameCopied(true);
            setTimeout(() => setUsernameCopied(false), 2500);
        } catch {
            // Clipboard unavailable — username remains visible to copy manually.
        }
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
    const deliveredToday = devices.reduce((sum, d) => sum + d.delivered_today, 0);
    const failedToday = devices.reduce((sum, d) => sum + d.failed_today, 0);

    return (
        <PlatformLayout>
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
                                <PlusIcon size={16} />
                                Add Device
                            </button>
                        </div>
                    )}
                </div>

                {flash?.devicePassword && (
                    <div className="pf-panel pf-credential-notice">
                        <div className="pf-credential-notice-inner">
                            <span className="pf-modal-hero-icon pf-modal-hero-icon--green" aria-hidden="true">
                                <SmartphoneNfcIcon size={20} />
                            </span>
                            <div className="pf-credential-notice-copy">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="pf-panel-title">New device credentials</h2>
                                    <span className="pf-credential-once">
                                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" aria-hidden="true" />
                                        Shown once
                                    </span>
                                </div>
                                <p className="pf-field-hint" style={{ margin: '4px 0 0' }}>
                                    Log into the app on the phone with these credentials — the password is only shown once in the pop-up.
                                </p>

                                <div className="pf-credential-fields">
                                    <div className="pf-credential-field">
                                        <span className="pf-credential-field-label">Username</span>
                                        <span className="pf-credential-field-value font-mono">{flash.deviceUsername}</span>
                                        <button
                                            type="button"
                                            className="pf-row-action pf-row-action--control"
                                            onClick={copyUsername}
                                            aria-label="Copy username"
                                        >
                                            {usernameCopied ? <CheckIcon size={15} aria-hidden="true" /> : <CopyIcon size={15} aria-hidden="true" />}
                                            {usernameCopied ? 'Copied' : 'Copy'}
                                        </button>
                                    </div>
                                    <div className="pf-credential-field">
                                        <span className="pf-credential-field-label">Password</span>
                                        <span className="pf-credential-field-value font-mono">{'••••••••••'}</span>
                                        <span className="pf-credential-field-note">In pop-up</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <SecretOnceCallout label="Password" value={flash.devicePassword} />
                    </div>
                )}

                {backlogIsHigh && (
                    <div className="pf-notice pf-notice-banner" role="alert">
                        <BadgeAlertIcon size={20} aria-hidden="true" />
                        <div>
                            <strong>Queue backlogged</strong>
                            <span>
                                Oldest pending message is{' '}
                                <strong>{formatAge(backlog.oldest_pending_age_seconds)}</strong> old.
                                Check for offline devices in the fleet below.
                            </span>
                        </div>
                    </div>
                )}

                <div className="pf-panel">
                    <div className="pf-panel-header">
                        <div>
                            <h2 className="pf-panel-title">Delivery analytics</h2>
                            <p className="pf-panel-count">
                                {onlineCount}/{devices.length} phones online · message volume today
                                {backlogIsHigh && ` · oldest pending ${formatAge(backlog.oldest_pending_age_seconds)}`}
                            </p>
                        </div>
                    </div>
                    <div className="pf-chart-legend">
                        {(['pending', 'delivered', 'failed'] as const).map((status) => (
                            <span key={status} className="pf-chart-legend-item">
                                <span
                                    className="pf-chart-legend-dot"
                                    style={{ background: FLEET_BAR_COLORS[status] }}
                                />
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                            </span>
                        ))}
                    </div>
                    {backlog.pending === 0 && deliveredToday === 0 && failedToday === 0 ? (
                        <p className="pf-empty pft-panel-empty">
                            No SMS activity yet today — bars appear once fleet phones start claiming and sending tap alerts.
                        </p>
                    ) : (
                        <div className="pf-chart-body">
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart
                                    data={[
                                        { name: 'Pending', value: backlog.pending, status: 'pending' },
                                        { name: 'Delivered', value: deliveredToday, status: 'delivered' },
                                        { name: 'Failed', value: failedToday, status: 'failed' },
                                    ]}
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
                                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--as-surface-active)' }} />
                                    <Bar dataKey="value" name="Messages" maxBarSize={64} radius={[8, 8, 2, 2]}>
                                        {(['pending', 'delivered', 'failed'] as const).map((status) => (
                                            <Cell key={status} fill={FLEET_BAR_COLORS[status]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                <div className="pf-panel">
                    <div className="pf-panel-header">
                        <div>
                            <h2 className="pf-panel-title">Devices</h2>
                            <p className="pf-panel-count">
                                {devices.length} in the fleet ·{' '}
                                <span className="pf-panel-count-accent">{onlineCount} online</span>
                            </p>
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
                                <p>Add a dual-SIM phone to start claiming and sending parent tap alerts.</p>
                            </div>
                            {canManage && (
                                <button type="button" className="pf-btn pf-btn-primary" onClick={() => setCreateOpen(true)}>
                                    <PlusIcon size={16} />
                                    Add Device
                                </button>
                            )}
                        </div>
                    ) : viewMode === 'gallery' ? (
                        <div className="sms-device-gallery">
                            {devices.map((device) => (
                                <SmsDevicePhone
                                    key={device.id}
                                    device={device}
                                    canManage={canManage}
                                    hasNewPassword={Boolean(
                                        flash?.deviceUsername &&
                                            flash.deviceUsername === device.username &&
                                            flash?.devicePassword,
                                    )}
                                    newPassword={flash?.devicePassword}
                                    onReset={() => setResettingDevice(device)}
                                    onDeactivate={() => setRevokingDevice(device)}
                                />
                            ))}
                        </div>
                    ) : (
                    <div className="pf-table-wrap pft-fleet-table-wrap">
                        <table className="pf-table pft-fleet-table">
                            <thead>
                                <tr>
                                    <th scope="col">Device</th>
                                    <th scope="col">Status</th>
                                    <th scope="col">Last seen</th>
                                    <th scope="col">Today</th>
                                    <th scope="col">Failed</th>
                                    <th scope="col">
                                        <span className="sr-only">Actions</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {devices.map((device) => {
                                    const capPct = Math.min(100, Math.round(((device.sent_today + device.reserved_today) / device.device_daily_send_cap) * 100));
                                    return (
                                    <tr key={device.id}>
                                        <td>
                                            <div className="pft-device-cell">
                                                <span className="pft-device-avatar">
                                                    <SmartphoneNfcIcon size={16} />
                                                </span>
                                                <div className="pft-device-info">
                                                    <p className="pft-device-label">{device.label}</p>
                                                    <p className="pft-device-username font-mono">{device.username ?? '—'}</p>
                                                    <p className="pft-device-username">
                                                        {device.session_signed_in_at
                                                            ? `Signed in ${timeAgo(device.session_signed_in_at)}`
                                                            : 'No active session'}
                                                    </p>
                                                    {device.reserved_today > 0 && (
                                                        <p className="pft-device-username">
                                                            {device.reserved_today} SMS reserved for in-progress sends
                                                        </p>
                                                    )}
                                                    {device.sim_stats.length > 0 && (
                                                        <div className="pft-sim-badges">
                                                            {device.sim_stats.map((sim) => (
                                                                <span key={sim.sim_slot} className="pft-sim-badge">
                                                                    SIM {sim.sim_slot + 1} · {sim.sent_today}/{device.daily_send_cap}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                    <div className="pft-sim-badges">
                                                        {[0, 1].map((slot) => {
                                                            const sim = device.sim_statuses.find((status) => status.sim_slot === slot);

                                                            if (!sim || sim.status === 'unknown' || sim.status === 'has_load') {
                                                                return null;
                                                            }

                                                            return (
                                                                <span key={slot} className={`pf-pill ${simLoadTone(sim)} `}>
                                                                    SIM {slot + 1} · {simLoadLabel(sim)}
                                                                </span>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            {!device.is_stale && !device.is_active && (
                                                <span
                                                    className="pf-pill pf-pill--inactive"
                                                >
                                                    Deactivated
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            <span
                                                className={`pft-fleet-metric pft-fleet-metric--seen ${device.is_stale ? 'pft-fleet-metric--stale' : ''}`}
                                            >
                                                <ClockIcon size={13} aria-hidden="true" />
                                                {device.last_seen_at
                                                    ? formatDateTime(device.last_seen_at)
                                                    : 'Never seen'}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`pft-fleet-metric pft-fleet-metric--today pft-fleet-metric--cap-${device.cap_status}`}>
                                                <CheckIcon size={13} aria-hidden="true" />
                                                <span className="pft-fleet-metric-value">
                                                    {device.sent_today}
                                                    <span> / {device.device_daily_send_cap}</span>
                                                </span>
                                                <span className="pft-fleet-cap-track" aria-hidden="true">
                                                    <span
                                                        className="pft-fleet-cap-fill"
                                                        style={{ width: `${capPct}%`, background: CAP_STATUS_COLOR[device.cap_status] }}
                                                    />
                                                </span>
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`pft-fleet-metric pft-fleet-metric--failed ${device.failed_today > 0 ? 'pft-fleet-metric--has-failures' : ''}`}>
                                                <BadgeAlertIcon size={13} aria-hidden="true" />
                                                <span className="pft-fleet-metric-value">{device.failed_today}</span>
                                            </span>
                                        </td>
                                        <td>
                                            {canManage && device.is_active && (
                                                <div className="pft-row-actions">
                                                    <button
                                                        type="button"
                                                        className="pf-row-action pf-row-action--control"
                                                        onClick={() => setResettingDevice(device)}
                                                    >
                                                        <LockIcon size={15} aria-hidden="true" />
                                                        Reset password
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="pf-row-action pf-row-action--control pf-row-action--danger"
                                                        onClick={() => setRevokingDevice(device)}
                                                    >
                                                        <XIcon size={15} aria-hidden="true" />
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
                    )}
                </div>
            </div>

            {/* Add Device modal */}
            <Modal show={createOpen} onClose={() => setCreateOpen(false)}>
                <form onSubmit={submit} className="pf-modal">
                    <ModalHero
                        tone="violet"
                        title="Add Device"
                        subtitle="Log into the app on the phone with this username and the password shown next — the password is shown only once."
                        onClose={() => setCreateOpen(false)}
                    >
                        <SmartphoneNfcIcon size={22} />
                    </ModalHero>

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
                    <ModalHero
                        tone="red"
                        title="Deactivate Device"
                        subtitle="It immediately stops claiming messages and can no longer send SMS."
                        onClose={() => setRevokingDevice(null)}
                    >
                        <XIcon size={22} />
                    </ModalHero>

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
                    <ModalHero
                        tone="amber"
                        title="Reset Device Password"
                        subtitle="The current password stops working immediately. Sign into the app again with the new credentials."
                        onClose={() => setResettingDevice(null)}
                    >
                        <LockIcon size={22} />
                    </ModalHero>

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

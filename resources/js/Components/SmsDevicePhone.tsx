import { LockIcon } from '@/Components/icons/lock';
import { XIcon } from '@/Components/icons/x';

function timeAgo(value: string): string {
    const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
    if (seconds < 60) return 'just now';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h === 0) return `${m}m ago`;
    if (m === 0) return `${h}h ago`;
    return `${h}h ${m}m ago`;
}

interface SimStat {
    sim_slot: number;
    sent_today: number;
    reserved_today: number;
    delivered_today: number;
    failed_today: number;
    cap_status: 'ok' | 'near' | 'at';
}

export interface SmsDevicePhoneDevice {
    id: string;
    label: string;
    username: string | null;
    is_active: boolean;
    last_seen_at: string | null;
    // Which phone currently holds this device's identity, and since when —
    // see SmsGatewayDeviceToken::issueFor()'s docblock: only one session is
    // ever active at a time, so this is "who's logged in right now," not a
    // login history.
    session_signed_in_at: string | null;
    sent_today: number;
    reserved_today: number;
    delivered_today: number;
    failed_today: number;
    is_stale: boolean;
    daily_send_cap: number;
    device_daily_send_cap: number;
    cap_status: 'ok' | 'near' | 'at';
    sim_stats: SimStat[];
}

function deviceStatus(device: SmsDevicePhoneDevice): 'online' | 'offline' | 'deactivated' {
    if (!device.is_active) {
        return 'deactivated';
    }

    return device.is_stale ? 'offline' : 'online';
}

function statusLabel(status: ReturnType<typeof deviceStatus>): string {
    if (status === 'deactivated') {
        return 'Deactivated';
    }

    return status === 'offline' ? 'Offline' : 'Online';
}

export default function SmsDevicePhone({
    device,
    canManage = false,
    hasNewPassword = false,
    newPassword,
    onReset,
    onDeactivate,
}: {
    device: SmsDevicePhoneDevice;
    canManage?: boolean;
    hasNewPassword?: boolean;
    newPassword?: string;
    onReset?: () => void;
    onDeactivate?: () => void;
}) {
    const status = deviceStatus(device);
    const sims = [0, 1].map(
        (slot) => device.sim_stats.find((sim) => sim.sim_slot === slot) ?? null,
    );
    const capPct = Math.min(
        100,
        Math.round((device.sent_today / Math.max(1, device.device_daily_send_cap)) * 100),
    );

    return (
        <article className={`sms-phone-card sms-phone-card--${status}`}>
            <div className="sms-phone" aria-hidden="true">
                <div className="sms-phone-island" />
                <div className="sms-phone-screen">
                    <div className="sms-phone-status-bar">
                        <span>Gateway</span>
                        <span className={`sms-phone-signal sms-phone-signal--${status}`}>
                            {status === 'online' ? 'LTE' : status === 'offline' ? 'No service' : 'Off'}
                        </span>
                    </div>
                    <p className="sms-phone-app">SMS Gateway</p>
                    <h3 className="sms-phone-name">{device.label}</h3>
                    <p className="sms-phone-user font-mono">{device.username ?? 'unassigned'}</p>
                    <p className="sms-phone-user" style={{ opacity: 0.75 }}>
                        {device.session_signed_in_at ? `Signed in ${timeAgo(device.session_signed_in_at)}` : 'No active session'}
                    </p>
                    <span className={`sms-phone-chip sms-phone-chip--${status}`}>
                        {statusLabel(status)}
                    </span>

                    <div className="sms-phone-sims">
                        {sims.map((sim, index) => {
                            const sent = sim?.sent_today ?? 0;
                            const reserved = sim?.reserved_today ?? 0;
                            const used = sent + reserved;
                            const pct = sim
                                ? Math.min(100, Math.round((used / Math.max(1, device.daily_send_cap)) * 100))
                                : 0;

                            return (
                                <div key={index} className="sms-phone-sim">
                                    <div className="sms-phone-sim-row">
                                        <span>SIM {index + 1}</span>
                                        <span className="font-mono">
                                            {sim ? `${sent}/${device.daily_send_cap}` : '—'}
                                        </span>
                                    </div>
                                    <div className="sms-phone-sim-bar">
                                        <span style={{ width: `${pct}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="sms-phone-metrics">
                        <div>
                            <strong className="font-mono">{device.sent_today}</strong>
                            <span>Sent</span>
                        </div>
                        <div>
                            <strong className="font-mono">{device.reserved_today}</strong>
                            <span>Reserved</span>
                        </div>
                        <div>
                            <strong className="font-mono">{device.delivered_today}</strong>
                            <span>Delivered</span>
                        </div>
                        <div>
                            <strong className="font-mono">{device.failed_today}</strong>
                            <span>Failed</span>
                        </div>
                    </div>
                </div>
                <div className="sms-phone-home" />
            </div>

            <div className="sms-phone-meta">
                <p className="sms-phone-cap font-mono">
                    Today {device.sent_today}/{device.device_daily_send_cap}
                    <span className="sms-phone-cap-bar">
                        <span style={{ width: `${capPct}%` }} />
                    </span>
                </p>
                {hasNewPassword && newPassword && (
                    <p className="sms-phone-secret font-mono">{newPassword}</p>
                )}
                {canManage && device.is_active && (
                    <div className="pft-row-actions">
                        <button type="button" className="pf-row-action pf-row-action--control" onClick={onReset}>
                            <LockIcon size={15} aria-hidden="true" />
                            Reset password
                        </button>
                        <button
                            type="button"
                            className="pf-row-action pf-row-action--control pf-row-action--danger"
                            onClick={onDeactivate}
                        >
                            <XIcon size={15} aria-hidden="true" />
                            Deactivate
                        </button>
                    </div>
                )}
            </div>
        </article>
    );
}

import Modal from '@/Components/Modal';
import SecretOnceCallout from '@/Components/SecretOnceCallout';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import type { Station, StationCredential } from '@/types';
import '../../../../css/platform-dashboard.css';
import '../../../../css/platform-overview.css';

const STATUS_LABELS: Record<string, string> = {
    pending_activation: 'Pending Activation',
    active: 'Active',
    disabled: 'Disabled',
    retired: 'Retired',
};

const STATUS_PILL_CLASS: Record<string, string> = {
    active: 'pf-pill--active',
    pending_activation: 'pf-pill--suspended',
    disabled: 'pf-pill--archived',
    retired: 'pf-pill--archived',
};

// last_used_at is a full UTC timestamp — displayed in GMT+8 (Asia/Manila, no
// DST) since that's the timezone every tenant in this system runs on today.
function formatDateTime(value: string): string {
    return new Date(value).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Manila',
    });
}

export default function StationDetailScreen({
    station,
    credentials,
    hasPairingLink,
}: {
    station: Station;
    credentials: StationCredential[];
    hasPairingLink: boolean;
}) {
    const { props } = usePage<import('@/types').PageProps>();
    const flash = props.flash;

    const [configValue, setConfigValue] = useState(JSON.stringify(station.configuration ?? {}, null, 2));
    const [configError, setConfigError] = useState<string | null>(null);
    const [configProcessing, setConfigProcessing] = useState(false);

    function submitConfiguration(e: React.FormEvent) {
        e.preventDefault();
        setConfigError(null);

        let parsed: Record<string, unknown>;
        try {
            parsed = JSON.parse(configValue || '{}');
        } catch {
            setConfigError('Must be valid JSON.');
            return;
        }

        setConfigProcessing(true);
        router.patch(
            route('portal.stations.configuration', station.station_code),
            { configuration: parsed as unknown as string },
            { onFinish: () => setConfigProcessing(false) },
        );
    }

    const [revokingCredential, setRevokingCredential] = useState<StationCredential | null>(null);
    const [isRevoking, setIsRevoking] = useState(false);

    function submitRevokeCredential() {
        if (!revokingCredential) { return; }
        setIsRevoking(true);
        router.patch(
            route('portal.stations.credentials.revoke', [station.station_code, revokingCredential.id] as unknown as Record<string, unknown>),
            {},
            {
                preserveScroll: true,
                onFinish: () => {
                    setIsRevoking(false);
                    setRevokingCredential(null);
                },
            },
        );
    }

    const [isResettingLink, setIsResettingLink] = useState(false);

    function resetLink() {
        setIsResettingLink(true);
        router.post(route('portal.stations.pairing-link', station.station_code), {}, {
            onFinish: () => setIsResettingLink(false),
        });
    }

    return (
        <AdminLayout>
            <Head title={station.name} />

            <div className="pf-dashboard pft-page">
                <Link href={route('portal.stations.index')} className="pft-panel-link" style={{ marginBottom: 14 }}>
                    <svg viewBox="0 0 24 24">
                        <path d="m15 6-6 6 6 6" />
                    </svg>
                    Back to Stations
                </Link>

                <div className="pft-hero">
                    <div className="pft-hero-main">
                        <span className="pft-hero-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24">
                                <rect x="4" y="5" width="16" height="10" rx="1.6" />
                                <rect x="9.5" y="17" width="5" height="2" rx="1" />
                                <rect x="7" y="19.4" width="10" height="1.6" rx="0.8" />
                            </svg>
                        </span>
                        <div>
                            <h1 className="pft-hero-title">{station.name}</h1>
                            <p className="pft-hero-subtitle">
                                <span className="font-mono">{station.station_code}</span>
                            </p>
                        </div>
                    </div>
                    <div className="pft-hero-actions">
                        <span
                            className={
                                'pf-pill ' + (STATUS_PILL_CLASS[station.status] ?? 'pf-pill--inactive')
                            }
                        >
                            {STATUS_LABELS[station.status] ?? station.status}
                        </span>
                        <button
                            type="button"
                            className={'pf-btn pf-btn-primary' + (isResettingLink ? ' pf-btn--loading' : '')}
                            onClick={resetLink}
                            disabled={isResettingLink}
                        >
                            {hasPairingLink ? 'Reset Link' : 'Create Link'}
                        </button>
                    </div>
                </div>

                <SecretOnceCallout label="Station link" value={flash?.pairingLink} />

                <div className="pf-panel" style={{ marginBottom: 16 }}>
                    <div className="pf-panel-header">
                        <div>
                            <h2 className="pf-panel-title">Configuration</h2>
                            <p className="pf-panel-count">
                                Raw JSON delivered to the kiosk's display/operational
                                configuration on its next sync.
                            </p>
                        </div>
                    </div>

                    <form onSubmit={submitConfiguration} style={{ padding: '20px 24px 24px' }}>
                        <div className="pf-field">
                            <label htmlFor="configuration">Configuration (JSON)</label>
                            <textarea
                                id="configuration"
                                rows={8}
                                value={configValue}
                                onChange={(e) => setConfigValue(e.target.value)}
                                className="font-mono"
                                style={{
                                    width: '100%',
                                    padding: '12px 14px',
                                    border: '1px solid var(--as-border)',
                                    borderRadius: 12,
                                    fontSize: 12.5,
                                    lineHeight: 1.6,
                                    color: 'var(--as-brand-dark)',
                                }}
                            />
                            {configError && (
                                <p style={{ color: '#dc2626', fontSize: 13, marginTop: 8 }}>{configError}</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            className={'pf-btn pf-btn-primary' + (configProcessing ? ' pf-btn--loading' : '')}
                            disabled={configProcessing}
                        >
                            Save Configuration
                        </button>
                    </form>
                </div>

                <div className="pf-panel">
                    <div className="pf-panel-header">
                        <div>
                            <h2 className="pf-panel-title">Paired Devices</h2>
                            <p className="pf-panel-count">
                                {credentials.length} device{credentials.length === 1 ? '' : 's'} paired to this station via its link
                            </p>
                        </div>
                    </div>

                    <div className="pf-table-wrap">
                        <table className="pf-table">
                            <thead>
                                <tr>
                                    <th scope="col">Label</th>
                                    <th scope="col">Last Used</th>
                                    <th scope="col">Status</th>
                                    <th scope="col">
                                        <span className="sr-only">Actions</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {credentials.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="pf-empty">
                                            No device has paired yet.
                                        </td>
                                    </tr>
                                )}

                                {credentials.map((credential: StationCredential) => (
                                    <tr key={credential.id}>
                                        <td className="pf-tenant-name">{credential.label ?? '—'}</td>
                                        <td>
                                            {credential.last_used_at
                                                ? formatDateTime(credential.last_used_at)
                                                : 'Never'}
                                        </td>
                                        <td>
                                            <span
                                                className={
                                                    'pf-pill ' +
                                                    (credential.revoked_at ? 'pf-pill--archived' : 'pf-pill--active')
                                                }
                                            >
                                                {credential.revoked_at ? 'Revoked' : 'Active'}
                                            </span>
                                        </td>
                                        <td>
                                            {!credential.revoked_at && (
                                                <div className="pft-row-actions">
                                                    <button
                                                        type="button"
                                                        className="pf-row-action pf-row-action--danger"
                                                        onClick={() => setRevokingCredential(credential)}
                                                    >
                                                        <svg viewBox="0 0 24 24">
                                                            <path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m-7 0v12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V7" />
                                                        </svg>
                                                        Revoke
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

            <Modal show={revokingCredential !== null} onClose={() => setRevokingCredential(null)}>
                <div className="pf-modal">
                    <div className="pf-modal-header">
                        <h2 className="pf-modal-title">Revoke this device?</h2>
                        <p className="pf-modal-desc">
                            <strong>{revokingCredential?.label ?? 'Untitled'}</strong> — this device will lose access immediately. It can re-pair using the station link again.
                        </p>
                    </div>
                    <div className="pf-modal-footer">
                        <button
                            type="button"
                            className="pf-btn pf-btn-secondary"
                            onClick={() => setRevokingCredential(null)}
                            disabled={isRevoking}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className={'pf-btn pf-btn-danger' + (isRevoking ? ' pf-btn--loading' : '')}
                            onClick={submitRevokeCredential}
                            disabled={isRevoking}
                        >
                            Revoke
                        </button>
                    </div>
                </div>
            </Modal>
        </AdminLayout>
    );
}

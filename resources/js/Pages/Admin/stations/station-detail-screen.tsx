import InputError from '@/Components/InputError';
import Modal from '@/Components/Modal';
import SecretOnceCallout from '@/Components/SecretOnceCallout';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
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
    pending_activation: 'pft-pill--suspended',
    disabled: 'pft-pill--archived',
    retired: 'pft-pill--archived',
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

export default function StationDetailScreen({ station, credentials }: { station: Station; credentials: StationCredential[] }) {
    const { props } = usePage<import('@/types').PageProps>();
    const flash = props.flash;

    const configForm = useForm({
        configuration: JSON.stringify(station.configuration ?? {}, null, 2),
    });
    const [configError, setConfigError] = useState<string | null>(null);

    function submitConfiguration(e: React.FormEvent) {
        e.preventDefault();
        setConfigError(null);

        let parsed: Record<string, unknown>;
        try {
            parsed = JSON.parse(configForm.data.configuration || '{}');
        } catch {
            setConfigError('Must be valid JSON.');
            return;
        }

        router.patch(route('portal.stations.configuration', station.id), {
            configuration: parsed as unknown as string,
        });
    }

    const [issueCredentialOpen, setIssueCredentialOpen] = useState(false);
    const credentialForm = useForm({ label: '' });

    function submitIssueCredential(e: React.FormEvent) {
        e.preventDefault();
        credentialForm.post(route('portal.stations.credentials.store', station.id), {
            onSuccess: () => {
                setIssueCredentialOpen(false);
                credentialForm.reset();
            },
        });
    }

    function revokeCredential(credential: StationCredential) {
        if (!confirm(`Revoke credential "${credential.label ?? 'Untitled'}"? The kiosk using it will lose access immediately.`)) {
            return;
        }
        router.patch(route('portal.stations.credentials.revoke', [station.id, credential.id] as unknown as Record<string, unknown>), {}, { preserveScroll: true });
    }

    function issueActivationCode() {
        router.post(route('portal.stations.activation-code', station.id));
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
                        {station.status === 'pending_activation' && (
                            <button type="button" className="pf-btn pf-btn-primary" onClick={issueActivationCode}>
                                Issue Activation Code
                            </button>
                        )}
                    </div>
                </div>

                <SecretOnceCallout label="Device credential token" value={flash?.deviceToken} />
                <SecretOnceCallout label="Activation code" value={flash?.activationCode} />

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
                                value={configForm.data.configuration}
                                onChange={(e) => configForm.setData('configuration', e.target.value)}
                                className="font-mono"
                                style={{
                                    width: '100%',
                                    padding: '12px 14px',
                                    border: '1px solid #d7dde7',
                                    borderRadius: 12,
                                    fontSize: 12.5,
                                    lineHeight: 1.6,
                                    color: '#162033',
                                }}
                            />
                            <InputError message={configError ?? configForm.errors.configuration} className="mt-2" />
                        </div>

                        <button type="submit" className="pf-btn pf-btn-primary" disabled={configForm.processing}>
                            Save Configuration
                        </button>
                    </form>
                </div>

                <div className="pf-panel">
                    <div className="pf-panel-header">
                        <div>
                            <h2 className="pf-panel-title">Device Credentials</h2>
                            <p className="pf-panel-count">
                                {credentials.length} credential{credentials.length === 1 ? '' : 's'}
                            </p>
                        </div>
                        <button
                            type="button"
                            className="pf-btn pf-btn-primary"
                            onClick={() => setIssueCredentialOpen(true)}
                        >
                            <svg viewBox="0 0 24 24">
                                <path d="M12 5v14M5 12h14" />
                            </svg>
                            Issue New Credential
                        </button>
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
                                            No credentials issued yet.
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
                                                    (credential.revoked_at ? 'pft-pill--archived' : 'pf-pill--active')
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
                                                        onClick={() => revokeCredential(credential)}
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

            <Modal
                show={issueCredentialOpen}
                onClose={() => {
                    setIssueCredentialOpen(false);
                    credentialForm.reset();
                }}
            >
                <form onSubmit={submitIssueCredential} className="pf-modal">
                    <div className="pf-modal-header">
                        <div>
                            <h3 className="pf-modal-title">Issue New Credential</h3>
                            <p className="pf-field-hint">
                                The device token is shown only once — enter it into
                                the kiosk's configuration immediately.
                            </p>
                        </div>
                        <button
                            type="button"
                            className="pf-modal-close"
                            onClick={() => {
                                setIssueCredentialOpen(false);
                                credentialForm.reset();
                            }}
                            aria-label="Close"
                        >
                            <svg viewBox="0 0 24 24">
                                <path d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="pf-field">
                        <label htmlFor="label">Label (optional)</label>
                        <input
                            id="label"
                            type="text"
                            value={credentialForm.data.label}
                            onChange={(e) => credentialForm.setData('label', e.target.value)}
                            autoFocus
                        />
                        <InputError message={credentialForm.errors.label} className="mt-2" />
                    </div>

                    <div className="pf-modal-footer">
                        <button
                            type="button"
                            className="pf-btn pf-btn-secondary"
                            onClick={() => {
                                setIssueCredentialOpen(false);
                                credentialForm.reset();
                            }}
                        >
                            Cancel
                        </button>
                        <button type="submit" className="pf-btn pf-btn-primary" disabled={credentialForm.processing}>
                            Issue
                        </button>
                    </div>
                </form>
            </Modal>
        </AdminLayout>
    );
}

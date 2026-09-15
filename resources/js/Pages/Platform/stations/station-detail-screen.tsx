import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import SecretOnceCallout from '@/Components/SecretOnceCallout';
import StationViewDropdown, { StationOption } from '@/Components/StationViewDropdown';
import TextInput from '@/Components/TextInput';
import StatusBadge from '@/Components/admin/StatusBadge';
import Table from '@/Components/admin/Table';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { StationCredential, Tenant } from '@/types';
import '../../../../css/platform-dashboard.css';

interface StationDetail {
    id: number | string;
    tenant_id: number | string;
    name: string;
    station_code: string;
    status: string;
    app_version?: string | null;
    configuration?: Record<string, unknown> | null;
    last_pending_count?: number | null;
    last_seen_at?: string | null;
    last_scan_at?: string | null;
    is_online?: boolean;
}

interface SchoolStationOption {
    id: string;
    name: string;
    station_code: string;
    status: string;
    tenant_id: number | string;
    tenant_name: string;
}

interface StationDetailScreenProps {
    station: StationDetail;
    tenant: Tenant;
    tenants: Tenant[];
    schoolStations: SchoolStationOption[];
    credentials: StationCredential[];
}

interface PagePropsWithFlash {
    flash?: {
        deviceToken?: string;
        activationCode?: string;
    };
}

const statusLabels: Record<string, string> = {
    pending_activation: 'Pending Activation',
    active: 'Active',
    disabled: 'Disabled',
    retired: 'Retired',
};

export default function StationDetailScreen({
    station,
    tenant,
    tenants,
    schoolStations,
    credentials,
}: StationDetailScreenProps) {
    const { flash } = usePage().props as PagePropsWithFlash;

    const [issueCredentialOpen, setIssueCredentialOpen] = useState(false);
    const credentialForm = useForm({ label: '' });

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
            setConfigError('Configuration must be valid JSON.');
            return;
        }

        router.patch(route('platform.stations.configuration', station.id), {
            tenant_id: tenant.id,
            configuration: parsed as unknown as string,
        });
    }

    function submitIssueCredential(e: React.FormEvent) {
        e.preventDefault();
        credentialForm.post(route('platform.stations.credentials.store', station.id), {
            data: {
                tenant_id: tenant.id,
                label: credentialForm.data.label,
            },
            onSuccess: () => {
                setIssueCredentialOpen(false);
                credentialForm.reset();
            },
        });
    }

    function revokeCredential(credentialId: number) {
        if (confirm('Revoke this credential? The kiosk using it will lose access immediately.')) {
            router.patch(
                route('platform.stations.credentials.revoke', {
                    station: station.id,
                    credential: credentialId,
                }),
                {
                    tenant_id: tenant.id,
                }
            );
        }
    }

    function issueActivationCode() {
        router.post(route('platform.stations.activation-code', station.id), {
            tenant_id: tenant.id,
            redirect_to: 'show',
        });
    }

    function handleSchoolSwitch(newTenantId: string) {
        if (!newTenantId) {
            router.visit(route('platform.stations.index'));
            return;
        }
        router.visit(route('platform.stations.index', { tenant_id: newTenantId }));
    }

    const stationOptions: StationOption[] = useMemo(() => {
        return schoolStations.map((stn) => ({
            value: String(stn.id),
            label: `${stn.name} (${stn.station_code})`,
            tenant_id: stn.tenant_id,
            tenant_name: stn.tenant_name,
            status: stn.status,
        }));
    }, [schoolStations]);

    return (
        <PlatformLayout>
            <Head title={`${station.name} — Station Details`} />

            <div className="pf-dashboard max-w-5xl mx-auto">
                {/* Back link & Switcher bar */}
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                    <Link
                        href={route('platform.stations.index', { tenant_id: tenant.id })}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                        Back to Stations
                    </Link>

                    {/* Unified School & Station View Switcher */}
                    <div className="w-full sm:w-auto">
                        <StationViewDropdown
                            tenants={tenants}
                            currentTenantId={String(tenant.id)}
                            currentStationId={String(station.id)}
                            allStationOptions={stationOptions}
                            onSchoolChange={handleSchoolSwitch}
                            onStatusChange={(status) => {
                                router.visit(
                                    route('platform.stations.index', {
                                        tenant_id: tenant.id,
                                        status: status !== 'all' ? status : undefined,
                                    })
                                );
                            }}
                            onStationSelect={(stnId, tenantId) => {
                                if (stnId === String(station.id)) {
                                    return;
                                }
                                router.visit(
                                    route('platform.stations.show', {
                                        station: stnId,
                                        tenant_id: tenantId,
                                    })
                                );
                            }}
                        />
                    </div>
                </div>

                {/* Hero Header */}
                <div className="pf-dashboard-header">
                    <div>
                        <div className="pf-dashboard-kicker">Station Overview</div>
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="pf-dashboard-title">{station.name}</h1>
                            <span className="font-mono text-xs px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md border border-slate-200 dark:border-slate-700">
                                {station.station_code}
                            </span>
                            <StatusBadge
                                color={
                                    station.status === 'active'
                                        ? 'green'
                                        : station.status === 'disabled' || station.status === 'retired'
                                          ? 'red'
                                          : 'yellow'
                                }
                            >
                                {statusLabels[station.status] ?? station.status}
                            </StatusBadge>
                            {station.status === 'active' && (
                                <StatusBadge color={station.is_online ? 'green' : 'gray'}>
                                    {station.is_online ? 'Online' : 'Offline'}
                                </StatusBadge>
                            )}
                        </div>
                        <p className="pf-dashboard-subtitle mt-2">
                            Assigned to School:{' '}
                            <Link
                                href={route('platform.tenants.show', tenant.id)}
                                className="font-semibold text-indigo-600 hover:underline"
                            >
                                {tenant.name}
                            </Link>{' '}
                            ({tenant.code})
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {station.status === 'pending_activation' && (
                            <button
                                type="button"
                                onClick={issueActivationCode}
                                className="pf-btn pf-btn-primary"
                            >
                                <svg viewBox="0 0 24 24">
                                    <path d="M12 5v14M5 12h14" />
                                </svg>
                                Issue Activation Code
                            </button>
                        )}
                    </div>
                </div>

                <SecretOnceCallout label="Device credential token" value={flash?.deviceToken} />
                <SecretOnceCallout label="Activation code" value={flash?.activationCode} />

                {/* Telemetry and Station Stats Grid */}
                <div className="pf-stat-grid">
                    <div className="pf-stat-card">
                        <span className="pf-stat-icon pf-stat-icon--blue" aria-hidden="true">
                            <svg viewBox="0 0 24 24">
                                <rect x="4" y="5" width="16" height="13" rx="2" />
                                <path d="M8 21h8M9 9h6M9 13h4" />
                            </svg>
                        </span>
                        <div>
                            <p className="pf-stat-label">Connectivity</p>
                            <p className="pf-stat-value text-lg">
                                {station.status === 'active' ? (station.is_online ? 'Online' : 'Offline') : 'Inactive'}
                            </p>
                            <p className="pf-stat-hint">Threshold: 5 min</p>
                        </div>
                    </div>

                    <div className="pf-stat-card">
                        <span className="pf-stat-icon pf-stat-icon--violet" aria-hidden="true">
                            <svg viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M12 6v6l4 2" />
                            </svg>
                        </span>
                        <div>
                            <p className="pf-stat-label">Last Seen</p>
                            <p className="pf-stat-value text-sm font-semibold">
                                {station.last_seen_at ? new Date(station.last_seen_at).toLocaleTimeString() : 'Never'}
                            </p>
                            <p className="pf-stat-hint">
                                {station.last_seen_at ? new Date(station.last_seen_at).toLocaleDateString() : 'No sync recorded'}
                            </p>
                        </div>
                    </div>

                    <div className="pf-stat-card">
                        <span className="pf-stat-icon pf-stat-icon--green" aria-hidden="true">
                            <svg viewBox="0 0 24 24">
                                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                            </svg>
                        </span>
                        <div>
                            <p className="pf-stat-label">App Version</p>
                            <p className="pf-stat-value text-lg">
                                {station.app_version ? `v${station.app_version}` : '—'}
                            </p>
                            <p className="pf-stat-hint">Kiosk firmware</p>
                        </div>
                    </div>

                    <div className="pf-stat-card">
                        <span className="pf-stat-icon pf-stat-icon--amber" aria-hidden="true">
                            <svg viewBox="0 0 24 24">
                                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                            </svg>
                        </span>
                        <div>
                            <p className="pf-stat-label">Pending Events</p>
                            <p className="pf-stat-value text-lg">
                                {station.last_pending_count ?? 0}
                            </p>
                            <p className="pf-stat-hint">Queued on device</p>
                        </div>
                    </div>
                </div>

                {/* Activation Prompt Card */}
                {station.status === 'pending_activation' && (
                    <div className="pf-panel mb-6 border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
                        <div className="p-6">
                            <div className="flex items-start gap-4">
                                <span className="pf-modal-hero-icon pf-modal-hero-icon--amber shrink-0" aria-hidden="true">
                                    <svg viewBox="0 0 24 24">
                                        <rect x="4" y="5" width="16" height="13" rx="2" />
                                        <path d="M8 21h8M9 9h6M9 13h4" />
                                    </svg>
                                </span>
                                <div>
                                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                        Station Pending Activation
                                    </h3>
                                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 max-w-xl">
                                        This kiosk has been registered but not yet paired with physical hardware.
                                        Generate an activation code and enter it on the device display to complete activation.
                                    </p>
                                    <div className="mt-4">
                                        <button
                                            type="button"
                                            onClick={issueActivationCode}
                                            className="pf-btn pf-btn-primary"
                                        >
                                            Generate Activation Code
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Configuration Card */}
                <div className="pf-panel mb-6">
                    <div className="pf-panel-header">
                        <div>
                            <h3 className="pf-panel-title">Kiosk Configuration (JSON)</h3>
                            <p className="pf-panel-count">
                                Display settings, scanner preferences, and sync parameters delivered to the kiosk.
                            </p>
                        </div>
                    </div>
                    <form onSubmit={submitConfiguration} className="p-6 space-y-4">
                        <div>
                            <textarea
                                id="configuration"
                                rows={7}
                                value={configForm.data.configuration}
                                onChange={(e) => configForm.setData('configuration', e.target.value)}
                                className="block w-full rounded-xl border-slate-300 font-mono text-xs shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 p-3"
                                placeholder="{}"
                            />
                            <InputError message={configError ?? configForm.errors.configuration} className="mt-2" />
                        </div>
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={configForm.processing}
                                className="pf-btn pf-btn-primary text-xs"
                            >
                                {configForm.processing ? 'Saving...' : 'Save Configuration'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Device Credentials Card */}
                <div className="pf-panel mb-6">
                    <div className="pf-panel-header">
                        <div>
                            <h3 className="pf-panel-title">Device Credentials</h3>
                            <p className="pf-panel-count">
                                Cryptographic API bearer tokens used by the kiosk hardware to authenticate.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIssueCredentialOpen(true)}
                            className="pf-btn pf-btn-secondary text-xs"
                        >
                            <svg viewBox="0 0 24 24">
                                <path d="M12 5v14M5 12h14" />
                            </svg>
                            Issue New Credential
                        </button>
                    </div>

                    <div className="pf-table-wrap">
                        <Table>
                            <Table.Head>
                                <Table.Th>Label</Table.Th>
                                <Table.Th>Last Used</Table.Th>
                                <Table.Th>Status</Table.Th>
                                <Table.Th>
                                    <span className="sr-only">Actions</span>
                                </Table.Th>
                            </Table.Head>
                            <Table.Body>
                                {credentials.length === 0 && (
                                    <Table.Empty colSpan={4}>No credentials issued yet for this station.</Table.Empty>
                                )}

                                {credentials.map((credential) => (
                                    <tr key={credential.id}>
                                        <Table.Td className="font-medium text-slate-800 dark:text-slate-200">
                                            {credential.label || 'Default Token'}
                                        </Table.Td>
                                        <Table.Td className="text-xs text-slate-500">
                                            {credential.last_used_at
                                                ? new Date(credential.last_used_at).toLocaleString()
                                                : 'Never used'}
                                        </Table.Td>
                                        <Table.Td>
                                            <StatusBadge color={credential.revoked_at ? 'gray' : 'green'}>
                                                {credential.revoked_at ? 'Revoked' : 'Active'}
                                            </StatusBadge>
                                        </Table.Td>
                                        <Table.Td className="text-right">
                                            {!credential.revoked_at && (
                                                <button
                                                    type="button"
                                                    onClick={() => revokeCredential(credential.id)}
                                                    className="font-medium text-red-600 hover:text-red-800 dark:text-red-400 text-xs"
                                                >
                                                    Revoke
                                                </button>
                                            )}
                                        </Table.Td>
                                    </tr>
                                ))}
                            </Table.Body>
                        </Table>
                    </div>
                </div>
            </div>

            {/* Modal for Issuing New Credential */}
            <Modal show={issueCredentialOpen} onClose={() => setIssueCredentialOpen(false)}>
                <form onSubmit={submitIssueCredential} className="pf-modal">
                    <div className="pf-modal-header">
                        <div className="pf-modal-hero">
                            <span className="pf-modal-hero-icon pf-modal-hero-icon--amber" aria-hidden="true">
                                <svg viewBox="0 0 24 24">
                                    <rect x="3" y="11" width="10" height="8" rx="1.5" />
                                    <path d="M7 11V8a4 4 0 0 1 8 0v3" />
                                    <circle cx="8" cy="15" r="1" />
                                </svg>
                            </span>
                            <div className="pf-modal-hero-text">
                                <h3 className="pf-modal-title">Issue Device Credential</h3>
                                <p className="pf-modal-subtitle">
                                    A secure token will be generated. Copy and enter it on the kiosk immediately.
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            className="pf-modal-close"
                            onClick={() => setIssueCredentialOpen(false)}
                            aria-label="Close"
                        >
                            <svg viewBox="0 0 24 24">
                                <path d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="mt-4">
                        <InputLabel htmlFor="label" value="Credential Label (e.g. Primary Kiosk Tablet)" />
                        <TextInput
                            id="label"
                            value={credentialForm.data.label}
                            onChange={(e) => credentialForm.setData('label', e.target.value)}
                            className="mt-1 block w-full"
                            placeholder="e.g. Android Tablet A"
                            isFocused
                        />
                        <InputError message={credentialForm.errors.label} className="mt-2" />
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={() => setIssueCredentialOpen(false)}>
                            Cancel
                        </SecondaryButton>
                        <PrimaryButton disabled={credentialForm.processing}>
                            {credentialForm.processing ? 'Generating...' : 'Issue Credential'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>
        </PlatformLayout>
    );
}

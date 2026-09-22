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
import KioskMediaPanel from '@/Components/kiosk/KioskMediaPanel';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { KioskMediaItem, StationCredential, Tenant } from '@/types';
import { ArrowLeftIcon } from '@/Components/icons/arrow-left';
import { MonitorCheckIcon } from '@/Components/icons/monitor-check';
import { ActivityIcon } from '@/Components/icons/activity';
import { ClockIcon } from '@/Components/icons/clock';
import { CpuIcon } from '@/Components/icons/cpu';
import { LockIcon } from '@/Components/icons/lock';
import { PencilIcon } from '@/Components/icons/pencil';
import { XIcon } from '@/Components/icons/x';
import { PlusIcon } from '@/Components/icons/plus';
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
    media: KioskMediaItem[];
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
    media,
}: StationDetailScreenProps) {
    const { flash } = usePage().props as PagePropsWithFlash;

    const [issueCredentialOpen, setIssueCredentialOpen] = useState(false);
    const credentialForm = useForm({ label: '' });

    const [renameOpen, setRenameOpen] = useState(false);
    const renameForm = useForm({ name: station.name });

    function submitRename(e: React.FormEvent) {
        e.preventDefault();
        renameForm.transform((data) => ({ ...data, tenant_id: tenant.id }));
        renameForm.patch(route('platform.stations.rename', station.id), {
            preserveScroll: true,
            onSuccess: () => setRenameOpen(false),
        });
    }

    const [editCodeOpen, setEditCodeOpen] = useState(false);
    const editCodeForm = useForm({ station_code: station.station_code });

    function submitEditCode(e: React.FormEvent) {
        e.preventDefault();
        editCodeForm.transform((data) => ({ ...data, tenant_id: tenant.id }));
        editCodeForm.patch(route('platform.stations.update-code', station.id), {
            preserveScroll: true,
            onSuccess: () => setEditCodeOpen(false),
        });
    }

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

    function formatConfiguration() {
        try {
            const parsed = JSON.parse(configForm.data.configuration || '{}');
            configForm.setData('configuration', JSON.stringify(parsed, null, 2));
            setConfigError(null);
        } catch {
            setConfigError('Configuration must be valid JSON before it can be formatted.');
        }
    }

    const isValidConfiguration = useMemo(() => {
        try {
            JSON.parse(configForm.data.configuration || '{}');
            return true;
        } catch {
            return false;
        }
    }, [configForm.data.configuration]);

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
                        <ArrowLeftIcon size={16} />
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
                            <button
                                type="button"
                                onClick={() => { renameForm.setData('name', station.name); setRenameOpen(true); }}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                                aria-label={`Rename ${station.name}`}
                            >
                                <PencilIcon size={16} />
                            </button>
                            <span className="inline-flex items-center gap-1">
                                <span className="font-mono text-xs px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md border border-slate-200 dark:border-slate-700">
                                    {station.station_code}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => { editCodeForm.setData('station_code', station.station_code); setEditCodeOpen(true); }}
                                    className="inline-flex h-6 w-6 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                                    aria-label={`Edit code for ${station.name}`}
                                >
                                    <PencilIcon size={13} />
                                </button>
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
                </div>

                <SecretOnceCallout label="Device credential token" value={flash?.deviceToken} />
                <SecretOnceCallout label="Activation code" value={flash?.activationCode} />

                {/* Telemetry and Station Stats Grid */}
                <div className="pf-stat-grid">
                    <div className="pf-stat-card">
                        <span className="pf-stat-icon pf-stat-icon--blue" aria-hidden="true">
                            <MonitorCheckIcon size={20} />
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
                            <ClockIcon size={20} />
                        </span>
                        <div>
                            <p className="pf-stat-label">Last Seen</p>
                            <p className="pf-stat-value text-sm font-semibold">
                                {station.last_seen_at
                                    ? new Date(station.last_seen_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
                                    : 'Never'}
                            </p>
                            <p className="pf-stat-hint">
                                {station.last_seen_at
                                    ? new Date(station.last_seen_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                                    : 'No sync recorded'}
                            </p>
                            {station.last_scan_at && (
                                <p className="pf-stat-hint mt-0.5">
                                    Last scan:{' '}
                                    {new Date(station.last_scan_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="pf-stat-card">
                        <span className="pf-stat-icon pf-stat-icon--green" aria-hidden="true">
                            <CpuIcon size={20} />
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
                            <ActivityIcon size={20} />
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
                                    <MonitorCheckIcon size={20} />
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

                {/* Management: Device Credentials + Kiosk Configuration */}
                <div className="pf-detail-grid">
                    {/* Device Credentials Card */}
                    <section className="pf-panel">
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
                                <PlusIcon size={20} />
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
                    </section>

                    {/* Kiosk Configuration Card */}
                    <section className="pf-panel">
                        <div className="pf-panel-header">
                            <div>
                                <h3 className="pf-panel-title">Kiosk Configuration</h3>
                                <p className="pf-panel-count">
                                    JSON delivered to the kiosk: display, scanner, and sync parameters.
                                </p>
                            </div>
                        </div>
                        <form onSubmit={submitConfiguration} className="pf-detail-grid-form p-6 space-y-4">
                            <div>
                                <div className="mb-2 flex items-center justify-between gap-3">
                                    <label
                                        htmlFor="configuration"
                                        className="text-xs font-semibold text-slate-600 dark:text-slate-300"
                                    >
                                        Payload
                                    </label>
                                    <span
                                        className={
                                            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset ' +
                                            (isValidConfiguration
                                                ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800/50'
                                                : 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-800/50')
                                        }
                                        aria-live="polite"
                                    >
                                        <span className={`h-1.5 w-1.5 rounded-full ${isValidConfiguration ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                        {isValidConfiguration ? 'Valid JSON' : 'Invalid JSON'}
                                    </span>
                                </div>
                                <textarea
                                    id="configuration"
                                    rows={7}
                                    value={configForm.data.configuration}
                                    onChange={(e) => configForm.setData('configuration', e.target.value)}
                                    spellCheck={false}
                                    className="block w-full resize-y rounded-xl border-slate-300 font-mono text-xs shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 p-3"
                                    placeholder="{}"
                                />
                                <InputError message={configError ?? configForm.errors.configuration} className="mt-2" />
                            </div>
                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={formatConfiguration}
                                    className="pf-btn pf-btn-secondary text-xs"
                                >
                                    Format JSON
                                </button>
                                <button
                                    type="submit"
                                    disabled={configForm.processing}
                                    className="pf-btn pf-btn-primary text-xs"
                                >
                                    {configForm.processing ? 'Saving...' : 'Save Configuration'}
                                </button>
                            </div>
                        </form>
                    </section>
                </div>

                {/* Idle-Screen Media (standalone panel) */}
                <KioskMediaPanel
                    media={media}
                    storeUrl={route('platform.stations.media.store', station.id)}
                    updateUrl={(id) => route('platform.stations.media.update', [station.id, id] as unknown as Record<string, unknown>)}
                    destroyUrl={(id) => route('platform.stations.media.destroy', [station.id, id] as unknown as Record<string, unknown>)}
                    extraFormData={{ tenant_id: String(tenant.id) }}
                />
            </div>

            {/* Modal for Issuing New Credential */}
            <Modal show={issueCredentialOpen} onClose={() => setIssueCredentialOpen(false)}>
                <form onSubmit={submitIssueCredential} className="pf-modal">
                    <div className="pf-modal-header">
                        <div className="pf-modal-hero">
                            <span className="pf-modal-hero-icon pf-modal-hero-icon--amber" aria-hidden="true">
                                <LockIcon size={20} />
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
                            <XIcon size={20} />
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

            {/* Modal for Renaming the Station */}
            <Modal show={renameOpen} onClose={() => setRenameOpen(false)}>
                <form onSubmit={submitRename} className="pf-modal">
                    <div className="pf-modal-header">
                        <div className="pf-modal-hero">
                            <span className="pf-modal-hero-icon pf-modal-hero-icon--amber" aria-hidden="true">
                                <PencilIcon size={20} />
                            </span>
                            <div className="pf-modal-hero-text">
                                <h3 className="pf-modal-title">Rename Station</h3>
                                <p className="pf-modal-subtitle">
                                    Only the display name changes — the station code kiosks pair with stays the same.
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            className="pf-modal-close"
                            onClick={() => setRenameOpen(false)}
                            aria-label="Close"
                        >
                            <XIcon size={20} />
                        </button>
                    </div>

                    <div className="mt-4">
                        <InputLabel htmlFor="station-name" value="Station Name" />
                        <TextInput
                            id="station-name"
                            value={renameForm.data.name}
                            onChange={(e) => renameForm.setData('name', e.target.value)}
                            className="mt-1 block w-full"
                            placeholder="e.g. Main Gate"
                            isFocused
                        />
                        <InputError message={renameForm.errors.name} className="mt-2" />
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={() => setRenameOpen(false)}>
                            Cancel
                        </SecondaryButton>
                        <PrimaryButton disabled={renameForm.processing}>
                            {renameForm.processing ? 'Saving...' : 'Save Name'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Modal for Editing the Station Code */}
            <Modal show={editCodeOpen} onClose={() => setEditCodeOpen(false)}>
                <form onSubmit={submitEditCode} className="pf-modal">
                    <div className="pf-modal-header">
                        <div className="pf-modal-hero">
                            <span className="pf-modal-hero-icon pf-modal-hero-icon--amber" aria-hidden="true">
                                <PencilIcon size={20} />
                            </span>
                            <div className="pf-modal-hero-text">
                                <h3 className="pf-modal-title">Edit Station Code</h3>
                                <p className="pf-modal-subtitle">
                                    Safe to change even after the kiosk is paired — the device authenticates with its
                                    own credential token, not this code. Must stay unique within this school.
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            className="pf-modal-close"
                            onClick={() => setEditCodeOpen(false)}
                            aria-label="Close"
                        >
                            <XIcon size={20} />
                        </button>
                    </div>

                    <div className="mt-4">
                        <InputLabel htmlFor="station-code" value="Station Code" />
                        <TextInput
                            id="station-code"
                            value={editCodeForm.data.station_code}
                            onChange={(e) => editCodeForm.setData('station_code', e.target.value)}
                            className="mt-1 block w-full font-mono"
                            placeholder="e.g. main-gate-01"
                            isFocused
                        />
                        <InputError message={editCodeForm.errors.station_code} className="mt-2" />
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={() => setEditCodeOpen(false)}>
                            Cancel
                        </SecondaryButton>
                        <PrimaryButton disabled={editCodeForm.processing}>
                            {editCodeForm.processing ? 'Saving...' : 'Save Code'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>
        </PlatformLayout>
    );
}

import InputError from '@/Components/InputError';
import Modal from '@/Components/Modal';
import { FilePenLineIcon } from '@/Components/icons/file-pen-line';
import { KeyIcon } from '@/Components/icons/key';
import { LockIcon } from '@/Components/icons/lock';
import { MonitorCheckIcon } from '@/Components/icons/monitor-check';
import { SquarePenIcon } from '@/Components/icons/square-pen';
import { XIcon } from '@/Components/icons/x';
import { useToast } from '@/Components/toast/ToastProvider';
import { Station, StationCredential } from '@/types';
import { Link, router } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useState } from 'react';

interface StationItem extends Station {
    station_code: string;
    is_online?: boolean;
    app_version?: string | null;
    last_pending_count?: number | null;
    last_seen_at?: string | null;
}

interface ManageStationModalProps {
    station: StationItem | null;
    show: boolean;
    onClose: () => void;
    onUpdated?: (station: StationItem) => void;
    onIssueCodeClick?: (station: StationItem) => void;
}

type TabKey = 'overview' | 'configuration' | 'credentials';

const statusLabels: Record<string, string> = {
    pending_activation: 'Pending Activation',
    active: 'Active',
    disabled: 'Disabled',
    retired: 'Retired',
};

export default function ManageStationModal({
    station,
    show,
    onClose,
    onUpdated,
    onIssueCodeClick,
}: ManageStationModalProps) {
    const { showToast } = useToast();

    const [activeTab, setActiveTab] = useState<TabKey>('overview');
    const [currentStation, setCurrentStation] = useState<StationItem | null>(station);
    const [credentials, setCredentials] = useState<StationCredential[]>([]);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);

    // Configuration state
    const [configString, setConfigString] = useState('{}');
    const [configError, setConfigError] = useState<string | null>(null);
    const [isSavingConfig, setIsSavingConfig] = useState(false);

    // Issue credential state
    const [credentialLabel, setCredentialLabel] = useState('');
    const [isIssuingCredential, setIsIssuingCredential] = useState(false);
    const [issuedDeviceToken, setIssuedDeviceToken] = useState<string | null>(null);
    const [copiedToken, setCopiedToken] = useState(false);
    const [revokingId, setRevokingId] = useState<number | null>(null);

    // Fetch full station details & credentials when modal opens
    useEffect(() => {
        if (!show || !station) {
            setActiveTab('overview');
            setIssuedDeviceToken(null);
            setCredentialLabel('');
            setConfigError(null);
            return;
        }

        setCurrentStation(station);
        setConfigString(JSON.stringify(station.configuration ?? {}, null, 2));
        setIsLoadingDetails(true);
        setIssuedDeviceToken(null);

        axios
            .get(route('portal.stations.show', station.station_code), {
                headers: { Accept: 'application/json' },
            })
            .then((res) => {
                if (res.data.station) {
                    setCurrentStation(res.data.station);
                    setConfigString(JSON.stringify(res.data.station.configuration ?? {}, null, 2));
                }
                if (res.data.credentials) {
                    setCredentials(res.data.credentials);
                }
            })
            .catch(() => {
                showToast({
                    type: 'error',
                    message: 'Could not load station details.',
                    description: 'Failed to fetch latest station telemetry and credentials.',
                });
            })
            .finally(() => {
                setIsLoadingDetails(false);
            });
    }, [show, station]);

    if (!currentStation) {
        return null;
    }

    // Format JSON helper
    function handleFormatJson() {
        try {
            const parsed = JSON.parse(configString || '{}');
            setConfigString(JSON.stringify(parsed, null, 2));
            setConfigError(null);
        } catch {
            setConfigError('Cannot format: Text is not valid JSON.');
        }
    }

    // Save Configuration
    async function handleSaveConfiguration(e: React.FormEvent) {
        e.preventDefault();
        if (!currentStation || isSavingConfig) return;

        setConfigError(null);

        let parsed: Record<string, unknown>;
        try {
            parsed = JSON.parse(configString || '{}');
        } catch {
            setConfigError('Configuration must be valid JSON syntax.');
            return;
        }

        setIsSavingConfig(true);
        try {
            const res = await axios.patch(
                route('portal.stations.configuration', currentStation.station_code),
                { configuration: parsed },
                { headers: { Accept: 'application/json' } },
            );

            const updated = res.data.station ?? { ...currentStation, configuration: parsed };
            setCurrentStation(updated);
            if (onUpdated) {
                onUpdated(updated);
            }

            showToast({
                type: 'success',
                message: 'Configuration saved.',
                description: 'Station runtime parameters updated successfully.',
            });

            router.reload({ only: ['stations'] });
        } catch (error: any) {
            const msg =
                error.response?.data?.errors?.configuration?.[0] ||
                error.response?.data?.message ||
                'Failed to update configuration.';
            setConfigError(msg);
            showToast({
                type: 'error',
                message: 'Configuration error',
                description: msg,
            });
        } finally {
            setIsSavingConfig(false);
        }
    }

    // Issue Credential
    async function handleIssueCredential(e: React.FormEvent) {
        e.preventDefault();
        if (!currentStation || isIssuingCredential) return;

        setIsIssuingCredential(true);
        try {
            const res = await axios.post(
                route('portal.stations.credentials.store', currentStation.station_code),
                { label: credentialLabel.trim() || null },
                { headers: { Accept: 'application/json' } },
            );

            if (res.data.deviceToken) {
                setIssuedDeviceToken(res.data.deviceToken);
            }
            if (res.data.credentials) {
                setCredentials(res.data.credentials);
            }
            setCredentialLabel('');

            showToast({
                type: 'success',
                message: 'Credential issued.',
                description: 'Device token generated. Enter it on the kiosk immediately.',
            });
        } catch (error: any) {
            showToast({
                type: 'error',
                message: 'Could not issue credential.',
                description: error.response?.data?.message || 'Please try again.',
            });
        } finally {
            setIsIssuingCredential(false);
        }
    }

    // Revoke Credential
    async function handleRevokeCredential(credentialId: number) {
        if (
            !confirm(
                'Revoke this credential? The hardware kiosk using it will immediately lose synchronization access.',
            )
        ) {
            return;
        }

        setRevokingId(credentialId);
        try {
            const res = await axios.patch(
                route('portal.stations.credentials.revoke', [currentStation.station_code, credentialId]),
                {},
                { headers: { Accept: 'application/json' } },
            );

            if (res.data.credentials) {
                setCredentials(res.data.credentials);
            } else {
                setCredentials((prev) =>
                    prev.map((c) =>
                        c.id === credentialId
                            ? { ...c, revoked_at: new Date().toISOString() }
                            : c,
                    ),
                );
            }

            showToast({
                type: 'update',
                message: 'Credential revoked.',
                description: 'Kiosk access has been disconnected for this credential.',
            });
        } catch (error: any) {
            showToast({
                type: 'error',
                message: 'Failed to revoke credential.',
                description: error.response?.data?.message || 'Please try again.',
            });
        } finally {
            setRevokingId(null);
        }
    }

    function handleCopyToken() {
        if (!issuedDeviceToken) return;
        navigator.clipboard.writeText(issuedDeviceToken);
        setCopiedToken(true);
        setTimeout(() => setCopiedToken(false), 2000);
        showToast({
            type: 'info',
            message: 'Copied to clipboard',
            description: 'Device credential token copied.',
        });
    }

    return (
        <Modal show={show} onClose={onClose} maxWidth="3xl">
            <div className="pf-modal relative p-6 sm:p-8">
                {/* Modal Header */}
                <div className="pf-modal-header mb-6">
                    <div className="pf-modal-hero">
                        <span
                            className={
                                'pf-modal-hero-icon ' +
                                (currentStation.status === 'active'
                                    ? 'pf-modal-hero-icon--blue'
                                    : currentStation.status === 'pending_activation'
                                      ? 'pf-modal-hero-icon--amber'
                                      : 'pf-modal-hero-icon--red')
                            }
                            aria-hidden="true"
                        >
                            <MonitorCheckIcon size={22} />
                        </span>
                        <div className="pf-modal-hero-text">
                            <div className="flex flex-wrap items-center gap-2.5">
                                <h3 className="pf-modal-title text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                                    Manage {currentStation.name}
                                </h3>
                                <span
                                    className={
                                        'pf-pill text-[11px] ' +
                                        (currentStation.status === 'active'
                                            ? 'pf-pill--active'
                                            : currentStation.status === 'pending_activation'
                                              ? 'pf-pill--warning'
                                              : 'pf-pill--danger')
                                    }
                                >
                                    {statusLabels[currentStation.status] ?? currentStation.status}
                                </span>
                                {currentStation.status === 'active' && (
                                    <span
                                        className={
                                            'pf-pill text-[11px] ' +
                                            (currentStation.is_online
                                                ? 'pf-pill--online'
                                                : 'pf-pill--offline')
                                        }
                                    >
                                        {currentStation.is_online ? 'Online' : 'Offline'}
                                    </span>
                                )}
                            </div>
                            <p className="pf-modal-subtitle text-xs text-slate-500 dark:text-slate-400">
                                Station Code:{' '}
                                <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                                    {currentStation.station_code}
                                </span>{' '}
                                {currentStation.app_version && (
                                    <>· App: v{currentStation.app_version} </>
                                )}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="pf-modal-close"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        <XIcon size={16} />
                    </button>
                </div>

                {/* Tab Navigation */}
                <div className="mb-6 flex flex-wrap items-center gap-1.5 rounded-2xl border border-slate-200/90 bg-slate-100/90 p-1 dark:border-slate-700/80 dark:bg-slate-800/80">
                    <button
                        type="button"
                        onClick={() => setActiveTab('overview')}
                        className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all duration-150 ${
                            activeTab === 'overview'
                                ? 'border border-slate-200/80 bg-white text-blue-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-blue-400'
                                : 'text-slate-600 hover:bg-white/60 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700/50 dark:hover:text-slate-200'
                        }`}
                    >
                        <MonitorCheckIcon size={16} />
                        Overview &amp; Health
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('configuration')}
                        className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all duration-150 ${
                            activeTab === 'configuration'
                                ? 'border border-slate-200/80 bg-white text-blue-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-blue-400'
                                : 'text-slate-600 hover:bg-white/60 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700/50 dark:hover:text-slate-200'
                        }`}
                    >
                        <SquarePenIcon size={16} />
                        Configuration
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('credentials')}
                        className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all duration-150 ${
                            activeTab === 'credentials'
                                ? 'border border-slate-200/80 bg-white text-blue-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-blue-400'
                                : 'text-slate-600 hover:bg-white/60 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700/50 dark:hover:text-slate-200'
                        }`}
                    >
                        <LockIcon size={16} />
                        Device Credentials
                        <span className="rounded-full bg-slate-200/90 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                            {isLoadingDetails ? '…' : credentials.length}
                        </span>
                    </button>
                </div>

                {/* TAB 1: OVERVIEW & HEALTH */}
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        {/* Activation Alert if Pending */}
                        {currentStation.status === 'pending_activation' && (
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-amber-200/80 bg-amber-50/70 p-4 sm:p-5 dark:border-amber-900/50 dark:bg-amber-950/30">
                                <div className="flex items-start gap-3">
                                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300">
                                        <KeyIcon size={20} />
                                    </span>
                                    <div>
                                        <h4 className="text-sm font-bold text-amber-900 dark:text-amber-100">
                                            Hardware Activation Required
                                        </h4>
                                        <p className="mt-0.5 text-xs text-amber-800/90 dark:text-amber-300/90">
                                            This station is pending pairing. Generate a one-time activation code to connect your physical kiosk device.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (onIssueCodeClick) {
                                            onIssueCodeClick(currentStation);
                                        }
                                    }}
                                    className="pf-btn pf-btn-primary !bg-gradient-to-r !from-amber-600 !to-orange-600 hover:!from-amber-500 hover:!to-orange-500 !text-white self-start sm:self-auto !text-xs !h-9"
                                >
                                    <KeyIcon size={16} />
                                    Issue Code
                                </button>
                            </div>
                        )}

                        {/* Telemetry Stat Cards Grid */}
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-900/60">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    Network Status
                                </span>
                                <div className="mt-1 flex items-center gap-2">
                                    <span
                                        className={`h-2.5 w-2.5 rounded-full ${
                                            currentStation.is_online
                                                ? 'bg-emerald-500 animate-pulse'
                                                : 'bg-slate-400'
                                        }`}
                                    />
                                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                        {currentStation.is_online ? 'Online' : 'Offline'}
                                    </span>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-900/60">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    Firmware / App
                                </span>
                                <div className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-100">
                                    {currentStation.app_version ? `v${currentStation.app_version}` : '—'}
                                </div>
                            </div>

                            <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-900/60">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    Pending Sync
                                </span>
                                <div className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-100">
                                    {currentStation.last_pending_count ?? 0} taps
                                </div>
                            </div>

                            <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-900/60">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    Last Contact
                                </span>
                                <div className="mt-1 truncate text-xs font-semibold text-slate-700 dark:text-slate-300" title={currentStation.last_seen_at ?? 'Never'}>
                                    {currentStation.last_seen_at
                                        ? new Date(currentStation.last_seen_at).toLocaleTimeString(undefined, {
                                              hour: '2-digit',
                                              minute: '2-digit',
                                          })
                                        : 'Never seen'}
                                </div>
                            </div>
                        </div>

                        {/* Station Identity Summary */}
                        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/80">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                                Station Identification
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                <div>
                                    <span className="text-slate-500 dark:text-slate-400">Station Name:</span>
                                    <p className="mt-0.5 font-semibold text-slate-800 dark:text-slate-100">
                                        {currentStation.name}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-slate-500 dark:text-slate-400">Hardware Identifier:</span>
                                    <p className="mt-0.5 font-mono font-semibold text-slate-800 dark:text-slate-100">
                                        {currentStation.station_code}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-slate-500 dark:text-slate-400">Active Device Credentials:</span>
                                    <p className="mt-0.5 font-semibold text-slate-800 dark:text-slate-100">
                                        {credentials.filter((c) => !c.revoked_at).length} active token(s)
                                    </p>
                                </div>
                                <div>
                                    <span className="text-slate-500 dark:text-slate-400">Dedicated Detail Page:</span>
                                    <p className="mt-0.5">
                                        <Link
                                            href={route('portal.stations.show', currentStation.station_code)}
                                            className="font-semibold text-blue-600 hover:text-blue-500 hover:underline dark:text-blue-400"
                                        >
                                            View Full Screen Details &rarr;
                                        </Link>
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                            <span className="text-xs text-slate-400">
                                Need to edit configuration or credentials? Use the tabs above.
                            </span>
                            <button
                                type="button"
                                className="pf-btn pf-btn-secondary"
                                onClick={onClose}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}

                {/* TAB 2: CONFIGURATION */}
                {activeTab === 'configuration' && (
                    <form onSubmit={handleSaveConfiguration} className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                    Station Runtime Parameters
                                </h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Raw JSON delivered to the kiosk display &amp; operating configuration upon next sync.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleFormatJson}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                            >
                                <FilePenLineIcon size={14} />
                                Format JSON
                            </button>
                        </div>

                        <div>
                            <textarea
                                rows={10}
                                value={configString}
                                onChange={(e) => {
                                    setConfigString(e.target.value);
                                    setConfigError(null);
                                }}
                                className="w-full rounded-2xl border border-slate-200/90 bg-slate-900 p-4 font-mono text-xs text-emerald-400 shadow-inner focus:border-blue-500 focus:ring-blue-500 dark:border-slate-800"
                                placeholder="{}"
                                spellCheck={false}
                            />
                            {configError && <InputError message={configError} className="mt-2" />}
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                type="button"
                                className="pf-btn pf-btn-secondary"
                                onClick={() => {
                                    setConfigString(
                                        JSON.stringify(currentStation.configuration ?? {}, null, 2),
                                    );
                                    setConfigError(null);
                                }}
                                disabled={isSavingConfig}
                            >
                                Reset Changes
                            </button>
                            <button
                                type="submit"
                                className="pf-btn pf-btn-primary"
                                disabled={isSavingConfig}
                            >
                                {isSavingConfig ? 'Saving Configuration...' : 'Save Configuration'}
                            </button>
                        </div>
                    </form>
                )}

                {/* TAB 3: DEVICE CREDENTIALS */}
                {activeTab === 'credentials' && (
                    <div className="space-y-6">
                        {/* Issued Token Secret Callout Banner */}
                        {issuedDeviceToken && (
                            <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50/70 p-5 dark:border-emerald-700/60 dark:bg-emerald-950/40">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                                        Device Credential Token Issued (Shown Once)
                                    </span>
                                    <button
                                        type="button"
                                        onClick={handleCopyToken}
                                        className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-emerald-800 shadow-sm border border-emerald-200 hover:bg-emerald-50 dark:bg-slate-800 dark:text-emerald-300 dark:border-emerald-800"
                                    >
                                        {copiedToken ? 'Copied!' : 'Copy Token'}
                                    </button>
                                </div>
                                <div className="mt-2 rounded-xl bg-slate-900 p-3 font-mono text-xs text-emerald-400 break-all select-all">
                                    {issuedDeviceToken}
                                </div>
                                <p className="mt-2 text-[11px] text-emerald-700 dark:text-emerald-400">
                                    Configure this token on the kiosk device now. This token will not be visible again once dismissed.
                                </p>
                            </div>
                        )}

                        {/* Issue New Credential Form */}
                        <form
                            onSubmit={handleIssueCredential}
                            className="rounded-2xl border border-slate-200/90 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/50"
                        >
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                                Issue New Credential Token
                            </h4>
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                                <input
                                    type="text"
                                    value={credentialLabel}
                                    onChange={(e) => setCredentialLabel(e.target.value)}
                                    placeholder="Credential label (e.g. Lobby Terminal 01)"
                                    className="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                />
                                <button
                                    type="submit"
                                    disabled={isIssuingCredential}
                                    className="pf-btn pf-btn-primary !h-9 !text-xs"
                                >
                                    {isIssuingCredential ? 'Issuing...' : 'Issue Credential'}
                                </button>
                            </div>
                        </form>

                        {/* Credentials List Table */}
                        <div className="overflow-hidden rounded-2xl border border-slate-200/90 dark:border-slate-800">
                            <table className="min-w-full divide-y divide-slate-200 text-left text-xs dark:divide-slate-800">
                                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800/80 dark:text-slate-400">
                                    <tr>
                                        <th scope="col" className="px-4 py-3">
                                            Label
                                        </th>
                                        <th scope="col" className="px-4 py-3">
                                            Last Used
                                        </th>
                                        <th scope="col" className="px-4 py-3">
                                            Status
                                        </th>
                                        <th scope="col" className="px-4 py-3 text-right">
                                            Action
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200/80 bg-white dark:divide-slate-800/80 dark:bg-slate-900/40">
                                    {credentials.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="pf-empty">
                                                No credentials issued yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        credentials.map((cred) => (
                                            <tr key={cred.id}>
                                                <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                                                    {cred.label || '—'}
                                                </td>
                                                <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                                                    {cred.last_used_at
                                                        ? new Date(cred.last_used_at).toLocaleString()
                                                        : 'Never'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span
                                                        className={
                                                            'pf-pill text-[10px] ' +
                                                            (cred.revoked_at
                                                                ? 'pf-pill--inactive'
                                                                : 'pf-pill--active')
                                                        }
                                                    >
                                                        {cred.revoked_at ? 'Revoked' : 'Active'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    {!cred.revoked_at && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRevokeCredential(cred.id)}
                                                            disabled={revokingId === cred.id}
                                                            className="font-bold text-red-600 hover:text-red-700 hover:underline dark:text-red-400 text-xs"
                                                        >
                                                            {revokingId === cred.id ? 'Revoking...' : 'Revoke'}
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex items-center justify-end pt-2">
                            <button
                                type="button"
                                className="pf-btn pf-btn-secondary"
                                onClick={onClose}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}

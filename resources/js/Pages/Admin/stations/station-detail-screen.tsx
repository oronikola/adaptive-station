import InputError from '@/Components/InputError';
import Modal from '@/Components/Modal';
import SecretOnceCallout from '@/Components/SecretOnceCallout';
import StatusBadge from '@/Components/admin/StatusBadge';
import Table from '@/Components/admin/Table';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import type { Station, StationCredential } from '@/types';
import IssueActivationCodeModal from './IssueActivationCodeModal';
import { LockIcon } from '@/Components/icons/lock';
import { XIcon } from '@/Components/icons/x';
import { KeyIcon } from '@/Components/icons/key';
import { ChevronLeftIcon } from '@/Components/icons/chevron-left';
import '../../../../css/platform-dashboard.css';

const statusLabels: Record<string, string> = {
    pending_activation: 'Pending Activation',
    active: 'Active',
    disabled: 'Disabled',
    retired: 'Retired',
};

export default function StationDetailScreen({
    station,
    credentials,
}: {
    station: Station;
    credentials: StationCredential[];
}) {
    const { props } = usePage<import('@/types').PageProps>();
    const flash = props.flash;

    const [issueActivationCodeOpen, setIssueActivationCodeOpen] = useState(false);
    const [issueCredentialOpen, setIssueCredentialOpen] = useState(false);

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
            setConfigError('Configuration must be valid JSON syntax.');
            return;
        }

        router.patch(route('portal.stations.configuration', station.id), {
            configuration: parsed as unknown as string,
        });
    }

    function formatJson() {
        try {
            const parsed = JSON.parse(configForm.data.configuration || '{}');
            configForm.setData('configuration', JSON.stringify(parsed, null, 2));
            setConfigError(null);
        } catch {
            setConfigError('Cannot format: Text is not valid JSON.');
        }
    }

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

    function revokeCredential(credentialId: number) {
        if (confirm('Revoke this credential? The kiosk using it will lose access immediately.')) {
            router.patch(
                route('portal.stations.credentials.revoke', [
                    station.id,
                    credentialId,
                ] as unknown as Record<string, unknown>),
            );
        }
    }

    return (
        <AdminLayout>
            <Head title={`${station.name} — Station Details`} />

            <div className="pf-dashboard max-w-4xl mx-auto">
                {/* Back navigation */}
                <div className="mb-6">
                    <Link
                        href={route('portal.stations.index')}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                    >
                        <ChevronLeftIcon size={16} />
                        Back to Stations
                    </Link>
                </div>

                {/* Hero Header */}
                <div className="pf-dashboard-header">
                    <div>
                        <div className="pf-dashboard-kicker">Hardware Station</div>
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="pf-dashboard-title">{station.name}</h1>
                            <span className="font-mono text-xs px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md border border-slate-200 dark:border-slate-700">
                                {station.station_code}
                            </span>
                            <StatusBadge
                                color={
                                    station.status === 'active'
                                        ? 'green'
                                        : station.status === 'pending_activation'
                                          ? 'yellow'
                                          : 'red'
                                }
                            >
                                {statusLabels[station.status] ?? station.status}
                            </StatusBadge>
                        </div>
                        <p className="pf-dashboard-subtitle mt-2">
                            Manage station configuration, activation pairing codes, and authorized kiosk device tokens.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {station.status === 'pending_activation' && (
                            <button
                                type="button"
                                onClick={() => setIssueActivationCodeOpen(true)}
                                className="pf-btn pf-btn-primary !bg-gradient-to-r !from-amber-600 !to-orange-600 hover:!from-amber-500 hover:!to-orange-500 !text-white !border-amber-500/40 shadow-lg shadow-amber-500/20"
                            >
                                <KeyIcon size={18} />
                                Issue Activation Code
                            </button>
                        )}
                    </div>
                </div>

                <SecretOnceCallout label="Device credential token" value={flash?.deviceToken} />
                <SecretOnceCallout label="Activation code" value={flash?.activationCode} />

                <div className="space-y-6">
                    {/* Activation Pending Card */}
                    {station.status === 'pending_activation' && (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-amber-200/90 bg-amber-50/70 p-5 dark:border-amber-900/50 dark:bg-amber-950/30">
                            <div className="flex items-start gap-3">
                                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300">
                                    <KeyIcon size={20} />
                                </span>
                                <div>
                                    <h3 className="text-sm font-bold text-amber-900 dark:text-amber-100">
                                        Pending Hardware Activation
                                    </h3>
                                    <p className="mt-1 text-xs text-amber-800/90 dark:text-amber-300/90">
                                        This station has not yet completed setup. Generate a one-time activation code to enter on the physical kiosk terminal.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIssueActivationCodeOpen(true)}
                                className="pf-btn pf-btn-primary !bg-gradient-to-r !from-amber-600 !to-orange-600 hover:!from-amber-500 hover:!to-orange-500 !text-white self-start sm:self-auto !text-xs !h-9"
                            >
                                <KeyIcon size={16} />
                                Issue Activation Code
                            </button>
                        </div>
                    )}

                    {/* Configuration Form Card */}
                    <div className="pf-panel p-6">
                        <form onSubmit={submitConfiguration} className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                        Runtime Configuration
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        Raw JSON delivered to the kiosk display &amp; operational configuration on its next sync.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={formatJson}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                                >
                                    Format JSON
                                </button>
                            </div>

                            <div>
                                <textarea
                                    id="configuration"
                                    rows={8}
                                    value={configForm.data.configuration}
                                    onChange={(e) => configForm.setData('configuration', e.target.value)}
                                    className="mt-1 block w-full rounded-2xl border-slate-200 bg-slate-900 p-4 font-mono text-xs text-emerald-400 shadow-inner focus:border-blue-500 focus:ring-blue-500 dark:border-slate-700"
                                    spellCheck={false}
                                />
                                <InputError message={configError ?? configForm.errors.configuration} className="mt-2" />
                            </div>

                            <div className="flex justify-end pt-2">
                                <button
                                    type="submit"
                                    disabled={configForm.processing}
                                    className="pf-btn pf-btn-primary"
                                >
                                    {configForm.processing ? 'Saving...' : 'Save Configuration'}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Device Credentials Card */}
                    <div className="pf-panel p-6">
                        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                    Authorized Device Credentials
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    Cryptographic tokens assigned to hardware kiosks running this station profile.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIssueCredentialOpen(true)}
                                className="pf-btn pf-btn-primary !h-9 !text-xs"
                            >
                                <LockIcon size={16} />
                                Issue New Credential
                            </button>
                        </div>

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
                                    <Table.Empty colSpan={4}>No credentials issued yet.</Table.Empty>
                                )}

                                {credentials.map((credential: StationCredential) => (
                                    <tr key={credential.id}>
                                        <Table.Td>{credential.label ?? '—'}</Table.Td>
                                        <Table.Td>
                                            {credential.last_used_at
                                                ? new Date(credential.last_used_at).toLocaleString()
                                                : 'Never'}
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
                                                    className="font-bold text-red-600 hover:text-red-700 hover:underline dark:text-red-400 text-xs"
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

            {/* Issue Activation Code Modal */}
            <IssueActivationCodeModal
                station={station}
                show={issueActivationCodeOpen}
                onClose={() => setIssueActivationCodeOpen(false)}
            />

            {/* Issue Credential Modal */}
            <Modal show={issueCredentialOpen} onClose={() => setIssueCredentialOpen(false)} maxWidth="md">
                <form onSubmit={submitIssueCredential} className="pf-modal relative p-6 sm:p-8">
                    <div className="pf-modal-header mb-5">
                        <div className="pf-modal-hero">
                            <span className="pf-modal-hero-icon pf-modal-hero-icon--amber" aria-hidden="true">
                                <LockIcon size={20} />
                            </span>
                            <div className="pf-modal-hero-text">
                                <h3 className="pf-modal-title text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                                    Issue New Credential
                                </h3>
                                <p className="pf-modal-subtitle text-xs text-slate-500 dark:text-slate-400">
                                    Token shown once — enter it on the kiosk immediately.
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

                    <div className="space-y-4">
                        <div>
                            <label htmlFor="label" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Credential Label (Optional)
                            </label>
                            <input
                                id="label"
                                type="text"
                                value={credentialForm.data.label}
                                onChange={(e) => credentialForm.setData('label', e.target.value)}
                                placeholder="e.g. Front Gate Terminal 01"
                                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                autoFocus
                            />
                            <InputError message={credentialForm.errors.label} className="mt-2" />
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            type="button"
                            className="pf-btn pf-btn-secondary"
                            onClick={() => setIssueCredentialOpen(false)}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="pf-btn pf-btn-primary"
                            disabled={credentialForm.processing}
                        >
                            {credentialForm.processing ? 'Issuing...' : 'Issue Credential'}
                        </button>
                    </div>
                </form>
            </Modal>
        </AdminLayout>
    );
}

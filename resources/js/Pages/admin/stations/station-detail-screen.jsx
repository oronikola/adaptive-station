import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import SecretOnceCallout from '@/Components/SecretOnceCallout';
import StatusBadge from '@/Components/admin/StatusBadge';
import Table from '@/Components/admin/Table';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';

const statusLabels = {
    pending_activation: 'Pending Activation',
    active: 'Active',
    disabled: 'Disabled',
    retired: 'Retired',
};

export default function StationDetailScreen({ station, credentials }) {
    const { flash } = usePage().props;

    const configForm = useForm({
        configuration: JSON.stringify(station.configuration ?? {}, null, 2),
    });
    const [configError, setConfigError] = useState(null);

    function submitConfiguration(e) {
        e.preventDefault();
        setConfigError(null);

        let parsed;
        try {
            parsed = JSON.parse(configForm.data.configuration || '{}');
        } catch {
            setConfigError('Must be valid JSON.');
            return;
        }

        router.patch(route('portal.stations.configuration', station.id), {
            configuration: parsed,
        });
    }

    const [issueCredentialOpen, setIssueCredentialOpen] = useState(false);
    const credentialForm = useForm({ label: '' });

    function submitIssueCredential(e) {
        e.preventDefault();
        credentialForm.post(route('portal.stations.credentials.store', station.id), {
            onSuccess: () => {
                setIssueCredentialOpen(false);
                credentialForm.reset();
            },
        });
    }

    function revokeCredential(credentialId) {
        if (confirm('Revoke this credential? The kiosk using it will lose access immediately.')) {
            router.patch(route('portal.stations.credentials.revoke', [station.id, credentialId]));
        }
    }

    function issueActivationCode() {
        router.post(route('portal.stations.activation-code', station.id));
    }

    return (
        <AdminLayout
            header={
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                        {station.name}
                    </h2>
                    <StatusBadge color={station.status === 'active' ? 'green' : 'yellow'}>
                        {statusLabels[station.status] ?? station.status}
                    </StatusBadge>
                </div>
            }
        >
            <Head title={station.name} />

            <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
                <Link
                    href={route('portal.stations.index')}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                >
                    Back to Stations
                </Link>

                <SecretOnceCallout label="Device credential token" value={flash?.deviceToken} />
                <SecretOnceCallout label="Activation code" value={flash?.activationCode} />

                {station.status === 'pending_activation' && (
                    <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
                        <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-gray-100">
                            Activation
                        </h3>
                        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                            This station hasn't been activated yet. Issue an
                            activation code and enter it on the kiosk.
                        </p>
                        <PrimaryButton type="button" onClick={issueActivationCode}>
                            Issue Activation Code
                        </PrimaryButton>
                    </div>
                )}

                <form
                    onSubmit={submitConfiguration}
                    className="space-y-4 rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800"
                >
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        Configuration
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Raw JSON delivered to the kiosk's display/operational
                        configuration on its next sync.
                    </p>

                    <div>
                        <InputLabel htmlFor="configuration" value="Configuration (JSON)" />
                        <textarea
                            id="configuration"
                            rows={8}
                            value={configForm.data.configuration}
                            onChange={(e) => configForm.setData('configuration', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 font-mono text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                        />
                        <InputError message={configError ?? configForm.errors.configuration} className="mt-2" />
                    </div>

                    <PrimaryButton disabled={configForm.processing}>Save Configuration</PrimaryButton>
                </form>

                <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                            Device Credentials
                        </h3>
                        <PrimaryButton type="button" onClick={() => setIssueCredentialOpen(true)}>
                            Issue New Credential
                        </PrimaryButton>
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

                            {credentials.map((credential) => (
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
                                                className="font-medium text-red-600 hover:text-red-500 dark:text-red-400"
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

            <Modal show={issueCredentialOpen} onClose={() => setIssueCredentialOpen(false)}>
                <form onSubmit={submitIssueCredential} className="p-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        Issue New Credential
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        The device token is shown only once — enter it into
                        the kiosk's configuration immediately.
                    </p>
                    <div className="mt-4">
                        <InputLabel htmlFor="label" value="Label (optional)" />
                        <TextInput
                            id="label"
                            value={credentialForm.data.label}
                            onChange={(e) => credentialForm.setData('label', e.target.value)}
                            className="mt-1 block w-full"
                            isFocused
                        />
                        <InputError message={credentialForm.errors.label} className="mt-2" />
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={() => setIssueCredentialOpen(false)}>
                            Cancel
                        </SecondaryButton>
                        <PrimaryButton disabled={credentialForm.processing}>Issue</PrimaryButton>
                    </div>
                </form>
            </Modal>
        </AdminLayout>
    );
}

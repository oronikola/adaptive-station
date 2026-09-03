import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import SecretOnceCallout from '@/Components/SecretOnceCallout';
import Pagination from '@/Components/admin/Pagination';
import StatusBadge from '@/Components/admin/StatusBadge';
import Table from '@/Components/admin/Table';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';

export default function StationsListScreen({ stations, tenants }) {
    const { flash } = usePage().props;

    const [createOpen, setCreateOpen] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({
        tenant_id: tenants[0]?.id ?? '',
        name: '',
        station_code: '',
    });

    function submit(e) {
        e.preventDefault();
        post(route('platform.stations.store'), {
            onSuccess: () => {
                setCreateOpen(false);
                reset();
            },
        });
    }

    function issueCode(stationId) {
        router.post(route('platform.stations.activation-code', stationId));
    }

    return (
        <PlatformLayout
            header={
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                        Stations
                    </h2>
                    <PrimaryButton type="button" onClick={() => setCreateOpen(true)}>
                        Add Station
                    </PrimaryButton>
                </div>
            }
        >
            <Head title="Stations" />

            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                <SecretOnceCallout label="Activation code" value={flash?.activationCode} />

                <Table>
                    <Table.Head>
                        <Table.Th>Name</Table.Th>
                        <Table.Th>Code</Table.Th>
                        <Table.Th>Tenant</Table.Th>
                        <Table.Th>Status</Table.Th>
                        <Table.Th>
                            <span className="sr-only">Actions</span>
                        </Table.Th>
                    </Table.Head>
                    <Table.Body>
                        {stations.data.length === 0 && (
                            <Table.Empty colSpan={5}>No stations registered yet.</Table.Empty>
                        )}

                        {stations.data.map((station) => (
                            <tr key={station.id}>
                                <Table.Td className="font-medium text-gray-900 dark:text-gray-100">
                                    {station.name}
                                </Table.Td>
                                <Table.Td className="font-mono">{station.station_code}</Table.Td>
                                <Table.Td>{station.tenant?.name ?? '—'}</Table.Td>
                                <Table.Td>
                                    <StatusBadge
                                        color={station.status === 'active' ? 'green' : 'yellow'}
                                    >
                                        {station.status}
                                    </StatusBadge>
                                </Table.Td>
                                <Table.Td className="text-right">
                                    {station.status === 'pending_activation' && (
                                        <button
                                            type="button"
                                            onClick={() => issueCode(station.id)}
                                            className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                                        >
                                            Issue Activation Code
                                        </button>
                                    )}
                                </Table.Td>
                            </tr>
                        ))}
                    </Table.Body>
                </Table>

                <Pagination links={stations.links} />
            </div>

            <Modal show={createOpen} onClose={() => setCreateOpen(false)}>
                <form onSubmit={submit} className="p-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        Add Station
                    </h3>

                    <div className="mt-4">
                        <InputLabel htmlFor="tenant_id" value="Tenant" />
                        <select
                            id="tenant_id"
                            value={data.tenant_id}
                            onChange={(e) => setData('tenant_id', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                        >
                            {tenants.map((tenant) => (
                                <option key={tenant.id} value={tenant.id}>
                                    {tenant.name}
                                </option>
                            ))}
                        </select>
                        <InputError message={errors.tenant_id} className="mt-2" />
                    </div>

                    <div className="mt-4">
                        <InputLabel htmlFor="name" value="Station name" />
                        <TextInput
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            className="mt-1 block w-full"
                            required
                        />
                        <InputError message={errors.name} className="mt-2" />
                    </div>

                    <div className="mt-4">
                        <InputLabel htmlFor="station_code" value="Station code" />
                        <TextInput
                            id="station_code"
                            value={data.station_code}
                            onChange={(e) => setData('station_code', e.target.value)}
                            className="mt-1 block w-full"
                            required
                        />
                        <InputError message={errors.station_code} className="mt-2" />
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={() => setCreateOpen(false)}>
                            Cancel
                        </SecondaryButton>
                        <PrimaryButton disabled={processing}>Create</PrimaryButton>
                    </div>
                </form>
            </Modal>
        </PlatformLayout>
    );
}

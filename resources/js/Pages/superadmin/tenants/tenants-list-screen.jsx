import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import Pagination from '@/Components/admin/Pagination';
import StatusBadge from '@/Components/admin/StatusBadge';
import Table from '@/Components/admin/Table';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';

function StatTile({ label, value }) {
    return (
        <div className="rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800">
            <div className="text-sm text-gray-500 dark:text-gray-400">
                {label}
            </div>
            <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {value}
            </div>
        </div>
    );
}

export default function TenantsListScreen({ tenants, stats }) {
    const [createOpen, setCreateOpen] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        code: '',
        timezone: 'Asia/Manila',
    });

    function submit(e) {
        e.preventDefault();
        post(route('platform.tenants.store'), {
            onSuccess: () => {
                setCreateOpen(false);
                reset();
            },
        });
    }

    return (
        <PlatformLayout
            header={
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                        Tenants
                    </h2>
                    <PrimaryButton type="button" onClick={() => setCreateOpen(true)}>
                        Add Tenant
                    </PrimaryButton>
                </div>
            }
        >
            <Head title="Tenants" />

            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <StatTile label="Tenants" value={stats.tenant_count} />
                    <StatTile label="Active Tenants" value={stats.active_tenant_count} />
                    <StatTile label="Stations" value={stats.station_count} />
                    <StatTile label="Active Stations" value={stats.active_station_count} />
                </div>

                <Table>
                    <Table.Head>
                        <Table.Th>Name</Table.Th>
                        <Table.Th>Code</Table.Th>
                        <Table.Th>Timezone</Table.Th>
                        <Table.Th>Status</Table.Th>
                        <Table.Th>
                            <span className="sr-only">Actions</span>
                        </Table.Th>
                    </Table.Head>
                    <Table.Body>
                        {tenants.data.length === 0 && (
                            <Table.Empty colSpan={5}>No tenants yet.</Table.Empty>
                        )}

                        {tenants.data.map((tenant) => (
                            <tr key={tenant.id}>
                                <Table.Td className="font-medium text-gray-900 dark:text-gray-100">
                                    {tenant.name}
                                </Table.Td>
                                <Table.Td className="font-mono">{tenant.code}</Table.Td>
                                <Table.Td>{tenant.timezone}</Table.Td>
                                <Table.Td>
                                    <StatusBadge
                                        color={tenant.status === 'active' ? 'green' : 'gray'}
                                    >
                                        {tenant.status}
                                    </StatusBadge>
                                </Table.Td>
                                <Table.Td className="text-right">
                                    <Link
                                        href={route('platform.tenants.show', tenant.id)}
                                        className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                                    >
                                        Manage
                                    </Link>
                                </Table.Td>
                            </tr>
                        ))}
                    </Table.Body>
                </Table>

                <Pagination links={tenants.links} />
            </div>

            <Modal show={createOpen} onClose={() => setCreateOpen(false)}>
                <form onSubmit={submit} className="p-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        Add Tenant
                    </h3>

                    <div className="mt-4">
                        <InputLabel htmlFor="name" value="School name" />
                        <TextInput
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            className="mt-1 block w-full"
                            isFocused
                            required
                        />
                        <InputError message={errors.name} className="mt-2" />
                    </div>

                    <div className="mt-4">
                        <InputLabel htmlFor="code" value="Code (short, unique)" />
                        <TextInput
                            id="code"
                            value={data.code}
                            onChange={(e) => setData('code', e.target.value)}
                            className="mt-1 block w-full"
                            required
                        />
                        <InputError message={errors.code} className="mt-2" />
                    </div>

                    <div className="mt-4">
                        <InputLabel htmlFor="timezone" value="Timezone (e.g. Asia/Manila)" />
                        <TextInput
                            id="timezone"
                            value={data.timezone}
                            onChange={(e) => setData('timezone', e.target.value)}
                            className="mt-1 block w-full"
                            required
                        />
                        <InputError message={errors.timezone} className="mt-2" />
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

import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import DangerButton from '@/Components/DangerButton';
import TextInput from '@/Components/TextInput';
import SecretOnceCallout from '@/Components/SecretOnceCallout';
import StatusBadge from '@/Components/admin/StatusBadge';
import Table from '@/Components/admin/Table';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';

export default function TenantDetailScreen({ tenant, admins, stations }) {
    const { flash } = usePage().props;

    const [createAdminOpen, setCreateAdminOpen] = useState(false);
    const adminForm = useForm({ name: '', email: '' });

    function submitAdmin(e) {
        e.preventDefault();
        adminForm.post(route('platform.tenants.admins.store', tenant.id), {
            onSuccess: () => {
                setCreateAdminOpen(false);
                adminForm.reset();
            },
        });
    }

    function toggleStatus() {
        const nextStatus = tenant.status === 'active' ? 'suspended' : 'active';

        if (
            nextStatus === 'suspended' &&
            !confirm('Suspend this tenant? Its stations and portal will stop working until reactivated.')
        ) {
            return;
        }

        router.patch(route('platform.tenants.status', tenant.id), { status: nextStatus });
    }

    return (
        <PlatformLayout
            header={
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                            {tenant.name}
                        </h2>
                        <StatusBadge color={tenant.status === 'active' ? 'green' : 'gray'}>
                            {tenant.status}
                        </StatusBadge>
                    </div>
                    {tenant.status === 'active' ? (
                        <DangerButton type="button" onClick={toggleStatus}>
                            Suspend
                        </DangerButton>
                    ) : (
                        <PrimaryButton type="button" onClick={toggleStatus}>
                            Reactivate
                        </PrimaryButton>
                    )}
                </div>
            }
        >
            <Head title={tenant.name} />

            <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
                <Link
                    href={route('platform.tenants.index')}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                >
                    Back to Tenants
                </Link>

                <SecretOnceCallout label="Temporary password" value={flash?.temporaryPassword} />

                <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                            Admin Users
                        </h3>
                        <PrimaryButton type="button" onClick={() => setCreateAdminOpen(true)}>
                            Add Admin
                        </PrimaryButton>
                    </div>

                    <Table>
                        <Table.Head>
                            <Table.Th>Name</Table.Th>
                            <Table.Th>Email</Table.Th>
                            <Table.Th>Status</Table.Th>
                        </Table.Head>
                        <Table.Body>
                            {admins.length === 0 && (
                                <Table.Empty colSpan={3}>No admin users yet.</Table.Empty>
                            )}

                            {admins.map((admin) => (
                                <tr key={admin.id}>
                                    <Table.Td className="font-medium text-gray-900 dark:text-gray-100">
                                        {admin.name}
                                    </Table.Td>
                                    <Table.Td>{admin.email}</Table.Td>
                                    <Table.Td>
                                        <StatusBadge color={admin.is_active ? 'green' : 'gray'}>
                                            {admin.is_active ? 'Active' : 'Inactive'}
                                        </StatusBadge>
                                    </Table.Td>
                                </tr>
                            ))}
                        </Table.Body>
                    </Table>
                </div>

                <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
                    <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-gray-100">
                        Stations
                    </h3>

                    <Table>
                        <Table.Head>
                            <Table.Th>Name</Table.Th>
                            <Table.Th>Code</Table.Th>
                            <Table.Th>Status</Table.Th>
                        </Table.Head>
                        <Table.Body>
                            {stations.length === 0 && (
                                <Table.Empty colSpan={3}>No stations yet.</Table.Empty>
                            )}

                            {stations.map((station) => (
                                <tr key={station.id}>
                                    <Table.Td className="font-medium text-gray-900 dark:text-gray-100">
                                        {station.name}
                                    </Table.Td>
                                    <Table.Td className="font-mono">{station.station_code}</Table.Td>
                                    <Table.Td>
                                        <StatusBadge
                                            color={station.status === 'active' ? 'green' : 'yellow'}
                                        >
                                            {station.status}
                                        </StatusBadge>
                                    </Table.Td>
                                </tr>
                            ))}
                        </Table.Body>
                    </Table>

                    <Link
                        href={route('platform.stations.index')}
                        className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                    >
                        Manage stations →
                    </Link>
                </div>
            </div>

            <Modal show={createAdminOpen} onClose={() => setCreateAdminOpen(false)}>
                <form onSubmit={submitAdmin} className="p-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        Add Admin User
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        A temporary password will be generated and shown once. Relay
                        it to the school administrator directly.
                    </p>

                    <div className="mt-4">
                        <InputLabel htmlFor="admin_name" value="Name" />
                        <TextInput
                            id="admin_name"
                            value={adminForm.data.name}
                            onChange={(e) => adminForm.setData('name', e.target.value)}
                            className="mt-1 block w-full"
                            isFocused
                            required
                        />
                        <InputError message={adminForm.errors.name} className="mt-2" />
                    </div>

                    <div className="mt-4">
                        <InputLabel htmlFor="admin_email" value="Email" />
                        <TextInput
                            id="admin_email"
                            type="email"
                            value={adminForm.data.email}
                            onChange={(e) => adminForm.setData('email', e.target.value)}
                            className="mt-1 block w-full"
                            required
                        />
                        <InputError message={adminForm.errors.email} className="mt-2" />
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={() => setCreateAdminOpen(false)}>
                            Cancel
                        </SecondaryButton>
                        <PrimaryButton disabled={adminForm.processing}>Create</PrimaryButton>
                    </div>
                </form>
            </Modal>
        </PlatformLayout>
    );
}

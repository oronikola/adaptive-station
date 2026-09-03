import StatusBadge from '@/Components/admin/StatusBadge';
import Table from '@/Components/admin/Table';
import PrimaryButton from '@/Components/PrimaryButton';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link } from '@inertiajs/react';

const statusLabels = {
    active: 'Active',
    disabled: 'Disabled',
    error: 'Error',
};

export default function IntegrationsListScreen({ profiles }) {
    return (
        <AdminLayout
            header={
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                        Integrations
                    </h2>
                    <Link href={route('portal.integrations.create')}>
                        <PrimaryButton type="button">New Integration Profile</PrimaryButton>
                    </Link>
                </div>
            }
        >
            <Head title="Integrations" />

            <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
                <Table>
                    <Table.Head>
                        <Table.Th>Name</Table.Th>
                        <Table.Th>Driver</Table.Th>
                        <Table.Th>Direction</Table.Th>
                        <Table.Th>Status</Table.Th>
                        <Table.Th>Last Successful Run</Table.Th>
                        <Table.Th>
                            <span className="sr-only">Actions</span>
                        </Table.Th>
                    </Table.Head>
                    <Table.Body>
                        {profiles.length === 0 && (
                            <Table.Empty colSpan={6}>No integration profiles yet.</Table.Empty>
                        )}

                        {profiles.map((profile) => (
                            <tr key={profile.id}>
                                <Table.Td className="font-medium text-gray-900 dark:text-gray-100">
                                    {profile.name}
                                </Table.Td>
                                <Table.Td className="font-mono">{profile.driver}</Table.Td>
                                <Table.Td>{profile.direction}</Table.Td>
                                <Table.Td>
                                    <StatusBadge color={profile.status === 'active' ? 'green' : profile.status === 'error' ? 'red' : 'gray'}>
                                        {statusLabels[profile.status] ?? profile.status}
                                    </StatusBadge>
                                </Table.Td>
                                <Table.Td>
                                    {profile.last_successful_run_at
                                        ? new Date(profile.last_successful_run_at).toLocaleString()
                                        : 'Never'}
                                </Table.Td>
                                <Table.Td className="text-right">
                                    <Link
                                        href={route('portal.integrations.edit', profile.id)}
                                        className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                                    >
                                        Manage
                                    </Link>
                                </Table.Td>
                            </tr>
                        ))}
                    </Table.Body>
                </Table>
            </div>
        </AdminLayout>
    );
}

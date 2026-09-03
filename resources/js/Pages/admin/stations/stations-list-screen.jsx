import Pagination from '@/Components/admin/Pagination';
import StatusBadge from '@/Components/admin/StatusBadge';
import Table from '@/Components/admin/Table';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link } from '@inertiajs/react';

const statusLabels = {
    pending_activation: 'Pending Activation',
    active: 'Active',
    disabled: 'Disabled',
    retired: 'Retired',
};

export default function StationsListScreen({ stations }) {
    return (
        <AdminLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                    Stations
                </h2>
            }
        >
            <Head title="Stations" />

            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                <Table>
                    <Table.Head>
                        <Table.Th>Name</Table.Th>
                        <Table.Th>Code</Table.Th>
                        <Table.Th>Status</Table.Th>
                        <Table.Th>Connectivity</Table.Th>
                        <Table.Th>App Version</Table.Th>
                        <Table.Th>Pending Events</Table.Th>
                        <Table.Th>Last Seen</Table.Th>
                        <Table.Th>
                            <span className="sr-only">Actions</span>
                        </Table.Th>
                    </Table.Head>
                    <Table.Body>
                        {stations.data.length === 0 && (
                            <Table.Empty colSpan={8}>
                                No stations registered yet.
                            </Table.Empty>
                        )}

                        {stations.data.map((station) => (
                            <tr key={station.id}>
                                <Table.Td className="font-medium text-gray-900 dark:text-gray-100">
                                    {station.name}
                                </Table.Td>
                                <Table.Td className="font-mono">
                                    {station.station_code}
                                </Table.Td>
                                <Table.Td>
                                    <StatusBadge
                                        color={
                                            station.status === 'active'
                                                ? 'green'
                                                : station.status === 'disabled' ||
                                                    station.status === 'retired'
                                                  ? 'red'
                                                  : 'yellow'
                                        }
                                    >
                                        {statusLabels[station.status] ?? station.status}
                                    </StatusBadge>
                                </Table.Td>
                                <Table.Td>
                                    <StatusBadge
                                        color={station.is_online ? 'green' : 'gray'}
                                    >
                                        {station.is_online ? 'Online' : 'Offline'}
                                    </StatusBadge>
                                </Table.Td>
                                <Table.Td>{station.app_version ?? '—'}</Table.Td>
                                <Table.Td>
                                    {station.last_pending_count ?? '—'}
                                </Table.Td>
                                <Table.Td>
                                    {station.last_seen_at
                                        ? new Date(station.last_seen_at).toLocaleString()
                                        : 'Never'}
                                </Table.Td>
                                <Table.Td className="text-right">
                                    <Link
                                        href={route('portal.stations.show', station.id)}
                                        className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                                    >
                                        Manage
                                    </Link>
                                </Table.Td>
                            </tr>
                        ))}
                    </Table.Body>
                </Table>

                <Pagination links={stations.links} />
            </div>
        </AdminLayout>
    );
}

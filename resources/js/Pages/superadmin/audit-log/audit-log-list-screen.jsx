import Pagination from '@/Components/admin/Pagination';
import Table from '@/Components/admin/Table';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Head } from '@inertiajs/react';

export default function AuditLogListScreen({ logs }) {
    return (
        <PlatformLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                    Audit Log
                </h2>
            }
        >
            <Head title="Audit Log" />

            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                <Table>
                    <Table.Head>
                        <Table.Th>When</Table.Th>
                        <Table.Th>Tenant</Table.Th>
                        <Table.Th>Actor</Table.Th>
                        <Table.Th>Action</Table.Th>
                        <Table.Th>Entity</Table.Th>
                    </Table.Head>
                    <Table.Body>
                        {logs.data.length === 0 && (
                            <Table.Empty colSpan={5}>No audit log entries yet.</Table.Empty>
                        )}

                        {logs.data.map((log) => (
                            <tr key={log.id}>
                                <Table.Td>
                                    {new Date(log.created_at).toLocaleString()}
                                </Table.Td>
                                <Table.Td>{log.tenant?.name ?? '—'}</Table.Td>
                                <Table.Td className="capitalize">{log.actor_type}</Table.Td>
                                <Table.Td className="font-mono">{log.action}</Table.Td>
                                <Table.Td>
                                    {log.entity_type ?? '—'}
                                    {log.entity_id ? ` #${log.entity_id.slice(0, 8)}` : ''}
                                </Table.Td>
                            </tr>
                        ))}
                    </Table.Body>
                </Table>

                <Pagination links={logs.links} />
            </div>
        </PlatformLayout>
    );
}

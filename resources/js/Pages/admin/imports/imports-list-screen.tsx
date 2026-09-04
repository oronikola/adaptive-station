import Pagination from '@/Components/admin/Pagination';
import StatusBadge from '@/Components/admin/StatusBadge';
import Table from '@/Components/admin/Table';
import PrimaryButton from '@/Components/PrimaryButton';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link } from '@inertiajs/react';
import type { PaginatedData } from '@/types';

interface ImportBatch {
    id: number;
    source_system: string;
    source_description: string | null;
    status: string;
    started_at: string | null;
}

const statusColors: Record<string, string> = {
    completed: 'green',
    completed_with_exceptions: 'yellow',
    failed: 'red',
    importing: 'yellow',
    validating: 'yellow',
    draft: 'gray',
};

export default function ImportsListScreen({ batches }: { batches: PaginatedData<ImportBatch> }) {
    return (
        <AdminLayout
            header={
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                        Legacy Imports
                    </h2>
                    <Link href={route('portal.imports.create')}>
                        <PrimaryButton type="button">New Import</PrimaryButton>
                    </Link>
                </div>
            }
        >
            <Head title="Legacy Imports" />

            <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
                <Table>
                    <Table.Head>
                        <Table.Th>Description</Table.Th>
                        <Table.Th>Status</Table.Th>
                        <Table.Th>Started</Table.Th>
                        <Table.Th>
                            <span className="sr-only">Actions</span>
                        </Table.Th>
                    </Table.Head>
                    <Table.Body>
                        {batches.data.length === 0 && (
                            <Table.Empty colSpan={4}>No imports run yet.</Table.Empty>
                        )}

                        {batches.data.map((batch: ImportBatch) => (
                            <tr key={batch.id}>
                                <Table.Td className="font-medium text-gray-900 dark:text-gray-100">
                                    {batch.source_description ?? batch.source_system}
                                </Table.Td>
                                <Table.Td>
                                    <StatusBadge color={(statusColors[batch.status] ?? 'gray') as 'green' | 'gray' | 'red' | 'yellow'}>
                                        {batch.status}
                                    </StatusBadge>
                                </Table.Td>
                                <Table.Td>
                                    {batch.started_at ? new Date(batch.started_at).toLocaleString() : '—'}
                                </Table.Td>
                                <Table.Td className="text-right">
                                    <Link
                                        href={route('portal.imports.show', batch.id)}
                                        className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                                    >
                                        View
                                    </Link>
                                </Table.Td>
                            </tr>
                        ))}
                    </Table.Body>
                </Table>

                <Pagination links={batches.links} />
            </div>
        </AdminLayout>
    );
}

import Pagination from '@/Components/admin/Pagination';
import StatusBadge from '@/Components/admin/StatusBadge';
import Table from '@/Components/admin/Table';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router } from '@inertiajs/react';
import type { PaginatedData } from '@/types';

interface ImportBatch {
    id: number;
    source_system: string;
    source_description: string | null;
}

interface ImportException {
    id: number;
    entity_type: string;
    source_record_id: string | null;
    exception_type: string;
    resolution: 'open' | 'resolved' | 'ignored';
}

interface ExceptionsFilters {
    resolution?: string;
}

export default function ImportsExceptionsListScreen({ batch, exceptions, filters }: { batch: ImportBatch; exceptions: PaginatedData<ImportException>; filters: ExceptionsFilters }) {
    function resolve(exception: ImportException, resolution: string) {
        const note = window.prompt('Optional note for this resolution:') ?? '';
        router.patch(route('portal.imports.exceptions.resolve', [batch.id, exception.id] as unknown as Record<string, unknown>), {
            resolution,
            note: note || null,
        });
    }

    return (
        <AdminLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                    Exceptions — {batch.source_description ?? batch.source_system}
                </h2>
            }
        >
            <Head title="Import Exceptions" />

            <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
                <Link
                    href={route('portal.imports.show', batch.id)}
                    className="mb-4 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                >
                    Back to Import
                </Link>

                <Table>
                    <Table.Head>
                        <Table.Th>Entity</Table.Th>
                        <Table.Th>Source Record</Table.Th>
                        <Table.Th>Type</Table.Th>
                        <Table.Th>Resolution</Table.Th>
                        <Table.Th>
                            <span className="sr-only">Actions</span>
                        </Table.Th>
                    </Table.Head>
                    <Table.Body>
                        {exceptions.data.length === 0 && (
                            <Table.Empty colSpan={5}>No exceptions{filters.resolution ? ` with resolution "${filters.resolution}"` : ''}.</Table.Empty>
                        )}

                        {exceptions.data.map((exception: ImportException) => (
                            <tr key={exception.id}>
                                <Table.Td>{exception.entity_type}</Table.Td>
                                <Table.Td className="font-mono">{exception.source_record_id ?? '—'}</Table.Td>
                                <Table.Td>{exception.exception_type}</Table.Td>
                                <Table.Td>
                                    <StatusBadge color={exception.resolution === 'open' ? 'yellow' : exception.resolution === 'resolved' ? 'green' : 'gray'}>
                                        {exception.resolution}
                                    </StatusBadge>
                                </Table.Td>
                                <Table.Td className="text-right">
                                    {exception.resolution === 'open' && (
                                        <div className="flex justify-end gap-3">
                                            <button
                                                type="button"
                                                onClick={() => resolve(exception, 'resolved')}
                                                className="font-medium text-[#174a96] hover:text-[#2863bd] dark:text-indigo-400"
                                            >
                                                Resolve
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => resolve(exception, 'ignored')}
                                                className="font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400"
                                            >
                                                Ignore
                                            </button>
                                        </div>
                                    )}
                                </Table.Td>
                            </tr>
                        ))}
                    </Table.Body>
                </Table>

                <Pagination links={exceptions.links} />
            </div>
        </AdminLayout>
    );
}

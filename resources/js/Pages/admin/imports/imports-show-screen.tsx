import StatusBadge from '@/Components/admin/StatusBadge';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link } from '@inertiajs/react';

interface ImportBatch {
    id: number;
    source_system: string;
    source_description: string | null;
    status: string;
    summary?: {
        source?: number;
        imported?: number;
        skipped_known?: number;
        rejected?: number;
        manual_review?: number;
    } | null;
}

const statusColors: Record<string, string> = {
    completed: 'green',
    completed_with_exceptions: 'yellow',
    failed: 'red',
    importing: 'yellow',
    validating: 'yellow',
    draft: 'gray',
};

function Count({ label, value }: { label: string; value: number | undefined }) {
    return (
        <div className="rounded-lg bg-white p-4 text-center shadow-sm dark:bg-gray-800">
            <div className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{value ?? '—'}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
        </div>
    );
}

export default function ImportsShowScreen({ batch, openExceptionCount }: { batch: ImportBatch; openExceptionCount: number }) {
    const summary = batch.summary ?? {};

    return (
        <AdminLayout
            header={
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                        {batch.source_description ?? batch.source_system}
                    </h2>
                    <StatusBadge color={(statusColors[batch.status] ?? 'gray') as 'green' | 'gray' | 'red' | 'yellow'}>{batch.status}</StatusBadge>
                </div>
            }
        >
            <Head title="Import Batch" />

            <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
                <Link
                    href={route('portal.imports.index')}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                >
                    Back to Imports
                </Link>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                    <Count label="Source" value={summary.source} />
                    <Count label="Imported" value={summary.imported} />
                    <Count label="Skipped (known)" value={summary.skipped_known} />
                    <Count label="Rejected" value={summary.rejected} />
                    <Count label="Manual Review" value={summary.manual_review} />
                </div>

                {openExceptionCount > 0 && (
                    <div className="rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:border-yellow-900 dark:bg-yellow-900/30 dark:text-yellow-300">
                        {openExceptionCount} exception(s) still need review before this migration can be signed off.
                    </div>
                )}

                <Link
                    href={route('portal.imports.exceptions.index', batch.id)}
                    className="inline-block font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                >
                    View Exceptions →
                </Link>
            </div>
        </AdminLayout>
    );
}

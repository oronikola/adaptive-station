import Pagination from '@/Components/admin/Pagination';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link } from '@inertiajs/react';
import type { PaginatedData } from '@/types';
import '../../../../css/platform-dashboard.css';
import '../../../../css/platform-overview.css';

interface ImportBatch {
    id: number;
    source_system: string;
    source_description: string | null;
    status: string;
    started_at: string | null;
}

const STATUS_PILL_CLASS: Record<string, string> = {
    completed: 'pf-pill--active',
    completed_with_exceptions: 'pf-pill--warning',
    failed: 'pf-pill--danger',
    importing: 'pf-pill--in-progress',
    validating: 'pf-pill--in-progress',
    draft: 'pf-pill--inactive',
};

const STATUS_LABELS: Record<string, string> = {
    completed: 'Completed',
    completed_with_exceptions: 'Completed with exceptions',
    failed: 'Failed',
    importing: 'Importing…',
    validating: 'Validating…',
    draft: 'Draft',
};

export default function ImportsListScreen({ batches }: { batches: PaginatedData<ImportBatch> }) {
    return (
        <AdminLayout>
            <Head title="Imports" />

            <div className="pf-dashboard pft-page">
                <div className="pft-hero">
                    <div className="pft-hero-main">
                        <span className="pft-hero-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24">
                                <rect x="4" y="15.4" width="16" height="4.6" rx="1.4" />
                                <rect x="10.6" y="4" width="2.8" height="7.4" rx="1.2" />
                                <polygon points="7.4,11 16.6,11 12,15.6" />
                            </svg>
                        </span>
                        <div>
                            <h1 className="pft-hero-title">Imports</h1>
                            <p className="pft-hero-subtitle">
                                Review every data import batch for your school.
                            </p>
                        </div>
                    </div>
                    <div className="pft-hero-actions">
                        <Link href={route('portal.imports.csv.create')} className="pf-btn pf-btn-secondary">
                            <svg viewBox="0 0 24 24">
                                <path d="M12 5v14M5 12h14" />
                            </svg>
                            Upload CSV
                        </Link>
                        <Link href={route('portal.imports.create')} className="pf-btn pf-btn-primary">
                            <svg viewBox="0 0 24 24">
                                <path d="M12 5v14M5 12h14" />
                            </svg>
                            New Import
                        </Link>
                    </div>
                </div>

                <div className="pf-panel">
                    <div className="pf-panel-header">
                        <div>
                            <h2 className="pf-panel-title">Import Batches</h2>
                            <p className="pf-panel-count">
                                {batches.from !== null ? `${batches.from}–${batches.to} of ${batches.total}` : 'No results'}
                            </p>
                        </div>
                    </div>

                    <div className="pf-table-wrap">
                        <table className="pf-table">
                            <thead>
                                <tr>
                                    <th scope="col">Description</th>
                                    <th scope="col">Status</th>
                                    <th scope="col">Started</th>
                                    <th scope="col">
                                        <span className="sr-only">Actions</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {batches.data.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="pf-empty">
                                            No imports run yet.{' '}
                                            <Link href={route('portal.imports.create')} className="pf-row-action" style={{ display: 'inline', marginLeft: 4 }}>
                                                Start your first import →
                                            </Link>
                                        </td>
                                    </tr>
                                )}

                                {batches.data.map((batch: ImportBatch) => (
                                    <tr key={batch.id}>
                                        <td className="pf-tenant-name">
                                            {batch.source_description ?? batch.source_system}
                                        </td>
                                        <td>
                                            <span
                                                className={
                                                    'pf-pill ' +
                                                    (STATUS_PILL_CLASS[batch.status] ?? 'pf-pill--inactive')
                                                }
                                            >
                                                {STATUS_LABELS[batch.status] ?? batch.status}
                                            </span>
                                        </td>
                                        <td className="pft-created">
                                            {batch.started_at ? new Date(batch.started_at).toLocaleString() : '—'}
                                        </td>
                                        <td>
                                            <Link
                                                href={route('portal.imports.show', batch.id)}
                                                className="pf-row-action"
                                            >
                                                View
                                                <svg viewBox="0 0 24 24">
                                                    <path d="M9 6l6 6-6 6" />
                                                </svg>
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <Pagination links={batches.links} />
                </div>
            </div>
        </AdminLayout>
    );
}

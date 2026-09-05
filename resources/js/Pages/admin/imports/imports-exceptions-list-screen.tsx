import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router } from '@inertiajs/react';
import type { PaginatedData, PaginationLink } from '@/types';
import '../../../../css/platform-dashboard.css';
import '../../../../css/platform-overview.css';

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

const RESOLUTION_PILL_CLASS: Record<ImportException['resolution'], string> = {
    open: 'pft-pill--suspended',
    resolved: 'pf-pill--active',
    ignored: 'pf-pill--inactive',
};

function PaginationBar({ links }: { links: PaginationLink[] }) {
    if (!links || links.length <= 3) {
        return null;
    }

    return (
        <nav className="pf-pagination">
            {links.map((link: PaginationLink, index: number) => {
                const label = link.label
                    .replace('&laquo; Previous', '‹ Previous')
                    .replace('Next &raquo;', 'Next ›');

                if (link.url === null) {
                    return (
                        <span key={index} className="pf-page-link pf-page-link--disabled">
                            {label}
                        </span>
                    );
                }

                return (
                    <Link
                        key={index}
                        href={link.url}
                        preserveScroll
                        className={
                            'pf-page-link' +
                            (link.active ? ' pf-page-link--active' : '')
                        }
                    >
                        {label}
                    </Link>
                );
            })}
        </nav>
    );
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
        <AdminLayout>
            <Head title="Import Exceptions" />

            <div className="pf-dashboard">
                <div className="pf-dashboard-header">
                    <div>
                        <p className="pf-dashboard-kicker">Admin overview</p>
                        <h1 className="pf-dashboard-title">
                            Exceptions — {batch.source_description ?? batch.source_system}
                        </h1>
                        <p className="pf-dashboard-subtitle">
                            Records that need manual review or were skipped during matching.
                        </p>
                    </div>
                </div>

                <Link href={route('portal.imports.show', batch.id)} className="pft-panel-link" style={{ marginBottom: 14 }}>
                    <svg viewBox="0 0 24 24">
                        <path d="m15 6-6 6 6 6" />
                    </svg>
                    Back to Import
                </Link>

                <div className="pf-panel">
                    <div className="pf-panel-header">
                        <div>
                            <h2 className="pf-panel-title">Exceptions</h2>
                            <p className="pf-panel-count">
                                {exceptions.data.length} shown
                            </p>
                        </div>
                    </div>

                    <div className="pf-table-wrap">
                        <table className="pf-table">
                            <thead>
                                <tr>
                                    <th scope="col">Entity</th>
                                    <th scope="col">Source Record</th>
                                    <th scope="col">Type</th>
                                    <th scope="col">Resolution</th>
                                    <th scope="col">
                                        <span className="sr-only">Actions</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {exceptions.data.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="pf-empty">
                                            No exceptions{filters.resolution ? ` with resolution "${filters.resolution}"` : ''}.
                                        </td>
                                    </tr>
                                )}

                                {exceptions.data.map((exception: ImportException) => (
                                    <tr key={exception.id}>
                                        <td>{exception.entity_type}</td>
                                        <td className="font-mono">{exception.source_record_id ?? '—'}</td>
                                        <td>{exception.exception_type}</td>
                                        <td>
                                            <span
                                                className={
                                                    'pf-pill ' + RESOLUTION_PILL_CLASS[exception.resolution]
                                                }
                                            >
                                                {exception.resolution}
                                            </span>
                                        </td>
                                        <td>
                                            {exception.resolution === 'open' && (
                                                <div className="pft-row-actions">
                                                    <button
                                                        type="button"
                                                        onClick={() => resolve(exception, 'resolved')}
                                                        className="pf-row-action"
                                                    >
                                                        <svg viewBox="0 0 24 24">
                                                            <path d="M20 6 9 17l-5-5" />
                                                        </svg>
                                                        Resolve
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => resolve(exception, 'ignored')}
                                                        className="pf-row-action"
                                                    >
                                                        <svg viewBox="0 0 24 24">
                                                            <path d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                        Ignore
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <PaginationBar links={exceptions.links} />
                </div>
            </div>
        </AdminLayout>
    );
}

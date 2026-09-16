import { ChevronLeftIcon } from '@/Components/icons/chevron-left';
import { ChevronRightIcon } from '@/Components/icons/chevron-right';
import { DownloadIcon } from '@/Components/icons/download';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link } from '@inertiajs/react';
import '../../../../css/platform-dashboard.css';
import '../../../../css/platform-overview.css';

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
        guardians_created?: number;
        guardians_linked?: number;
        new_parent_account_ids?: string[];
    } | null;
}

const STATUS_PILL_CLASS: Record<string, string> = {
    completed: 'pf-pill--active',
    completed_with_exceptions: 'pf-pill--suspended',
    failed: 'pf-pill--danger',
    importing: 'pf-pill--suspended',
    validating: 'pf-pill--suspended',
    draft: 'pf-pill--inactive',
};

function StatCard({ label, value }: { label: string; value: number | undefined }) {
    return (
        <div className="pf-stat-card">
            <div>
                <p className="pf-stat-label">{label}</p>
                <p className="pf-stat-value">{value ?? '—'}</p>
            </div>
        </div>
    );
}

export default function ImportsShowScreen({ batch, openExceptionCount }: { batch: ImportBatch; openExceptionCount: number }) {
    const summary = batch.summary ?? {};

    return (
        <AdminLayout>
            <Head title="Import Batch" />

            <div className="pf-dashboard pft-page">
                <Link href={route('portal.imports.index')} className="pft-panel-link" style={{ marginBottom: 14 }}>
                    <ChevronLeftIcon size={14} />
                    Back to Imports
                </Link>

                <div className="pft-hero">
                    <div className="pft-hero-main">
                        <span className="pft-hero-icon" aria-hidden="true">
                            <DownloadIcon size={22} />
                        </span>
                        <div>
                            <h1 className="pft-hero-title">
                                {batch.source_description ?? batch.source_system}
                            </h1>
                        </div>
                    </div>
                    <div className="pft-hero-actions">
                        <span
                            className={
                                'pf-pill ' +
                                (STATUS_PILL_CLASS[batch.status] ?? 'pf-pill--inactive')
                            }
                        >
                            {batch.status}
                        </span>
                    </div>
                </div>

                <div className="pf-stat-grid">
                    <StatCard label="Source" value={summary.source} />
                    <StatCard label="Imported" value={summary.imported} />
                    <StatCard label="Skipped (known)" value={summary.skipped_known} />
                    <StatCard label="Rejected" value={summary.rejected} />
                    <StatCard label="Manual Review" value={summary.manual_review} />
                    {(summary.guardians_created !== undefined || summary.guardians_linked !== undefined) && (
                        <>
                            <StatCard label="Guardians Created" value={summary.guardians_created} />
                            <StatCard label="Guardians Linked" value={summary.guardians_linked} />
                        </>
                    )}
                </div>

                {(summary.new_parent_account_ids?.length ?? 0) > 0 && (
                    <div className="pf-notice" style={{ marginBottom: 20 }}>
                        {summary.new_parent_account_ids!.length} new guardian account(s) were created with generated
                        passwords.{' '}
                        <a href={route('portal.imports.credentials', batch.id)} className="pft-panel-link" style={{ display: 'inline-flex' }}>
                            Download credentials CSV
                        </a>
                    </div>
                )}

                {openExceptionCount > 0 && (
                    <div className="pf-notice" style={{ marginBottom: 20 }}>
                        {openExceptionCount} exception(s) still need review before this migration can be signed off.
                    </div>
                )}

                <div className="pf-panel">
                    <div className="pf-panel-header">
                        <div>
                            <h2 className="pf-panel-title">Exceptions</h2>
                            <p className="pf-panel-count">
                                Records that need manual review or were skipped during matching.
                            </p>
                        </div>
                        <Link href={route('portal.imports.exceptions.index', batch.id)} className="pft-panel-link">
                            View Exceptions
                            <ChevronRightIcon size={14} />
                        </Link>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}

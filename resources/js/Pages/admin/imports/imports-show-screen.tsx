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
    } | null;
}

const STATUS_PILL_CLASS: Record<string, string> = {
    completed: 'pf-pill--active',
    completed_with_exceptions: 'pft-pill--suspended',
    failed: 'pf-pill--danger',
    importing: 'pft-pill--suspended',
    validating: 'pft-pill--suspended',
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
                    <svg viewBox="0 0 24 24">
                        <path d="m15 6-6 6 6 6" />
                    </svg>
                    Back to Imports
                </Link>

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
                </div>

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
                            <svg viewBox="0 0 24 24">
                                <path d="M9 6l6 6-6 6" />
                            </svg>
                        </Link>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}

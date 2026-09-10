import InputError from '@/Components/InputError';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm } from '@inertiajs/react';
import '../../../../css/platform-dashboard.css';
import '../../../../css/platform-overview.css';

interface IntegrationProfile {
    id: number | string;
    name: string;
}

export default function ImportsCreateScreen({ profiles }: { profiles: IntegrationProfile[] }) {
    const { data, setData, post, processing, errors } = useForm({
        integration_profile_id: profiles[0]?.id ?? '',
        date_from: '',
        date_to: '',
        commit: false,
    });

    function submit(commit: boolean) {
        return (e: React.MouseEvent<HTMLButtonElement>) => {
            e.preventDefault();
            setData('commit', commit);
            post(route('portal.imports.store'));
        };
    }

    return (
        <AdminLayout>
            <Head title="New Legacy Import" />

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
                            <h1 className="pft-hero-title">New Legacy Import</h1>
                            <p className="pft-hero-subtitle">
                                Migrate attendance history from a connected legacy database.{' '}
                                <strong>Preview</strong> runs read-only — nothing is written.{' '}
                                <strong>Commit</strong> performs the real migration; re-running Commit is always safe — already-imported rows are skipped, never duplicated.
                            </p>
                        </div>
                    </div>
                </div>

                {profiles.length === 0 ? (
                    <div
                        className="pf-panel"
                        style={{ padding: 32, textAlign: 'center' }}
                    >
                        <svg viewBox="0 0 24 24" style={{ width: 40, height: 40, fill: 'none', stroke: 'var(--as-text-muted)', strokeWidth: 1.5, strokeLinecap: 'round', margin: '0 auto 12px' }}>
                            <circle cx="7" cy="12" r="3.4" />
                            <rect x="9" y="10.3" width="6" height="3.4" rx="1.2" />
                            <circle cx="17" cy="12" r="3.4" />
                        </svg>
                        <p style={{ fontWeight: 600, color: 'var(--as-text)', marginBottom: 6 }}>No integration profiles</p>
                        <p className="pf-field-hint" style={{ marginBottom: 16 }}>
                            Create an integration profile first to connect to a legacy database before running an import.
                        </p>
                        <a href={route('portal.integrations.create')} className="pf-btn pf-btn-primary">
                            <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>
                            New Integration Profile
                        </a>
                    </div>
                ) : (
                    <div className="pf-panel">
                        <div className="pf-panel-header">
                            <div>
                                <h2 className="pf-panel-title">Import settings</h2>
                                <p className="pf-panel-count">
                                    Choose a source profile and the attendance date range to migrate.
                                </p>
                            </div>
                        </div>

                        <form className="pft-form-panel">
                            <div className="pf-field">
                                <label htmlFor="integration_profile_id">Integration profile</label>
                                <select
                                    id="integration_profile_id"
                                    value={data.integration_profile_id}
                                    onChange={(e) => setData('integration_profile_id', e.target.value)}
                                >
                                    {profiles.map((profile: IntegrationProfile) => (
                                        <option key={profile.id} value={profile.id}>
                                            {profile.name}
                                        </option>
                                    ))}
                                </select>
                                <p className="pf-field-hint">Defines which legacy database to read from and how tables are mapped.</p>
                                <InputError message={errors.integration_profile_id} className="mt-2" />
                            </div>

                            {/* Date range section */}
                            <div
                                style={{
                                    padding: '16px 18px',
                                    borderRadius: 16,
                                    border: '1px solid var(--as-border)',
                                    background: 'var(--as-surface)',
                                    marginBottom: 4,
                                }}
                            >
                                <p style={{ margin: '0 0 12px', fontWeight: 600, fontSize: 13, color: 'var(--as-text)' }}>
                                    Attendance date range
                                </p>
                                <p className="pf-field-hint" style={{ marginBottom: 14, marginTop: 0 }}>
                                    Only tap records within this range will be imported.
                                    Leave both blank to import all available history from the source.
                                </p>
                                <div className="pft-form-grid">
                                    <div className="pf-field">
                                        <label htmlFor="date_from">From date</label>
                                        <input
                                            id="date_from"
                                            type="date"
                                            value={data.date_from}
                                            onChange={(e) => setData('date_from', e.target.value)}
                                        />
                                    </div>

                                    <div className="pf-field">
                                        <label htmlFor="date_to">To date</label>
                                        <input
                                            id="date_to"
                                            type="date"
                                            value={data.date_to}
                                            min={data.date_from || undefined}
                                            onChange={(e) => setData('date_to', e.target.value)}
                                        />
                                    </div>
                                </div>
                                <InputError message={errors.date_from ?? errors.date_to} className="mt-2" />
                            </div>

                            {/* Action bar */}
                            <div
                                style={{
                                    display: 'flex',
                                    gap: 10,
                                    padding: '16px 0 0',
                                    borderTop: '1px solid var(--as-border)',
                                    marginTop: 16,
                                    alignItems: 'center',
                                    flexWrap: 'wrap',
                                }}
                            >
                                <button
                                    type="button"
                                    className="pf-btn pf-btn-secondary"
                                    disabled={processing}
                                    onClick={submit(false)}
                                >
                                    <svg viewBox="0 0 24 24">
                                        <circle cx="11" cy="11" r="7" />
                                        <path d="m20 20-3.5-3.5" />
                                    </svg>
                                    Preview
                                </button>
                                <button
                                    type="button"
                                    className={'pf-btn pf-btn-primary' + (processing ? ' pf-btn--loading' : '')}
                                    disabled={processing}
                                    onClick={submit(true)}
                                >
                                    <svg viewBox="0 0 24 24">
                                        <path d="M12 5v14M5 12h14" />
                                    </svg>
                                    Commit Import
                                </button>
                                <span style={{ fontSize: 11, color: 'var(--as-text-muted)', marginLeft: 4 }}>
                                    Preview first to verify what will be imported.
                                </span>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}

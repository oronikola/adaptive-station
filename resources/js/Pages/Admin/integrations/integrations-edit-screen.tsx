import InputError from '@/Components/InputError';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import '../../../../css/platform-dashboard.css';
import '../../../../css/platform-overview.css';

interface IntegrationProfile {
    id: number;
    name: string;
    driver: string;
    direction: string;
    status: string;
    last_successful_run_at: string | null;
}

interface IntegrationRun {
    id: number;
    direction: string;
    status: string;
    started_at: string | null;
    summary?: Record<string, unknown> | null;
}

const STATUS_PILL_CLASS: Record<string, string> = {
    active: 'pf-pill--active',
    disabled: 'pf-pill--inactive',
    error: 'pf-pill--danger',
};

const RUN_STATUS_PILL_CLASS: Record<string, string> = {
    succeeded: 'pf-pill--active',
    failed: 'pf-pill--danger',
    running: 'pf-pill--inactive',
    pending: 'pf-pill--inactive',
};

const DIRECTION_LABELS: Record<string, string> = {
    import_only: 'Import only',
    export_only: 'Export only',
    bidirectional: 'Import + Export',
};

const textareaStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    border: '1px solid #d7dde7',
    borderRadius: 12,
    outline: 'none',
    fontSize: 13,
};

export default function IntegrationsEditScreen({ profile, runs }: { profile: IntegrationProfile; runs: IntegrationRun[] }) {
    const form = useForm({
        name: profile.name,
        direction: profile.direction,
        config: '',
    });

    function submitProfile(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        form.put(route('portal.integrations.update', profile.id));
    }

    const exportForm = useForm({ date_from: '', date_to: '' });

    function submitExport(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        exportForm.post(route('portal.integrations.export', profile.id));
    }

    return (
        <AdminLayout>
            <Head title={profile.name} />

            <div className="pf-dashboard pft-page">
                <div className="pft-hero">
                    <div className="pft-hero-main">
                        <span className="pft-hero-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24">
                                <circle cx="7" cy="12" r="3.4" />
                                <rect x="9" y="10.3" width="6" height="3.4" rx="1.2" />
                                <circle cx="17" cy="12" r="3.4" />
                            </svg>
                        </span>
                        <div>
                            <h1 className="pft-hero-title">
                                {profile.name}{' '}
                                <span
                                    className={
                                        'pf-pill ' +
                                        (STATUS_PILL_CLASS[profile.status] ?? 'pf-pill--inactive')
                                    }
                                    style={{ verticalAlign: 'middle', marginLeft: 8 }}
                                >
                                    {profile.status}
                                </span>
                            </h1>
                            <p className="pft-hero-subtitle">
                                <span className="font-mono">{profile.driver}</span> ·{' '}
                                {DIRECTION_LABELS[profile.direction] ?? profile.direction}
                            </p>
                        </div>
                    </div>
                    <div className="pft-hero-actions">
                        <Link href={route('portal.integrations.index')} className="pf-btn pf-btn-secondary">
                            Back to Integrations
                        </Link>
                    </div>
                </div>

                <div className="pf-panel" style={{ marginBottom: 16 }}>
                    <div className="pf-panel-header">
                        <div>
                            <h2 className="pf-panel-title">Profile</h2>
                        </div>
                    </div>

                    <form onSubmit={submitProfile} className="pf-modal">
                        <div className="pf-field">
                            <label htmlFor="name">Name</label>
                            <input
                                id="name"
                                type="text"
                                value={form.data.name}
                                onChange={(e) => form.setData('name', e.target.value)}
                                required
                            />
                            <InputError message={form.errors.name} className="mt-2" />
                        </div>

                        <div className="pf-field">
                            <label htmlFor="direction">Direction</label>
                            <select
                                id="direction"
                                value={form.data.direction}
                                onChange={(e) => form.setData('direction', e.target.value)}
                            >
                                <option value="import_only">Import only</option>
                                <option value="export_only">Export only</option>
                                <option value="bidirectional">Import + Export</option>
                            </select>
                            <InputError message={form.errors.direction} className="mt-2" />
                        </div>

                        <div className="pf-field">
                            <label htmlFor="config">Connection &amp; Table Mapping (JSON)</label>
                            <p className="pf-field-hint" style={{ marginBottom: 8 }}>
                                Leave blank to keep the current configuration unchanged — it is never redisplayed after saving.
                            </p>
                            <textarea
                                id="config"
                                rows={12}
                                placeholder="Paste replacement JSON here only if you want to change it"
                                value={form.data.config}
                                onChange={(e) => form.setData('config', e.target.value)}
                                className="font-mono"
                                style={textareaStyle}
                            />
                            <InputError message={form.errors.config} className="mt-2" />
                        </div>

                        <div className="pf-modal-footer" style={{ justifyContent: 'flex-start' }}>
                            <button type="submit" className="pf-btn pf-btn-primary" disabled={form.processing}>
                                Save
                            </button>
                        </div>
                    </form>
                </div>

                {profile.direction !== 'import_only' && (
                    <div className="pf-panel" style={{ marginBottom: 16 }}>
                        <div className="pf-panel-header">
                            <div>
                                <h2 className="pf-panel-title">Run Attendance Export</h2>
                                <p className="pf-panel-count">
                                    One-way: Adaptive Station tap events → legacy taphistory format. Safe to re-run over an overlapping range.
                                </p>
                            </div>
                        </div>

                        <form onSubmit={submitExport} className="pf-modal">
                            <div className="pft-form-grid">
                                <div className="pf-field">
                                    <label htmlFor="date_from">From</label>
                                    <input
                                        id="date_from"
                                        type="date"
                                        value={exportForm.data.date_from}
                                        onChange={(e) => exportForm.setData('date_from', e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="pf-field">
                                    <label htmlFor="date_to">To</label>
                                    <input
                                        id="date_to"
                                        type="date"
                                        value={exportForm.data.date_to}
                                        onChange={(e) => exportForm.setData('date_to', e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <InputError message={exportForm.errors.date_from ?? exportForm.errors.date_to} className="mt-2" />

                            <div className="pf-modal-footer" style={{ justifyContent: 'flex-start' }}>
                                <button type="submit" className="pf-btn pf-btn-primary" disabled={exportForm.processing}>
                                    Run Export
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="pf-panel">
                    <div className="pf-panel-header">
                        <div>
                            <h2 className="pf-panel-title">Recent Runs</h2>
                            <p className="pf-panel-count">
                                {runs.length} run{runs.length === 1 ? '' : 's'}
                            </p>
                        </div>
                    </div>

                    <div className="pf-table-wrap">
                        <table className="pf-table">
                            <thead>
                                <tr>
                                    <th scope="col">Direction</th>
                                    <th scope="col">Status</th>
                                    <th scope="col">Started</th>
                                    <th scope="col">Summary</th>
                                </tr>
                            </thead>
                            <tbody>
                                {runs.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="pf-empty">
                                            No runs yet.
                                        </td>
                                    </tr>
                                )}

                                {runs.map((run: IntegrationRun) => (
                                    <tr key={run.id}>
                                        <td>{DIRECTION_LABELS[run.direction] ?? run.direction}</td>
                                        <td>
                                            <span
                                                className={
                                                    'pf-pill ' +
                                                    (RUN_STATUS_PILL_CLASS[run.status] ?? 'pf-pill--inactive')
                                                }
                                            >
                                                {run.status}
                                            </span>
                                        </td>
                                        <td>
                                            {run.started_at ? new Date(run.started_at).toLocaleString() : '—'}
                                        </td>
                                        <td className="font-mono" style={{ fontSize: 12 }}>
                                            {run.summary ? JSON.stringify(run.summary) : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}

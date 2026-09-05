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

            <div className="pf-dashboard">
                <div className="pf-dashboard-header">
                    <div>
                        <p className="pf-dashboard-kicker">Admin overview</p>
                        <h1 className="pf-dashboard-title">New Legacy Import</h1>
                        <p className="pf-dashboard-subtitle">
                            Preview runs the same matching logic read-only — nothing is written. Commit performs the real import; re-running Commit is always safe (already-imported rows are skipped, never duplicated).
                        </p>
                    </div>
                </div>

                <div className="pf-panel">
                    <div className="pf-panel-header">
                        <div>
                            <h2 className="pf-panel-title">Import Settings</h2>
                            <p className="pf-panel-count">
                                Choose a source profile and the attendance date range to migrate.
                            </p>
                        </div>
                    </div>

                    <form className="pft-form-panel">
                        <div className="pft-form-grid">
                            <div className="pf-field">
                                <label htmlFor="integration_profile_id">Integration Profile</label>
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
                                <InputError message={errors.integration_profile_id} className="mt-2" />
                            </div>

                            <div className="pf-field">
                                <label htmlFor="date_from">Attendance History From</label>
                                <input
                                    id="date_from"
                                    type="date"
                                    value={data.date_from}
                                    onChange={(e) => setData('date_from', e.target.value)}
                                />
                            </div>

                            <div className="pf-field">
                                <label htmlFor="date_to">To</label>
                                <input
                                    id="date_to"
                                    type="date"
                                    value={data.date_to}
                                    onChange={(e) => setData('date_to', e.target.value)}
                                />
                                <InputError message={errors.date_from ?? errors.date_to} className="mt-2" />
                            </div>
                        </div>

                        <div className="pft-form-actions">
                            <button
                                type="button"
                                className="pf-btn pf-btn-secondary"
                                disabled={processing}
                                onClick={submit(false)}
                            >
                                Preview
                            </button>
                            <button
                                type="button"
                                className="pf-btn pf-btn-primary"
                                disabled={processing}
                                onClick={submit(true)}
                            >
                                Commit
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AdminLayout>
    );
}

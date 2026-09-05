import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link } from '@inertiajs/react';
import '../../../../css/platform-dashboard.css';

interface IntegrationProfile {
    id: number;
    name: string;
    driver: string;
    direction: string;
    status: string;
    last_successful_run_at: string | null;
}

const STATUS_PILL_CLASS: Record<string, string> = {
    active: 'pf-pill--active',
    disabled: 'pf-pill--inactive',
    error: 'pf-pill--danger',
};

const STATUS_LABELS: Record<string, string> = {
    active: 'Active',
    disabled: 'Disabled',
    error: 'Error',
};

const DIRECTION_LABELS: Record<string, string> = {
    import_only: 'Import only',
    export_only: 'Export only',
    bidirectional: 'Import + Export',
};

export default function IntegrationsListScreen({ profiles }: { profiles: IntegrationProfile[] }) {
    return (
        <AdminLayout>
            <Head title="Integrations" />

            <div className="pf-dashboard">
                <div className="pf-dashboard-header">
                    <div>
                        <p className="pf-dashboard-kicker">Admin overview</p>
                        <h1 className="pf-dashboard-title">Integrations</h1>
                        <p className="pf-dashboard-subtitle">
                            Connect and manage your school's legacy data sources.
                        </p>
                    </div>
                    <Link href={route('portal.integrations.create')} className="pf-btn pf-btn-primary">
                        <svg viewBox="0 0 24 24">
                            <path d="M12 5v14M5 12h14" />
                        </svg>
                        New Integration Profile
                    </Link>
                </div>

                <div className="pf-panel">
                    <div className="pf-panel-header">
                        <div>
                            <h2 className="pf-panel-title">All Integration Profiles</h2>
                            <p className="pf-panel-count">
                                {profiles.length} shown
                            </p>
                        </div>
                    </div>

                    <div className="pf-table-wrap">
                        <table className="pf-table">
                            <thead>
                                <tr>
                                    <th scope="col">Name</th>
                                    <th scope="col">Driver</th>
                                    <th scope="col">Direction</th>
                                    <th scope="col">Status</th>
                                    <th scope="col">Last Successful Run</th>
                                    <th scope="col">
                                        <span className="sr-only">Actions</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {profiles.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="pf-empty">
                                            No integration profiles yet.
                                        </td>
                                    </tr>
                                )}

                                {profiles.map((profile: IntegrationProfile) => (
                                    <tr key={profile.id}>
                                        <td className="pf-tenant-name">
                                            {profile.name}
                                        </td>
                                        <td className="font-mono">{profile.driver}</td>
                                        <td>{DIRECTION_LABELS[profile.direction] ?? profile.direction}</td>
                                        <td>
                                            <span
                                                className={
                                                    'pf-pill ' +
                                                    (STATUS_PILL_CLASS[profile.status] ?? 'pf-pill--inactive')
                                                }
                                            >
                                                {STATUS_LABELS[profile.status] ?? profile.status}
                                            </span>
                                        </td>
                                        <td>
                                            {profile.last_successful_run_at
                                                ? new Date(profile.last_successful_run_at).toLocaleString()
                                                : 'Never'}
                                        </td>
                                        <td>
                                            <Link
                                                href={route('portal.integrations.edit', profile.id)}
                                                className="pf-row-action"
                                            >
                                                Manage
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
                </div>
            </div>
        </AdminLayout>
    );
}

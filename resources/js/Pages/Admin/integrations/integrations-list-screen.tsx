import { ChevronRightIcon } from '@/Components/icons/chevron-right';
import { ConnectIcon } from '@/Components/icons/connect';
import { PlusIcon } from '@/Components/icons/plus';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';
import NewIntegrationModal from './NewIntegrationModal';
import '../../../../css/platform-dashboard.css';
import '../../../../css/platform-overview.css';

interface IntegrationProfile {
    id: number;
    name: string;
    driver: string;
    direction: string;
    status: string;
    last_successful_run_at: string | null;
    last_error?: string | null;
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
    const [newIntegrationOpen, setNewIntegrationOpen] = useState(false);

    return (
        <AdminLayout>
            <Head title="Integrations" />

            <div className="pf-dashboard pft-page">
                <div className="pft-hero">
                    <div className="pft-hero-main">
                        <span className="pft-hero-icon" aria-hidden="true">
                            <ConnectIcon size={22} />
                        </span>
                        <div>
                            <h1 className="pft-hero-title">Integrations</h1>
                            <p className="pft-hero-subtitle">
                                Connect and manage your school's legacy data sources.
                            </p>
                        </div>
                    </div>
                    <div className="pft-hero-actions">
                        <button
                            type="button"
                            className="pf-btn pf-btn-primary"
                            onClick={() => setNewIntegrationOpen(true)}
                        >
                            <PlusIcon size={16} />
                            New Integration Profile
                        </button>
                    </div>
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
                                            {profile.status === 'error' && profile.last_error && (
                                                <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--as-danger)', lineHeight: 1.4, maxWidth: 260 }}>
                                                    {profile.last_error}
                                                </p>
                                            )}
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
                                                <ChevronRightIcon size={14} />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <NewIntegrationModal
                show={newIntegrationOpen}
                onClose={() => setNewIntegrationOpen(false)}
            />
        </AdminLayout>
    );
}

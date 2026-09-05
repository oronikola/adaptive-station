import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link } from '@inertiajs/react';
import type { PaginatedData, PaginationLink, Station } from '@/types';
import '../../../../css/platform-dashboard.css';

interface StationListItem extends Station {
    is_online: boolean;
}

const STATUS_LABELS: Record<string, string> = {
    pending_activation: 'Pending Activation',
    active: 'Active',
    disabled: 'Disabled',
    retired: 'Retired',
};

const STATUS_PILL_CLASS: Record<string, string> = {
    active: 'pf-pill--active',
    pending_activation: 'pft-pill--suspended',
    disabled: 'pft-pill--archived',
    retired: 'pft-pill--archived',
};

// last_seen_at is a full UTC timestamp — displayed in GMT+8 (Asia/Manila, no
// DST) since that's the timezone every tenant in this system runs on today.
function formatDateTime(value: string): string {
    return new Date(value).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Manila',
    });
}

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

export default function StationsListScreen({ stations }: { stations: PaginatedData<StationListItem> }) {
    return (
        <AdminLayout>
            <Head title="Stations" />

            <div className="pf-dashboard">
                <div className="pf-dashboard-header">
                    <div>
                        <p className="pf-dashboard-kicker">Admin overview</p>
                        <h1 className="pf-dashboard-title">Stations</h1>
                        <p className="pf-dashboard-subtitle">
                            Monitor and manage every kiosk registered to your school.
                        </p>
                    </div>
                </div>

                <div className="pf-panel">
                    <div className="pf-panel-header">
                        <div>
                            <h2 className="pf-panel-title">All Stations</h2>
                            <p className="pf-panel-count">
                                {stations.data.length} shown
                            </p>
                        </div>
                    </div>

                    <div className="pf-table-wrap">
                        <table className="pf-table">
                            <thead>
                                <tr>
                                    <th scope="col">Name</th>
                                    <th scope="col">Code</th>
                                    <th scope="col">Status</th>
                                    <th scope="col">Connectivity</th>
                                    <th scope="col">App Version</th>
                                    <th scope="col">Pending Events</th>
                                    <th scope="col">Last Seen</th>
                                    <th scope="col">
                                        <span className="sr-only">Actions</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {stations.data.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="pf-empty">
                                            No stations registered yet.
                                        </td>
                                    </tr>
                                )}

                                {stations.data.map((station: StationListItem) => (
                                    <tr key={station.id}>
                                        <td className="pf-tenant-name">{station.name}</td>
                                        <td className="font-mono">{station.station_code}</td>
                                        <td>
                                            <span
                                                className={
                                                    'pf-pill ' +
                                                    (STATUS_PILL_CLASS[station.status] ?? 'pf-pill--inactive')
                                                }
                                            >
                                                {STATUS_LABELS[station.status] ?? station.status}
                                            </span>
                                        </td>
                                        <td>
                                            <span
                                                className={
                                                    'pf-pill ' +
                                                    (station.is_online ? 'pf-pill--active' : 'pf-pill--inactive')
                                                }
                                            >
                                                {station.is_online ? 'Online' : 'Offline'}
                                            </span>
                                        </td>
                                        <td>{station.app_version ?? '—'}</td>
                                        <td>{station.last_pending_count ?? '—'}</td>
                                        <td>
                                            {station.last_seen_at
                                                ? formatDateTime(station.last_seen_at)
                                                : 'Never'}
                                        </td>
                                        <td>
                                            <Link
                                                href={route('portal.stations.show', station.id)}
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

                    <PaginationBar links={stations.links} />
                </div>
            </div>
        </AdminLayout>
    );
}

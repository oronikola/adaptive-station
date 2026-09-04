import PlatformLayout from '@/Layouts/PlatformLayout';
import { Head, Link } from '@inertiajs/react';
import { PaginatedData, PaginationLink } from '@/types';
import '../../../../css/platform-dashboard.css';

interface AuditLog {
    id: string;
    tenant?: { name: string } | null;
    actor_type: string;
    action: string;
    entity_type: string | null;
    entity_id: string | null;
    created_at: string;
}

interface PaginationBarProps {
    links: PaginationLink[];
}

function PaginationBar({ links }: PaginationBarProps) {
    if (!links || links.length <= 3) {
        return null;
    }

    return (
        <nav className="pf-pagination">
            {links.map((link, index) => {
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

interface AuditLogListScreenProps {
    logs: PaginatedData<AuditLog>;
}

export default function AuditLogListScreen({ logs }: AuditLogListScreenProps) {
    return (
        <PlatformLayout>
            <Head title="Audit Log" />

            <div className="pf-dashboard">
                <div className="pf-dashboard-header">
                    <div>
                        <p className="pf-dashboard-kicker">Platform overview</p>
                        <h1 className="pf-dashboard-title">Audit Log</h1>
                        <p className="pf-dashboard-subtitle">
                            Every sensitive action taken across the platform, most
                            recent first.
                        </p>
                    </div>
                </div>

                <div className="pf-panel">
                    <div className="pf-panel-header">
                        <div>
                            <h2 className="pf-panel-title">Recent Activity</h2>
                            <p className="pf-panel-count">
                                {logs.data.length} shown
                            </p>
                        </div>
                    </div>

                    <div className="pf-table-wrap">
                        <table className="pf-table">
                            <thead>
                                <tr>
                                    <th scope="col">When</th>
                                    <th scope="col">Tenant</th>
                                    <th scope="col">Actor</th>
                                    <th scope="col">Action</th>
                                    <th scope="col">Entity</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.data.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="pf-empty">
                                            No audit log entries yet.
                                        </td>
                                    </tr>
                                )}

                                {logs.data.map((log) => (
                                    <tr key={log.id}>
                                        <td>
                                            {new Date(log.created_at).toLocaleString()}
                                        </td>
                                        <td>{log.tenant?.name ?? '—'}</td>
                                        <td className="capitalize">{log.actor_type}</td>
                                        <td className="font-mono">{log.action}</td>
                                        <td>
                                            {log.entity_type ?? '—'}
                                            {log.entity_id ? ` #${log.entity_id.slice(0, 8)}` : ''}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <PaginationBar links={logs.links} />
                </div>
            </div>
        </PlatformLayout>
    );
}

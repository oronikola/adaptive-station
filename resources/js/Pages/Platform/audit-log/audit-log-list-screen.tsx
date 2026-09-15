import Pagination from '@/Components/admin/Pagination';
import { HistoryIcon } from '@/Components/icons/history';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { PaginatedData } from '@/types';
import '../../../../css/platform-dashboard.css';
import '../../../../css/platform-overview.css';

interface AuditLog {
    id: string;
    tenant?: { name: string } | null;
    actor_type: string;
    action: string;
    entity_type: string | null;
    entity_id: string | null;
    created_at: string;
}

interface Filters {
    search?: string;
    actor_type?: string;
    date_from?: string;
    date_to?: string;
}

interface AuditLogListScreenProps {
    logs: PaginatedData<AuditLog>;
    filters: Filters;
}

const KNOWN_ACTION_GROUPS: { label: string; actions: string[] }[] = [
    {
        label: 'Tenant',
        actions: ['tenant.created', 'tenant.status_updated', 'tenant.purged'],
    },
    {
        label: 'User',
        actions: ['user.created', 'user.updated', 'user.reactivated', 'user.deactivated'],
    },
    {
        label: 'Station',
        actions: [
            'station.created',
            'station.activated',
            'station.configuration_updated',
            'station.reset_to_pending',
            'station.legacy_placeholder_created',
            'station_credential.issued',
            'station_credential.revoked',
        ],
    },
    {
        label: 'Person',
        actions: ['person.created', 'person.updated', 'person.deactivated', 'person.reactivated'],
    },
    {
        label: 'RFID Card',
        actions: ['rfid_card.assigned', 'rfid_card.replaced', 'rfid_card.deactivated'],
    },
    {
        label: 'Parent',
        actions: [
            'parent.created',
            'parent.updated',
            'parent.reactivated',
            'parent.deactivated',
            'parent.login',
            'parent.logout',
        ],
    },
    {
        label: 'Integration',
        actions: [
            'integration_profile.created',
            'integration_profile.config_updated',
            'integration_profile.status_updated',
        ],
    },
    {
        label: 'Import',
        actions: ['import_exception.resolved'],
    },
    {
        label: 'SMS Gateway',
        actions: [
            'sms_gateway_device.created',
            'sms_gateway_device.login',
            'sms_gateway_device.logout',
            'sms_gateway_device.password_reset',
            'sms_gateway_device_token.issued',
            'sms_gateway_device_token.revoked',
        ],
    },
];

export default function AuditLogListScreen({ logs, filters }: AuditLogListScreenProps) {
    const [isFiltering, setIsFiltering] = useState(false);
    const hasFilters = Boolean(filters.search || filters.actor_type || filters.date_from || filters.date_to);
    const { data, setData } = useForm({
        search: filters.search ?? '',
        actor_type: filters.actor_type ?? '',
        date_from: filters.date_from ?? '',
        date_to: filters.date_to ?? '',
    });

    // Guard: prevent date_to before date_from
    const today = new Date().toISOString().slice(0, 10);

    function handleDateFrom(value: string) {
        setData((d) => ({
            ...d,
            date_from: value,
            // Clear date_to if it would precede the new from date
            date_to: d.date_to && d.date_to < value ? '' : d.date_to,
        }));
    }

    function submit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsFiltering(true);
        router.get(route('platform.audit-log.index'), data, {
            preserveState: true,
            onFinish: () => setIsFiltering(false),
        });
    }

    return (
        <PlatformLayout>
            <Head title="Audit Log" />

            <div className="pf-dashboard pft-page">
                <div className="pft-hero">
                    <div className="pft-hero-main">
                        <span className="pft-hero-icon" aria-hidden="true">
                            <HistoryIcon size={22} />
                        </span>
                        <div>
                            <h1 className="pft-hero-title">Audit Log</h1>
                            <p className="pft-hero-subtitle">
                                Every sensitive action taken across the platform, most
                                recent first.
                            </p>
                        </div>
                    </div>
                </div>

                <form onSubmit={submit} className="pf-filter-bar" role="search">
                    <div className="pf-field">
                        <label htmlFor="search">Action</label>
                        <select
                            id="search"
                            value={data.search}
                            onChange={(e) => setData('search', e.target.value)}
                        >
                            <option value="">All actions</option>
                            {KNOWN_ACTION_GROUPS.map((group) => (
                                <optgroup key={group.label} label={group.label}>
                                    {group.actions.map((action) => (
                                        <option key={action} value={action}>{action}</option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                    </div>

                    <div className="pf-field">
                        <label htmlFor="actor_type">Actor type</label>
                        <select
                            id="actor_type"
                            value={data.actor_type}
                            onChange={(e) => setData('actor_type', e.target.value)}
                        >
                            <option value="">All</option>
                            <option value="user">User</option>
                            <option value="system">System</option>
                            <option value="platform">Platform</option>
                        </select>
                    </div>

                    <div className="pf-field">
                        <label htmlFor="date_from">From</label>
                        <input
                            id="date_from"
                            type="date"
                            value={data.date_from}
                            max={today}
                            onChange={(e) => handleDateFrom(e.target.value)}
                        />
                    </div>

                    <div className="pf-field">
                        <label htmlFor="date_to">To</label>
                        <input
                            id="date_to"
                            type="date"
                            value={data.date_to}
                            min={data.date_from || undefined}
                            max={today}
                            onChange={(e) => setData('date_to', e.target.value)}
                        />
                    </div>

                    <div className="pf-filter-bar-actions">
                        <button
                            type="submit"
                            className={'pf-btn pf-btn-primary' + (isFiltering ? ' pf-btn--loading' : '')}
                            disabled={isFiltering}
                        >
                            Filter
                        </button>
                        {hasFilters && (
                            <Link
                                href={route('platform.audit-log.index')}
                                className="pf-btn pf-btn-secondary"
                            >
                                Reset
                            </Link>
                        )}
                    </div>
                </form>

                <div className="pf-panel">
                    <div className="pf-panel-header">
                        <div>
                            <h2 className="pf-panel-title">Recent Activity</h2>
                            <p className="pf-panel-count">
                                {logs.from !== null ? `${logs.from}–${logs.to} of ${logs.total}` : 'No results'}
                            </p>
                        </div>
                    </div>

                    <div className="pf-table-wrap">
                        <table className="pf-table">
                            <thead>
                                <tr>
                                    <th scope="col">When</th>
                                    <th scope="col">School</th>
                                    <th scope="col">Actor</th>
                                    <th scope="col">Action</th>
                                    <th scope="col">Entity</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.data.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="pf-empty">
                                            {hasFilters
                                                ? 'No entries match these filters.'
                                                : 'No audit log entries yet.'}
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

                    <Pagination links={logs.links} />
                </div>
            </div>
        </PlatformLayout>
    );
}

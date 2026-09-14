import InputError from '@/Components/InputError';
import Modal from '@/Components/Modal';
import PremiumSelect from '@/Components/PremiumSelect';
import SecretOnceCallout from '@/Components/SecretOnceCallout';
import StationViewDropdown from '@/Components/StationViewDropdown';
import StatusBadge from '@/Components/admin/StatusBadge';
import Table from '@/Components/admin/Table';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import { PaginatedData, PaginationLink, Tenant } from '@/types';
import '../../../../css/platform-dashboard.css';

interface StationRow {
    id: number;
    name: string;
    station_code: string;
    status: string;
    tenant?: { id: number; name: string; code: string } | null;
    tenant_id: number;
    app_version?: string | null;
    last_pending_count?: number | null;
    last_seen_at?: string | null;
    last_scan_at?: string | null;
    is_online?: boolean;
}

interface StationOption {
    value: string;
    label: string;
    tenant_id: number;
    tenant_name: string;
    status: string;
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

const statusLabels: Record<string, string> = {
    pending_activation: 'Pending Activation',
    active: 'Active',
    disabled: 'Disabled',
    retired: 'Retired',
};

interface StationsListScreenProps {
    stations: PaginatedData<StationRow>;
    tenants: Tenant[];
    allStationOptions?: StationOption[];
    filters?: {
        tenant_id?: string;
        status?: string;
    };
}

interface PagePropsWithFlash {
    flash?: {
        activationCode?: string;
    };
}

export default function StationsListScreen({
    stations,
    tenants,
    allStationOptions = [],
    filters = {},
}: StationsListScreenProps) {
    const { flash } = usePage().props as PagePropsWithFlash;

    const currentTenantId = filters.tenant_id ? String(filters.tenant_id) : '';
    const currentStatus = filters.status || 'all';

    const [viewMode, setViewMode] = useState<'table' | 'gallery'>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('as-stations-view') as 'table' | 'gallery') || 'table';
        }
        return 'table';
    });

    useEffect(() => {
        localStorage.setItem('as-stations-view', viewMode);
    }, [viewMode]);

    const [createOpen, setCreateOpen] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({
        tenant_id: currentTenantId || (tenants[0]?.id ? String(tenants[0].id) : ''),
        name: '',
        station_code: '',
    });

    function handleSchoolSwitch(newTenantId: string) {
        router.get(
            route('platform.stations.index'),
            {
                tenant_id: newTenantId || undefined,
                status: currentStatus !== 'all' ? currentStatus : undefined,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }
        );
    }

    function handleStatusFilterChange(newStatus: string) {
        router.get(
            route('platform.stations.index'),
            {
                tenant_id: currentTenantId || undefined,
                status: newStatus !== 'all' ? newStatus : undefined,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }
        );
    }

    function handleSpecificStationSelect(stationId: string) {
        if (!stationId) {
            return;
        }

        const selectedOption = allStationOptions.find((opt) => String(opt.value) === String(stationId));
        router.visit(
            route('platform.stations.show', {
                station: stationId,
                tenant_id: selectedOption?.tenant_id ?? currentTenantId,
            })
        );
    }

    function handleResetFilters() {
        router.get(
            route('platform.stations.index'),
            {},
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }
        );
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post(route('platform.stations.store'), {
            onSuccess: () => {
                setCreateOpen(false);
                reset();
            },
        });
    }

    function issueCode(station: StationRow) {
        router.post(route('platform.stations.activation-code', station.id), {
            tenant_id: station.tenant_id,
        });
    }

    const selectedSchool = tenants.find((t) => String(t.id) === currentTenantId);

    return (
        <PlatformLayout>
            <Head title="Stations" />

            <div className="pf-dashboard">
                <div className="pf-dashboard-header">
                    <div>
                        <div className="pf-dashboard-kicker">Network Management</div>
                        <h1 className="pf-dashboard-title">Stations</h1>
                        <p className="pf-dashboard-subtitle">
                            Monitor, configure, and issue credentials for tap-in kiosks across all registered schools.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            className="pf-btn pf-btn-primary"
                            onClick={() => {
                                if (currentTenantId) {
                                    setData('tenant_id', currentTenantId);
                                }
                                setCreateOpen(true);
                            }}
                        >
                            <svg viewBox="0 0 24 24">
                                <path d="M12 5v14M5 12h14" />
                            </svg>
                            Add Station
                        </button>
                    </div>
                </div>

                <SecretOnceCallout label="Activation code" value={flash?.activationCode} />

                {/* Unified Dropdown & Filter Actions */}
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                        <StationViewDropdown
                            tenants={tenants}
                            currentTenantId={currentTenantId}
                            currentStatus={currentStatus}
                            allStationOptions={allStationOptions}
                            onSchoolChange={handleSchoolSwitch}
                            onStatusChange={handleStatusFilterChange}
                            onStationSelect={handleSpecificStationSelect}
                            onReset={handleResetFilters}
                        />

                        {(currentTenantId || (currentStatus && currentStatus !== 'all')) && (
                            <button
                                type="button"
                                onClick={handleResetFilters}
                                className="pf-btn pf-btn-secondary text-xs h-[42px]"
                            >
                                Reset All Filters
                            </button>
                        )}
                    </div>
                </div>

                {/* Stations Panel */}
                <div className="pf-panel">
                    <div className="pf-panel-header">
                        <div>
                            <h2 className="pf-panel-title">
                                {selectedSchool ? `${selectedSchool.name} Stations` : 'All Stations'}
                            </h2>
                            <p className="pf-panel-count">
                                {stations.data.length} shown {selectedSchool ? `(${selectedSchool.code})` : ''}
                            </p>
                        </div>
                        <div className="pf-view-toggle" role="group" aria-label="View mode">
                            <button
                                type="button"
                                className={`pf-view-toggle-btn ${viewMode === 'table' ? 'pf-view-toggle-btn--active' : ''}`}
                                onClick={() => setViewMode('table')}
                                aria-pressed={viewMode === 'table'}
                            >
                                <svg viewBox="0 0 24 24">
                                    <path d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                                Table
                            </button>
                            <button
                                type="button"
                                className={`pf-view-toggle-btn ${viewMode === 'gallery' ? 'pf-view-toggle-btn--active' : ''}`}
                                onClick={() => setViewMode('gallery')}
                                aria-pressed={viewMode === 'gallery'}
                            >
                                <svg viewBox="0 0 24 24">
                                    <rect x="3" y="3" width="7" height="7" rx="1.2" />
                                    <rect x="14" y="3" width="7" height="7" rx="1.2" />
                                    <rect x="3" y="14" width="7" height="7" rx="1.2" />
                                    <rect x="14" y="14" width="7" height="7" rx="1.2" />
                                </svg>
                                Gallery
                            </button>
                        </div>
                    </div>

                    {viewMode === 'gallery' ? (
                        stations.data.length === 0 ? (
                            <p className="pf-empty">No stations found matching the selected filters.</p>
                        ) : (
                            <div className="station-gallery">
                                {stations.data.map((station, index) => {
                                    const iconTone =
                                        station.status === 'active' && station.is_online
                                            ? 'station-card-icon--active'
                                            : station.status === 'pending_activation'
                                              ? 'station-card-icon--pending'
                                              : 'station-card-icon--offline';
                                    return (
                                        <div key={station.id} className="station-card" style={{ animationDelay: `${index * 36}ms` }}>
                                            <div className="station-card-top">
                                                <span className={`station-card-icon ${iconTone}`} aria-hidden="true">
                                                    <svg viewBox="0 0 24 24">
                                                        <rect x="4" y="5" width="16" height="13" rx="2" />
                                                        <path d="M8 21h8M9 9h6M9 13h4" />
                                                    </svg>
                                                </span>
                                                <div className="flex items-center gap-1.5">
                                                    <StatusBadge
                                                        color={
                                                            station.status === 'active'
                                                                ? 'green'
                                                                : station.status === 'disabled' || station.status === 'retired'
                                                                  ? 'red'
                                                                  : 'yellow'
                                                        }
                                                    >
                                                        {statusLabels[station.status] ?? station.status}
                                                    </StatusBadge>
                                                    {station.status === 'active' && (
                                                        <StatusBadge color={station.is_online ? 'green' : 'gray'}>
                                                            {station.is_online ? 'Online' : 'Offline'}
                                                        </StatusBadge>
                                                    )}
                                                </div>
                                            </div>
                                            <div>
                                                <h3 className="station-card-name">{station.name}</h3>
                                                <p className="station-card-code">{station.station_code}</p>
                                                <p className="station-card-meta mt-1 text-slate-600 font-medium">
                                                    {station.tenant?.name ?? '—'}
                                                </p>
                                                <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-400">
                                                    <span>{station.app_version ? `v${station.app_version}` : 'Version —'}</span>
                                                    <span>•</span>
                                                    <span>{station.last_seen_at ? new Date(station.last_seen_at).toLocaleDateString() : 'Never seen'}</span>
                                                </div>
                                            </div>
                                            <div className="station-card-footer">
                                                <Link
                                                    href={route('platform.stations.show', {
                                                        station: station.id,
                                                        tenant_id: station.tenant_id,
                                                    })}
                                                    className="pf-row-action"
                                                >
                                                    View Details
                                                    <svg viewBox="0 0 24 24">
                                                        <path d="M9 6l6 6-6 6" />
                                                    </svg>
                                                </Link>
                                                {station.status === 'pending_activation' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => issueCode(station)}
                                                        className="pf-row-action text-amber-600 hover:text-amber-700"
                                                    >
                                                        Issue Code
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )
                    ) : (
                        <div className="pf-table-wrap">
                            <Table>
                                <Table.Head>
                                    <Table.Th>Name</Table.Th>
                                    <Table.Th>Code</Table.Th>
                                    <Table.Th>School</Table.Th>
                                    <Table.Th>Status</Table.Th>
                                    <Table.Th>Connectivity</Table.Th>
                                    <Table.Th>App Version</Table.Th>
                                    <Table.Th>Last Seen</Table.Th>
                                    <Table.Th>
                                        <span className="sr-only">Actions</span>
                                    </Table.Th>
                                </Table.Head>
                                <Table.Body>
                                    {stations.data.length === 0 && (
                                        <Table.Empty colSpan={8}>
                                            No stations found matching the selected filters.
                                        </Table.Empty>
                                    )}

                                    {stations.data.map((station) => (
                                        <tr key={station.id}>
                                            <Table.Td className="font-semibold text-gray-900 dark:text-gray-100">
                                                {station.name}
                                            </Table.Td>
                                            <Table.Td className="font-mono text-xs">{station.station_code}</Table.Td>
                                            <Table.Td className="font-medium text-slate-600">
                                                {station.tenant?.name ?? '—'}
                                            </Table.Td>
                                            <Table.Td>
                                                <StatusBadge
                                                    color={
                                                        station.status === 'active'
                                                            ? 'green'
                                                            : station.status === 'disabled' || station.status === 'retired'
                                                              ? 'red'
                                                              : 'yellow'
                                                    }
                                                >
                                                    {statusLabels[station.status] ?? station.status}
                                                </StatusBadge>
                                            </Table.Td>
                                            <Table.Td>
                                                <StatusBadge color={station.is_online ? 'green' : 'gray'}>
                                                    {station.is_online ? 'Online' : 'Offline'}
                                                </StatusBadge>
                                            </Table.Td>
                                            <Table.Td className="text-xs text-slate-500">
                                                {station.app_version ? `v${station.app_version}` : '—'}
                                            </Table.Td>
                                            <Table.Td className="text-xs text-slate-500">
                                                {station.last_seen_at ? new Date(station.last_seen_at).toLocaleString() : 'Never'}
                                            </Table.Td>
                                            <Table.Td className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Link
                                                        href={route('platform.stations.show', {
                                                            station: station.id,
                                                            tenant_id: station.tenant_id,
                                                        })}
                                                        className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 text-xs"
                                                    >
                                                        Manage
                                                    </Link>
                                                    {station.status === 'pending_activation' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => issueCode(station)}
                                                            className="font-medium text-amber-600 hover:text-amber-500 text-xs ml-2"
                                                        >
                                                            Issue Code
                                                        </button>
                                                    )}
                                                </div>
                                            </Table.Td>
                                        </tr>
                                    ))}
                                </Table.Body>
                            </Table>
                        </div>
                    )}

                    <PaginationBar links={stations.links} />
                </div>
            </div>

            <Modal show={createOpen} onClose={() => setCreateOpen(false)}>
                <form onSubmit={submit} className="pf-modal">
                    <div className="pf-modal-header">
                        <div className="pf-modal-hero">
                            <span className="pf-modal-hero-icon pf-modal-hero-icon--violet" aria-hidden="true">
                                <svg viewBox="0 0 24 24">
                                    <rect x="4" y="5" width="16" height="13" rx="2" />
                                    <path d="M8 21h8M9 9h6M9 13h4" />
                                </svg>
                            </span>
                            <div className="pf-modal-hero-text">
                                <h3 className="pf-modal-title">Add Station</h3>
                                <p className="pf-modal-subtitle">Register a new kiosk for this school network.</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            className="pf-modal-close"
                            onClick={() => setCreateOpen(false)}
                            aria-label="Close"
                        >
                            <svg viewBox="0 0 24 24">
                                <path d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="pf-field">
                        <label htmlFor="tenant_id">School</label>
                        <PremiumSelect
                            id="tenant_id"
                            value={data.tenant_id}
                            onChange={(tenantId) => setData('tenant_id', tenantId)}
                            options={tenants.map((tenant) => ({
                                value: String(tenant.id),
                                label: tenant.name,
                            }))}
                            placeholder="Select a school"
                            invalid={Boolean(errors.tenant_id)}
                        />
                        <InputError message={errors.tenant_id} className="mt-2" />
                    </div>

                    <div className="pf-field">
                        <label htmlFor="name">Station name</label>
                        <input
                            id="name"
                            type="text"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            placeholder="e.g. Main Gate 01"
                            autoFocus
                            required
                        />
                        <InputError message={errors.name} className="mt-2" />
                    </div>

                    <div className="pf-field">
                        <label htmlFor="station_code">Station code</label>
                        <input
                            id="station_code"
                            type="text"
                            value={data.station_code}
                            onChange={(e) => setData('station_code', e.target.value)}
                            placeholder="e.g. main-gate-01"
                            className="font-mono"
                            required
                        />
                        <InputError message={errors.station_code} className="mt-2" />
                    </div>

                    <div className="pf-modal-footer">
                        <button
                            type="button"
                            className="pf-btn pf-btn-secondary"
                            onClick={() => setCreateOpen(false)}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="pf-btn pf-btn-primary"
                            disabled={processing}
                        >
                            Create
                        </button>
                    </div>
                </form>
            </Modal>
        </PlatformLayout>
    );
}

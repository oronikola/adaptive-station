import InputError from '@/Components/InputError';
import Modal from '@/Components/Modal';
import PremiumSelect from '@/Components/PremiumSelect';
import SecretOnceCallout from '@/Components/SecretOnceCallout';
import StationViewDropdown from '@/Components/StationViewDropdown';
import StatusBadge from '@/Components/admin/StatusBadge';
import Table from '@/Components/admin/Table';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import Pagination from '@/Components/admin/Pagination';
import { PageProps, PaginatedData, Tenant } from '@/types';
import { MenuIcon } from '@/Components/icons/menu';
import { MonitorCheckIcon } from '@/Components/icons/monitor-check';
import { ChevronRightIcon } from '@/Components/icons/chevron-right';
import { XIcon } from '@/Components/icons/x';
import { PlusIcon } from '@/Components/icons/plus';
import { LayoutGridIcon } from '@/Components/icons/layout-grid';
import '../../../../css/platform-dashboard.css';
import '../../../../css/platform-overview.css';

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

// Mirrors server-side slugification for station codes
function slugifyStation(value: string): string {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export default function StationsListScreen({
    stations,
    tenants,
    allStationOptions = [],
    filters = {},
}: StationsListScreenProps) {
    const { flash } = usePage().props as PagePropsWithFlash;
    const { auth } = usePage<PageProps>().props;
    const canManage = auth.user.role === 'platform_super_admin';

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
    const [stationCodeTouched, setStationCodeTouched] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({
        tenant_id: currentTenantId || (tenants[0]?.id ? String(tenants[0].id) : ''),
        name: '',
        station_code: '',
    });

    function handleStationNameChange(value: string) {
        setData((current) => ({
            ...current,
            name: value,
            station_code: stationCodeTouched ? current.station_code : slugifyStation(value),
        }));
    }

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
                setStationCodeTouched(false);
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

            <div className="pf-dashboard pft-page">
                <div className="pft-hero">
                    <div className="pft-hero-main">
                        <span className="pft-hero-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24">
                                <rect x="4" y="5" width="16" height="10" rx="1.6" />
                                <rect x="9.5" y="17" width="5" height="2" rx="1" />
                                <rect x="7" y="19.4" width="10" height="1.6" rx="0.8" />
                            </svg>
                        </span>
                        <div>
                            <h1 className="pft-hero-title">Stations</h1>
                            <p className="pft-hero-subtitle">
                                Every tap-in device registered across all schools on
                                Adaptive Station.
                            </p>
                        </div>
                    </div>
                    {canManage && (
                        <div className="pft-hero-actions">
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
                                <PlusIcon size={20} />
                                Add Station
                            </button>
                        </div>
                    )}
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
                                {stations.from !== null ? `${stations.from}–${stations.to} of ${stations.total}` : 'No results'}
                            </p>
                        </div>
                        <div className="pf-view-toggle" role="group" aria-label="View mode">
                            <button
                                type="button"
                                className={`pf-view-toggle-btn ${viewMode === 'table' ? 'pf-view-toggle-btn--active' : ''}`}
                                onClick={() => setViewMode('table')}
                                aria-pressed={viewMode === 'table'}
                            >
                                <MenuIcon size={20} />
                                Table
                            </button>
                            <button
                                type="button"
                                className={`pf-view-toggle-btn ${viewMode === 'gallery' ? 'pf-view-toggle-btn--active' : ''}`}
                                onClick={() => setViewMode('gallery')}
                                aria-pressed={viewMode === 'gallery'}
                            >
                                <LayoutGridIcon size={20} />
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
                                                    <MonitorCheckIcon size={20} />
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
                                                    <ChevronRightIcon size={20} />
                                                </Link>
                                                {canManage && station.status === 'pending_activation' && (
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
                                                    {canManage && station.status === 'pending_activation' && (
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

                    <Pagination links={stations.links} />
                </div>
            </div>

            <Modal show={createOpen} onClose={() => { setCreateOpen(false); setStationCodeTouched(false); reset(); }}>
                <form onSubmit={submit} className="pf-modal">
                    <div className="pf-modal-header">
                        <div className="pf-modal-hero">
                            <span className="pf-modal-hero-icon pf-modal-hero-icon--violet" aria-hidden="true">
                                <MonitorCheckIcon size={20} />
                            </span>
                            <div className="pf-modal-hero-text">
                                <h3 className="pf-modal-title">Add Station</h3>
                                <p className="pf-modal-subtitle">Register a new kiosk for this school network.</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            className="pf-modal-close"
                            onClick={() => { setCreateOpen(false); setStationCodeTouched(false); reset(); }}
                            aria-label="Close"
                        >
                            <XIcon size={20} />
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
                            onChange={(e) => handleStationNameChange(e.target.value)}
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
                            onChange={(e) => { setStationCodeTouched(true); setData('station_code', e.target.value); }}
                            placeholder="e.g. main-gate-01"
                            className="font-mono"
                            required
                        />
                        <p className="pf-field-hint">Auto-filled from the station name — edit if you want something different.</p>
                        <InputError message={errors.station_code} className="mt-2" />
                    </div>

                    <div className="pf-modal-footer">
                        <button
                            type="button"
                            className="pf-btn pf-btn-secondary"
                            onClick={() => { setCreateOpen(false); setStationCodeTouched(false); reset(); }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className={'pf-btn pf-btn-primary' + (processing ? ' pf-btn--loading' : '')}
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

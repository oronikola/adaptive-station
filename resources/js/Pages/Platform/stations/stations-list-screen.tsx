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
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Pagination from '@/Components/admin/Pagination';
import { PageProps, PaginatedData, Tenant } from '@/types';
import { MenuIcon } from '@/Components/icons/menu';
import { MonitorCheckIcon } from '@/Components/icons/monitor-check';
import { ChevronRightIcon } from '@/Components/icons/chevron-right';
import { XIcon } from '@/Components/icons/x';
import { PlusIcon } from '@/Components/icons/plus';
import { LayoutGridIcon } from '@/Components/icons/layout-grid';
import { ClockIcon } from '@/Components/icons/clock';
import { GraduationCapIcon } from '@/Components/icons/graduation-cap';
import { WifiIcon } from '@/Components/icons/wifi';
import { KeyIcon } from '@/Components/icons/key';
import { WrenchIcon } from '@/Components/icons/wrench';
import { ArchiveIcon } from '@/Components/icons/archive';
import { RotateCWIcon } from '@/Components/icons/rotate-cw';
import '../../../../css/platform-dashboard.css';
import '../../../../css/platform-overview.css';

interface StationRow {
    id: string;
    name: string;
    station_code: string;
    status: string;
    tenant?: { id: string; name: string; code: string } | null;
    tenant_id: string;
    app_version?: string | null;
    last_pending_count?: number | null;
    last_seen_at?: string | null;
    last_scan_at?: string | null;
    is_online?: boolean;
}

interface StationOption {
    value: string;
    label: string;
    tenant_id: string;
    tenant_name: string;
    status: string;
}

const statusLabels: Record<string, string> = {
    pending_activation: 'Pending Activation',
    active: 'Active',
    disabled: 'Disabled',
    retired: 'Retired',
};

interface StationStats {
    total: number;
    active: number;
    pending_activation: number;
    disabled: number;
    retired: number;
    online: number;
    offline: number;
}

interface TrendPoint {
    bucket: string;
    total: number;
}

interface StationTrend {
    granularity: 'day' | 'month';
    range: { date_from: string; date_to: string };
    points: TrendPoint[];
}

interface SchoolAnalyticsRow {
    id: string;
    name: string;
    total: number;
    online: number;
    online_rate: number;
}

interface StationsListScreenProps {
    stations: PaginatedData<StationRow>;
    tenants: Tenant[];
    allStationOptions?: StationOption[];
    filters?: {
        tenant_id?: string;
        status?: string;
    };
    stats: StationStats;
    trend: StationTrend;
    schoolAnalytics: SchoolAnalyticsRow[];
}

interface PagePropsWithFlash {
    flash?: {
        activationCode?: string;
        pairingLink?: string;
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

function sharePct(part: number, total: number): string {
    return total > 0 ? `${Math.round((part / total) * 100)}%` : '0%';
}

interface StatCardProps {
    label: string;
    value: number;
    icon: React.ReactNode;
    tone: 'blue' | 'amber' | 'violet' | 'green' | 'red';
    pill?: { value: string; text: string; tone?: string };
}

function StatCard({ label, value, icon, tone, pill }: StatCardProps) {
    return (
        <div className="pft-stat-card">
            <div className="pft-stat-card-top">
                <p className="pft-stat-label">{label}</p>
                <span className={`pft-stat-icon pft-stat-icon--${tone}`}>{icon}</span>
            </div>
            <p className="pft-stat-value">{value}</p>
            {pill && (
                <div className="pft-stat-pills">
                    <span className={`pft-stat-pill ${pill.tone ? `pft-stat-pill--${pill.tone}` : ''}`}>
                        <strong>{pill.value}</strong> {pill.text}
                    </span>
                </div>
            )}
        </div>
    );
}

interface TooltipEntry {
    dataKey: string;
    name: string;
    value: number;
    color: string;
}

function ChartTooltip({
    active,
    payload,
    label,
}: {
    active?: boolean;
    payload?: TooltipEntry[];
    label?: string;
}) {
    if (!active || !payload || payload.length === 0) {
        return null;
    }

    return (
        <div className="pf-chart-tooltip">
            <p className="pf-chart-tooltip-label">{label}</p>
            {payload.map((entry) => (
                <div key={entry.dataKey} className="pf-chart-tooltip-row">
                    <span style={{ color: entry.color }}>
                        <span className="pf-chart-tooltip-swatch" />
                        {entry.name}
                    </span>
                    <span>{entry.value.toLocaleString()}</span>
                </div>
            ))}
        </div>
    );
}

function labelForBucket(bucket: string, granularity: 'day' | 'month'): string {
    if (granularity === 'day') {
        return new Date(`${bucket}T12:00:00`).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
        });
    }
    return new Date(`${bucket}-01T12:00:00`).toLocaleDateString(undefined, {
        month: 'short',
        year: 'numeric',
    });
}

function StationTrendChart({ trend }: { trend: StationTrend }) {
    const chartData = trend.points.map((point) => ({
        ...point,
        label: labelForBucket(point.bucket, trend.granularity),
    }));

    const hasData = chartData.some((point) => point.total > 0);

    return (
        <>
            {!hasData ? (
                <p className="pf-empty pft-panel-empty">No stations created in this window.</p>
            ) : (
                <div className="pf-chart-body">
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart
                            data={chartData}
                            margin={{ top: 8, right: 12, left: -12, bottom: 0 }}
                            barCategoryGap="20%"
                        >
                            <CartesianGrid stroke="var(--as-border-light)" vertical={false} />
                            <XAxis
                                dataKey="label"
                                tick={{ fontSize: 11, fill: 'var(--as-text-muted)' }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                tick={{ fontSize: 11, fill: 'var(--as-text-muted)' }}
                                axisLine={false}
                                tickLine={false}
                                allowDecimals={false}
                            />
                            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--as-surface-active)' }} />
                            <Bar
                                dataKey="total"
                                name="Stations added"
                                fill="#234ef4"
                                maxBarSize={44}
                                radius={[3, 3, 0, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </>
    );
}

function SchoolRankPanel({ rows }: { rows: SchoolAnalyticsRow[] }) {
    if (rows.length === 0) {
        return <p className="pf-empty pft-panel-empty">No stations in this window.</p>;
    }

    return (
        <ul className="pft-school-rank-list">
            {rows.map((row) => (
                <li key={row.id} className="pft-school-rank-row">
                    <div className="pft-school-rank-main">
                        <span className="pft-school-rank-name">{row.name}</span>
                        <span className="pft-school-rank-count">
                            {row.total} station{row.total === 1 ? '' : 's'} · {row.online} online
                        </span>
                    </div>
                    <div className="pft-school-rank-meta">
                        <div className="pft-school-rank-track" role="img" aria-label={`${row.online_rate}% online`}>
                            <span style={{ width: `${Math.min(100, row.online_rate)}%` }} />
                        </div>
                        <span className="pft-school-rank-pct">{row.online_rate}%</span>
                    </div>
                </li>
            ))}
        </ul>
    );
}

export default function StationsListScreen({
    stations,
    tenants,
    allStationOptions = [],
    filters = {},
    stats,
    trend,
    schoolAnalytics,
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

    function resetLink(station: StationRow) {
        router.post(route('platform.stations.pairing-link', station.id), {
            tenant_id: station.tenant_id,
        });
    }

    function reactivateStation(station: StationRow) {
        router.patch(route('platform.stations.reactivate', station.id), { tenant_id: station.tenant_id }, { preserveScroll: true });
    }

    const [retiringStation, setRetiringStation] = useState<StationRow | null>(null);
    const retireForm = useForm({ tenant_id: '' });

    function openRetireModal(station: StationRow) {
        setRetiringStation(station);
        retireForm.setData('tenant_id', String(station.tenant_id));
    }

    function submitRetireStation(e: React.FormEvent) {
        e.preventDefault();
        if (!retiringStation) return;

        retireForm.patch(route('platform.stations.retire', retiringStation.id), {
            preserveScroll: true,
            onSuccess: () => {
                setRetiringStation(null);
                retireForm.reset();
            },
        });
    }

    const [deletingStation, setDeletingStation] = useState<StationRow | null>(null);
    const deleteForm = useForm({ confirm_code: '', tenant_id: '', purge_attendance: false });
    const deleteConfirmed =
        deletingStation !== null && deleteForm.data.confirm_code.trim() === deletingStation.station_code;

    function openDeleteModal(station: StationRow) {
        setDeletingStation(station);
        deleteForm.setData({ confirm_code: '', tenant_id: String(station.tenant_id), purge_attendance: false });
    }

    function submitDeleteStation(e: React.FormEvent) {
        e.preventDefault();

        if (!deletingStation || !deleteConfirmed) {
            return;
        }

        deleteForm.delete(route('platform.stations.destroy', deletingStation.id), {
            onSuccess: () => {
                setDeletingStation(null);
                deleteForm.reset();
            },
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
                            <MonitorCheckIcon size={22} />
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

                <SecretOnceCallout label="Station link" value={flash?.pairingLink} />
                <SecretOnceCallout label="Activation code" value={flash?.activationCode} />

                {/* Fleet Analytics */}
                <div className="pft-stat-grid">
                    <StatCard
                        label="Total stations"
                        value={stats.total}
                        icon={<MonitorCheckIcon size={18} />}
                        tone="blue"
                        pill={{
                            value: sharePct(stats.online, stats.total),
                            text: 'online now',
                        }}
                    />
                    <StatCard
                        label="Active"
                        value={stats.active}
                        icon={<WifiIcon size={18} />}
                        tone="green"
                        pill={{
                            value: sharePct(stats.active, stats.total),
                            text: 'of all stations',
                        }}
                    />
                    <StatCard
                        label="Pending activation"
                        value={stats.pending_activation}
                        icon={<KeyIcon size={18} />}
                        tone="amber"
                        pill={{
                            value: sharePct(stats.pending_activation, stats.total),
                            text: 'waiting on a code',
                        }}
                    />
                    <StatCard
                        label="Out of service"
                        value={stats.disabled + stats.retired}
                        icon={<ArchiveIcon size={18} />}
                        tone="red"
                        pill={{
                            value: sharePct(stats.disabled + stats.retired, stats.total),
                            text: 'disabled or retired',
                        }}
                    />
                </div>

                <div className="pft-grid-2 pft-analytics-grid">
                    <section className="pf-panel pft-growth-panel" aria-labelledby="station-trend-title">
                        <div className="pf-panel-header">
                            <div>
                                <h2 id="station-trend-title" className="pf-panel-title">Stations added over time</h2>
                                <p className="pf-panel-count">
                                    {stats.total} station{stats.total === 1 ? '' : 's'} in window ·{' '}
                                    {trend.range.date_from} → {trend.range.date_to}
                                </p>
                            </div>
                        </div>
                        <StationTrendChart trend={trend} />
                    </section>

                    <section className="pf-panel pft-growth-panel" aria-labelledby="school-analytics-title">
                        <div className="pf-panel-header">
                            <div>
                                <h2 id="school-analytics-title" className="pf-panel-title">By school</h2>
                                <p className="pf-panel-count">Top schools by fleet size · share online</p>
                            </div>
                        </div>
                        <SchoolRankPanel rows={schoolAnalytics} />
                    </section>
                </div>

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
                <div className="pf-panel pfs-station-directory">
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
                            <div className="pf-empty-state">
                                <span className="pf-empty-state-icon" aria-hidden="true"><MonitorCheckIcon size={34} /></span>
                                <p>No stations found matching the selected filters.</p>
                            </div>
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
                                                    className="pf-row-action pf-row-action--control"
                                                >
                                                    <WrenchIcon size={15} aria-hidden="true" />
                                                    View Details
                                                    <ChevronRightIcon size={20} />
                                                </Link>
                                                {canManage && station.status === 'pending_activation' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => issueCode(station)}
                                                        className="pf-row-action pf-row-action--control pf-row-action--warning"
                                                    >
                                                        <KeyIcon size={15} aria-hidden="true" />
                                                        Issue Code
                                                    </button>
                                                )}
                                                {canManage && (
                                                    <button
                                                        type="button"
                                                        onClick={() => resetLink(station)}
                                                        className="pf-row-action pf-row-action--control"
                                                    >
                                                        Reset Link
                                                    </button>
                                                )}
                                                {canManage && station.status === 'retired' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => reactivateStation(station)}
                                                        className="pf-row-action pf-row-action--control"
                                                    >
                                                        <RotateCWIcon size={15} aria-hidden="true" />
                                                        Reactivate
                                                    </button>
                                                )}
                                                {canManage && station.status !== 'retired' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => openRetireModal(station)}
                                                        className="pf-row-action pf-row-action--warning"
                                                    >
                                                        <ArchiveIcon size={15} aria-hidden="true" />
                                                        Retire
                                                    </button>
                                                )}
                                                {canManage && (
                                                    <button
                                                        type="button"
                                                        onClick={() => openDeleteModal(station)}
                                                        className="pf-row-action pf-row-action--danger"
                                                    >
                                                        Delete
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )
                    ) : (
                        <div className="pf-table-wrap pfs-station-table-shell">
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
                                            <div className="pf-empty-state">
                                                <span className="pf-empty-state-icon" aria-hidden="true"><MonitorCheckIcon size={34} /></span>
                                                <p>No stations found matching the selected filters.</p>
                                            </div>
                                        </Table.Empty>
                                    )}

                                    {stations.data.map((station) => (
                                        <tr key={station.id}>
                                            <Table.Td>
                                                <div className="pfs-station-identity">
                                                    <span className="pfs-station-avatar" aria-hidden="true">
                                                        <MonitorCheckIcon size={17} />
                                                    </span>
                                                    <span className="pfs-station-name">{station.name}</span>
                                                </div>
                                            </Table.Td>
                                            <Table.Td>
                                                <span className="pfs-code-pill">{station.station_code}</span>
                                            </Table.Td>
                                            <Table.Td>
                                                <span className="pfs-meta-pill pfs-meta-pill--school">
                                                    <GraduationCapIcon size={13} aria-hidden="true" />
                                                    {station.tenant?.name ?? '—'}
                                                </span>
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
                                                <span
                                                    className={`pfs-connectivity-pill ${station.is_online ? 'pfs-connectivity-pill--online' : 'pfs-connectivity-pill--offline'}`}
                                                >
                                                    <WifiIcon size={13} aria-hidden="true" />
                                                    {station.is_online ? 'Online' : 'Offline'}
                                                </span>
                                            </Table.Td>
                                            <Table.Td>
                                                <span className="pfs-version-pill">
                                                    {station.app_version ? `v${station.app_version}` : 'Unreported'}
                                                </span>
                                            </Table.Td>
                                            <Table.Td>
                                                <span className="pfs-meta-pill pfs-meta-pill--seen">
                                                    <ClockIcon size={13} aria-hidden="true" />
                                                    {station.last_seen_at ? new Date(station.last_seen_at).toLocaleString() : 'Never seen'}
                                                </span>
                                            </Table.Td>
                                            <Table.Td className="pfs-station-action-cell">
                                                <div className="pfs-station-actions">
                                                    <Link
                                                        href={route('platform.stations.show', {
                                                            station: station.id,
                                                            tenant_id: station.tenant_id,
                                                        })}
                                                        className="pf-row-action pf-row-action--control"
                                                    >
                                                        <WrenchIcon size={15} aria-hidden="true" />
                                                        Manage
                                                    </Link>
                                                    {canManage && station.status === 'pending_activation' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => issueCode(station)}
                                                            className="pf-row-action pf-row-action--control pf-row-action--warning"
                                                        >
                                                            <KeyIcon size={15} aria-hidden="true" />
                                                            Issue Code
                                                        </button>
                                                    )}
                                                    {canManage && (
                                                        <button
                                                            type="button"
                                                            onClick={() => resetLink(station)}
                                                            className="pf-row-action pf-row-action--control"
                                                        >
                                                            Reset Link
                                                        </button>
                                                    )}
                                                    {canManage && station.status === 'retired' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => reactivateStation(station)}
                                                            className="pf-row-action pf-row-action--control"
                                                        >
                                                            <RotateCWIcon size={15} aria-hidden="true" />
                                                            Reactivate
                                                        </button>
                                                    )}
                                                    {canManage && station.status !== 'retired' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => openRetireModal(station)}
                                                            className="pf-row-action pf-row-action--warning"
                                                        >
                                                            <ArchiveIcon size={15} aria-hidden="true" />
                                                            Retire
                                                        </button>
                                                    )}
                                                    {canManage && (
                                                        <button
                                                            type="button"
                                                            onClick={() => openDeleteModal(station)}
                                                            className="pf-row-action pf-row-action--danger"
                                                        >
                                                            Delete
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
            <Modal
                show={retiringStation !== null}
                onClose={() => {
                    setRetiringStation(null);
                    retireForm.reset();
                }}
            >
                <form onSubmit={submitRetireStation} className="pf-modal">
                    <div className="pf-modal-header">
                        <h2 className="pf-modal-title">Retire station?</h2>
                        <p className="pf-modal-desc">
                            <strong>{retiringStation?.name}</strong> will stop accepting taps and its device
                            credentials will be revoked, but its attendance history and audit trail are kept.
                            It can be reactivated later.
                        </p>
                    </div>

                    <div className="pf-modal-footer">
                        <button
                            type="button"
                            className="pf-btn pf-btn-secondary"
                            onClick={() => {
                                setRetiringStation(null);
                                retireForm.reset();
                            }}
                            disabled={retireForm.processing}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className={'pf-btn pf-btn-danger' + (retireForm.processing ? ' pf-btn--loading' : '')}
                            disabled={retireForm.processing}
                        >
                            Retire station
                        </button>
                    </div>
                </form>
            </Modal>
            <Modal
                show={deletingStation !== null}
                onClose={() => {
                    setDeletingStation(null);
                    deleteForm.reset();
                }}
            >
                <form onSubmit={submitDeleteStation} className="pf-modal">
                    <div className="pf-modal-header">
                        <h2 className="pf-modal-title">Delete station?</h2>
                        <p className="pf-modal-desc">
                            <strong>{deletingStation?.name}</strong> will be permanently deleted, along with its
                            device credentials and station link. Stations with attendance history can't be deleted
                            unless you also purge that attendance data below — use Retire instead if you want to keep
                            the history while taking the station out of service.
                        </p>
                    </div>

                    <div className="pf-field">
                        <label className="flex items-start gap-2 text-sm font-normal">
                            <input
                                type="checkbox"
                                className="mt-0.5"
                                checked={deleteForm.data.purge_attendance}
                                onChange={(e) => deleteForm.setData('purge_attendance', e.target.checked)}
                            />
                            <span>
                                This is a test station — also delete its attendance (tap) records from our
                                database. This only affects our own database, nothing is sent to Essentiel, and it
                                cannot be undone.
                            </span>
                        </label>
                    </div>

                    <div className="pf-field">
                        <label htmlFor="confirm_code">
                            Type &quot;{deletingStation?.station_code}&quot; to confirm
                        </label>
                        <input
                            id="confirm_code"
                            type="text"
                            className="font-mono"
                            value={deleteForm.data.confirm_code}
                            onChange={(e) => deleteForm.setData('confirm_code', e.target.value)}
                            autoFocus
                        />
                        <InputError message={deleteForm.errors.confirm_code} className="mt-2" />
                    </div>

                    <div className="pf-modal-footer">
                        <button
                            type="button"
                            className="pf-btn pf-btn-secondary"
                            onClick={() => {
                                setDeletingStation(null);
                                deleteForm.reset();
                            }}
                            disabled={deleteForm.processing}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className={'pf-btn pf-btn-danger' + (deleteForm.processing ? ' pf-btn--loading' : '')}
                            disabled={deleteForm.processing || !deleteConfirmed}
                        >
                            Delete station
                        </button>
                    </div>
                </form>
            </Modal>
        </PlatformLayout>
    );
}

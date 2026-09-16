import SecretOnceCallout from '@/Components/SecretOnceCallout';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import type { PaginatedData, PaginationLink, Station } from '@/types';
import { MonitorCheckIcon } from '@/Components/icons/monitor-check';
import { WifiIcon } from '@/Components/icons/wifi';
import { CircleCheckIcon } from '@/Components/icons/circle-check';
import { BadgeAlertIcon } from '@/Components/icons/badge-alert';
import { MenuIcon } from '@/Components/icons/menu';
import { KeyIcon } from '@/Components/icons/key';
import { CheckIcon } from '@/Components/icons/check';
import { WrenchIcon } from '@/Components/icons/wrench';
import { LayoutGridIcon } from '@/Components/icons/layout-grid';
import IssueActivationCodeModal from './IssueActivationCodeModal';
import ManageStationModal from './ManageStationModal';
import '../../../../css/platform-dashboard.css';

interface StationListItem extends Station {
    station_code: string;
    is_online: boolean;
    app_version?: string | null;
    last_pending_count?: number | null;
    last_seen_at?: string | null;
}

interface StationsListScreenProps {
    stations: PaginatedData<StationListItem>;
}

interface PagePropsWithFlash {
    flash?: {
        activationCode?: string;
    };
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

interface StatCardProps {
    label: string;
    value: number;
    hint: string;
    icon: 'stations' | 'online' | 'active' | 'attention';
    tone: 'violet' | 'green' | 'blue' | 'amber';
}

const STAT_ICONS: Record<StatCardProps['icon'], React.ReactNode> = {
    stations: (
        <MonitorCheckIcon size={20} />
    ),
    online: (
        <WifiIcon size={20} />
    ),
    active: (
        <CircleCheckIcon size={20} />
    ),
    attention: (
        <BadgeAlertIcon size={20} />
    ),
};

function StatCard({ label, value, hint, icon, tone }: StatCardProps) {
    return (
        <div className="pf-stat-card">
            <span className={`pf-stat-icon pf-stat-icon--${tone}`} aria-hidden="true">
                {STAT_ICONS[icon]}
            </span>
            <div>
                <p className="pf-stat-label">{label}</p>
                <p className="pf-stat-value">{value.toLocaleString()}</p>
                <p className="pf-stat-hint">{hint}</p>
            </div>
        </div>
    );
}

interface RecencyInfo {
    tier: 'now' | 'today' | 'yesterday' | 'week' | 'older';
    label: string;
    exact: string;
    fullDate: string;
}

function getRecencyInfo(dateString: string): RecencyInfo {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.max(0, Math.floor(diffMs / 1000));
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    const exact = date.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });

    const fullDate = date.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'medium',
    });

    if (diffMin < 1) {
        return { tier: 'now', label: 'Just now', exact, fullDate };
    }
    if (diffHour < 1) {
        return { tier: 'now', label: `${diffMin}m ago`, exact, fullDate };
    }

    const isToday =
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear();

    if (isToday || diffHour < 24) {
        return { tier: 'today', label: `${diffHour}h ago`, exact, fullDate };
    }

    if (diffDay === 1 || diffHour < 48) {
        return { tier: 'yesterday', label: 'Yesterday', exact, fullDate };
    }

    if (diffDay < 7) {
        return { tier: 'week', label: `${diffDay}d ago`, exact, fullDate };
    }

    const shortDate = date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
    return { tier: 'older', label: shortDate, exact, fullDate };
}

function LastSeenCell({ dateString }: { dateString: string | null | undefined }) {
    if (!dateString) {
        return <span className="text-xs text-slate-400 italic font-medium">Never seen</span>;
    }

    const info = getRecencyInfo(dateString);

    return (
        <div className="pf-when-cell" title={info.fullDate}>
            <span className={`pf-when-pill pf-when-pill--${info.tier}`}>
                <span className="pf-when-dot" aria-hidden="true" />
                <span>{info.label}</span>
            </span>
            <span className="pf-when-exact">
                {info.exact}
            </span>
        </div>
    );
}

const statusLabels: Record<string, string> = {
    pending_activation: 'Pending Activation',
    active: 'Active',
    disabled: 'Disabled',
    retired: 'Retired',
};

function StatusPill({ status }: { status: string }) {
    const pillClass =
        status === 'active'
            ? 'pf-pill--active'
            : status === 'pending_activation'
              ? 'pf-pill--warning'
              : 'pf-pill--danger';

    return (
        <span className={`pf-pill ${pillClass}`}>
            {statusLabels[status] ?? status}
        </span>
    );
}

function ConnectivityPill({ isOnline }: { isOnline: boolean }) {
    return (
        <span className={`pf-pill ${isOnline ? 'pf-pill--online' : 'pf-pill--offline'}`}>
            {isOnline ? 'Online' : 'Offline'}
        </span>
    );
}

export default function StationsListScreen({ stations }: StationsListScreenProps) {
    const { flash } = usePage().props as PagePropsWithFlash;

    const [viewMode, setViewMode] = useState<'table' | 'gallery'>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('as-portal-stations-view') as 'table' | 'gallery') || 'table';
        }
        return 'table';
    });

    useEffect(() => {
        localStorage.setItem('as-portal-stations-view', viewMode);
    }, [viewMode]);

    const [manageStation, setManageStation] = useState<StationListItem | null>(null);
    const [issueCodeStation, setIssueCodeStation] = useState<StationListItem | null>(null);

    // Calculated overview stats
    const totalStations = stations.data.length;
    const onlineCount = stations.data.filter((s) => s.is_online).length;
    const activeCount = stations.data.filter((s) => s.status === 'active').length;
    const attentionCount = stations.data.filter(
        (s) => s.status === 'pending_activation' || !s.is_online || (s.last_pending_count ?? 0) > 0,
    ).length;

    return (
        <AdminLayout>
            <Head title="Stations" />

            <div className="pf-dashboard">
                {/* Hero Header matching Superadmin */}
                <div className="pf-dashboard-header">
                    <div>
                        <div className="pf-dashboard-kicker">School Hardware</div>
                        <h1 className="pf-dashboard-title">Stations</h1>
                        <p className="pf-dashboard-subtitle">
                            Physical attendance tap-in devices and hardware kiosks registered for your school.
                        </p>
                    </div>
                </div>

                {/* Secret Activation Code Flash Banner */}
                <SecretOnceCallout label="Activation code" value={flash?.activationCode} />

                {/* Stat Grid matching Superadmin */}
                <div className="pf-stat-grid">
                    <StatCard
                        label="Total Stations"
                        value={totalStations}
                        hint="Registered kiosks"
                        icon="stations"
                        tone="violet"
                    />
                    <StatCard
                        label="Online Now"
                        value={onlineCount}
                        hint={onlineCount === totalStations && totalStations > 0 ? 'All devices connected' : 'Heartbeat active'}
                        icon="online"
                        tone="green"
                    />
                    <StatCard
                        label="Active Fleet"
                        value={activeCount}
                        hint="Authorized for taps"
                        icon="active"
                        tone="blue"
                    />
                    <StatCard
                        label="Needs Attention"
                        value={attentionCount}
                        hint={attentionCount === 0 ? 'All systems healthy' : 'Pending activation or sync'}
                        icon="attention"
                        tone="amber"
                    />
                </div>

                {/* Stations Panel */}
                <div className="pf-panel">
                    <div className="pf-panel-header">
                        <div>
                            <h2 className="pf-panel-title">All Stations</h2>
                            <p className="pf-panel-count">
                                {stations.data.length} {stations.data.length === 1 ? 'station' : 'stations'} shown
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 mr-2">
                                <span className="text-[10.5px] font-semibold uppercase tracking-wider mr-1">Activity:</span>
                                <span className="pf-when-pill pf-when-pill--now !py-0.5 !px-2 text-[10px]">
                                    <span className="pf-when-dot" aria-hidden="true" /> Live
                                </span>
                                <span className="pf-when-pill pf-when-pill--today !py-0.5 !px-2 text-[10px]">
                                    <span className="pf-when-dot" aria-hidden="true" /> Today
                                </span>
                                <span className="pf-when-pill pf-when-pill--older !py-0.5 !px-2 text-[10px]">
                                    <span className="pf-when-dot" aria-hidden="true" /> Past
                                </span>
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
                    </div>

                    {viewMode === 'gallery' ? (
                        stations.data.length === 0 ? (
                            <p className="pf-empty">No stations registered yet.</p>
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
                                        <div
                                            key={station.id}
                                            className="station-card"
                                            style={{ animationDelay: `${index * 36}ms` }}
                                        >
                                            <div className="station-card-top">
                                                <span className={`station-card-icon ${iconTone}`} aria-hidden="true">
                                                    <MonitorCheckIcon size={20} />
                                                </span>
                                                <StatusPill status={station.status} />
                                            </div>
                                            <div>
                                                <h3 className="station-card-name">{station.name}</h3>
                                                <p className="station-card-code">{station.station_code}</p>
                                                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                                    <ConnectivityPill isOnline={station.is_online} />
                                                    {station.last_pending_count != null && station.last_pending_count > 0 && (
                                                        <span className="pf-pill pf-pill--warning">
                                                            {station.last_pending_count} pending
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="station-card-footer">
                                                <span className="station-card-meta text-[11px]">
                                                    {station.app_version ? `v${station.app_version}` : '—'} ·{' '}
                                                    {station.last_seen_at ? (
                                                        <span>{getRecencyInfo(station.last_seen_at).label}</span>
                                                    ) : (
                                                        'Never seen'
                                                    )}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    {station.status === 'pending_activation' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setIssueCodeStation(station)}
                                                            className="pf-row-action pf-row-action--control pf-row-action--warning"
                                                        >
                                                            <KeyIcon size={15} aria-hidden="true" />
                                                            Issue Code
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => setManageStation(station)}
                                                        className="pf-row-action pf-row-action--control"
                                                    >
                                                        <WrenchIcon size={15} aria-hidden="true" />
                                                        Manage
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )
                    ) : (
                        <div className="pf-table-wrap">
                            <table className="pf-table">
                                <thead>
                                    <tr>
                                        <th scope="col">Station</th>
                                        <th scope="col">Status</th>
                                        <th scope="col">Connectivity</th>
                                        <th scope="col">Version</th>
                                        <th scope="col">Sync Queue</th>
                                        <th scope="col">Last Seen</th>
                                        <th scope="col">
                                            <span className="sr-only">Actions</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stations.data.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="pf-empty">
                                                <div className="flex flex-col items-center justify-center py-6 gap-2">
                                                    <MonitorCheckIcon size={32} className="text-slate-300" />
                                                    <p className="text-slate-500 font-medium">No stations registered yet.</p>
                                                    <p className="text-xs text-slate-400">
                                                        Tap kiosks will appear here once provisioned by your system administrator.
                                                    </p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}

                                    {stations.data.map((station) => (
                                        <tr key={station.id}>
                                            <td>
                                                <div className="pf-tenant-cell">
                                                    <span
                                                        className={`pf-tenant-avatar ${
                                                            station.status === 'active' && station.is_online
                                                                ? '!bg-emerald-50 !text-emerald-600 !border-emerald-200'
                                                                : station.status === 'pending_activation'
                                                                  ? '!bg-amber-50 !text-amber-600 !border-amber-200'
                                                                  : '!bg-slate-100 !text-slate-500 !border-slate-200'
                                                        }`}
                                                        style={{ width: 32, height: 32, flex: '0 0 32px', borderRadius: 10 }}
                                                        aria-hidden="true"
                                                    >
                                                        <MonitorCheckIcon size={16} />
                                                    </span>
                                                    <div>
                                                        <span className="pf-tenant-name font-semibold">{station.name}</span>
                                                        <span className="pf-tenant-code">{station.station_code}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <StatusPill status={station.status} />
                                            </td>
                                            <td>
                                                <ConnectivityPill isOnline={station.is_online} />
                                            </td>
                                            <td>
                                                {station.app_version ? (
                                                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/80">
                                                        v{station.app_version}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400">—</span>
                                                )}
                                            </td>
                                            <td>
                                                {station.last_pending_count != null && station.last_pending_count > 0 ? (
                                                    <span className="pf-pill pf-pill--warning">
                                                        {station.last_pending_count} pending
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                                                        <CheckIcon size={14} className="text-emerald-500" />
                                                        Synced
                                                    </span>
                                                )}
                                            </td>
                                            <td>
                                                <LastSeenCell dateString={station.last_seen_at} />
                                            </td>
                                            <td>
                                                <div className="flex items-center justify-end gap-2">
                                                    {station.status === 'pending_activation' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setIssueCodeStation(station)}
                                                            className="pf-row-action pf-row-action--control pf-row-action--warning"
                                                        >
                                                            <KeyIcon size={15} aria-hidden="true" />
                                                            Issue Code
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => setManageStation(station)}
                                                        className="pf-row-action pf-row-action--control"
                                                    >
                                                        <WrenchIcon size={15} aria-hidden="true" />
                                                        Manage
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <PaginationBar links={stations.links} />
                </div>
            </div>

            <ManageStationModal
                station={manageStation}
                show={Boolean(manageStation)}
                onClose={() => setManageStation(null)}
                onIssueCodeClick={(stn) => {
                    setManageStation(null);
                    setIssueCodeStation(stn as StationListItem);
                }}
            />

            <IssueActivationCodeModal
                station={issueCodeStation}
                show={Boolean(issueCodeStation)}
                onClose={() => setIssueCodeStation(null)}
            />
        </AdminLayout>
    );
}

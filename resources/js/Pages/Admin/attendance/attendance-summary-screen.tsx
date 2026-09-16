import PremiumSelect from '@/Components/PremiumSelect';
import { ArrowLeftIcon } from '@/Components/icons/arrow-left';
import { CalendarCheckIcon } from '@/Components/icons/calendar-check';
import { ChevronRightIcon } from '@/Components/icons/chevron-right';
import { LogoutIcon } from '@/Components/icons/logout';
import { MonitorCheckIcon } from '@/Components/icons/monitor-check';
import { NfcIcon } from '@/Components/icons/nfc';
import { RefreshCwIcon } from '@/Components/icons/refresh-cw';
import { SearchIcon } from '@/Components/icons/search';
import { SlidersHorizontalIcon } from '@/Components/icons/sliders-horizontal';
import { UsersIcon } from '@/Components/icons/users';
import { XIcon } from '@/Components/icons/x';
import { ZapIcon } from '@/Components/icons/zap';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import type { PaginatedData, PaginationLink, Station } from '@/types';
import '../../../../css/platform-dashboard.css';

interface SummaryRow {
    attendance_date_local: string;
    total: number;
    unique_people: number;
}

interface SummaryFilters {
    date_from?: string;
    date_to?: string;
    station_id?: string;
    event_type?: string;
}

interface AttendanceStats {
    total_days: number;
    taps_today: number;
    total_in: number;
    total_out: number;
}

interface AttendanceSummaryScreenProps {
    summary: PaginatedData<SummaryRow>;
    filters: SummaryFilters;
    stats?: AttendanceStats;
    stations: Station[];
}

interface StatCardProps {
    label: string;
    value: number;
    hint: string;
    icon: 'calendar' | 'taps' | 'in' | 'out';
    tone: 'blue' | 'green' | 'violet' | 'amber';
}

const STAT_ICONS: Record<StatCardProps['icon'], React.ReactNode> = {
    calendar: (
        <CalendarCheckIcon size={20} />
    ),
    taps: (
        <NfcIcon size={20} />
    ),
    in: (
        <ArrowLeftIcon size={20} />
    ),
    out: (
        <LogoutIcon size={20} />
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

function formatDate(dateStr: string) {
    if (!dateStr) {
        return { formatted: '—', weekday: '', isToday: false, isYesterday: false };
    }
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        const now = new Date();
        const isToday =
            d.getFullYear() === now.getFullYear() &&
            d.getMonth() === now.getMonth() &&
            d.getDate() === now.getDate();

        const yesterday = new Date();
        yesterday.setDate(now.getDate() - 1);
        const isYesterday =
            d.getFullYear() === yesterday.getFullYear() &&
            d.getMonth() === yesterday.getMonth() &&
            d.getDate() === yesterday.getDate();

        const formatted = d.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
        });
        const weekday = d.toLocaleDateString(undefined, { weekday: 'short' });

        return { formatted, weekday, isToday, isYesterday };
    }

    return { formatted: dateStr, weekday: '', isToday: false, isYesterday: false };
}

export default function AttendanceSummaryScreen({
    summary,
    filters,
    stats,
    stations,
}: AttendanceSummaryScreenProps) {
    const { data, setData } = useForm({
        date_from: filters.date_from ?? '',
        date_to: filters.date_to ?? '',
        station_id: filters.station_id ?? '',
        event_type: filters.event_type ?? '',
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        router.get(route('portal.attendance.summary'), data, { preserveState: true });
    }

    const activeFilterCount = Object.values(data).filter((v) => Boolean(v)).length;

    const daysCount = stats?.total_days ?? summary.data.length;
    const tapsTodayCount = stats?.taps_today ?? summary.data.find((r) => formatDate(r.attendance_date_local).isToday)?.total ?? 0;
    const totalInCount = stats?.total_in ?? 0;
    const totalOutCount = stats?.total_out ?? 0;

    return (
        <AdminLayout>
            <Head title="Daily Attendance Summary" />

            <div className="pf-dashboard">
                {/* Hero Header */}
                <div className="pf-dashboard-header">
                    <div>
                        <span className="pf-dashboard-kicker">Attendance Analytics</span>
                        <h1 className="pf-dashboard-title">Daily Attendance Summary</h1>
                        <p className="pf-dashboard-subtitle">
                            Daily aggregated attendance metrics showing total tap volumes, attendee headcounts, and check-in velocity.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <Link
                            href={route('portal.attendance.index')}
                            className="pf-btn pf-btn-secondary"
                        >
                            <ArrowLeftIcon size={16} />
                            <span>Back to Live Records</span>
                        </Link>
                    </div>
                </div>

                {/* Stat Cards Grid */}
                <div className="pf-stat-grid">
                    <StatCard
                        label="Days Recorded"
                        value={daysCount}
                        hint="Active calendar days"
                        icon="calendar"
                        tone="blue"
                    />
                    <StatCard
                        label="Today's Total Taps"
                        value={tapsTodayCount}
                        hint="Logged for today"
                        icon="taps"
                        tone="green"
                    />
                    <StatCard
                        label="Total Check-Ins"
                        value={totalInCount}
                        hint="Tap IN events"
                        icon="in"
                        tone="violet"
                    />
                    <StatCard
                        label="Total Check-Outs"
                        value={totalOutCount}
                        hint="Tap OUT events"
                        icon="out"
                        tone="amber"
                    />
                </div>

                {/* Filter Panel */}
                <div className="pf-panel mb-6">
                    <div className="pf-panel-header">
                        <div className="flex items-center gap-2.5">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                                <SlidersHorizontalIcon size={16} />
                            </span>
                            <div>
                                <h2 className="pf-panel-title">Filter Daily Aggregations</h2>
                                <p className="pf-panel-count">
                                    {activeFilterCount === 0
                                        ? 'Showing all historical dates'
                                        : `${activeFilterCount} active ${activeFilterCount === 1 ? 'filter' : 'filters'} applied`}
                                </p>
                            </div>
                        </div>

                        {activeFilterCount > 0 && (
                            <Link
                                href={route('portal.attendance.summary')}
                                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition"
                            >
                                <XIcon size={14} />
                                Clear Filters
                            </Link>
                        )}
                    </div>

                    <form onSubmit={submit} className="p-5 sm:p-6">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            {/* Date From */}
                            <div>
                                <label
                                    htmlFor="date_from"
                                    className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400"
                                >
                                    <CalendarCheckIcon size={14} className="text-slate-400" />
                                    From Date
                                </label>
                                <input
                                    id="date_from"
                                    type="date"
                                    value={data.date_from}
                                    onChange={(e) => setData('date_from', e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm transition hover:border-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                                />
                            </div>

                            {/* Date To */}
                            <div>
                                <label
                                    htmlFor="date_to"
                                    className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400"
                                >
                                    <CalendarCheckIcon size={14} className="text-slate-400" />
                                    To Date
                                </label>
                                <input
                                    id="date_to"
                                    type="date"
                                    value={data.date_to}
                                    onChange={(e) => setData('date_to', e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm transition hover:border-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                                />
                            </div>

                            {/* Station */}
                            <div>
                                <label
                                    htmlFor="station_id"
                                    className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400"
                                >
                                    <MonitorCheckIcon size={14} className="text-slate-400" />
                                    Station
                                </label>
                                <PremiumSelect
                                    id="station_id"
                                    value={data.station_id}
                                    onChange={(stationId) => setData('station_id', stationId)}
                                    options={[
                                        { value: '', label: 'All Stations' },
                                        ...stations.map((station: Station) => ({
                                            value: String(station.id),
                                            label: station.name,
                                        })),
                                    ]}
                                    placeholder="Filter by station"
                                    className="w-full"
                                />
                            </div>

                            {/* Event Type */}
                            <div>
                                <label
                                    htmlFor="event_type"
                                    className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400"
                                >
                                    <ChevronRightIcon size={14} className="text-slate-400" />
                                    Event Type
                                </label>
                                <PremiumSelect
                                    id="event_type"
                                    value={data.event_type}
                                    onChange={(eventType) => setData('event_type', eventType)}
                                    options={[
                                        { value: '', label: 'All Events' },
                                        { value: 'IN', label: 'IN (Tap In)' },
                                        { value: 'OUT', label: 'OUT (Tap Out)' },
                                    ]}
                                    placeholder="All Types"
                                    className="w-full"
                                />
                            </div>
                        </div>

                        {/* Filter Bar Action Buttons */}
                        <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                            <button type="submit" className="pf-btn pf-btn-primary !h-10 text-xs">
                                <SearchIcon size={16} />
                                Apply Filters
                            </button>
                            <Link
                                href={route('portal.attendance.summary')}
                                className="pf-btn pf-btn-secondary !h-10 text-xs"
                            >
                                <RefreshCwIcon size={16} />
                                Reset
                            </Link>
                        </div>
                    </form>
                </div>

                {/* Summary Table Panel */}
                <div className="pf-panel">
                    <div className="pf-panel-header">
                        <div>
                            <h2 className="pf-panel-title">Daily Attendance Logs</h2>
                            <p className="pf-panel-count">
                                {summary.data.length} {summary.data.length === 1 ? 'day' : 'days'} shown
                            </p>
                        </div>
                    </div>

                    <div className="pf-table-wrap">
                        <table className="pf-table">
                            <thead>
                                <tr>
                                    <th scope="col">Date</th>
                                    <th scope="col">Total Taps</th>
                                    <th scope="col">Unique Attendees</th>
                                    <th scope="col">Engagement Ratio</th>
                                </tr>
                            </thead>
                            <tbody>
                                {summary.data.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="pf-empty">
                                            <div className="flex flex-col items-center justify-center py-10 gap-3">
                                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                                                    <CalendarCheckIcon size={22} />
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No attendance data for this range</p>
                                                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                                                        No summary records exist for the selected date window or stations.
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}

                                {summary.data.map((row: SummaryRow) => {
                                    const dateInfo = formatDate(row.attendance_date_local);
                                    const avgTapsPerPerson =
                                        row.unique_people > 0
                                            ? (row.total / row.unique_people).toFixed(1)
                                            : '0';

                                    return (
                                        <tr key={row.attendance_date_local}>
                                            {/* Date Column */}
                                            <td>
                                                <div className="flex items-center gap-2">
                                                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700/80 dark:bg-slate-800/80 dark:text-slate-200">
                                                        <CalendarCheckIcon size={14} className="text-slate-400" />
                                                        <span>{dateInfo.formatted}</span>
                                                        {dateInfo.weekday && (
                                                            <span className="text-[10px] uppercase font-bold text-slate-400">
                                                                {dateInfo.weekday}
                                                            </span>
                                                        )}
                                                    </span>

                                                    {dateInfo.isToday && (
                                                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/80 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:border-emerald-800/80 dark:bg-emerald-950/40 dark:text-emerald-300">
                                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                            Today
                                                        </span>
                                                    )}

                                                    {dateInfo.isYesterday && (
                                                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                                                            Yesterday
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Total Taps */}
                                            <td>
                                                <div className="flex items-center gap-2.5">
                                                    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-blue-200/80 bg-blue-50 text-blue-600 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-400">
                                                        <NfcIcon size={14} />
                                                    </span>

                                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200/80 bg-blue-50/70 px-3 py-1 text-xs font-extrabold text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300">
                                                        {row.total.toLocaleString()} taps
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Unique Attendees */}
                                            <td>
                                                <div className="flex items-center gap-2.5">
                                                    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-purple-200/80 bg-purple-50 text-purple-600 dark:border-purple-900/60 dark:bg-purple-950/40 dark:text-purple-400">
                                                        <UsersIcon size={14} />
                                                    </span>

                                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-200/80 bg-purple-50/70 px-3 py-1 text-xs font-extrabold text-purple-700 dark:border-purple-900/60 dark:bg-purple-950/40 dark:text-purple-300">
                                                        {row.unique_people.toLocaleString()} people
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Average Taps / Person */}
                                            <td>
                                                <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300">
                                                    <ZapIcon size={14} className="text-slate-400" />
                                                    <span>{avgTapsPerPerson} taps / person</span>
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <PaginationBar links={summary.links} />
                </div>
            </div>
        </AdminLayout>
    );
}

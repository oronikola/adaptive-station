import PremiumSelect from '@/Components/PremiumSelect';
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
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
            <circle cx="12" cy="15" r="2" />
        </svg>
    ),
    taps: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 8.32a7.43 7.43 0 0 1 0 7.36" />
            <path d="M9.46 6.21a11.76 11.76 0 0 1 0 11.58" />
            <path d="M12.91 4.1a15.91 15.91 0 0 1 0 15.8" />
            <rect x="3" y="5" width="18" height="14" rx="3" />
        </svg>
    ),
    in: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 16l-4-4m0 0l4-4m-4 4h14" />
            <path d="M15 20h3a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3" />
        </svg>
    ),
    out: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 16l4-4m0 0l-4-4m4 4H7" />
            <path d="M13 20H9a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h4" />
        </svg>
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
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
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
                                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                                </svg>
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
                                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
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
                                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                        <line x1="16" y1="2" x2="16" y2="6" />
                                        <line x1="8" y1="2" x2="8" y2="6" />
                                        <line x1="3" y1="10" x2="21" y2="10" />
                                    </svg>
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
                                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                        <line x1="16" y1="2" x2="16" y2="6" />
                                        <line x1="8" y1="2" x2="8" y2="6" />
                                        <line x1="3" y1="10" x2="21" y2="10" />
                                    </svg>
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
                                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="4" y="5" width="16" height="13" rx="2" />
                                        <path d="M8 21h8M9 9h6M9 13h4" />
                                    </svg>
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
                                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10" />
                                        <path d="m10 8 4 4-4 4" />
                                    </svg>
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
                                <svg viewBox="0 0 24 24">
                                    <circle cx="11" cy="11" r="8" />
                                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                </svg>
                                Apply Filters
                            </button>
                            <Link
                                href={route('portal.attendance.summary')}
                                className="pf-btn pf-btn-secondary !h-10 text-xs"
                            >
                                <svg viewBox="0 0 24 24">
                                    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                                    <path d="M21 3v5h-5" />
                                    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                                    <path d="M3 21v-5h5" />
                                </svg>
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
                                                    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                                        <line x1="16" y1="2" x2="16" y2="6" />
                                                        <line x1="8" y1="2" x2="8" y2="6" />
                                                        <line x1="3" y1="10" x2="21" y2="10" />
                                                    </svg>
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
                                                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                                            <line x1="16" y1="2" x2="16" y2="6" />
                                                            <line x1="8" y1="2" x2="8" y2="6" />
                                                            <line x1="3" y1="10" x2="21" y2="10" />
                                                        </svg>
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
                                                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-currentColor stroke-2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M6 8.32a7.43 7.43 0 0 1 0 7.36" />
                                                            <path d="M9.46 6.21a11.76 11.76 0 0 1 0 11.58" />
                                                            <path d="M12.91 4.1a15.91 15.91 0 0 1 0 15.8" />
                                                        </svg>
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
                                                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-currentColor stroke-2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                                            <circle cx="9" cy="7" r="4" />
                                                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                                        </svg>
                                                    </span>

                                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-200/80 bg-purple-50/70 px-3 py-1 text-xs font-extrabold text-purple-700 dark:border-purple-900/60 dark:bg-purple-950/40 dark:text-purple-300">
                                                        {row.unique_people.toLocaleString()} people
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Average Taps / Person */}
                                            <td>
                                                <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300">
                                                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                                    </svg>
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

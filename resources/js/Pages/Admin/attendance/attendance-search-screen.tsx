import PremiumSelect from '@/Components/PremiumSelect';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import type { PaginatedData, PaginationLink, Person, Station } from '@/types';
import '../../../../css/platform-dashboard.css';

interface AttendanceEvent {
    id: number | string;
    attendance_date_local: string;
    occurred_at: string;
    card_uid: string;
    event_type: 'IN' | 'OUT' | string;
    person?: Person | null;
    station?: Station | null;
}

interface AttendanceFilters {
    date_from?: string;
    date_to?: string;
    person_id?: string;
    card_uid?: string;
    station_id?: string;
    event_type?: string;
}

interface AttendanceStats {
    total_events: number;
    taps_today: number;
    total_in: number;
    total_out: number;
}

interface AttendanceSearchScreenProps {
    events: PaginatedData<AttendanceEvent>;
    filters: AttendanceFilters;
    stats?: AttendanceStats;
    people: Person[];
    stations: Station[];
}

interface StatCardProps {
    label: string;
    value: number;
    hint: string;
    icon: 'taps' | 'today' | 'in' | 'out';
    tone: 'blue' | 'green' | 'violet' | 'amber';
}

const STAT_ICONS: Record<StatCardProps['icon'], React.ReactNode> = {
    taps: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 8.32a7.43 7.43 0 0 1 0 7.36" />
            <path d="M9.46 6.21a11.76 11.76 0 0 1 0 11.58" />
            <path d="M12.91 4.1a15.91 15.91 0 0 1 0 15.8" />
            <rect x="3" y="5" width="18" height="14" rx="3" />
        </svg>
    ),
    today: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
            <path d="m9 16 2 2 4-4" />
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

function formatTime(occurredAtStr: string) {
    if (!occurredAtStr) {
        return { time: '—', full: '' };
    }
    const d = new Date(occurredAtStr);
    const time = d.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
    const full = d.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'medium',
    });
    return { time, full };
}

export default function AttendanceSearchScreen({
    events,
    filters,
    stats,
    people,
    stations,
}: AttendanceSearchScreenProps) {
    const { data, setData } = useForm({
        date_from: filters.date_from ?? '',
        date_to: filters.date_to ?? '',
        person_id: filters.person_id ?? '',
        card_uid: filters.card_uid ?? '',
        station_id: filters.station_id ?? '',
        event_type: filters.event_type ?? '',
    });

    const [copiedUid, setCopiedUid] = useState<string | null>(null);

    function handleCopyUid(uid: string) {
        navigator.clipboard.writeText(uid).then(() => {
            setCopiedUid(uid);
            setTimeout(() => {
                setCopiedUid((current) => (current === uid ? null : current));
            }, 2000);
        });
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        router.get(route('portal.attendance.index'), data, {
            preserveState: true,
        });
    }

    const activeFilterCount = Object.values(data).filter((v) => Boolean(v)).length;

    const exportUrl = `${route('portal.attendance.export')}?${new URLSearchParams(
        Object.fromEntries(Object.entries(data).filter(([, v]) => v !== '')),
    ).toString()}`;

    // Stat values fallback to current paginated data if stats prop isn't passed
    const totalEventsCount = stats?.total_events ?? events.data.length;
    const tapsTodayCount = stats?.taps_today ?? events.data.filter((e) => formatDate(e.attendance_date_local).isToday).length;
    const totalInCount = stats?.total_in ?? events.data.filter((e) => e.event_type === 'IN').length;
    const totalOutCount = stats?.total_out ?? events.data.filter((e) => e.event_type === 'OUT').length;

    return (
        <AdminLayout>
            <Head title="Attendance" />

            <div className="pf-dashboard">
                {/* Dashboard Hero Header */}
                <div className="pf-dashboard-header">
                    <div>
                        <span className="pf-dashboard-kicker">Portal Attendance</span>
                        <h1 className="pf-dashboard-title">Attendance Records</h1>
                        <p className="pf-dashboard-subtitle">
                            Real-time stream of RFID tap events across all station kiosks with person identification,
                            verified card numbers, and direction tracking.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <Link
                            href={route('portal.attendance.summary')}
                            className="pf-btn pf-btn-secondary"
                        >
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            <span>Daily Summary</span>
                        </Link>

                        <a
                            href={exportUrl}
                            className="pf-btn pf-btn-primary"
                            title="Download filtered records as CSV spreadsheet"
                        >
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>Export CSV</span>
                        </a>
                    </div>
                </div>

                {/* Stat Cards Grid */}
                <div className="pf-stat-grid">
                    <StatCard
                        label="Total Tap Events"
                        value={totalEventsCount}
                        hint="All-time recorded entries"
                        icon="taps"
                        tone="blue"
                    />
                    <StatCard
                        label="Today's Taps"
                        value={tapsTodayCount}
                        hint="Logged for today"
                        icon="today"
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
                                <h2 className="pf-panel-title">Search &amp; Filter Events</h2>
                                <p className="pf-panel-count">
                                    {activeFilterCount === 0
                                        ? 'Showing all records without restrictions'
                                        : `${activeFilterCount} active ${activeFilterCount === 1 ? 'filter' : 'filters'} applied`}
                                </p>
                            </div>
                        </div>

                        {activeFilterCount > 0 && (
                            <Link
                                href={route('portal.attendance.index')}
                                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition"
                            >
                                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Clear All
                            </Link>
                        )}
                    </div>

                    <form onSubmit={submit} className="p-5 sm:p-6">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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

                            {/* Person */}
                            <div>
                                <label
                                    htmlFor="person_id"
                                    className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400"
                                >
                                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="7" r="4" />
                                        <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
                                    </svg>
                                    Person
                                </label>
                                <PremiumSelect
                                    id="person_id"
                                    value={data.person_id}
                                    onChange={(personId) => setData('person_id', personId)}
                                    options={[
                                        { value: '', label: 'All People' },
                                        ...people.map((person: Person) => ({
                                            value: String(person.id),
                                            label: person.display_name,
                                        })),
                                    ]}
                                    placeholder="Filter by person"
                                    className="w-full"
                                />
                            </div>

                            {/* Card UID */}
                            <div>
                                <label
                                    htmlFor="card_uid"
                                    className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400"
                                >
                                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="5" width="18" height="14" rx="3" />
                                        <path d="M3 10h18" />
                                    </svg>
                                    Card UID
                                </label>
                                <input
                                    id="card_uid"
                                    type="text"
                                    value={data.card_uid}
                                    onChange={(e) => setData('card_uid', e.target.value)}
                                    placeholder="e.g. A0B1C2D3"
                                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 font-mono text-sm uppercase text-slate-900 shadow-sm transition hover:border-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 placeholder:normal-case placeholder:font-sans"
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
                        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                                <button type="submit" className="pf-btn pf-btn-primary !h-10 text-xs">
                                    <svg viewBox="0 0 24 24">
                                        <circle cx="11" cy="11" r="8" />
                                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                    </svg>
                                    Apply Filters
                                </button>
                                <Link
                                    href={route('portal.attendance.index')}
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

                            <a
                                href={exportUrl}
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-750 transition"
                                title="Download filtered entries as CSV file"
                            >
                                <svg viewBox="0 0 24 24" className="h-4 w-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span>Export Filtered CSV</span>
                            </a>
                        </div>
                    </form>
                </div>

                {/* Main Table Panel */}
                <div className="pf-panel">
                    <div className="pf-panel-header">
                        <div>
                            <h2 className="pf-panel-title">Tap Activity Feed</h2>
                            <p className="pf-panel-count">
                                {events.data.length} {events.data.length === 1 ? 'record' : 'records'} displayed on this page
                            </p>
                        </div>

                        <div className="hidden md:flex items-center gap-2 text-xs">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mr-1">
                                Event Legend:
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:border-emerald-800/80 dark:bg-emerald-950/40 dark:text-emerald-300">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                TAP IN
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/80 bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 dark:border-amber-800/80 dark:bg-amber-950/40 dark:text-amber-300">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                TAP OUT
                            </span>
                        </div>
                    </div>

                    <div className="pf-table-wrap">
                        <table className="pf-table">
                            <thead>
                                <tr>
                                    <th scope="col">When &amp; Date</th>
                                    <th scope="col">Time</th>
                                    <th scope="col">Person / Attendee</th>
                                    <th scope="col">Card UID</th>
                                    <th scope="col">Station Kiosk</th>
                                    <th scope="col">Direction &amp; Event</th>
                                </tr>
                            </thead>
                            <tbody>
                                {events.data.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="pf-empty">
                                            <div className="flex flex-col items-center justify-center py-10 gap-3">
                                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                                                    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                                        <line x1="16" y1="2" x2="16" y2="6" />
                                                        <line x1="8" y1="2" x2="8" y2="6" />
                                                        <line x1="3" y1="10" x2="21" y2="10" />
                                                        <circle cx="12" cy="15" r="2" />
                                                    </svg>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No attendance events found</p>
                                                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                                                        No tap records matched your current filters. Try widening your date range or clearing selected criteria.
                                                    </p>
                                                </div>
                                                {activeFilterCount > 0 && (
                                                    <Link
                                                        href={route('portal.attendance.index')}
                                                        className="pf-btn pf-btn-secondary !h-9 text-xs mt-1"
                                                    >
                                                        Clear Filters
                                                    </Link>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )}

                                {events.data.map((event: AttendanceEvent) => {
                                    const dateInfo = formatDate(event.attendance_date_local);
                                    const timeInfo = formatTime(event.occurred_at);
                                    const isStudent = event.person?.person_type === 'student';
                                    const initials = event.person
                                        ? (event.person.first_name?.[0] || '') + (event.person.last_name?.[0] || '')
                                        : '';

                                    return (
                                        <tr key={event.id}>
                                            {/* Date Column with Calendar Pill */}
                                            <td>
                                                <div className="flex flex-col gap-1 items-start">
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
                                                </div>
                                            </td>

                                            {/* Time Column with Clock Pill */}
                                            <td>
                                                <div className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-100 bg-indigo-50/60 px-2.5 py-1 text-xs font-mono font-semibold text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300" title={`Exact timestamp: ${timeInfo.full}`}>
                                                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <circle cx="12" cy="12" r="10" />
                                                        <polyline points="12 6 12 12 16 14" />
                                                    </svg>
                                                    <span>{timeInfo.time}</span>
                                                </div>
                                            </td>

                                            {/* Person / Holder with Avatar, Badges & Details */}
                                            <td>
                                                {event.person ? (
                                                    <div className="flex items-center gap-3">
                                                        {event.person.photo_url ? (
                                                            <img
                                                                src={event.person.photo_url}
                                                                alt={event.person.display_name}
                                                                className="h-8 w-8 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                                                                onError={(e) => {
                                                                    (e.target as HTMLElement).style.display = 'none';
                                                                }}
                                                            />
                                                        ) : (
                                                            <span
                                                                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl text-xs font-extrabold text-white shadow-sm ${
                                                                    isStudent
                                                                        ? 'bg-gradient-to-br from-blue-500 to-indigo-600'
                                                                        : 'bg-gradient-to-br from-purple-500 to-indigo-600'
                                                                }`}
                                                            >
                                                                {initials || '?'}
                                                            </span>
                                                        )}

                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                                                                {event.person.display_name}
                                                            </span>

                                                            <div className="flex flex-wrap items-center gap-1.5">
                                                                <span
                                                                    className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.2 text-[10px] font-bold uppercase tracking-wider ${
                                                                        isStudent
                                                                            ? 'border border-blue-200/80 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300'
                                                                            : 'border border-purple-200/80 bg-purple-50 text-purple-700 dark:border-purple-900/60 dark:bg-purple-950/40 dark:text-purple-300'
                                                                    }`}
                                                                >
                                                                    {isStudent ? (
                                                                        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
                                                                            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                                                                            <path d="M6 12v5c3 3 9 3 12 0v-5" />
                                                                        </svg>
                                                                    ) : (
                                                                        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
                                                                            <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                                                                            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                                                                        </svg>
                                                                    )}
                                                                    {event.person.person_type}
                                                                </span>

                                                                {(event.person.grade_level || event.person.section) && (
                                                                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                                                        {[event.person.grade_level ? `Gr. ${event.person.grade_level}` : null, event.person.section]
                                                                            .filter(Boolean)
                                                                            .join(' · ')}
                                                                    </span>
                                                                )}

                                                                {event.person.external_id && (
                                                                    <span className="rounded bg-slate-100 px-1 py-0.2 font-mono text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                                                        #{event.person.external_id}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/80 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
                                                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <circle cx="12" cy="12" r="10" />
                                                            <line x1="12" y1="8" x2="12" y2="12" />
                                                            <line x1="12" y1="16" x2="12.01" y2="16" />
                                                        </svg>
                                                        Unlinked Card
                                                    </span>
                                                )}
                                            </td>

                                            {/* Card UID with RFID Badge & Copy Button */}
                                            <td>
                                                <div className="flex items-center gap-2">
                                                    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-blue-200/80 bg-blue-50 text-blue-600 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-400">
                                                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-currentColor stroke-2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M6 8.32a7.43 7.43 0 0 1 0 7.36" />
                                                            <path d="M9.46 6.21a11.76 11.76 0 0 1 0 11.58" />
                                                            <path d="M12.91 4.1a15.91 15.91 0 0 1 0 15.8" />
                                                        </svg>
                                                    </span>

                                                    <span className="font-mono text-xs font-bold tracking-wider text-slate-800 dark:text-slate-200">
                                                        {event.card_uid}
                                                    </span>

                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopyUid(event.card_uid)}
                                                        className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-blue-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-blue-400 transition"
                                                        title={copiedUid === event.card_uid ? 'Copied to clipboard!' : 'Copy Card UID'}
                                                    >
                                                        {copiedUid === event.card_uid ? (
                                                            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M20 6L9 17l-5-5" />
                                                            </svg>
                                                        ) : (
                                                            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                                            </svg>
                                                        )}
                                                    </button>
                                                </div>
                                            </td>

                                            {/* Station Kiosk Pill */}
                                            <td>
                                                {event.station ? (
                                                    <div className="flex items-center gap-2">
                                                        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-300">
                                                            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-currentColor stroke-2" strokeLinecap="round" strokeLinejoin="round">
                                                                <rect x="4" y="5" width="16" height="13" rx="2" />
                                                                <path d="M8 21h8M9 9h6M9 13h4" />
                                                            </svg>
                                                        </span>
                                                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                                            {event.station.name}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-900">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                                                        Unassigned Station
                                                    </span>
                                                )}
                                            </td>

                                            {/* Event Type Pill with Directional Icons */}
                                            <td>
                                                {event.event_type === 'IN' ? (
                                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/90 bg-emerald-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 shadow-sm dark:border-emerald-800/90 dark:bg-emerald-950/40 dark:text-emerald-300">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 20h3a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3" />
                                                        </svg>
                                                        <span>TAP IN</span>
                                                    </span>
                                                ) : event.event_type === 'OUT' ? (
                                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/90 bg-amber-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-amber-700 shadow-sm dark:border-amber-800/90 dark:bg-amber-950/40 dark:text-amber-300">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 20H9a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h4" />
                                                        </svg>
                                                        <span>TAP OUT</span>
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                                        {event.event_type}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <PaginationBar links={events.links} />
                </div>
            </div>
        </AdminLayout>
    );
}

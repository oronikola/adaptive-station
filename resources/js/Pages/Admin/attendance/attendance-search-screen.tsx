import PremiumSelect from '@/Components/PremiumSelect';
import { ArrowLeftIcon } from '@/Components/icons/arrow-left';
import { CalendarCheckIcon } from '@/Components/icons/calendar-check';
import { CheckIcon } from '@/Components/icons/check';
import { ChevronRightIcon } from '@/Components/icons/chevron-right';
import { CircleHelpIcon } from '@/Components/icons/circle-help';
import { ClockIcon } from '@/Components/icons/clock';
import { CopyIcon } from '@/Components/icons/copy';
import { CreditCardIcon } from '@/Components/icons/credit-card';
import { DownloadIcon } from '@/Components/icons/download';
import { GraduationCapIcon } from '@/Components/icons/graduation-cap';
import { IdCardIcon } from '@/Components/icons/id-card';
import { LayoutGridIcon } from '@/Components/icons/layout-grid';
import { LogoutIcon } from '@/Components/icons/logout';
import { MonitorCheckIcon } from '@/Components/icons/monitor-check';
import { NfcIcon } from '@/Components/icons/nfc';
import { RefreshCwIcon } from '@/Components/icons/refresh-cw';
import { SearchIcon } from '@/Components/icons/search';
import { SlidersHorizontalIcon } from '@/Components/icons/sliders-horizontal';
import { UserIcon } from '@/Components/icons/user';
import { XIcon } from '@/Components/icons/x';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useRef, useState } from 'react';
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
    total: number;
    unique_people: number;
    in: number;
    out: number;
}

interface TodayStats {
    in: number;
    out: number;
}

interface PersonOption {
    id: string;
    display_name: string;
    grade_level: string | null;
}

interface AttendanceSearchScreenProps {
    events: PaginatedData<AttendanceEvent>;
    filters: AttendanceFilters;
    stats?: AttendanceStats;
    todayStats?: TodayStats;
    selectedPerson?: PersonOption | null;
    stations: Station[];
}

interface StatCardProps {
    label: string;
    value: number;
    hint: string;
    icon: 'taps' | 'people' | 'in' | 'out';
    tone: 'blue' | 'green' | 'violet' | 'amber';
}

const STAT_ICONS: Record<StatCardProps['icon'], React.ReactNode> = {
    taps: (
        <NfcIcon size={20} />
    ),
    people: (
        <UserIcon size={20} />
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

function PersonSearchField({
    value,
    onChange,
    initialSelected,
}: {
    value: string;
    onChange: (personId: string) => void;
    initialSelected?: PersonOption | null;
}) {
    const [query, setQuery] = useState(
        initialSelected
            ? `${initialSelected.display_name}${initialSelected.grade_level ? ` (${initialSelected.grade_level})` : ''}`
            : '',
    );
    const [options, setOptions] = useState<PersonOption[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!open || query.trim() === '') {
            setOptions([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
            axios
                .get<{ people: PersonOption[] }>(route('portal.attendance.people-search'), {
                    params: { search: query },
                })
                .then(({ data }) => setOptions(data.people ?? []))
                .catch(() => setOptions([]))
                .finally(() => setLoading(false));
        }, 250);

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, [query, open]);

    function select(person: PersonOption) {
        setQuery(
            `${person.display_name}${person.grade_level ? ` (${person.grade_level})` : ''}`,
        );
        onChange(person.id);
        setOpen(false);
    }

    function clear() {
        setQuery('');
        setOptions([]);
        onChange('');
    }

    return (
        <div className="relative">
            <label
                htmlFor="person_search"
                className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400"
            >
                <UserIcon size={14} className="text-slate-400" />
                Person
            </label>
            <div className="flex gap-2">
                <div className="relative min-w-0 flex-1">
                    <SearchIcon
                        size={15}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                        id="person_search"
                        type="text"
                        placeholder="Search by name"
                        value={query}
                        onChange={(event) => {
                            setQuery(event.target.value);
                            setOpen(true);
                            if (value) {
                                onChange('');
                            }
                        }}
                        onFocus={() => setOpen(true)}
                        onBlur={() => setTimeout(() => setOpen(false), 150)}
                        autoComplete="off"
                        className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 shadow-sm transition hover:border-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    />
                </div>
                {value && (
                    <button
                        type="button"
                        onClick={clear}
                        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-300 text-slate-500 transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                        aria-label="Clear person filter"
                        title="Clear person filter"
                    >
                        <XIcon size={15} />
                    </button>
                )}
            </div>

            {open && query.trim() !== '' && (
                <div className="absolute left-0 right-0 z-50 mt-2 max-h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-800">
                    {loading && (
                        <p className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
                            Searching...
                        </p>
                    )}
                    {!loading && options.length === 0 && (
                        <p className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
                            No matching people found.
                        </p>
                    )}
                    {!loading &&
                        options.map((person) => (
                            <button
                                key={person.id}
                                type="button"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => select(person)}
                                className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                            >
                                <span className="truncate font-medium">{person.display_name}</span>
                                {person.grade_level && (
                                    <span className="shrink-0 text-xs text-slate-400">
                                        {person.grade_level}
                                    </span>
                                )}
                            </button>
                        ))}
                </div>
            )}
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
    todayStats,
    selectedPerson,
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
    const totalEventsCount = stats?.total ?? events.data.length;
    const uniquePeopleCount =
        stats?.unique_people ??
        new Set(events.data.map((event) => event.person?.id).filter(Boolean)).size;
    const totalInCount = stats?.in ?? events.data.filter((event) => event.event_type === 'IN').length;
    const totalOutCount = stats?.out ?? events.data.filter((event) => event.event_type === 'OUT').length;

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
                            <LayoutGridIcon size={16} />
                            <span>Daily Summary</span>
                        </Link>

                        <a
                            href={exportUrl}
                            className="pf-btn pf-btn-primary"
                            title="Download filtered records as CSV spreadsheet"
                        >
                            <DownloadIcon size={16} />
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
                        label="Unique People"
                        value={uniquePeopleCount}
                        hint="People in these results"
                        icon="people"
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
                    <StatCard
                        label="Tapped In Today"
                        value={todayStats?.in ?? 0}
                        hint="Regardless of active filters"
                        icon="in"
                        tone="violet"
                    />
                    <StatCard
                        label="Tapped Out Today"
                        value={todayStats?.out ?? 0}
                        hint="Regardless of active filters"
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
                                <XIcon size={14} />
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

                            {/* Person */}
                            <div>
                                <PersonSearchField
                                    value={data.person_id}
                                    onChange={(personId) => setData('person_id', personId)}
                                    initialSelected={selectedPerson}
                                />
                            </div>

                            {/* Card UID */}
                            <div>
                                <label
                                    htmlFor="card_uid"
                                    className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400"
                                >
                                    <CreditCardIcon size={14} className="text-slate-400" />
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
                        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                                <button type="submit" className="pf-btn pf-btn-primary !h-10 text-xs">
                                    <SearchIcon size={16} />
                                    Apply Filters
                                </button>
                                <Link
                                    href={route('portal.attendance.index')}
                                    className="pf-btn pf-btn-secondary !h-10 text-xs"
                                >
                                    <RefreshCwIcon size={16} />
                                    Reset
                                </Link>
                            </div>

                            <a
                                href={exportUrl}
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-750 transition"
                                title="Download filtered entries as CSV file"
                            >
                                <DownloadIcon size={16} className="text-emerald-600 dark:text-emerald-400" />
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
                                                    <CalendarCheckIcon size={22} />
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
                                                </div>
                                            </td>

                                            {/* Time Column with Clock Pill */}
                                            <td>
                                                <div className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-100 bg-indigo-50/60 px-2.5 py-1 text-xs font-mono font-semibold text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300" title={`Exact timestamp: ${timeInfo.full}`}>
                                                    <ClockIcon size={14} className="text-indigo-500 dark:text-indigo-400" />
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
                                                                        <GraduationCapIcon size={14} />
                                                                    ) : (
                                                                        <IdCardIcon size={14} />
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
                                                        <CircleHelpIcon size={14} className="text-amber-500" />
                                                        Unlinked Card
                                                    </span>
                                                )}
                                            </td>

                                            {/* Card UID with RFID Badge & Copy Button */}
                                            <td>
                                                <div className="flex items-center gap-2">
                                                    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-blue-200/80 bg-blue-50 text-blue-600 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-400">
                                                        <NfcIcon size={14} />
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
                                                            <CheckIcon size={14} className="text-emerald-600 dark:text-emerald-400" />
                                                        ) : (
                                                            <CopyIcon size={14} />
                                                        )}
                                                    </button>
                                                </div>
                                            </td>

                                            {/* Station Kiosk Pill */}
                                            <td>
                                                {event.station ? (
                                                    <div className="flex items-center gap-2">
                                                        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-300">
                                                            <MonitorCheckIcon size={14} />
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
                                                        <ArrowLeftIcon size={14} className="text-emerald-600 dark:text-emerald-400" />
                                                        <span>TAP IN</span>
                                                    </span>
                                                ) : event.event_type === 'OUT' ? (
                                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/90 bg-amber-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-amber-700 shadow-sm dark:border-amber-800/90 dark:bg-amber-950/40 dark:text-amber-300">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                                        <LogoutIcon size={14} className="text-amber-600 dark:text-amber-400" />
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

import AttendanceAnalytics, { type AttendanceAnalyticsData } from './attendance-analytics';
import AdminLayout from '@/Layouts/AdminLayout';
import Pagination from '@/Components/admin/Pagination';
import { Head, Link, router, useForm } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useRef, useState } from 'react';
import type { PaginatedData, Person, Station } from '@/types';
import { personRouteKey } from '@/types';
import '../../../../css/platform-dashboard.css';
import '../../../../css/platform-overview.css';

interface AttendanceEvent {
    id: number;
    attendance_date_local: string;
    occurred_at: string;
    card_uid: string;
    event_type: string;
    person?: Person;
    station?: Station;
}

interface AttendanceFilters {
    date_from?: string;
    date_to?: string;
    person_id?: string;
    card_uid?: string;
    station_id?: string;
    event_type?: string;
}

interface PersonOption {
    id: string;
    display_name: string;
    grade_level: string | null;
}

interface Stats {
    total: number;
    unique_people: number;
    in: number;
    out: number;
}

// attendance_date_local serializes as an ISO datetime at UTC midnight
// (Carbon's default date-cast JSON format) — read the Y-M-D straight out of
// the string rather than letting `new Date(...)` reinterpret it in the
// browser's own timezone, which can silently shift it a day either way.
function formatDate(value: string): string {
    const [year, month, day] = value.slice(0, 10).split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(undefined, {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
    });
}

// occurred_at is stored/serialized in UTC — displayed in GMT+8 (Asia/Manila,
// no DST) rather than the viewer's own browser timezone, since that's the
// timezone every tenant in this system runs on today. The column header
// reflects this explicitly so it's never ambiguous which clock it's in.
function formatLocalTime(value: string): string {
    return new Date(value).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
        timeZone: 'Asia/Manila',
    });
}

interface StatCardProps {
    label: string;
    value: number;
    icon: React.ReactNode;
    tone: 'blue' | 'green' | 'violet' | 'amber' | 'red';
}

function StatCard({ label, value, icon, tone }: StatCardProps) {
    return (
        <div className="pft-stat-card">
            <div className="pft-stat-card-top">
                <p className="pft-stat-label">{label}</p>
                <span className={`pft-stat-icon pft-stat-icon--${tone}`}>{icon}</span>
            </div>
            <p className="pft-stat-value">{value.toLocaleString()}</p>
        </div>
    );
}

const ICON_TOTAL = (
    <svg viewBox="0 0 24 24">
        <rect x="4" y="5.4" width="16" height="14.6" rx="2" />
        <rect x="7.2" y="3" width="2.2" height="4" rx="1" />
        <rect x="14.6" y="3" width="2.2" height="4" rx="1" />
    </svg>
);
const ICON_PEOPLE = (
    <svg viewBox="0 0 24 24">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-3.6 3.6-6.4 8-6.4s8 2.8 8 6.4" />
    </svg>
);
const ICON_IN = (
    <svg viewBox="0 0 24 24">
        <path d="M4 11l16-7-6 16-3-6-6-3z" />
    </svg>
);
const ICON_OUT = (
    <svg viewBox="0 0 24 24">
        <path d="M20 6L9 17l-5-5" />
    </svg>
);

/** Search-as-you-type replacement for a plain <select> — a tenant can have
 * thousands of people, so the full roster is never shipped to the browser;
 * only the current best-30 matches for whatever's been typed. */
function PersonSearchField({
    value,
    onChange,
    initialSelected,
}: {
    value: string;
    onChange: (personId: string, label: string) => void;
    initialSelected?: PersonOption | null;
}) {
    const [query, setQuery] = useState(
        initialSelected ? `${initialSelected.display_name}${initialSelected.grade_level ? ` (${initialSelected.grade_level})` : ''}` : '',
    );
    const [options, setOptions] = useState<PersonOption[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!open) return;

        setLoading(true);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            axios.get<{ people: PersonOption[] }>(route('portal.attendance.people-search'), { params: { search: query } })
                .then(({ data }) => setOptions(data.people))
                .catch(() => setOptions([]))
                .finally(() => setLoading(false));
        }, 250);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query, open]);

    function select(person: PersonOption) {
        const label = `${person.display_name}${person.grade_level ? ` (${person.grade_level})` : ''}`;
        setQuery(label);
        onChange(person.id, label);
        setOpen(false);
    }

    function clear() {
        setQuery('');
        onChange('', '');
    }

    return (
        <div className="pf-field" style={{ position: 'relative' }}>
            <label htmlFor="person_search">Person</label>
            <div style={{ display: 'flex', gap: 6 }}>
                <input
                    id="person_search"
                    type="text"
                    placeholder="Search by name…"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setOpen(true);
                        if (value) onChange('', '');
                    }}
                    onFocus={() => setOpen(true)}
                    onBlur={() => setTimeout(() => setOpen(false), 150)}
                    autoComplete="off"
                />
                {value && (
                    <button
                        type="button"
                        className="pf-btn pf-btn-secondary"
                        style={{ flexShrink: 0, padding: '0 12px', fontSize: 12 }}
                        onClick={clear}
                    >
                        Clear
                    </button>
                )}
            </div>

            {open && query.trim() !== '' && (
                <ul
                    style={{
                        position: 'absolute', zIndex: 10, top: '100%', left: 0, right: 0, marginTop: 4,
                        maxHeight: 260, overflowY: 'auto', margin: 0, padding: 4,
                        listStyle: 'none', background: 'var(--as-surface)', border: '1px solid var(--as-border)',
                        borderRadius: 12, boxShadow: '0 12px 28px -12px rgba(15,23,42,.25)',
                    }}
                >
                    {loading && (
                        <li style={{ padding: '8px 10px', fontSize: 12.5, color: 'var(--as-text-muted)' }}>Searching…</li>
                    )}
                    {!loading && options.length === 0 && (
                        <li style={{ padding: '8px 10px', fontSize: 12.5, color: 'var(--as-text-muted)' }}>No matches.</li>
                    )}
                    {!loading && options.map((person) => (
                        <li key={person.id}>
                            <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => select(person)}
                                style={{
                                    width: '100%', textAlign: 'left', padding: '8px 10px',
                                    border: 'none', background: 'transparent', cursor: 'pointer',
                                    borderRadius: 8, fontSize: 13,
                                }}
                            >
                                {person.display_name}
                                {person.grade_level && (
                                    <span style={{ color: 'var(--as-text-muted)' }}> ({person.grade_level})</span>
                                )}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default function AttendanceSearchScreen({
    events,
    filters,
    selectedPerson,
    stations,
    stats,
    analytics,
}: {
    events: PaginatedData<AttendanceEvent>;
    filters: AttendanceFilters;
    selectedPerson: PersonOption | null;
    stations: Station[];
    stats: Stats;
    analytics: AttendanceAnalyticsData;
}) {
    const { data, setData } = useForm({
        date_from: filters.date_from ?? '',
        date_to: filters.date_to ?? '',
        person_id: filters.person_id ?? '',
        card_uid: filters.card_uid ?? '',
        station_id: filters.station_id ?? '',
        event_type: filters.event_type ?? '',
    });

    const [isFiltering, setIsFiltering] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    function submit(e: React.FormEvent) {
        e.preventDefault();
        setIsFiltering(true);
        router.get(route('portal.attendance.index'), data, {
            preserveState: true,
            onFinish: () => setIsFiltering(false),
        });
    }

    async function handleExport() {
        setIsExporting(true);
        try {
            const params = new URLSearchParams(
                Object.fromEntries(Object.entries(data).filter(([, v]) => v !== '')),
            );
            const response = await fetch(`${route('portal.attendance.export')}?${params.toString()}`);
            if (!response.ok) throw new Error('Export failed');
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const now = new Date();
            const month = now.toLocaleDateString('en-US', { month: 'long' });
            const day = String(now.getDate()).padStart(2, '0');
            const year = now.getFullYear();
            a.download = `${month} ${day} ${year} - ATTENDANCE.csv`;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            alert('Export failed. Please try again.');
        } finally {
            setIsExporting(false);
        }
    }

    const hasFilters = Object.values(filters).some((v) => v);

    return (
        <AdminLayout>
            <Head title="Attendance" />

            <div className="pf-dashboard pft-page">
                <div className="pft-hero">
                    <div className="pft-hero-main">
                        <span className="pft-hero-icon" aria-hidden="true">
                            {ICON_TOTAL}
                        </span>
                        <div>
                            <h1 className="pft-hero-title">Attendance</h1>
                            <p className="pft-hero-subtitle">
                                Every RFID tap recorded across your school's stations.
                            </p>
                        </div>
                    </div>
                    <div className="pft-hero-actions">
                        <Link href={route('portal.attendance.summary')} className="pf-btn pf-btn-secondary">
                            <svg viewBox="0 0 24 24">
                                <rect x="4" y="5" width="16" height="13" rx="2" />
                                <path d="M8 21h8M9 9h6M9 13h4" />
                            </svg>
                            Daily Summary
                        </Link>
                        <button
                            type="button"
                            className={'pf-btn pf-btn-secondary' + (isExporting ? ' pf-btn--loading' : '')}
                            onClick={handleExport}
                            disabled={isExporting}
                        >
                            <svg viewBox="0 0 24 24">
                                <path d="M12 4v10m0 0-3.5-3.5M12 14l3.5-3.5" />
                                <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
                            </svg>
                            Export CSV
                        </button>
                    </div>
                </div>

                <div className="pft-stat-grid">
                    <StatCard label="Total taps" value={stats.total} icon={ICON_TOTAL} tone="blue" />
                    <StatCard label="Unique people" value={stats.unique_people} icon={ICON_PEOPLE} tone="violet" />
                    <StatCard label="Tapped in" value={stats.in} icon={ICON_IN} tone="green" />
                    <StatCard label="Tapped out" value={stats.out} icon={ICON_OUT} tone="amber" />
                </div>

                <AttendanceAnalytics analytics={analytics} totalTaps={stats.total} isUpdating={isFiltering} />

                <form onSubmit={submit} className="pf-filter-bar">
                    <div className="pf-field">
                        <label htmlFor="date_from">From</label>
                        <input
                            id="date_from"
                            type="date"
                            value={data.date_from}
                            onChange={(e) => setData('date_from', e.target.value)}
                        />
                    </div>

                    <div className="pf-field">
                        <label htmlFor="date_to">To</label>
                        <input
                            id="date_to"
                            type="date"
                            value={data.date_to}
                            onChange={(e) => setData('date_to', e.target.value)}
                        />
                    </div>

                    <PersonSearchField
                        value={data.person_id}
                        onChange={(personId) => setData('person_id', personId)}
                        initialSelected={selectedPerson}
                    />

                    <div className="pf-field">
                        <label htmlFor="card_uid">Card UID</label>
                        <input
                            id="card_uid"
                            type="text"
                            value={data.card_uid}
                            onChange={(e) => setData('card_uid', e.target.value)}
                        />
                    </div>

                    <div className="pf-field">
                        <label htmlFor="station_id">Station</label>
                        <select
                            id="station_id"
                            value={data.station_id}
                            onChange={(e) => setData('station_id', e.target.value)}
                        >
                            <option value="">All</option>
                            {stations.map((station) => (
                                <option key={station.id} value={station.id}>
                                    {station.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="pf-field">
                        <label htmlFor="event_type">Event</label>
                        <select
                            id="event_type"
                            value={data.event_type}
                            onChange={(e) => setData('event_type', e.target.value)}
                        >
                            <option value="">All</option>
                            <option value="IN">IN</option>
                            <option value="OUT">OUT</option>
                        </select>
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
                            <Link href={route('portal.attendance.index')} className="pf-btn pf-btn-secondary">
                                Reset
                            </Link>
                        )}
                    </div>
                </form>

                <div className="pf-panel">
                    <div className="pf-panel-header">
                        <div>
                            <h2 className="pf-panel-title">Tap Events</h2>
                            <p className="pf-panel-count">{events.from !== null ? `${events.from}–${events.to} of ${events.total}` : 'No results'}</p>
                        </div>
                    </div>

                    <div className="pf-table-wrap">
                        <table className="pf-table">
                            <thead>
                                <tr>
                                    <th scope="col">Date</th>
                                    <th scope="col">Time (GMT+8)</th>
                                    <th scope="col">Person</th>
                                    <th scope="col">Card UID</th>
                                    <th scope="col">Station</th>
                                    <th scope="col">Event</th>
                                </tr>
                            </thead>
                            <tbody>
                                {events.data.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="pft-empty">
                                            <svg viewBox="0 0 24 24">
                                                <rect x="4" y="5.4" width="16" height="14.6" rx="2" />
                                                <rect x="7.2" y="3" width="2.2" height="4" rx="1" />
                                                <rect x="14.6" y="3" width="2.2" height="4" rx="1" />
                                            </svg>
                                            {hasFilters ? 'No attendance events match these filters.' : 'No attendance events yet.'}
                                        </td>
                                    </tr>
                                )}

                                {events.data.map((event) => (
                                    <tr key={event.id}>
                                        <td className="pf-tenant-name">{formatDate(event.attendance_date_local)}</td>
                                        <td className="pf-created font-mono">{formatLocalTime(event.occurred_at)}</td>
                                        <td>
                                            {event.person ? (
                                                <Link
                                                    href={route('portal.attendance.students.show', personRouteKey(event.person))}
                                                    className="pf-row-action"
                                                >
                                                    {event.person.display_name}
                                                </Link>
                                            ) : (
                                                '—'
                                            )}
                                        </td>
                                        <td className="font-mono">{event.card_uid}</td>
                                        <td>{event.station?.name ?? '—'}</td>
                                        <td>
                                            <span
                                                className={
                                                    'pf-pill ' +
                                                    (event.event_type === 'IN' ? 'pf-pill--active' : 'pf-pill--inactive')
                                                }
                                            >
                                                {event.event_type}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <Pagination links={events.links} />
                </div>
            </div>
        </AdminLayout>
    );
}

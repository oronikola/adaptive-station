import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import type { PaginatedData, PaginationLink, Person, Station } from '@/types';
import '../../../../css/platform-dashboard.css';

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

// attendance_date_local serializes as an ISO datetime at UTC midnight
// (Carbon's default date-cast JSON format) — read the Y-M-D straight out of
// the string rather than letting `new Date(...)` reinterpret it in the
// browser's own timezone, which can silently shift it a day either way.
function formatDate(value: string): string {
    const [year, month, day] = value.slice(0, 10).split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(undefined, {
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
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
        timeZone: 'Asia/Manila',
    });
}

function PaginationBar({ links }: { links: PaginationLink[] }) {
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
                        className={'pf-page-link' + (link.active ? ' pf-page-link--active' : '')}
                    >
                        {label}
                    </Link>
                );
            })}
        </nav>
    );
}

export default function AttendanceSearchScreen({
    events,
    filters,
    people,
    stations,
}: {
    events: PaginatedData<AttendanceEvent>;
    filters: AttendanceFilters;
    people: Person[];
    stations: Station[];
}) {
    const { data, setData } = useForm({
        date_from: filters.date_from ?? '',
        date_to: filters.date_to ?? '',
        person_id: filters.person_id ?? '',
        card_uid: filters.card_uid ?? '',
        station_id: filters.station_id ?? '',
        event_type: filters.event_type ?? '',
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        router.get(route('portal.attendance.index'), data, { preserveState: true });
    }

    const hasFilters = Object.values(filters).some((v) => v);

    const exportUrl = `${route('portal.attendance.export')}?${new URLSearchParams(
        Object.fromEntries(Object.entries(data).filter(([, v]) => v !== '')),
    ).toString()}`;

    return (
        <AdminLayout>
            <Head title="Attendance" />

            <div className="pf-dashboard">
                <div className="pf-dashboard-header">
                    <div>
                        <p className="pf-dashboard-kicker">Admin overview</p>
                        <h1 className="pf-dashboard-title">Attendance</h1>
                        <p className="pf-dashboard-subtitle">
                            Every RFID tap recorded across your school's stations.
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <Link href={route('portal.attendance.summary')} className="pf-btn pf-btn-secondary">
                            <svg viewBox="0 0 24 24">
                                <rect x="4" y="5" width="16" height="13" rx="2" />
                                <path d="M8 21h8M9 9h6M9 13h4" />
                            </svg>
                            Daily Summary
                        </Link>
                        <a href={exportUrl} className="pf-btn pf-btn-secondary">
                            <svg viewBox="0 0 24 24">
                                <path d="M12 4v10m0 0-3.5-3.5M12 14l3.5-3.5" />
                                <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
                            </svg>
                            Export CSV
                        </a>
                    </div>
                </div>

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

                    <div className="pf-field">
                        <label htmlFor="person_id">Person</label>
                        <select
                            id="person_id"
                            value={data.person_id}
                            onChange={(e) => setData('person_id', e.target.value)}
                        >
                            <option value="">All</option>
                            {people.map((person) => (
                                <option key={person.id} value={person.id}>
                                    {person.display_name}
                                </option>
                            ))}
                        </select>
                    </div>

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
                        <button type="submit" className="pf-btn pf-btn-primary">
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
                            <p className="pf-panel-count">{events.data.length} shown</p>
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
                                        <td colSpan={6} className="pf-empty">
                                            No attendance events found.
                                        </td>
                                    </tr>
                                )}

                                {events.data.map((event) => (
                                    <tr key={event.id}>
                                        <td className="pf-tenant-name">{formatDate(event.attendance_date_local)}</td>
                                        <td className="pf-created">{formatLocalTime(event.occurred_at)}</td>
                                        <td>
                                            {event.person ? (
                                                <Link
                                                    href={route('portal.attendance.students.show', event.person.id)}
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

                    <PaginationBar links={events.links} />
                </div>
            </div>
        </AdminLayout>
    );
}

import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import type { PaginatedData, PaginationLink, Station } from '@/types';
import '../../../../css/platform-dashboard.css';
import '../../../../css/platform-overview.css';

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

export default function AttendanceSummaryScreen({
    summary,
    filters,
    stations,
}: {
    summary: PaginatedData<SummaryRow>;
    filters: SummaryFilters;
    stations: Station[];
}) {
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

    const hasFilters = Object.values(filters).some((v) => v);

    return (
        <AdminLayout>
            <Head title="Daily Attendance Summary" />

            <div className="pf-dashboard pft-page">
                <div className="pft-hero">
                    <div className="pft-hero-main">
                        <span className="pft-hero-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24">
                                <rect x="4" y="5.4" width="16" height="14.6" rx="2" />
                                <rect x="7.2" y="3" width="2.2" height="4" rx="1" />
                                <rect x="14.6" y="3" width="2.2" height="4" rx="1" />
                            </svg>
                        </span>
                        <div>
                            <h1 className="pft-hero-title">Daily Attendance Summary</h1>
                            <p className="pft-hero-subtitle">
                                Total taps and unique people recorded per day.
                            </p>
                        </div>
                    </div>
                    <div className="pft-hero-actions">
                        <Link href={route('portal.attendance.index')} className="pf-btn pf-btn-secondary">
                            <svg viewBox="0 0 24 24">
                                <path d="m15 6-6 6 6 6" />
                            </svg>
                            Back to Search
                        </Link>
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
                            <Link href={route('portal.attendance.summary')} className="pf-btn pf-btn-secondary">
                                Reset
                            </Link>
                        )}
                    </div>
                </form>

                <div className="pf-panel">
                    <div className="pf-panel-header">
                        <div>
                            <h2 className="pf-panel-title">Daily Totals</h2>
                            <p className="pf-panel-count">{summary.data.length} shown</p>
                        </div>
                    </div>

                    <div className="pf-table-wrap">
                        <table className="pf-table">
                            <thead>
                                <tr>
                                    <th scope="col">Date</th>
                                    <th scope="col">Total Taps</th>
                                    <th scope="col">Unique People</th>
                                </tr>
                            </thead>
                            <tbody>
                                {summary.data.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="pf-empty">
                                            No attendance data for this range.
                                        </td>
                                    </tr>
                                )}

                                {summary.data.map((row) => (
                                    <tr key={row.attendance_date_local}>
                                        <td className="pf-tenant-name">{formatDate(row.attendance_date_local)}</td>
                                        <td>{row.total}</td>
                                        <td>{row.unique_people}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <PaginationBar links={summary.links} />
                </div>
            </div>
        </AdminLayout>
    );
}

import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router } from '@inertiajs/react';
import type { Person } from '@/types';
import '../../../../css/platform-dashboard.css';
import '../../../../css/platform-overview.css';

interface MonthRow {
    month: number;
    label: string;
    days_present: number;
}

interface AttendanceStudentSummaryScreenProps {
    person: Person;
    year: number;
    years: number[];
    months: MonthRow[];
    totalDaysPresent: number;
}

export default function AttendanceStudentSummaryScreen({
    person,
    year,
    years,
    months,
    totalDaysPresent,
}: AttendanceStudentSummaryScreenProps) {
    function changeYear(e: React.ChangeEvent<HTMLSelectElement>) {
        router.get(
            route('portal.attendance.students.show', person.id),
            { year: e.target.value },
            { preserveState: true },
        );
    }

    return (
        <AdminLayout>
            <Head title={`Attendance Summary — ${person.display_name}`} />

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
                            <h1 className="pft-hero-title">Attendance Summary — {person.display_name}</h1>
                            <p className="pft-hero-subtitle">
                                Days present per month, counted from tap-in events. This does not show
                                an "absent" count — there is no school-calendar data to tell holidays
                                and non-school days apart from genuine absences.
                            </p>
                        </div>
                    </div>
                    <div className="pft-hero-actions">
                        <Link
                            href={route('portal.attendance.index', { person_id: person.id })}
                            className="pf-btn pf-btn-secondary"
                        >
                            View Raw Taps
                        </Link>
                    </div>
                </div>

                <div className="pf-panel">
                    <div className="pf-panel-header">
                        <div>
                            <h2 className="pf-panel-title">Monthly Breakdown</h2>
                            <p className="pf-panel-count">
                                {totalDaysPresent} day{totalDaysPresent === 1 ? '' : 's'} present in {year}
                            </p>
                        </div>
                        <div className="pf-field" style={{ marginBottom: 0, minWidth: 120 }}>
                            <label htmlFor="year">Year</label>
                            <select id="year" value={year} onChange={changeYear}>
                                {years.length === 0 && <option value={year}>{year}</option>}
                                {years.map((y) => (
                                    <option key={y} value={y}>
                                        {y}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="pf-table-wrap">
                        <table className="pf-table">
                            <thead>
                                <tr>
                                    <th scope="col">Month</th>
                                    <th scope="col">Days Present</th>
                                </tr>
                            </thead>
                            <tbody>
                                {years.length === 0 && (
                                    <tr>
                                        <td colSpan={2} className="pf-empty">
                                            No tap events recorded for this person yet.
                                        </td>
                                    </tr>
                                )}

                                {years.length > 0 &&
                                    months.map((row) => (
                                        <tr key={row.month}>
                                            <td className="pf-tenant-name">{row.label}</td>
                                            <td>{row.days_present}</td>
                                        </tr>
                                    ))}

                                {years.length > 0 && (
                                    <tr>
                                        <td className="pf-tenant-name">Total ({year})</td>
                                        <td className="pf-tenant-name">{totalDaysPresent}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}

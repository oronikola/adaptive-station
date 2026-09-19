import PremiumSelect from '@/Components/PremiumSelect';
import { CalendarDaysIcon } from '@/Components/icons/calendar-days';
import { ClipboardCheckIcon } from '@/Components/icons/clipboard-check';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';
import '../../../../css/platform-dashboard.css';
import '../../../../css/platform-overview.css';

interface CalendarDay {
    id: string;
    date: string;
    is_school_day: boolean;
    label: string | null;
}

interface AttendanceException {
    id: string;
    attendance_date: string;
    type: string;
    status: string;
    reason: string;
    person: { id: string; display_name: string; grade_level: string | null } | null;
}

interface PersonOption {
    id: string;
    display_name: string;
    grade_level: string | null;
}

const exceptionTypes = [
    { value: 'excused_absence', label: 'Excused absence' },
    { value: 'manual_present', label: 'Verified present' },
    { value: 'missing_out', label: 'Missing OUT review' },
    { value: 'late_review', label: 'Late arrival review' },
] as const;

export default function AttendanceOperationsScreen({ month, calendarDays, exceptions, people }: {
    month: string;
    calendarDays: CalendarDay[];
    exceptions: AttendanceException[];
    people: PersonOption[];
}) {
    const calendarForm = useForm({ date: month, is_school_day: false, label: '' });
    const exceptionForm = useForm({ person_id: '', attendance_date: month, type: 'excused_absence', reason: '' });
    const openExceptions = exceptions.filter((exception) => exception.status === 'open').length;

    function saveCalendarDay(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        calendarForm.post(route('portal.attendance.calendar-days.store'), { preserveScroll: true });
    }

    function saveException(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        exceptionForm.post(route('portal.attendance.exceptions.store'), {
            preserveScroll: true,
            onSuccess: () => exceptionForm.reset('reason'),
        });
    }

    function resolveException(id: string) {
        router.patch(route('portal.attendance.exceptions.resolve', id), {}, { preserveScroll: true });
    }

    return (
        <AdminLayout>
            <Head title="Attendance Operations" />

            <div className="pf-dashboard pft-page mx-auto w-full max-w-[1320px] space-y-6">
                <header className="pft-hero">
                    <div className="pft-hero-main">
                        <span className="pft-hero-icon" aria-hidden="true"><CalendarDaysIcon size={22} /></span>
                        <div>
                            <p className="school-eyebrow">Attendance workspace</p>
                            <h1 className="pft-hero-title">Attendance operations</h1>
                            <p className="pft-hero-subtitle">Manage school closures and resolve attendance decisions with a clear audit trail.</p>
                        </div>
                    </div>
                    <div className="pft-hero-actions">
                        <span className={openExceptions > 0 ? 'school-status school-status--warning' : 'school-status'}>{openExceptions} open review{openExceptions === 1 ? '' : 's'}</span>
                        <Link href={route('portal.attendance.index')} className="pf-btn pf-btn-secondary">View attendance</Link>
                    </div>
                </header>

                <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[0.92fr_1.08fr]">
                    <section className="pf-panel min-w-0 overflow-hidden">
                        <div className="flex items-start gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-5 dark:border-slate-800 dark:bg-slate-900/30 sm:px-6">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#234ef4] dark:bg-blue-950/40 dark:text-blue-300"><CalendarDaysIcon size={20} /></span>
                            <div><h2 className="pf-panel-title">School calendar</h2><p className="pf-panel-count">Record closures and special school days before reviewing attendance.</p></div>
                        </div>
                        <div className="p-5 sm:p-6">
                            <form onSubmit={saveCalendarDay} className="space-y-5">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <label className="pf-field"><span>Date</span><input type="date" value={calendarForm.data.date} onChange={(event) => calendarForm.setData('date', event.target.value)} /></label>
                                    <div className="pf-field"><label htmlFor="calendar-day-type">Day type</label><PremiumSelect id="calendar-day-type" value={calendarForm.data.is_school_day ? 'school' : 'closed'} onChange={(value) => calendarForm.setData('is_school_day', value === 'school')} options={[{ value: 'closed', label: 'No classes / holiday' }, { value: 'school', label: 'School day' }]} /></div>
                                </div>
                                <label className="pf-field"><span>Label <em className="not-italic text-slate-400">optional</em></span><input value={calendarForm.data.label} onChange={(event) => calendarForm.setData('label', event.target.value)} placeholder="e.g. Foundation Day" /></label>
                                <div className="flex justify-end border-t border-slate-100 pt-4 dark:border-slate-800"><button className="pf-btn pf-btn-primary" disabled={calendarForm.processing}>{calendarForm.processing ? 'Saving…' : 'Save calendar day'}</button></div>
                            </form>

                            <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800">
                                <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-bold text-slate-800 dark:text-white">Configured this month</h3><span className="text-xs font-semibold text-slate-400">{calendarDays.length} date{calendarDays.length === 1 ? '' : 's'}</span></div>
                                {calendarDays.length === 0 ? <div className="rounded-xl border border-dashed border-slate-200 px-4 py-5 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">No calendar dates have been configured yet.</div> : <ul className="space-y-2">{calendarDays.map((day) => <li key={day.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3.5 py-3 text-sm dark:border-slate-800 dark:bg-slate-900/40"><span className="font-semibold text-slate-700 dark:text-slate-200">{new Date(`${day.date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'short' })}</span><span className={day.is_school_day ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}>{day.label ?? (day.is_school_day ? 'School day' : 'No classes')}</span></li>)}</ul>}
                            </div>
                        </div>
                    </section>

                    <section className="pf-panel min-w-0 overflow-hidden">
                        <div className="flex items-start gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-5 dark:border-slate-800 dark:bg-slate-900/30 sm:px-6">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300"><ClipboardCheckIcon size={20} /></span>
                            <div><h2 className="pf-panel-title">Record an exception</h2><p className="pf-panel-count">Document a verified decision for a student or staff attendance record.</p></div>
                        </div>
                        <form onSubmit={saveException} className="space-y-5 p-5 sm:p-6">
                            <div className="pf-field"><label htmlFor="attendance-person">Person</label><PremiumSelect id="attendance-person" value={exceptionForm.data.person_id} onChange={(personId) => exceptionForm.setData('person_id', personId)} placeholder="Select a person" options={people.map((person) => ({ value: person.id, label: `${person.display_name}${person.grade_level ? ` — ${person.grade_level}` : ''}` }))} invalid={Boolean(exceptionForm.errors.person_id)} />{exceptionForm.errors.person_id && <span className="mt-1 block text-xs text-red-600">{exceptionForm.errors.person_id}</span>}</div>
                            <div className="grid gap-4 sm:grid-cols-2"><label className="pf-field"><span>Date</span><input type="date" value={exceptionForm.data.attendance_date} onChange={(event) => exceptionForm.setData('attendance_date', event.target.value)} /></label><div className="pf-field"><label htmlFor="exception-type">Decision</label><PremiumSelect id="exception-type" value={exceptionForm.data.type} onChange={(type) => exceptionForm.setData('type', type)} options={[...exceptionTypes]} /></div></div>
                            <label className="pf-field"><span>Reason</span><textarea rows={4} value={exceptionForm.data.reason} onChange={(event) => exceptionForm.setData('reason', event.target.value)} placeholder="Record the evidence or decision for this exception." className="block w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[#234ef4] focus:ring-4 focus:ring-[#234ef4]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />{exceptionForm.errors.reason && <span className="mt-1 block text-xs text-red-600">{exceptionForm.errors.reason}</span>}</label>
                            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800"><p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">The decision, actor, and timestamp are kept in the audit trail.</p><button className="pf-btn pf-btn-primary" disabled={exceptionForm.processing}>{exceptionForm.processing ? 'Recording…' : 'Record exception'}</button></div>
                        </form>
                    </section>
                </div>

                <section className="pf-panel overflow-hidden">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-5 dark:border-slate-800 sm:px-6"><div><h2 className="pf-panel-title">Exception review queue</h2><p className="pf-panel-count">Resolve completed reviews to keep the daily queue current.</p></div><span className="pf-pill">{exceptions.length} record{exceptions.length === 1 ? '' : 's'}</span></div>
                    <div className="pf-table-wrap"><table className="pf-table"><thead><tr><th>Date</th><th>Person</th><th>Decision</th><th>Reason</th><th>Status</th><th><span className="sr-only">Action</span></th></tr></thead><tbody>{exceptions.length === 0 ? <tr><td colSpan={6} className="pf-empty">No attendance exceptions recorded for this month.</td></tr> : exceptions.map((exception) => <tr key={exception.id}><td className="whitespace-nowrap font-medium">{exception.attendance_date}</td><td className="font-semibold">{exception.person?.display_name ?? 'Unknown person'}</td><td className="capitalize">{exception.type.replace(/_/g, ' ')}</td><td className="max-w-xs truncate" title={exception.reason}>{exception.reason}</td><td><span className={exception.status === 'resolved' ? 'pf-pill pf-pill--active' : 'pf-pill pf-pill--warning'}>{exception.status}</span></td><td className="text-right">{exception.status === 'open' && <button type="button" className="text-xs font-bold text-[#234ef4] hover:underline" onClick={() => resolveException(exception.id)}>Resolve</button>}</td></tr>)}</tbody></table></div>
                </section>
            </div>
        </AdminLayout>
    );
}

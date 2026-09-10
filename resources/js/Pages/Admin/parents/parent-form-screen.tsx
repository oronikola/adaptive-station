import InputError from '@/Components/InputError';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useState } from 'react';
import '../../../../css/platform-dashboard.css';
import '../../../../css/platform-overview.css';
import '../../../../css/parents.css';

interface Student {
    id: string;
    display_name: string;
    grade_level: string | null;
    section: string | null;
    is_active: boolean;
    unavailable?: boolean;
}

interface ParentAccount { id: string; name: string; email: string; login_id: string | null; is_active: boolean }

export default function ParentFormScreen({ parent, linkedStudents }: { parent: ParentAccount | null; linkedStudents: Student[] }) {
    const form = useForm({ name: parent?.name ?? '', email: parent?.email ?? '', password: '', password_confirmation: '', student_ids: linkedStudents.map((student) => student.id) });
    const statusForm = useForm({ is_active: parent?.is_active ?? true });
    const [selected, setSelected] = useState(linkedStudents);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchError, setSearchError] = useState('');
    const [retry, setRetry] = useState(0);

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setSearchError('');
        const timer = window.setTimeout(() => {
            axios.get<{ students: Student[] }>(route('portal.parents.students'), { params: { search: query }, signal: controller.signal })
                .then(({ data }) => { if (!controller.signal.aborted) setResults(data.students); })
                .catch(() => { if (!controller.signal.aborted) setSearchError('Students could not be loaded. Please try again.'); })
                .finally(() => { if (!controller.signal.aborted) setLoading(false); });
        }, 250);
        return () => { window.clearTimeout(timer); controller.abort(); };
    }, [query, retry]);

    // Link/Unlink used to only stage the change in local React state — it
    // looked like it worked, but a reload with no intervening "Save changes"
    // click silently discarded it, since nothing was ever sent to the
    // server. When editing an existing parent, persist immediately instead;
    // the create form has no parent id to save against yet, so it keeps
    // staging until the whole form is submitted.
    function selectStudents(students: Student[]) {
        setSelected(students);
        const studentIds = students.map((student) => student.id);
        form.setData('student_ids', studentIds);

        if (parent) {
            router.put(route('portal.parents.update', parent.id), {
                name: form.data.name,
                email: form.data.email,
                password: '',
                password_confirmation: '',
                student_ids: studentIds,
            }, { preserveScroll: true, preserveState: true });
        }
    }

    function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const options = { preserveScroll: true, onFinish: () => form.reset('password', 'password_confirmation') };
        if (parent) form.put(route('portal.parents.update', parent.id), options);
        else form.post(route('portal.parents.store'), options);
    }

    function changeStatus() {
        if (!parent) return;
        statusForm.transform(() => ({ is_active: !parent.is_active }));
        statusForm.patch(route('portal.parents.status', parent.id), { preserveScroll: true });
    }

    return (
        <AdminLayout>
            <Head title={parent ? 'Manage parent' : 'Add parent'} />
            <div className="pf-dashboard pft-page">
                <Link href={route('portal.parents.index')} className="pft-panel-link">Back to parents</Link>
                <div className="pft-hero">
                    <div>
                        <h1 className="pft-hero-title">{parent ? 'Manage parent' : 'Add parent'}</h1>
                        <p className="pft-hero-subtitle">Approve this parent’s student connections for your school.</p>
                    </div>
                    {parent && <span className={`pf-pill ${parent.is_active ? 'pf-pill--active' : 'pf-pill--inactive'}`}>{parent.is_active ? 'Active account' : 'Inactive account'}</span>}
                </div>
                {parent?.login_id && (
                    <div className="pf-notice" style={{ marginBottom: 20 }}>
                        This parent logs in with <strong style={{ fontFamily: 'monospace' }}>{parent.login_id}</strong> and
                        their password — not their email. Share this ID with them.
                    </div>
                )}
                <form onSubmit={submit} className="parent-form">
                    <fieldset className="pf-panel parent-section" disabled={form.processing || statusForm.processing}>
                        <legend>Parent details</legend>
                        <div className="parent-fields">
                            <div className="pf-field">
                                <label htmlFor="parent-name">Full name</label>
                                <input id="parent-name" value={form.data.name} required maxLength={150} autoComplete="name" onChange={(event) => form.setData('name', event.target.value)} />
                                <InputError message={form.errors.name} />
                            </div>
                            <div className="pf-field">
                                <label htmlFor="parent-email">Email address</label>
                                <input id="parent-email" type="email" value={form.data.email} required maxLength={255} autoComplete="email" onChange={(event) => form.setData('email', event.target.value)} />
                                <InputError message={form.errors.email} />
                            </div>
                            <div className="pf-field">
                                <label htmlFor="parent-password">{parent ? 'New password (optional)' : 'Initial password'}</label>
                                <input id="parent-password" type="password" value={form.data.password} required={!parent} minLength={12} maxLength={128} autoComplete="new-password" onChange={(event) => form.setData('password', event.target.value)} />
                                <InputError message={form.errors.password} />
                            </div>
                            <div className="pf-field">
                                <label htmlFor="parent-password-confirmation">Confirm password</label>
                                <input id="parent-password-confirmation" type="password" value={form.data.password_confirmation} required={!parent || form.data.password !== ''} autoComplete="new-password" onChange={(event) => form.setData('password_confirmation', event.target.value)} />
                            </div>
                        </div>
                        <p className="parent-help">Use at least 12 characters. Share the initial password directly with the parent. It cannot be viewed again here. No email is sent by this form.</p>
                    </fieldset>

                    <fieldset className="pf-panel parent-section" disabled={form.processing || statusForm.processing}>
                        <legend>Approved students</legend>
                        <p className="parent-help">Only link students after verifying the parent’s relationship with the school. Inactive students retain their links but grant no attendance access until reactivated.</p>
                        <h2 className="parent-subtitle">Linked students ({selected.length}/20)</h2>
                        {selected.length === 0 && <p className="parent-help">No students selected. This account will have no student access.</p>}
                        <ul className="parent-student-list">
                            {selected.map((student) => <li key={student.id}>
                                <div><strong>{student.display_name}</strong><span>{student.unavailable ? 'Unavailable — remove this link before saving' : [student.grade_level, student.section, !student.is_active ? 'Inactive' : null].filter(Boolean).join(' · ')}</span></div>
                                <button type="button" className="pf-btn pf-btn-secondary" aria-label={`Unlink ${student.display_name}`} onClick={() => selectStudents(selected.filter((item) => item.id !== student.id))}>Unlink</button>
                            </li>)}
                        </ul>
                        {Object.entries(form.errors).filter(([key]) => key.startsWith('student_ids')).map(([key, message]) => <InputError key={key} message={message} />)}
                        <div className="pf-field">
                            <label htmlFor="student-search">Find students to link</label>
                            <input id="student-search" type="search" value={query} maxLength={100} placeholder="Search student name or school ID" onChange={(event) => setQuery(event.target.value)} />
                        </div>
                        <div aria-live="polite">
                            {loading ? <p className="parent-help">Loading students…</p> : searchError ? <p className="parent-help" role="alert">{searchError} <button type="button" onClick={() => setRetry(retry + 1)}>Retry</button></p> : <>
                                <ul className="parent-student-list">
                                    {results.filter((student) => !form.data.student_ids.includes(student.id)).map((student) => <li key={student.id}>
                                        <div><strong>{student.display_name}</strong><span>{[student.grade_level, student.section, !student.is_active ? 'Inactive' : null].filter(Boolean).join(' · ')}</span></div>
                                        <button type="button" className="pf-btn pf-btn-secondary" disabled={selected.length >= 20} aria-label={`Link ${student.display_name}`} onClick={() => selectStudents([...selected, student])}>Link student</button>
                                    </li>)}
                                </ul>
                                <p className="parent-help">{results.length === 0 ? 'No students found.' : 'Showing up to 30 results. Refine your search to find another student.'}</p>
                            </>}
                        </div>
                    </fieldset>
                    <div className="parent-actions">
                        <button type="submit" className="pf-btn pf-btn-primary" disabled={form.processing || statusForm.processing}>{form.processing ? 'Saving…' : parent ? 'Save changes' : 'Create parent account'}</button>
                        <Link href={route('portal.parents.index')} className="pf-btn pf-btn-secondary">Cancel</Link>
                    </div>
                </form>
                {parent && <section className="pf-panel parent-section">
                    <h2 className="parent-subtitle">Account access</h2>
                    <p className="parent-help">Deactivation blocks access without deleting the parent’s approved student links.</p>
                    <button type="button" className={`pf-btn ${parent.is_active ? 'pf-btn-danger' : 'pf-btn-secondary'}`} disabled={statusForm.processing || form.processing} onClick={changeStatus}>{statusForm.processing ? 'Updating…' : parent.is_active ? 'Deactivate account' : 'Reactivate account'}</button>
                    <InputError message={statusForm.errors.is_active} />
                </section>}
            </div>
        </AdminLayout>
    );
}

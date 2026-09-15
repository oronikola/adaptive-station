import InputError from '@/Components/InputError';
import { CheckIcon } from '@/Components/icons/check';
import { ChevronLeftIcon } from '@/Components/icons/chevron-left';
import { ChevronRightIcon } from '@/Components/icons/chevron-right';
import { PlusIcon } from '@/Components/icons/plus';
import { SearchIcon } from '@/Components/icons/search';
import { UserPlusIcon } from '@/Components/icons/user-plus';
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

const CREATE_STEPS = [
    { label: 'Account', hint: 'Name & credentials' },
    { label: 'Students', hint: 'Link approvals' },
    { label: 'Review', hint: 'Confirm & save' },
];

function StepIndicator({ current, steps }: { current: number; steps: typeof CREATE_STEPS }) {
    return (
        <div
            style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 28 }}
            role="list"
            aria-label="Form steps"
        >
            {steps.map((step, i) => {
                const done = i < current;
                const active = i === current;
                return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : undefined }}>
                        <div
                            role="listitem"
                            aria-current={active ? 'step' : undefined}
                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
                        >
                            <div
                                style={{
                                    width: 32, height: 32, borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 13, fontWeight: 700, flexShrink: 0,
                                    background: done || active ? 'var(--as-brand)' : 'var(--as-surface-active)',
                                    color: done || active ? '#fff' : 'var(--as-text-muted)',
                                    border: active ? '2px solid var(--as-brand-mid)' : done ? 'none' : '1.5px solid var(--as-border-mid)',
                                    transition: 'background 200ms',
                                }}
                            >
                                {done ? (
                                    <CheckIcon size={14} />
                                ) : i + 1}
                            </div>
                            <div style={{ textAlign: 'center', lineHeight: 1.2 }}>
                                <div style={{ fontSize: 11, fontWeight: active ? 700 : 500, color: active ? 'var(--as-text)' : 'var(--as-text-muted)' }}>
                                    {step.label}
                                </div>
                                <div style={{ fontSize: 10, color: 'var(--as-text-muted)' }}>{step.hint}</div>
                            </div>
                        </div>
                        {i < steps.length - 1 && (
                            <div style={{ flex: 1, height: 2, background: done ? 'var(--as-brand-mid)' : 'var(--as-border)', margin: '0 8px', marginBottom: 28, flexShrink: 0 }} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

export default function ParentFormScreen({ parent, linkedStudents }: { parent: ParentAccount | null; linkedStudents: Student[] }) {
    const form = useForm({ name: parent?.name ?? '', email: parent?.email ?? '', password: '', password_confirmation: '', student_ids: linkedStudents.map((student) => student.id) });
    const statusForm = useForm({ is_active: parent?.is_active ?? true });
    const [selected, setSelected] = useState(linkedStudents);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchError, setSearchError] = useState('');
    const [retry, setRetry] = useState(0);
    const [step, setStep] = useState(0);

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setSearchError('');
        const timer = window.setTimeout(() => {
            axios.get<{ students: Student[] }>(route('portal.parents.students'), { params: { search: query }, signal: controller.signal })
                .then(({ data }) => { if (!controller.signal.aborted) setResults(data.students); })
                .catch(() => { if (!controller.signal.aborted) setSearchError('Students could not be loaded. Please try again.'); })
                .finally(() => { if (!controller.signal.aborted) setLoading(false); });
        }, 400);
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

    function canAdvanceStep1() {
        return form.data.name.trim() !== '' && form.data.email.trim() !== '' && form.data.password.length >= 12 && form.data.password_confirmation === form.data.password;
    }

    // ── Edit mode: flat form (no stepper) ─────────────────────────────────
    if (parent) {
        return (
            <AdminLayout>
                <Head title="Manage parent" />
                <div className="pf-dashboard pft-page">
                    <Link href={route('portal.parents.index')} className="pft-panel-link">Back to parents</Link>
                    <div className="pft-hero">
                        <div>
                            <h1 className="pft-hero-title">Manage parent</h1>
                            <p className="pft-hero-subtitle">Approve this parent's student connections for your school.</p>
                        </div>
                        <span className={`pf-pill ${parent.is_active ? 'pf-pill--active' : 'pf-pill--inactive'}`}>{parent.is_active ? 'Active account' : 'Inactive account'}</span>
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
                                    <label htmlFor="parent-password">New password (optional)</label>
                                    <input id="parent-password" type="password" value={form.data.password} minLength={12} maxLength={128} autoComplete="new-password" onChange={(event) => form.setData('password', event.target.value)} />
                                    <InputError message={form.errors.password} />
                                </div>
                                <div className="pf-field">
                                    <label htmlFor="parent-password-confirmation">Confirm password</label>
                                    <input id="parent-password-confirmation" type="password" value={form.data.password_confirmation} required={form.data.password !== ''} autoComplete="new-password" onChange={(event) => form.setData('password_confirmation', event.target.value)} />
                                </div>
                            </div>
                            <p className="parent-help">Use at least 12 characters. Share the initial password directly with the parent. It cannot be viewed again here. No email is sent by this form.</p>
                        </fieldset>

                        <fieldset className="pf-panel parent-section" disabled={form.processing || statusForm.processing}>
                            <legend>Approved students</legend>
                            <p className="parent-help">Only link students after verifying the parent's relationship with the school. Inactive students retain their links but grant no attendance access until reactivated.</p>
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
                            <button type="submit" className={'pf-btn pf-btn-primary' + (form.processing ? ' pf-btn--loading' : '')} disabled={form.processing || statusForm.processing}>{form.processing ? 'Saving…' : 'Save changes'}</button>
                            <Link href={route('portal.parents.index')} className="pf-btn pf-btn-secondary">Cancel</Link>
                        </div>
                    </form>
                    <section className="pf-panel parent-section">
                        <h2 className="parent-subtitle">Account access</h2>
                        <p className="parent-help">Deactivation blocks access without deleting the parent's approved student links.</p>
                        <button type="button" className={`pf-btn ${parent.is_active ? 'pf-btn-danger' : 'pf-btn-secondary'}`} disabled={statusForm.processing || form.processing} onClick={changeStatus}>{statusForm.processing ? 'Updating…' : parent.is_active ? 'Deactivate account' : 'Reactivate account'}</button>
                        <InputError message={statusForm.errors.is_active} />
                    </section>
                </div>
            </AdminLayout>
        );
    }

    // ── Create mode: stepped form ─────────────────────────────────────────
    return (
        <AdminLayout>
            <Head title="Add parent" />
            <div className="pf-dashboard pft-page">
                <Link href={route('portal.parents.index')} className="pft-panel-link">Back to parents</Link>
                <div className="pft-hero">
                    <div className="pft-hero-main">
                        <span className="pft-hero-icon" aria-hidden="true">
                            <UserPlusIcon size={22} />
                        </span>
                        <div>
                            <h1 className="pft-hero-title">Add parent</h1>
                            <p className="pft-hero-subtitle">Approve this parent's student connections for your school.</p>
                        </div>
                    </div>
                </div>

                <div className="pf-panel">
                    <div style={{ padding: '28px 28px 0' }}>
                        <StepIndicator current={step} steps={CREATE_STEPS} />
                    </div>

                    <form onSubmit={submit} className="pft-form-panel">

                        {/* ── Step 1: Account details ─────────────────────── */}
                        {step === 0 && (
                            <>
                                <div className="parent-fields">
                                    <div className="pf-field">
                                        <label htmlFor="parent-name">Full name <span aria-hidden="true" style={{ color: 'var(--as-danger)' }}>*</span></label>
                                        <input
                                            id="parent-name"
                                            value={form.data.name}
                                            required
                                            maxLength={150}
                                            autoComplete="name"
                                            autoFocus
                                            onChange={(event) => form.setData('name', event.target.value)}
                                        />
                                        <InputError message={form.errors.name} />
                                    </div>
                                    <div className="pf-field">
                                        <label htmlFor="parent-email">Email address <span aria-hidden="true" style={{ color: 'var(--as-danger)' }}>*</span></label>
                                        <input
                                            id="parent-email"
                                            type="email"
                                            value={form.data.email}
                                            required
                                            maxLength={255}
                                            autoComplete="email"
                                            onChange={(event) => form.setData('email', event.target.value)}
                                        />
                                        <InputError message={form.errors.email} />
                                    </div>
                                    <div className="pf-field">
                                        <label htmlFor="parent-password">Initial password <span aria-hidden="true" style={{ color: 'var(--as-danger)' }}>*</span></label>
                                        <input
                                            id="parent-password"
                                            type="password"
                                            value={form.data.password}
                                            required
                                            minLength={12}
                                            maxLength={128}
                                            autoComplete="new-password"
                                            onChange={(event) => form.setData('password', event.target.value)}
                                        />
                                        <p className="pf-field-hint">At least 12 characters. Share this directly with the parent — it is not emailed automatically.</p>
                                        <InputError message={form.errors.password} />
                                    </div>
                                    <div className="pf-field">
                                        <label htmlFor="parent-password-confirmation">Confirm password <span aria-hidden="true" style={{ color: 'var(--as-danger)' }}>*</span></label>
                                        <input
                                            id="parent-password-confirmation"
                                            type="password"
                                            value={form.data.password_confirmation}
                                            required
                                            autoComplete="new-password"
                                            onChange={(event) => form.setData('password_confirmation', event.target.value)}
                                        />
                                        {form.data.password_confirmation && form.data.password !== form.data.password_confirmation && (
                                            <p className="pf-field-error-msg" role="alert" style={{ marginTop: 4, fontSize: 11, color: 'var(--as-danger)' }}>Passwords do not match.</p>
                                        )}
                                    </div>
                                </div>

                                <div className="pft-form-actions">
                                    <Link href={route('portal.parents.index')} className="pf-btn pf-btn-secondary">Cancel</Link>
                                    <button
                                        type="button"
                                        className="pf-btn pf-btn-primary"
                                        disabled={!canAdvanceStep1()}
                                        onClick={() => setStep(1)}
                                    >
                                        Next — Link Students
                                        <ChevronRightIcon size={16} />
                                    </button>
                                </div>
                            </>
                        )}

                        {/* ── Step 2: Link students ───────────────────────── */}
                        {step === 1 && (
                            <>
                                <p className="parent-help">
                                    Only link students after verifying the parent's relationship with the school.
                                    Inactive students retain their links but grant no attendance access until reactivated.
                                </p>

                                <h2 className="parent-subtitle">Linked students ({selected.length}/20)</h2>
                                {selected.length === 0 && <p className="parent-help">No students selected yet. Search below to add students.</p>}
                                <ul className="parent-student-list">
                                    {selected.map((student) => (
                                        <li key={student.id}>
                                            <div>
                                                <strong>{student.display_name}</strong>
                                                <span>{[student.grade_level, student.section, !student.is_active ? 'Inactive' : null].filter(Boolean).join(' · ')}</span>
                                            </div>
                                            <button
                                                type="button"
                                                className="pf-btn pf-btn-secondary"
                                                aria-label={`Unlink ${student.display_name}`}
                                                onClick={() => selectStudents(selected.filter((item) => item.id !== student.id))}
                                            >
                                                Unlink
                                            </button>
                                        </li>
                                    ))}
                                </ul>

                                <div className="pf-field pft-search-field" style={{ position: 'relative' }}>
                                    <label htmlFor="student-search">Find students to link</label>
                                    <SearchIcon
                                        size={14}
                                        style={{ position: 'absolute', bottom: 11, left: 14, color: 'var(--as-text-muted)', pointerEvents: 'none' }}
                                    />
                                    <input
                                        id="student-search"
                                        type="search"
                                        value={query}
                                        maxLength={100}
                                        placeholder="Search by student name or school ID…"
                                        style={{ paddingLeft: 38 }}
                                        onChange={(event) => setQuery(event.target.value)}
                                        autoFocus
                                    />
                                    <p className="pf-field-hint">Results update as you type (400ms debounce). Showing up to 30 results.</p>
                                </div>

                                <div aria-live="polite">
                                    {loading ? (
                                        <p className="parent-help">Loading students…</p>
                                    ) : searchError ? (
                                        <p className="parent-help" role="alert">
                                            {searchError}{' '}
                                            <button type="button" onClick={() => setRetry(retry + 1)}>Retry</button>
                                        </p>
                                    ) : (
                                        <>
                                            <ul className="parent-student-list">
                                                {results
                                                    .filter((student) => !form.data.student_ids.includes(student.id))
                                                    .map((student) => (
                                                        <li key={student.id}>
                                                            <div>
                                                                <strong>{student.display_name}</strong>
                                                                <span>{[student.grade_level, student.section, !student.is_active ? 'Inactive' : null].filter(Boolean).join(' · ')}</span>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                className="pf-btn pf-btn-secondary"
                                                                disabled={selected.length >= 20}
                                                                aria-label={`Link ${student.display_name}`}
                                                                onClick={() => selectStudents([...selected, student])}
                                                            >
                                                                Link student
                                                            </button>
                                                        </li>
                                                    ))}
                                            </ul>
                                            {results.length === 0 && <p className="parent-help">No students found for that search.</p>}
                                        </>
                                    )}
                                </div>

                                <div className="pft-form-actions">
                                    <button type="button" className="pf-btn pf-btn-secondary" onClick={() => setStep(0)}>
                                        <ChevronLeftIcon size={16} />
                                        Back
                                    </button>
                                    <button type="button" className="pf-btn pf-btn-primary" onClick={() => setStep(2)}>
                                        Review
                                        <ChevronRightIcon size={16} />
                                    </button>
                                </div>
                            </>
                        )}

                        {/* ── Step 3: Review & Submit ─────────────────────── */}
                        {step === 2 && (
                            <>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                                    {[
                                        ['Full name', form.data.name || '—'],
                                        ['Email', form.data.email || '—'],
                                        ['Password', '••••••••••••'],
                                        ['Linked students', selected.length === 0 ? 'None — account has no student access' : `${selected.length} student${selected.length !== 1 ? 's' : ''}`],
                                    ].map(([label, value]) => (
                                        <div
                                            key={label}
                                            style={{
                                                padding: '10px 14px', borderRadius: 12,
                                                border: '1px solid var(--as-border)', background: 'var(--as-surface)',
                                            }}
                                        >
                                            <div style={{ fontSize: 10, color: 'var(--as-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{label}</div>
                                            <div style={{ fontSize: 13, color: 'var(--as-text)', fontWeight: 500 }}>{value}</div>
                                        </div>
                                    ))}
                                </div>

                                {selected.length > 0 && (
                                    <div style={{ padding: '12px 14px', borderRadius: 12, border: '1px solid var(--as-border)', background: 'var(--as-surface)', marginBottom: 16 }}>
                                        <div style={{ fontSize: 10, color: 'var(--as-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Linked students</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            {selected.map((s) => (
                                                <div key={s.id} style={{ fontSize: 13, color: 'var(--as-text)', display: 'flex', gap: 8, alignItems: 'center' }}>
                                                    <span style={{ fontWeight: 500 }}>{s.display_name}</span>
                                                    {(s.grade_level || s.section) && (
                                                        <span style={{ color: 'var(--as-text-muted)', fontSize: 11 }}>
                                                            {[s.grade_level, s.section].filter(Boolean).join(' · ')}
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="pft-form-actions">
                                    <button type="button" className="pf-btn pf-btn-secondary" onClick={() => setStep(1)}>
                                        <ChevronLeftIcon size={16} />
                                        Back
                                    </button>
                                    <button
                                        type="submit"
                                        className={'pf-btn pf-btn-primary' + (form.processing ? ' pf-btn--loading' : '')}
                                        disabled={form.processing}
                                    >
                                        <PlusIcon size={16} />
                                        {form.processing ? 'Saving…' : 'Create parent account'}
                                    </button>
                                </div>
                            </>
                        )}
                    </form>
                </div>
            </div>
        </AdminLayout>
    );
}

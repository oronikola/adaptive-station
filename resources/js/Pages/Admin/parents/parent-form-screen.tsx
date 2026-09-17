import InputError from '@/Components/InputError';
import Modal, { ModalHero } from '@/Components/Modal';
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

interface ParentFormScreenProps {
    parent: ParentAccount | null;
    linkedStudents: Student[];
    embedded?: boolean;
    show?: boolean;
    onClose?: () => void;
}

const CREATE_STEPS = [
    { label: 'Account', hint: 'Name & credentials' },
    { label: 'Students', hint: 'Link approvals' },
    { label: 'Review', hint: 'Confirm & save' },
];

function StepIndicator({ current, steps }: { current: number; steps: typeof CREATE_STEPS }) {
    return (
        <ol className="parent-stepper" aria-label="Parent account setup progress">
            {steps.map((step, i) => {
                const done = i < current;
                const active = i === current;

                return (
                    <li
                        key={step.label}
                        className={`parent-step${active ? ' parent-step--active' : ''}${done ? ' parent-step--done' : ''}`}
                        aria-current={active ? 'step' : undefined}
                    >
                        <span className="parent-step-number" aria-hidden="true">
                            {done ? <CheckIcon size={14} /> : i + 1}
                        </span>
                        <span className="parent-step-copy">
                            <strong>{step.label}</strong>
                            <span>{step.hint}</span>
                        </span>
                        {i < steps.length - 1 && (
                            <span className="parent-step-connector" aria-hidden="true">
                                <span />
                            </span>
                        )}
                    </li>
                );
            })}
        </ol>
    );
}

export function AddParentModal({ show, onClose }: { show: boolean; onClose: () => void }) {
    return (
        <ParentFormScreen
            parent={null}
            linkedStudents={[]}
            embedded
            show={show}
            onClose={onClose}
        />
    );
}

export default function ParentFormScreen({
    parent,
    linkedStudents,
    embedded = false,
    show = true,
    onClose,
}: ParentFormScreenProps) {
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
        const options = {
            preserveScroll: true,
            onFinish: () => form.reset('password', 'password_confirmation'),
            onError: (errors: Record<string, string>) => {
                if (!parent) {
                    setStep(Object.keys(errors).some((key) => key.startsWith('student_ids')) ? 1 : 0);
                }
            },
        };
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

    function closeCreateModal() {
        if (form.processing) {
            return;
        }

        if (onClose) {
            onClose();
            return;
        }

        router.visit(route('portal.parents.index'));
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

    // ── Create mode: stepped modal ────────────────────────────────────────
    const createModal = (
            <Modal
                show={show}
                maxWidth="3xl"
                closeable={!form.processing}
                onClose={closeCreateModal}
            >
                <div className="pf-modal parent-create-modal">
                    <ModalHero
                        title="Add parent"
                        subtitle="Create secure access, then approve the students this parent can view."
                        onClose={closeCreateModal}
                    >
                        <UserPlusIcon size={20} />
                    </ModalHero>

                    <div className="parent-create-progress">
                        <StepIndicator current={step} steps={CREATE_STEPS} />
                    </div>

                    <form onSubmit={submit} className="parent-create-form">

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
                                            placeholder="e.g. Maria Santos"
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
                                            placeholder="e.g. maria.santos@example.com"
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
                                            placeholder="Enter at least 12 characters"
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
                                            placeholder="Re-enter the initial password"
                                            onChange={(event) => form.setData('password_confirmation', event.target.value)}
                                        />
                                        {form.data.password_confirmation && form.data.password !== form.data.password_confirmation && (
                                            <p className="pf-field-error-msg" role="alert" style={{ marginTop: 4, fontSize: 11, color: 'var(--as-danger)' }}>Passwords do not match.</p>
                                        )}
                                    </div>
                                </div>

                                <div className="pf-modal-footer parent-create-actions">
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
                                <div className="parent-step-intro">
                                    <h4>Approve student access</h4>
                                    <p>
                                    Only link students after verifying the parent's relationship with the school.
                                    Inactive students retain their links but grant no attendance access until reactivated.
                                    </p>
                                </div>

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

                                <div className="pf-field pft-search-field">
                                    <label htmlFor="student-search">Find students to link</label>
                                    <div className="pft-search-input-wrap">
                                        <SearchIcon size={14} aria-hidden="true" />
                                        <input
                                            id="student-search"
                                            type="search"
                                            value={query}
                                            maxLength={100}
                                            placeholder="Search by student name or school ID…"
                                            onChange={(event) => setQuery(event.target.value)}
                                            autoFocus
                                        />
                                    </div>
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

                                <div className="pf-modal-footer parent-create-actions">
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
                                <div className="parent-step-intro">
                                    <h4>Review parent access</h4>
                                    <p>Confirm these details before creating the account. Access can be managed later.</p>
                                </div>
                                <div className="parent-review-grid">
                                    {[
                                        ['Full name', form.data.name || '—'],
                                        ['Email', form.data.email || '—'],
                                        ['Password', '••••••••••••'],
                                        ['Linked students', selected.length === 0 ? 'None — account has no student access' : `${selected.length} student${selected.length !== 1 ? 's' : ''}`],
                                    ].map(([label, value]) => (
                                        <div key={label}>
                                            <span>{label}</span>
                                            <strong>{value}</strong>
                                        </div>
                                    ))}
                                </div>

                                {selected.length > 0 && (
                                    <div className="parent-review-students">
                                        <h5>Linked students</h5>
                                        <div>
                                            {selected.map((s) => (
                                                <div key={s.id}>
                                                    <strong>{s.display_name}</strong>
                                                    {(s.grade_level || s.section) && (
                                                        <span>
                                                            {[s.grade_level, s.section].filter(Boolean).join(' · ')}
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="pf-modal-footer parent-create-actions">
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
            </Modal>
    );

    if (embedded) {
        return createModal;
    }

    return (
        <AdminLayout>
            <Head title="Add parent" />
            {createModal}
        </AdminLayout>
    );
}

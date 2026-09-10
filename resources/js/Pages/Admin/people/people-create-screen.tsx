import InputError from '@/Components/InputError';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';
import '../../../../css/platform-dashboard.css';
import '../../../../css/platform-overview.css';

const STEPS = [
    { label: 'Identity', hint: 'Type and name' },
    { label: 'Placement', hint: 'Class, card & guardian' },
    { label: 'Review', hint: 'Confirm and create' },
];

function StepIndicator({ current, total }: { current: number; total: number }) {
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 0,
                marginBottom: 28,
            }}
            role="list"
            aria-label="Form steps"
        >
            {STEPS.map((step, i) => {
                const done = i < current;
                const active = i === current;
                return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < total - 1 ? 1 : undefined }}>
                        <div
                            role="listitem"
                            aria-current={active ? 'step' : undefined}
                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
                        >
                            <div
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 13,
                                    fontWeight: 700,
                                    flexShrink: 0,
                                    background: done ? 'var(--as-brand)' : active ? 'var(--as-brand)' : 'var(--as-surface-active)',
                                    color: done || active ? '#fff' : 'var(--as-text-muted)',
                                    border: active ? '2px solid var(--as-brand-mid)' : done ? 'none' : '1.5px solid var(--as-border-mid)',
                                    transition: 'background 200ms, color 200ms',
                                }}
                            >
                                {done ? (
                                    <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, stroke: '#fff', strokeWidth: 2.5, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                ) : (
                                    i + 1
                                )}
                            </div>
                            <div style={{ textAlign: 'center', lineHeight: 1.2 }}>
                                <div style={{ fontSize: 11, fontWeight: active ? 700 : 500, color: active ? 'var(--as-text)' : 'var(--as-text-muted)' }}>
                                    {step.label}
                                </div>
                                <div style={{ fontSize: 10, color: 'var(--as-text-muted)' }}>{step.hint}</div>
                            </div>
                        </div>
                        {i < total - 1 && (
                            <div style={{ flex: 1, height: 2, background: done ? 'var(--as-brand-mid)' : 'var(--as-border)', margin: '0 8px', marginBottom: 28, flexShrink: 0 }} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

export default function PeopleCreateScreen() {
    const [step, setStep] = useState(0);
    const { data, setData, post, processing, errors } = useForm({
        person_type: 'student',
        first_name: '',
        middle_name: '',
        last_name: '',
        display_name: '',
        grade_level: '',
        section: '',
        external_id: '',
        photo_url: '',
        status: 'active',
        rfid_card_uid: '',
        guardian_name: '',
        guardian_email: '',
        guardian_phone: '',
    });

    function canAdvanceStep1() {
        return data.first_name.trim() !== '' && data.last_name.trim() !== '';
    }

    function submit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        post(route('portal.people.store'));
    }

    return (
        <AdminLayout>
            <Head title="Add Person" />

            <div className="pf-dashboard pft-page">
                <Link href={route('portal.people.index')} className="pft-panel-link" style={{ marginBottom: 14 }}>
                    <svg viewBox="0 0 24 24">
                        <path d="m15 6-6 6 6 6" />
                    </svg>
                    Back to People
                </Link>

                <div className="pft-hero">
                    <div className="pft-hero-main">
                        <span className="pft-hero-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24">
                                <circle cx="8.5" cy="8.5" r="3" />
                                <circle cx="16" cy="9.5" r="2.6" />
                                <path d="M3.2 19.5a5.5 4.6 0 0 1 11 0z" />
                                <path d="M12.8 19.5a5.2 4.2 0 0 1 10.4 0z" />
                            </svg>
                        </span>
                        <div>
                            <h1 className="pft-hero-title">Add Person</h1>
                            <p className="pft-hero-subtitle">
                                Create a new student or staff record for your school.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="pf-panel">
                    <div style={{ padding: '28px 28px 0' }}>
                        <StepIndicator current={step} total={STEPS.length} />
                    </div>

                    <form onSubmit={submit} className="pft-form-panel">

                        {/* ── Step 1: Identity ───────────────────────────── */}
                        {step === 0 && (
                            <>
                                <div className="pf-field">
                                    <label htmlFor="person_type">Type</label>
                                    <select
                                        id="person_type"
                                        value={data.person_type}
                                        onChange={(e) => setData('person_type', e.target.value)}
                                    >
                                        <option value="student">Student</option>
                                        <option value="staff">Staff</option>
                                    </select>
                                    <InputError message={errors.person_type} className="mt-2" />
                                </div>

                                <div className="pft-form-grid">
                                    <div className="pf-field">
                                        <label htmlFor="first_name">First name <span aria-hidden="true" style={{ color: 'var(--as-danger)' }}>*</span></label>
                                        <input
                                            id="first_name"
                                            type="text"
                                            value={data.first_name}
                                            onChange={(e) => setData('first_name', e.target.value)}
                                            autoFocus
                                            required
                                        />
                                        <InputError message={errors.first_name} className="mt-2" />
                                    </div>

                                    <div className="pf-field">
                                        <label htmlFor="last_name">Last name <span aria-hidden="true" style={{ color: 'var(--as-danger)' }}>*</span></label>
                                        <input
                                            id="last_name"
                                            type="text"
                                            value={data.last_name}
                                            onChange={(e) => setData('last_name', e.target.value)}
                                            required
                                        />
                                        <InputError message={errors.last_name} className="mt-2" />
                                    </div>

                                    <div className="pf-field">
                                        <label htmlFor="middle_name">Middle name <span style={{ color: 'var(--as-text-muted)', fontWeight: 400 }}>(optional)</span></label>
                                        <input
                                            id="middle_name"
                                            type="text"
                                            value={data.middle_name}
                                            onChange={(e) => setData('middle_name', e.target.value)}
                                        />
                                        <InputError message={errors.middle_name} className="mt-2" />
                                    </div>
                                </div>

                                <div className="pf-field">
                                    <label htmlFor="display_name">Display name <span style={{ color: 'var(--as-text-muted)', fontWeight: 400 }}>(optional)</span></label>
                                    <input
                                        id="display_name"
                                        type="text"
                                        value={data.display_name}
                                        onChange={(e) => setData('display_name', e.target.value)}
                                        placeholder="Derived from the name above if left blank"
                                    />
                                    <InputError message={errors.display_name} className="mt-2" />
                                </div>

                                <div className="pf-field">
                                    <label htmlFor="external_id">External ID <span style={{ color: 'var(--as-text-muted)', fontWeight: 400 }}>(from SIS, optional)</span></label>
                                    <input
                                        id="external_id"
                                        type="text"
                                        value={data.external_id}
                                        onChange={(e) => setData('external_id', e.target.value)}
                                    />
                                    <p className="pf-field-hint">Used to match rows during CSV imports — prevents duplicates on re-import.</p>
                                    <InputError message={errors.external_id} className="mt-2" />
                                </div>

                                <div className="pft-form-actions">
                                    <Link href={route('portal.people.index')} className="pf-btn pf-btn-secondary">
                                        Cancel
                                    </Link>
                                    <button
                                        type="button"
                                        className="pf-btn pf-btn-primary"
                                        disabled={!canAdvanceStep1()}
                                        onClick={() => setStep(1)}
                                    >
                                        Next
                                        <svg viewBox="0 0 24 24">
                                            <path d="M9 6l6 6-6 6" />
                                        </svg>
                                    </button>
                                </div>
                            </>
                        )}

                        {/* ── Step 2: Placement & Guardian ──────────────── */}
                        {step === 1 && (
                            <>
                                <div className="pft-form-grid">
                                    <div className="pf-field">
                                        <label htmlFor="grade_level">Grade level <span style={{ color: 'var(--as-text-muted)', fontWeight: 400 }}>(optional)</span></label>
                                        <input
                                            id="grade_level"
                                            type="text"
                                            value={data.grade_level}
                                            onChange={(e) => setData('grade_level', e.target.value)}
                                            autoFocus
                                        />
                                        <InputError message={errors.grade_level} className="mt-2" />
                                    </div>

                                    <div className="pf-field">
                                        <label htmlFor="section">Section <span style={{ color: 'var(--as-text-muted)', fontWeight: 400 }}>(optional)</span></label>
                                        <input
                                            id="section"
                                            type="text"
                                            value={data.section}
                                            onChange={(e) => setData('section', e.target.value)}
                                        />
                                        <InputError message={errors.section} className="mt-2" />
                                    </div>

                                    <div className="pf-field">
                                        <label htmlFor="status">Status</label>
                                        <select
                                            id="status"
                                            value={data.status}
                                            onChange={(e) => setData('status', e.target.value)}
                                        >
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                        </select>
                                        <InputError message={errors.status} className="mt-2" />
                                    </div>

                                    <div className="pf-field">
                                        <label htmlFor="rfid_card_uid">RFID card UID <span style={{ color: 'var(--as-text-muted)', fontWeight: 400 }}>(optional)</span></label>
                                        <input
                                            id="rfid_card_uid"
                                            type="text"
                                            value={data.rfid_card_uid}
                                            onChange={(e) => setData('rfid_card_uid', e.target.value)}
                                        />
                                        <InputError message={errors.rfid_card_uid} className="mt-2" />
                                    </div>
                                </div>

                                <div className="pf-field">
                                    <label htmlFor="photo_url">Photo URL <span style={{ color: 'var(--as-text-muted)', fontWeight: 400 }}>(optional)</span></label>
                                    <input
                                        id="photo_url"
                                        type="url"
                                        value={data.photo_url}
                                        onChange={(e) => setData('photo_url', e.target.value)}
                                        placeholder="https://..."
                                    />
                                    <InputError message={errors.photo_url} className="mt-2" />
                                </div>

                                {/* Guardian section */}
                                <div
                                    style={{
                                        padding: '16px 18px',
                                        borderRadius: 16,
                                        border: '1px solid var(--as-border)',
                                        background: 'var(--as-surface)',
                                        marginBottom: 4,
                                    }}
                                >
                                    <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: 13, color: 'var(--as-text)' }}>
                                        Guardian <span style={{ color: 'var(--as-text-muted)', fontWeight: 400 }}>(optional)</span>
                                    </p>
                                    <p className="pf-field-hint" style={{ marginBottom: 16, marginTop: 2 }}>
                                        Creates or reuses a parent/guardian account and links it to this person.
                                        Guardian phone is where SMS tap alerts are sent, once the guardian enables SMS notifications after logging in.
                                    </p>

                                    <div className="pft-form-grid" style={{ marginBottom: 0 }}>
                                        <div className="pf-field">
                                            <label htmlFor="guardian_name">Guardian name</label>
                                            <input
                                                id="guardian_name"
                                                type="text"
                                                value={data.guardian_name}
                                                onChange={(e) => setData('guardian_name', e.target.value)}
                                            />
                                            <InputError message={errors.guardian_name} className="mt-2" />
                                        </div>

                                        <div className="pf-field">
                                            <label htmlFor="guardian_email">Guardian email</label>
                                            <input
                                                id="guardian_email"
                                                type="email"
                                                value={data.guardian_email}
                                                onChange={(e) => setData('guardian_email', e.target.value)}
                                            />
                                            <InputError message={errors.guardian_email} className="mt-2" />
                                        </div>

                                        <div className="pf-field">
                                            <label htmlFor="guardian_phone">Guardian phone</label>
                                            <input
                                                id="guardian_phone"
                                                type="text"
                                                value={data.guardian_phone}
                                                onChange={(e) => setData('guardian_phone', e.target.value)}
                                            />
                                            <InputError message={errors.guardian_phone} className="mt-2" />
                                        </div>
                                    </div>
                                </div>

                                <div className="pft-form-actions">
                                    <button
                                        type="button"
                                        className="pf-btn pf-btn-secondary"
                                        onClick={() => setStep(0)}
                                    >
                                        <svg viewBox="0 0 24 24">
                                            <path d="m15 6-6 6 6 6" />
                                        </svg>
                                        Back
                                    </button>
                                    <button
                                        type="button"
                                        className="pf-btn pf-btn-primary"
                                        onClick={() => setStep(2)}
                                    >
                                        Review
                                        <svg viewBox="0 0 24 24">
                                            <path d="M9 6l6 6-6 6" />
                                        </svg>
                                    </button>
                                </div>
                            </>
                        )}

                        {/* ── Step 3: Review & Submit ────────────────────── */}
                        {step === 2 && (
                            <>
                                <div
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: 12,
                                        marginBottom: 8,
                                    }}
                                >
                                    {[
                                        ['Type', data.person_type === 'student' ? 'Student' : 'Staff'],
                                        ['First name', data.first_name || '—'],
                                        ['Last name', data.last_name || '—'],
                                        ['Middle name', data.middle_name || '—'],
                                        ['Display name', data.display_name || 'Auto'],
                                        ['External ID', data.external_id || '—'],
                                        ['Grade level', data.grade_level || '—'],
                                        ['Section', data.section || '—'],
                                        ['Status', data.status],
                                        ['RFID card UID', data.rfid_card_uid || '—'],
                                        ['Photo URL', data.photo_url || '—'],
                                        ['Guardian name', data.guardian_name || '—'],
                                        ['Guardian email', data.guardian_email || '—'],
                                        ['Guardian phone', data.guardian_phone || '—'],
                                    ].map(([label, value]) => (
                                        <div
                                            key={label}
                                            style={{
                                                padding: '10px 14px',
                                                borderRadius: 12,
                                                border: '1px solid var(--as-border)',
                                                background: 'var(--as-surface)',
                                            }}
                                        >
                                            <div style={{ fontSize: 10, color: 'var(--as-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
                                                {label}
                                            </div>
                                            <div style={{ fontSize: 13, color: 'var(--as-text)', fontWeight: 500, wordBreak: 'break-all' }}>
                                                {value}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="pft-form-actions">
                                    <button
                                        type="button"
                                        className="pf-btn pf-btn-secondary"
                                        onClick={() => setStep(1)}
                                    >
                                        <svg viewBox="0 0 24 24">
                                            <path d="m15 6-6 6 6 6" />
                                        </svg>
                                        Back
                                    </button>
                                    <button
                                        type="submit"
                                        className={'pf-btn pf-btn-primary' + (processing ? ' pf-btn--loading' : '')}
                                        disabled={processing}
                                    >
                                        <svg viewBox="0 0 24 24">
                                            <path d="M12 5v14M5 12h14" />
                                        </svg>
                                        Create Person
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

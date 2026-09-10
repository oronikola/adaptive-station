import InputError from '@/Components/InputError';
import Modal from '@/Components/Modal';
import SecretOnceCallout from '@/Components/SecretOnceCallout';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import type { PageProps, Person, RfidCard } from '@/types';
import { personRouteKey } from '@/types';
import '../../../../css/platform-dashboard.css';
import '../../../../css/platform-overview.css';

interface RfidCardWithAssign extends RfidCard {
    card_uid: string;
    assigned_at: string;
}

interface PersonWithCards extends Person {
    middle_name: string | null;
    photo_url: string | null;
    rfid_cards: RfidCardWithAssign[];
}

interface Guardian {
    id: string;
    name: string;
    email: string;
    phone_number: string | null;
}

interface PeopleEditPageProps extends PageProps {
    flash?: PageProps['flash'] & { temporaryPassword?: string };
}

export default function PeopleEditScreen({ person, guardian }: { person: PersonWithCards; guardian: Guardian | null }) {
    const { props } = usePage<PeopleEditPageProps>();
    const canManage = props.auth.user.role === 'tenant_admin';

    const detailsForm = useForm({
        person_type: person.person_type,
        first_name: person.first_name,
        middle_name: person.middle_name ?? '',
        last_name: person.last_name,
        display_name: person.display_name,
        grade_level: person.grade_level ?? '',
        section: person.section ?? '',
        external_id: person.external_id ?? '',
        photo_url: person.photo_url ?? '',
        status: person.is_active ? 'active' : 'inactive',
        guardian_name: guardian?.name ?? '',
        guardian_email: guardian?.email ?? '',
        guardian_phone: guardian?.phone_number ?? '',
    });

    function submitDetails(e: React.FormEvent) {
        e.preventDefault();
        detailsForm.put(route('portal.people.update', personRouteKey(person)));
    }

    const [assignOpen, setAssignOpen] = useState(false);
    const assignForm = useForm({ card_uid: '', person_id: person.id });

    function submitAssign(e: React.FormEvent) {
        e.preventDefault();
        assignForm.post(route('portal.rfid-cards.store'), {
            onSuccess: () => {
                setAssignOpen(false);
                assignForm.reset('card_uid');
            },
        });
    }

    const [replacingCard, setReplacingCard] = useState<number | null>(null);
    const replaceForm = useForm({ card_uid: '' });

    function submitReplace(e: React.FormEvent) {
        e.preventDefault();
        replaceForm.post(route('portal.rfid-cards.replace', replacingCard ?? 0), {
            onSuccess: () => {
                setReplacingCard(null);
                replaceForm.reset();
            },
        });
    }

    const [deactivatingCard, setDeactivatingCard] = useState<number | null>(null);
    const deactivateForm = useForm({});

    function submitDeactivate(e: React.FormEvent) {
        e.preventDefault();
        deactivateForm.patch(route('portal.rfid-cards.deactivate', deactivatingCard ?? 0), {
            onSuccess: () => setDeactivatingCard(null),
        });
    }

    return (
        <AdminLayout>
            <Head title={person.display_name} />

            <div className="pf-dashboard pft-page">
                <div className="pft-hero">
                    <div className="pft-hero-main">
                        <span className="pft-hero-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24">
                                <circle cx="12" cy="8" r="4" />
                                <path d="M4 20a8 8 0 0 1 16 0" />
                            </svg>
                        </span>
                        <div>
                            <h1 className="pft-hero-title">{person.display_name}</h1>
                            <p className="pft-hero-subtitle">
                                {person.person_type === 'student' ? 'Student' : 'Staff'} record
                                {person.grade_level ? ` · ${[person.grade_level, person.section].filter(Boolean).join(' ')}` : ''}
                            </p>
                        </div>
                    </div>
                    <div className="pft-hero-actions">
                        <span
                            className={
                                'pf-pill ' +
                                (person.is_active ? 'pf-pill--active' : 'pf-pill--inactive')
                            }
                        >
                            {person.is_active ? 'active' : 'inactive'}
                        </span>
                        <Link href={route('portal.people.index')} className="pf-btn pf-btn-secondary">
                            Back to People
                        </Link>
                    </div>
                </div>

                <SecretOnceCallout label="Guardian temporary password" value={props.flash?.temporaryPassword} />

                <div className="pf-panel">
                    <div className="pf-panel-header">
                        <div>
                            <h2 className="pf-panel-title">Details</h2>
                            <p className="pf-panel-count">Personal and classification information</p>
                        </div>
                    </div>

                    <form onSubmit={submitDetails} className="pft-form-panel">
                        <div className="pft-form-grid">
                            <div className="pf-field" style={{ gridColumn: '1 / -1' }}>
                                <label htmlFor="person_type">Type</label>
                                <select
                                    id="person_type"
                                    value={detailsForm.data.person_type}
                                    onChange={(e) =>
                                        detailsForm.setData('person_type', e.target.value as 'student' | 'staff')
                                    }
                                    disabled={!canManage}
                                >
                                    <option value="student">Student</option>
                                    <option value="staff">Staff</option>
                                </select>
                                <InputError message={detailsForm.errors.person_type} className="mt-2" />
                            </div>

                            <div className="pf-field">
                                <label htmlFor="first_name">First name</label>
                                <input
                                    id="first_name"
                                    type="text"
                                    value={detailsForm.data.first_name}
                                    onChange={(e) => detailsForm.setData('first_name', e.target.value)}
                                    disabled={!canManage}
                                    required
                                />
                                <InputError message={detailsForm.errors.first_name} className="mt-2" />
                            </div>

                            <div className="pf-field">
                                <label htmlFor="middle_name">Middle name</label>
                                <input
                                    id="middle_name"
                                    type="text"
                                    value={detailsForm.data.middle_name}
                                    onChange={(e) => detailsForm.setData('middle_name', e.target.value)}
                                    disabled={!canManage}
                                />
                            </div>

                            <div className="pf-field">
                                <label htmlFor="last_name">Last name</label>
                                <input
                                    id="last_name"
                                    type="text"
                                    value={detailsForm.data.last_name}
                                    onChange={(e) => detailsForm.setData('last_name', e.target.value)}
                                    disabled={!canManage}
                                    required
                                />
                                <InputError message={detailsForm.errors.last_name} className="mt-2" />
                            </div>

                            <div className="pf-field">
                                <label htmlFor="display_name">Display name</label>
                                <input
                                    id="display_name"
                                    type="text"
                                    value={detailsForm.data.display_name}
                                    onChange={(e) => detailsForm.setData('display_name', e.target.value)}
                                    disabled={!canManage}
                                />
                            </div>

                            <div className="pf-field">
                                <label htmlFor="grade_level">Grade level</label>
                                <input
                                    id="grade_level"
                                    type="text"
                                    value={detailsForm.data.grade_level}
                                    onChange={(e) => detailsForm.setData('grade_level', e.target.value)}
                                    disabled={!canManage}
                                />
                            </div>

                            <div className="pf-field">
                                <label htmlFor="section">Section</label>
                                <input
                                    id="section"
                                    type="text"
                                    value={detailsForm.data.section}
                                    onChange={(e) => detailsForm.setData('section', e.target.value)}
                                    disabled={!canManage}
                                />
                            </div>

                            <div className="pf-field">
                                <label htmlFor="external_id">External ID</label>
                                <input
                                    id="external_id"
                                    type="text"
                                    value={detailsForm.data.external_id}
                                    onChange={(e) => detailsForm.setData('external_id', e.target.value)}
                                    disabled={!canManage}
                                />
                                <InputError message={detailsForm.errors.external_id} className="mt-2" />
                            </div>

                            <div className="pf-field">
                                <label htmlFor="status">Status</label>
                                <select
                                    id="status"
                                    value={detailsForm.data.status}
                                    onChange={(e) => detailsForm.setData('status', e.target.value)}
                                    disabled={!canManage}
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                                <InputError message={detailsForm.errors.status} className="mt-2" />
                            </div>

                            <div className="pf-field" style={{ gridColumn: '1 / -1' }}>
                                <label htmlFor="photo_url">Photo URL</label>
                                <input
                                    id="photo_url"
                                    type="url"
                                    value={detailsForm.data.photo_url}
                                    onChange={(e) => detailsForm.setData('photo_url', e.target.value)}
                                    disabled={!canManage}
                                    placeholder="https://..."
                                />
                            </div>
                        </div>

                        <div style={{ borderTop: '1px solid var(--as-border)', margin: '24px 0 20px', paddingTop: 20 }}>
                            <p className="pf-panel-title" style={{ margin: '0 0 4px', fontSize: 14 }}>Guardian</p>
                            <p className="pf-panel-count" style={{ margin: '0 0 16px' }}>
                                Creates or reuses a parent/guardian account linked to this person. The guardian's phone
                                number receives SMS tap alerts once they enable notifications after logging in. Clearing
                                the email removes the link.
                            </p>

                            <div className="pft-form-grid">
                                <div className="pf-field">
                                    <label htmlFor="guardian_name">Guardian name</label>
                                    <input
                                        id="guardian_name"
                                        type="text"
                                        value={detailsForm.data.guardian_name}
                                        onChange={(e) => detailsForm.setData('guardian_name', e.target.value)}
                                        disabled={!canManage}
                                    />
                                    <InputError message={detailsForm.errors.guardian_name} className="mt-2" />
                                </div>

                                <div className="pf-field">
                                    <label htmlFor="guardian_email">Guardian email</label>
                                    <input
                                        id="guardian_email"
                                        type="email"
                                        value={detailsForm.data.guardian_email}
                                        onChange={(e) => detailsForm.setData('guardian_email', e.target.value)}
                                        disabled={!canManage}
                                    />
                                    <InputError message={detailsForm.errors.guardian_email} className="mt-2" />
                                </div>

                                <div className="pf-field">
                                    <label htmlFor="guardian_phone">Guardian phone</label>
                                    <input
                                        id="guardian_phone"
                                        type="text"
                                        value={detailsForm.data.guardian_phone}
                                        onChange={(e) => detailsForm.setData('guardian_phone', e.target.value)}
                                        disabled={!canManage}
                                    />
                                    <InputError message={detailsForm.errors.guardian_phone} className="mt-2" />
                                </div>
                            </div>
                        </div>

                        {canManage && (
                            <div className="pft-form-actions">
                                <button
                                    type="submit"
                                    className={'pf-btn pf-btn-primary' + (detailsForm.processing ? ' pf-btn--loading' : '')}
                                    disabled={detailsForm.processing}
                                >
                                    Save Changes
                                </button>
                            </div>
                        )}
                    </form>
                </div>

                <div className="pf-panel">
                    <div className="pf-panel-header">
                        <div>
                            <h2 className="pf-panel-title">RFID Cards</h2>
                            <p className="pf-panel-count">
                                {person.rfid_cards.length === 0
                                    ? 'No cards assigned'
                                    : `${person.rfid_cards.length} card${person.rfid_cards.length === 1 ? '' : 's'}`}
                            </p>
                        </div>
                        {canManage && (
                            <button
                                type="button"
                                className="pf-btn pf-btn-primary"
                                onClick={() => setAssignOpen(true)}
                            >
                                <svg viewBox="0 0 24 24">
                                    <path d="M12 5v14M5 12h14" />
                                </svg>
                                Assign Card
                            </button>
                        )}
                    </div>

                    <div className="pf-table-wrap">
                        <table className="pf-table">
                            <thead>
                                <tr>
                                    <th scope="col">Card UID</th>
                                    <th scope="col">Status</th>
                                    <th scope="col">Assigned</th>
                                    <th scope="col">
                                        <span className="sr-only">Actions</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {person.rfid_cards.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="pf-empty">
                                            No cards assigned yet.
                                            {canManage && (
                                                <>
                                                    {' '}
                                                    <button
                                                        type="button"
                                                        onClick={() => setAssignOpen(true)}
                                                        className="pf-row-action"
                                                        style={{ display: 'inline', marginLeft: 4 }}
                                                    >
                                                        Assign one →
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                )}

                                {person.rfid_cards.map((card) => (
                                    <tr key={card.id}>
                                        <td className="font-mono">{card.card_uid}</td>
                                        <td>
                                            <span
                                                className={
                                                    'pf-pill ' +
                                                    (card.is_active
                                                        ? 'pf-pill--active'
                                                        : 'pf-pill--inactive')
                                                }
                                            >
                                                {card.is_active ? 'active' : 'inactive'}
                                            </span>
                                        </td>
                                        <td>
                                            {new Date(card.assigned_at).toLocaleDateString()}
                                        </td>
                                        <td className="space-x-3 text-right">
                                            {canManage && card.is_active && (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => setReplacingCard(card.id)}
                                                        className="pf-row-action"
                                                    >
                                                        Replace
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setDeactivatingCard(card.id)}
                                                        className="pf-row-action pf-row-action--danger"
                                                    >
                                                        Deactivate
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <Modal show={assignOpen} onClose={() => setAssignOpen(false)}>
                <form onSubmit={submitAssign} className="pf-modal">
                    <div className="pf-modal-header">
                        <h3 className="pf-modal-title">Assign a card</h3>
                        <button
                            type="button"
                            className="pf-modal-close"
                            onClick={() => setAssignOpen(false)}
                            aria-label="Close"
                        >
                            <svg viewBox="0 0 24 24">
                                <path d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="pf-field">
                        <label htmlFor="assign_card_uid">Card UID</label>
                        <input
                            id="assign_card_uid"
                            type="text"
                            value={assignForm.data.card_uid}
                            onChange={(e) => assignForm.setData('card_uid', e.target.value)}
                            autoFocus
                            required
                        />
                        <InputError message={assignForm.errors.card_uid} className="mt-2" />
                    </div>

                    <div className="pf-modal-footer">
                        <button
                            type="button"
                            className="pf-btn pf-btn-secondary"
                            onClick={() => setAssignOpen(false)}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className={'pf-btn pf-btn-primary' + (assignForm.processing ? ' pf-btn--loading' : '')}
                            disabled={assignForm.processing}
                        >
                            Assign
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal show={replacingCard !== null} onClose={() => setReplacingCard(null)}>
                <form onSubmit={submitReplace} className="pf-modal">
                    <div className="pf-modal-header">
                        <h3 className="pf-modal-title">Replace card</h3>
                        <button
                            type="button"
                            className="pf-modal-close"
                            onClick={() => setReplacingCard(null)}
                            aria-label="Close"
                        >
                            <svg viewBox="0 0 24 24">
                                <path d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <p className="pf-field-hint" style={{ marginBottom: '16px' }}>
                        The current card will be deactivated and can no longer be
                        used to tap in or out.
                    </p>

                    <div className="pf-field">
                        <label htmlFor="replace_card_uid">New card UID</label>
                        <input
                            id="replace_card_uid"
                            type="text"
                            value={replaceForm.data.card_uid}
                            onChange={(e) => replaceForm.setData('card_uid', e.target.value)}
                            autoFocus
                            required
                        />
                        <InputError message={replaceForm.errors.card_uid} className="mt-2" />
                    </div>

                    <div className="pf-modal-footer">
                        <button
                            type="button"
                            className="pf-btn pf-btn-secondary"
                            onClick={() => setReplacingCard(null)}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className={'pf-btn pf-btn-primary' + (replaceForm.processing ? ' pf-btn--loading' : '')}
                            disabled={replaceForm.processing}
                        >
                            Replace
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal show={deactivatingCard !== null} onClose={() => setDeactivatingCard(null)}>
                <form onSubmit={submitDeactivate} className="pf-modal">
                    <div className="pf-modal-header">
                        <h3 className="pf-modal-title">Deactivate card</h3>
                        <button
                            type="button"
                            className="pf-modal-close"
                            onClick={() => setDeactivatingCard(null)}
                            aria-label="Close"
                        >
                            <svg viewBox="0 0 24 24">
                                <path d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <p className="pf-field-hint" style={{ marginBottom: '16px' }}>
                        This card will be permanently deactivated and can no longer
                        be used to tap in or out. This cannot be undone — assign a
                        new card if the student needs access again.
                    </p>

                    <div className="pf-modal-footer">
                        <button
                            type="button"
                            className="pf-btn pf-btn-secondary"
                            onClick={() => setDeactivatingCard(null)}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className={'pf-btn pf-btn-danger' + (deactivateForm.processing ? ' pf-btn--loading' : '')}
                            disabled={deactivateForm.processing}
                        >
                            Deactivate
                        </button>
                    </div>
                </form>
            </Modal>
        </AdminLayout>
    );
}

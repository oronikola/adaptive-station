import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import Modal from '@/Components/Modal';
import TextInput from '@/Components/TextInput';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import '../../../../css/platform-dashboard.css';

export default function PeopleEditScreen({ person }) {
    const { auth } = usePage().props;
    const canManage = auth.user.role === 'tenant_admin';

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
    });

    function submitDetails(e) {
        e.preventDefault();
        detailsForm.put(route('portal.people.update', person.id));
    }

    const [assignOpen, setAssignOpen] = useState(false);
    const assignForm = useForm({ card_uid: '', person_id: person.id });

    function submitAssign(e) {
        e.preventDefault();
        assignForm.post(route('portal.rfid-cards.store'), {
            onSuccess: () => {
                setAssignOpen(false);
                assignForm.reset('card_uid');
            },
        });
    }

    const [replacingCard, setReplacingCard] = useState(null);
    const replaceForm = useForm({ card_uid: '' });

    function submitReplace(e) {
        e.preventDefault();
        replaceForm.post(route('portal.rfid-cards.replace', replacingCard), {
            onSuccess: () => {
                setReplacingCard(null);
                replaceForm.reset();
            },
        });
    }

    return (
        <AdminLayout
            header={
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                        {person.display_name}
                    </h2>
                    {canManage && (
                        <Link
                            href={route(
                                person.is_active
                                    ? 'portal.people.deactivate'
                                    : 'portal.people.reactivate',
                                person.id,
                            )}
                            method="patch"
                            as="button"
                            className={
                                'pf-btn ' +
                                (person.is_active
                                    ? 'pf-btn-danger'
                                    : 'pf-btn-primary')
                            }
                        >
                            {person.is_active ? 'Deactivate' : 'Reactivate'}
                        </Link>
                    )}
                </div>
            }
        >
            <Head title={person.display_name} />

            <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
                <div className="flex items-center gap-3">
                    <span
                        className={
                            'pf-pill ' +
                            (person.is_active ? 'pf-pill--active' : 'pf-pill--inactive')
                        }
                    >
                        {person.is_active ? 'active' : 'inactive'}
                    </span>
                    <Link
                        href={route('portal.people.index')}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                    >
                        Back to People
                    </Link>
                </div>

                <form
                    onSubmit={submitDetails}
                    className="space-y-6 rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800"
                >
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        Details
                    </h3>

                    <div>
                        <InputLabel htmlFor="person_type" value="Type" />
                        <select
                            id="person_type"
                            value={detailsForm.data.person_type}
                            onChange={(e) =>
                                detailsForm.setData('person_type', e.target.value)
                            }
                            disabled={!canManage}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                        >
                            <option value="student">Student</option>
                            <option value="staff">Staff</option>
                        </select>
                        <InputError message={detailsForm.errors.person_type} className="mt-2" />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div>
                            <InputLabel htmlFor="first_name" value="First name" />
                            <TextInput
                                id="first_name"
                                value={detailsForm.data.first_name}
                                onChange={(e) => detailsForm.setData('first_name', e.target.value)}
                                className="mt-1 block w-full"
                                disabled={!canManage}
                                required
                            />
                            <InputError message={detailsForm.errors.first_name} className="mt-2" />
                        </div>

                        <div>
                            <InputLabel htmlFor="middle_name" value="Middle name" />
                            <TextInput
                                id="middle_name"
                                value={detailsForm.data.middle_name}
                                onChange={(e) => detailsForm.setData('middle_name', e.target.value)}
                                className="mt-1 block w-full"
                                disabled={!canManage}
                            />
                        </div>

                        <div>
                            <InputLabel htmlFor="last_name" value="Last name" />
                            <TextInput
                                id="last_name"
                                value={detailsForm.data.last_name}
                                onChange={(e) => detailsForm.setData('last_name', e.target.value)}
                                className="mt-1 block w-full"
                                disabled={!canManage}
                                required
                            />
                            <InputError message={detailsForm.errors.last_name} className="mt-2" />
                        </div>
                    </div>

                    <div>
                        <InputLabel htmlFor="display_name" value="Display name" />
                        <TextInput
                            id="display_name"
                            value={detailsForm.data.display_name}
                            onChange={(e) => detailsForm.setData('display_name', e.target.value)}
                            className="mt-1 block w-full"
                            disabled={!canManage}
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <InputLabel htmlFor="grade_level" value="Grade level" />
                            <TextInput
                                id="grade_level"
                                value={detailsForm.data.grade_level}
                                onChange={(e) => detailsForm.setData('grade_level', e.target.value)}
                                className="mt-1 block w-full"
                                disabled={!canManage}
                            />
                        </div>

                        <div>
                            <InputLabel htmlFor="section" value="Section" />
                            <TextInput
                                id="section"
                                value={detailsForm.data.section}
                                onChange={(e) => detailsForm.setData('section', e.target.value)}
                                className="mt-1 block w-full"
                                disabled={!canManage}
                            />
                        </div>
                    </div>

                    <div>
                        <InputLabel htmlFor="external_id" value="External ID" />
                        <TextInput
                            id="external_id"
                            value={detailsForm.data.external_id}
                            onChange={(e) => detailsForm.setData('external_id', e.target.value)}
                            className="mt-1 block w-full"
                            disabled={!canManage}
                        />
                        <InputError message={detailsForm.errors.external_id} className="mt-2" />
                    </div>

                    {canManage && (
                        <button type="submit" className="pf-btn pf-btn-primary" disabled={detailsForm.processing}>
                            Save Changes
                        </button>
                    )}
                </form>

                <div className="pf-panel">
                    <div className="pf-panel-header">
                        <div>
                            <h2 className="pf-panel-title">RFID Cards</h2>
                            <p className="pf-panel-count">
                                {person.rfid_cards.length} shown
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
                                            No cards assigned.
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
                                                    <Link
                                                        href={route('portal.rfid-cards.deactivate', card.id)}
                                                        method="patch"
                                                        as="button"
                                                        className="pf-row-action pf-row-action--danger"
                                                    >
                                                        Deactivate
                                                    </Link>
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
                            className="pf-btn pf-btn-primary"
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
                            className="pf-btn pf-btn-primary"
                            disabled={replaceForm.processing}
                        >
                            Replace
                        </button>
                    </div>
                </form>
            </Modal>
        </AdminLayout>
    );
}

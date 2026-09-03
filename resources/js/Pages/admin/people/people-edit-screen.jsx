import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import DangerButton from '@/Components/DangerButton';
import TextInput from '@/Components/TextInput';
import StatusBadge from '@/Components/admin/StatusBadge';
import Table from '@/Components/admin/Table';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';

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
                        >
                            {person.is_active ? (
                                <DangerButton type="button">
                                    Deactivate
                                </DangerButton>
                            ) : (
                                <PrimaryButton type="button">
                                    Reactivate
                                </PrimaryButton>
                            )}
                        </Link>
                    )}
                </div>
            }
        >
            <Head title={person.display_name} />

            <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
                <div className="flex items-center gap-3">
                    <StatusBadge color={person.is_active ? 'green' : 'gray'}>
                        {person.is_active ? 'Active' : 'Inactive'}
                    </StatusBadge>
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
                        <PrimaryButton disabled={detailsForm.processing}>
                            Save Changes
                        </PrimaryButton>
                    )}
                </form>

                <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                            RFID Cards
                        </h3>
                        {canManage && (
                            <PrimaryButton
                                type="button"
                                onClick={() => setAssignOpen(true)}
                            >
                                Assign Card
                            </PrimaryButton>
                        )}
                    </div>

                    <Table>
                        <Table.Head>
                            <Table.Th>Card UID</Table.Th>
                            <Table.Th>Status</Table.Th>
                            <Table.Th>Assigned</Table.Th>
                            <Table.Th>
                                <span className="sr-only">Actions</span>
                            </Table.Th>
                        </Table.Head>
                        <Table.Body>
                            {person.rfid_cards.length === 0 && (
                                <Table.Empty colSpan={4}>
                                    No cards assigned.
                                </Table.Empty>
                            )}

                            {person.rfid_cards.map((card) => (
                                <tr key={card.id}>
                                    <Table.Td className="font-mono">
                                        {card.card_uid}
                                    </Table.Td>
                                    <Table.Td>
                                        <StatusBadge
                                            color={card.is_active ? 'green' : 'gray'}
                                        >
                                            {card.is_active ? 'Active' : 'Inactive'}
                                        </StatusBadge>
                                    </Table.Td>
                                    <Table.Td>
                                        {new Date(card.assigned_at).toLocaleDateString()}
                                    </Table.Td>
                                    <Table.Td className="space-x-3 text-right">
                                        {canManage && card.is_active && (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => setReplacingCard(card.id)}
                                                    className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                                                >
                                                    Replace
                                                </button>
                                                <Link
                                                    href={route('portal.rfid-cards.deactivate', card.id)}
                                                    method="patch"
                                                    as="button"
                                                    className="font-medium text-red-600 hover:text-red-500 dark:text-red-400"
                                                >
                                                    Deactivate
                                                </Link>
                                            </>
                                        )}
                                    </Table.Td>
                                </tr>
                            ))}
                        </Table.Body>
                    </Table>
                </div>
            </div>

            <Modal show={assignOpen} onClose={() => setAssignOpen(false)}>
                <form onSubmit={submitAssign} className="p-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        Assign a card
                    </h3>
                    <div className="mt-4">
                        <InputLabel htmlFor="assign_card_uid" value="Card UID" />
                        <TextInput
                            id="assign_card_uid"
                            value={assignForm.data.card_uid}
                            onChange={(e) => assignForm.setData('card_uid', e.target.value)}
                            className="mt-1 block w-full"
                            isFocused
                            required
                        />
                        <InputError message={assignForm.errors.card_uid} className="mt-2" />
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={() => setAssignOpen(false)}>
                            Cancel
                        </SecondaryButton>
                        <PrimaryButton disabled={assignForm.processing}>
                            Assign
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            <Modal show={replacingCard !== null} onClose={() => setReplacingCard(null)}>
                <form onSubmit={submitReplace} className="p-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        Replace card
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        The current card will be deactivated and can no longer be
                        used to tap in or out.
                    </p>
                    <div className="mt-4">
                        <InputLabel htmlFor="replace_card_uid" value="New card UID" />
                        <TextInput
                            id="replace_card_uid"
                            value={replaceForm.data.card_uid}
                            onChange={(e) => replaceForm.setData('card_uid', e.target.value)}
                            className="mt-1 block w-full"
                            isFocused
                            required
                        />
                        <InputError message={replaceForm.errors.card_uid} className="mt-2" />
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={() => setReplacingCard(null)}>
                            Cancel
                        </SecondaryButton>
                        <PrimaryButton disabled={replaceForm.processing}>
                            Replace
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>
        </AdminLayout>
    );
}

import FilterBar from '@/Components/admin/FilterBar';
import Pagination from '@/Components/admin/Pagination';
import StatusBadge from '@/Components/admin/StatusBadge';
import Table from '@/Components/admin/Table';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';

export default function PeopleListScreen({ people, filters }) {
    const { data, setData } = useForm({
        search: filters.search ?? '',
        status: filters.status ?? '',
    });

    function submit(e) {
        e.preventDefault();
        router.get(route('portal.people.index'), data, { preserveState: true });
    }

    return (
        <AdminLayout
            header={
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                        People
                    </h2>
                    <Link href={route('portal.people.create')}>
                        <PrimaryButton>Add Person</PrimaryButton>
                    </Link>
                </div>
            }
        >
            <Head title="People" />

            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                <FilterBar onSubmit={submit} resetHref={route('portal.people.index')}>
                    <div>
                        <InputLabel htmlFor="search" value="Search" />
                        <TextInput
                            id="search"
                            value={data.search}
                            onChange={(e) => setData('search', e.target.value)}
                            placeholder="Name or ID..."
                            className="mt-1 block w-56"
                        />
                    </div>

                    <div>
                        <InputLabel htmlFor="status" value="Status" />
                        <select
                            id="status"
                            value={data.status}
                            onChange={(e) => setData('status', e.target.value)}
                            className="mt-1 block w-40 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                        >
                            <option value="">All</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>
                </FilterBar>

                <Table>
                    <Table.Head>
                        <Table.Th>Name</Table.Th>
                        <Table.Th>Type</Table.Th>
                        <Table.Th>Grade / Section</Table.Th>
                        <Table.Th>External ID</Table.Th>
                        <Table.Th>Status</Table.Th>
                        <Table.Th>
                            <span className="sr-only">Actions</span>
                        </Table.Th>
                    </Table.Head>
                    <Table.Body>
                        {people.data.length === 0 && (
                            <Table.Empty colSpan={6}>
                                No people found.
                            </Table.Empty>
                        )}

                        {people.data.map((person) => (
                            <tr key={person.id}>
                                <Table.Td className="font-medium text-gray-900 dark:text-gray-100">
                                    {person.display_name}
                                </Table.Td>
                                <Table.Td className="capitalize">
                                    {person.person_type}
                                </Table.Td>
                                <Table.Td>
                                    {[person.grade_level, person.section]
                                        .filter(Boolean)
                                        .join(' / ') || '—'}
                                </Table.Td>
                                <Table.Td>{person.external_id ?? '—'}</Table.Td>
                                <Table.Td>
                                    <StatusBadge
                                        color={
                                            person.is_active ? 'green' : 'gray'
                                        }
                                    >
                                        {person.is_active
                                            ? 'Active'
                                            : 'Inactive'}
                                    </StatusBadge>
                                </Table.Td>
                                <Table.Td className="text-right">
                                    <Link
                                        href={route(
                                            'portal.people.edit',
                                            person.id,
                                        )}
                                        className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                                    >
                                        View
                                    </Link>
                                </Table.Td>
                            </tr>
                        ))}
                    </Table.Body>
                </Table>

                <Pagination links={people.links} />
            </div>
        </AdminLayout>
    );
}

import FilterBar from '@/Components/admin/FilterBar';
import Pagination from '@/Components/admin/Pagination';
import StatusBadge from '@/Components/admin/StatusBadge';
import Table from '@/Components/admin/Table';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import type { PaginatedData, Person, RfidCard } from '@/types';

interface RfidCardWithPerson extends RfidCard {
    card_uid: string;
    assigned_at: string;
    person?: Person;
}

export default function RfidCardsListScreen({ rfidCards, filters }: { rfidCards: PaginatedData<RfidCardWithPerson>; filters: { search?: string; status?: string } }) {
    const { data, setData } = useForm({
        search: filters.search ?? '',
        status: filters.status ?? '',
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        router.get(route('portal.rfid-cards.index'), data, {
            preserveState: true,
        });
    }

    return (
        <AdminLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                    RFID Cards
                </h2>
            }
        >
            <Head title="RFID Cards" />

            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                <FilterBar onSubmit={submit} resetHref={route('portal.rfid-cards.index')}>
                    <div>
                        <InputLabel htmlFor="search" value="Card UID" />
                        <TextInput
                            id="search"
                            value={data.search}
                            onChange={(e) => setData('search', e.target.value)}
                            placeholder="Search by UID..."
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
                        <Table.Th>Card UID</Table.Th>
                        <Table.Th>Assigned To</Table.Th>
                        <Table.Th>Status</Table.Th>
                        <Table.Th>Assigned</Table.Th>
                        <Table.Th>
                            <span className="sr-only">Actions</span>
                        </Table.Th>
                    </Table.Head>
                    <Table.Body>
                        {rfidCards.data.length === 0 && (
                            <Table.Empty colSpan={5}>
                                No cards found.
                            </Table.Empty>
                        )}

                        {rfidCards.data.map((card: RfidCardWithPerson) => (
                            <tr key={card.id}>
                                <Table.Td className="font-mono">
                                    {card.card_uid}
                                </Table.Td>
                                <Table.Td>
                                    {card.person?.display_name ?? '—'}
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
                                <Table.Td className="text-right">
                                    {card.person && (
                                        <Link
                                            href={route(
                                                'portal.people.edit',
                                                card.person.id,
                                            )}
                                            className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                                        >
                                            Manage
                                        </Link>
                                    )}
                                </Table.Td>
                            </tr>
                        ))}
                    </Table.Body>
                </Table>

                <Pagination links={rfidCards.links} />
            </div>
        </AdminLayout>
    );
}

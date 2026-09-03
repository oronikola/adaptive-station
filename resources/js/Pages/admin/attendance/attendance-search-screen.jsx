import FilterBar from '@/Components/admin/FilterBar';
import Pagination from '@/Components/admin/Pagination';
import StatusBadge from '@/Components/admin/StatusBadge';
import Table from '@/Components/admin/Table';
import InputLabel from '@/Components/InputLabel';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';

export default function AttendanceSearchScreen({ events, filters, people, stations }) {
    const { data, setData } = useForm({
        date_from: filters.date_from ?? '',
        date_to: filters.date_to ?? '',
        person_id: filters.person_id ?? '',
        card_uid: filters.card_uid ?? '',
        station_id: filters.station_id ?? '',
        event_type: filters.event_type ?? '',
    });

    function submit(e) {
        e.preventDefault();
        router.get(route('portal.attendance.index'), data, {
            preserveState: true,
        });
    }

    const exportUrl = `${route('portal.attendance.export')}?${new URLSearchParams(
        Object.fromEntries(Object.entries(data).filter(([, v]) => v !== '')),
    ).toString()}`;

    return (
        <AdminLayout
            header={
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                        Attendance
                    </h2>
                    <div className="flex items-center gap-4">
                        <Link
                            href={route('portal.attendance.summary')}
                            className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                        >
                            View Daily Summary
                        </Link>
                        <a href={exportUrl}>
                            <SecondaryButton type="button">
                                Export CSV
                            </SecondaryButton>
                        </a>
                    </div>
                </div>
            }
        >
            <Head title="Attendance" />

            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                <FilterBar onSubmit={submit} resetHref={route('portal.attendance.index')}>
                    <div>
                        <InputLabel htmlFor="date_from" value="From" />
                        <TextInput
                            id="date_from"
                            type="date"
                            value={data.date_from}
                            onChange={(e) => setData('date_from', e.target.value)}
                            className="mt-1 block"
                        />
                    </div>

                    <div>
                        <InputLabel htmlFor="date_to" value="To" />
                        <TextInput
                            id="date_to"
                            type="date"
                            value={data.date_to}
                            onChange={(e) => setData('date_to', e.target.value)}
                            className="mt-1 block"
                        />
                    </div>

                    <div>
                        <InputLabel htmlFor="person_id" value="Person" />
                        <select
                            id="person_id"
                            value={data.person_id}
                            onChange={(e) => setData('person_id', e.target.value)}
                            className="mt-1 block w-44 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                        >
                            <option value="">All</option>
                            {people.map((person) => (
                                <option key={person.id} value={person.id}>
                                    {person.display_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <InputLabel htmlFor="card_uid" value="Card UID" />
                        <TextInput
                            id="card_uid"
                            value={data.card_uid}
                            onChange={(e) => setData('card_uid', e.target.value)}
                            className="mt-1 block w-36"
                        />
                    </div>

                    <div>
                        <InputLabel htmlFor="station_id" value="Station" />
                        <select
                            id="station_id"
                            value={data.station_id}
                            onChange={(e) => setData('station_id', e.target.value)}
                            className="mt-1 block w-40 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                        >
                            <option value="">All</option>
                            {stations.map((station) => (
                                <option key={station.id} value={station.id}>
                                    {station.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <InputLabel htmlFor="event_type" value="Event" />
                        <select
                            id="event_type"
                            value={data.event_type}
                            onChange={(e) => setData('event_type', e.target.value)}
                            className="mt-1 block w-28 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                        >
                            <option value="">All</option>
                            <option value="IN">IN</option>
                            <option value="OUT">OUT</option>
                        </select>
                    </div>
                </FilterBar>

                <Table>
                    <Table.Head>
                        <Table.Th>Date</Table.Th>
                        <Table.Th>Time (UTC)</Table.Th>
                        <Table.Th>Person</Table.Th>
                        <Table.Th>Card UID</Table.Th>
                        <Table.Th>Station</Table.Th>
                        <Table.Th>Event</Table.Th>
                    </Table.Head>
                    <Table.Body>
                        {events.data.length === 0 && (
                            <Table.Empty colSpan={6}>
                                No attendance events found.
                            </Table.Empty>
                        )}

                        {events.data.map((event) => (
                            <tr key={event.id}>
                                <Table.Td>{event.attendance_date_local}</Table.Td>
                                <Table.Td>
                                    {new Date(event.occurred_at).toLocaleTimeString()}
                                </Table.Td>
                                <Table.Td>
                                    {event.person?.display_name ?? '—'}
                                </Table.Td>
                                <Table.Td className="font-mono">
                                    {event.card_uid}
                                </Table.Td>
                                <Table.Td>{event.station?.name ?? '—'}</Table.Td>
                                <Table.Td>
                                    <StatusBadge
                                        color={
                                            event.event_type === 'IN'
                                                ? 'green'
                                                : 'yellow'
                                        }
                                    >
                                        {event.event_type}
                                    </StatusBadge>
                                </Table.Td>
                            </tr>
                        ))}
                    </Table.Body>
                </Table>

                <Pagination links={events.links} />
            </div>
        </AdminLayout>
    );
}

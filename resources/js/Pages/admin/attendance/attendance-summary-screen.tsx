import FilterBar from '@/Components/admin/FilterBar';
import Pagination from '@/Components/admin/Pagination';
import Table from '@/Components/admin/Table';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import type { PaginatedData, Station } from '@/types';

interface SummaryRow {
    attendance_date_local: string;
    total: number;
    unique_people: number;
}

interface SummaryFilters {
    date_from?: string;
    date_to?: string;
    station_id?: string;
    event_type?: string;
}

export default function AttendanceSummaryScreen({ summary, filters, stations }: { summary: PaginatedData<SummaryRow>; filters: SummaryFilters; stations: Station[] }) {
    const { data, setData } = useForm({
        date_from: filters.date_from ?? '',
        date_to: filters.date_to ?? '',
        station_id: filters.station_id ?? '',
        event_type: filters.event_type ?? '',
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        router.get(route('portal.attendance.summary'), data, { preserveState: true });
    }

    return (
        <AdminLayout
            header={
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                        Daily Attendance Summary
                    </h2>
                    <Link
                        href={route('portal.attendance.index')}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                    >
                        Back to Search
                    </Link>
                </div>
            }
        >
            <Head title="Daily Attendance Summary" />

            <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
                <FilterBar onSubmit={submit} resetHref={route('portal.attendance.summary')}>
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
                        <InputLabel htmlFor="station_id" value="Station" />
                        <select
                            id="station_id"
                            value={data.station_id}
                            onChange={(e) => setData('station_id', e.target.value)}
                            className="mt-1 block w-40 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                        >
                            <option value="">All</option>
                            {stations.map((station: Station) => (
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
                        <Table.Th>Total Taps</Table.Th>
                        <Table.Th>Unique People</Table.Th>
                    </Table.Head>
                    <Table.Body>
                        {summary.data.length === 0 && (
                            <Table.Empty colSpan={3}>No attendance data for this range.</Table.Empty>
                        )}

                        {summary.data.map((row: SummaryRow) => (
                            <tr key={row.attendance_date_local}>
                                <Table.Td className="font-medium text-gray-900 dark:text-gray-100">
                                    {row.attendance_date_local}
                                </Table.Td>
                                <Table.Td>{row.total}</Table.Td>
                                <Table.Td>{row.unique_people}</Table.Td>
                            </tr>
                        ))}
                    </Table.Body>
                </Table>

                <Pagination links={summary.links} />
            </div>
        </AdminLayout>
    );
}

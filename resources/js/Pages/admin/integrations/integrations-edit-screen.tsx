import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import StatusBadge from '@/Components/admin/StatusBadge';
import Table from '@/Components/admin/Table';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, useForm } from '@inertiajs/react';

interface IntegrationProfile {
    id: number;
    name: string;
    direction: string;
    status: string;
}

interface IntegrationRun {
    id: number;
    direction: string;
    status: string;
    started_at: string | null;
    summary?: Record<string, unknown> | null;
}

export default function IntegrationsEditScreen({ profile, runs }: { profile: IntegrationProfile; runs: IntegrationRun[] }) {
    const form = useForm({
        name: profile.name,
        direction: profile.direction,
        config: '',
    });

    function submitProfile(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        form.put(route('portal.integrations.update', profile.id));
    }

    const exportForm = useForm({ date_from: '', date_to: '' });

    function submitExport(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        exportForm.post(route('portal.integrations.export', profile.id));
    }

    return (
        <AdminLayout
            header={
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                        {profile.name}
                    </h2>
                    <StatusBadge color={profile.status === 'active' ? 'green' : 'gray'}>
                        {profile.status}
                    </StatusBadge>
                </div>
            }
        >
            <Head title={profile.name} />

            <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
                <Link
                    href={route('portal.integrations.index')}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                >
                    Back to Integrations
                </Link>

                <form onSubmit={submitProfile} className="space-y-4 rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Profile</h3>

                    <div>
                        <InputLabel htmlFor="name" value="Name" />
                        <TextInput
                            id="name"
                            value={form.data.name}
                            onChange={(e) => form.setData('name', e.target.value)}
                            className="mt-1 block w-full"
                        />
                        <InputError message={form.errors.name} className="mt-2" />
                    </div>

                    <div>
                        <InputLabel htmlFor="direction" value="Direction" />
                        <select
                            id="direction"
                            value={form.data.direction}
                            onChange={(e) => form.setData('direction', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                        >
                            <option value="import_only">Import only</option>
                            <option value="export_only">Export only</option>
                            <option value="bidirectional">Import + Export</option>
                        </select>
                    </div>

                    <div>
                        <InputLabel htmlFor="config" value="Connection & Table Mapping (JSON)" />
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            Leave blank to keep the current configuration unchanged — it is never redisplayed after saving.
                        </p>
                        <textarea
                            id="config"
                            rows={12}
                            placeholder="Paste replacement JSON here only if you want to change it"
                            value={form.data.config}
                            onChange={(e) => form.setData('config', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 font-mono text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                        />
                        <InputError message={form.errors.config} className="mt-2" />
                    </div>

                    <PrimaryButton disabled={form.processing}>Save</PrimaryButton>
                </form>

                {profile.direction !== 'import_only' && (
                    <form onSubmit={submitExport} className="space-y-4 rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                            Run Attendance Export
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            One-way: Adaptive Station tap events → legacy taphistory format. Safe to re-run over an overlapping range.
                        </p>

                        <div className="flex gap-4">
                            <div>
                                <InputLabel htmlFor="date_from" value="From" />
                                <TextInput
                                    id="date_from"
                                    type="date"
                                    value={exportForm.data.date_from}
                                    onChange={(e) => exportForm.setData('date_from', e.target.value)}
                                    className="mt-1 block"
                                />
                            </div>
                            <div>
                                <InputLabel htmlFor="date_to" value="To" />
                                <TextInput
                                    id="date_to"
                                    type="date"
                                    value={exportForm.data.date_to}
                                    onChange={(e) => exportForm.setData('date_to', e.target.value)}
                                    className="mt-1 block"
                                />
                            </div>
                        </div>
                        <InputError message={exportForm.errors.date_from ?? exportForm.errors.date_to} className="mt-2" />

                        <PrimaryButton disabled={exportForm.processing}>Run Export</PrimaryButton>
                    </form>
                )}

                <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
                    <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-gray-100">Recent Runs</h3>
                    <Table>
                        <Table.Head>
                            <Table.Th>Direction</Table.Th>
                            <Table.Th>Status</Table.Th>
                            <Table.Th>Started</Table.Th>
                            <Table.Th>Summary</Table.Th>
                        </Table.Head>
                        <Table.Body>
                            {runs.length === 0 && <Table.Empty colSpan={4}>No runs yet.</Table.Empty>}

                            {runs.map((run: IntegrationRun) => (
                                <tr key={run.id}>
                                    <Table.Td>{run.direction}</Table.Td>
                                    <Table.Td>
                                        <StatusBadge color={run.status === 'succeeded' ? 'green' : run.status === 'failed' ? 'red' : 'yellow'}>
                                            {run.status}
                                        </StatusBadge>
                                    </Table.Td>
                                    <Table.Td>
                                        {run.started_at ? new Date(run.started_at).toLocaleString() : '—'}
                                    </Table.Td>
                                    <Table.Td className="font-mono text-xs">
                                        {run.summary ? JSON.stringify(run.summary) : '—'}
                                    </Table.Td>
                                </tr>
                            ))}
                        </Table.Body>
                    </Table>
                </div>
            </div>
        </AdminLayout>
    );
}

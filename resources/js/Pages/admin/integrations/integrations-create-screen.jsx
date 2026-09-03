import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm } from '@inertiajs/react';

const DEFAULT_CONFIG = JSON.stringify(
    {
        host: '',
        port: 3306,
        database: '',
        username: '',
        password: '',
        tables: {
            studinfo: { table: 'studinfo', columns: {} },
            gradelevel: { table: 'gradelevel', columns: {} },
            teacher: { table: 'teacher', columns: {} },
            taphistory: { table: 'taphistory', columns: {} },
        },
    },
    null,
    2,
);

export default function IntegrationsCreateScreen() {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        driver: 'legacy_mysql',
        direction: 'import_only',
        config: DEFAULT_CONFIG,
    });

    function submit(e) {
        e.preventDefault();
        post(route('portal.integrations.store'));
    }

    return (
        <AdminLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                    New Integration Profile
                </h2>
            }
        >
            <Head title="New Integration Profile" />

            <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
                <form onSubmit={submit} className="space-y-6 rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Connects to a school's existing legacy tapping database
                        (read-only for roster/attendance import; write access
                        only if you enable export). Credentials are encrypted
                        and never shown again after saving.
                    </p>

                    <div>
                        <InputLabel htmlFor="name" value="Name" />
                        <TextInput
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            className="mt-1 block w-full"
                            isFocused
                        />
                        <InputError message={errors.name} className="mt-2" />
                    </div>

                    <div>
                        <InputLabel htmlFor="direction" value="Direction" />
                        <select
                            id="direction"
                            value={data.direction}
                            onChange={(e) => setData('direction', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                        >
                            <option value="import_only">Import only</option>
                            <option value="export_only">Export only</option>
                            <option value="bidirectional">Import + Export</option>
                        </select>
                        <InputError message={errors.direction} className="mt-2" />
                    </div>

                    <div>
                        <InputLabel htmlFor="config" value="Connection & Table Mapping (JSON)" />
                        <textarea
                            id="config"
                            rows={16}
                            value={data.config}
                            onChange={(e) => setData('config', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 font-mono text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                        />
                        <InputError message={errors.config} className="mt-2" />
                    </div>

                    <PrimaryButton disabled={processing}>Create</PrimaryButton>
                </form>
            </div>
        </AdminLayout>
    );
}

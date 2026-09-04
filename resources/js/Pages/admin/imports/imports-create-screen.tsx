import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm } from '@inertiajs/react';

interface IntegrationProfile {
    id: number | string;
    name: string;
}

export default function ImportsCreateScreen({ profiles }: { profiles: IntegrationProfile[] }) {
    const { data, setData, post, processing, errors } = useForm({
        integration_profile_id: profiles[0]?.id ?? '',
        date_from: '',
        date_to: '',
        commit: false,
    });

    function submit(commit: boolean) {
        return (e: React.MouseEvent<HTMLButtonElement>) => {
            e.preventDefault();
            setData('commit', commit);
            post(route('portal.imports.store'));
        };
    }

    return (
        <AdminLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                    New Legacy Import
                </h2>
            }
        >
            <Head title="New Legacy Import" />

            <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:px-8">
                <form className="space-y-6 rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Preview runs the same matching logic read-only — nothing is written. Commit performs the real import; re-running Commit is always safe (already-imported rows are skipped, never duplicated).
                    </p>

                    <div>
                        <InputLabel htmlFor="integration_profile_id" value="Integration Profile" />
                        <select
                            id="integration_profile_id"
                            value={data.integration_profile_id}
                            onChange={(e) => setData('integration_profile_id', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                        >
                            {profiles.map((profile: IntegrationProfile) => (
                                <option key={profile.id} value={profile.id}>
                                    {profile.name}
                                </option>
                            ))}
                        </select>
                        <InputError message={errors.integration_profile_id} className="mt-2" />
                    </div>

                    <div className="flex gap-4">
                        <div>
                            <InputLabel htmlFor="date_from" value="Attendance History From" />
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
                    </div>
                    <InputError message={errors.date_from ?? errors.date_to} className="mt-2" />

                    <div className="flex gap-3">
                        <SecondaryButton type="button" disabled={processing} onClick={submit(false)}>
                            Preview
                        </SecondaryButton>
                        <PrimaryButton type="button" disabled={processing} onClick={submit(true)}>
                            Commit
                        </PrimaryButton>
                    </div>
                </form>
            </div>
        </AdminLayout>
    );
}

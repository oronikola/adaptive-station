import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PremiumSelect from '@/Components/PremiumSelect';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, useForm } from '@inertiajs/react';

export default function UsersCreateScreen() {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        email: '',
        role: 'tenant_operator',
    });

    function submit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        post(route('portal.users.store'));
    }

    return (
        <AdminLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                    Add User
                </h2>
            }
        >
            <Head title="Add User" />

            <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:px-8">
                <form
                    onSubmit={submit}
                    className="space-y-6 rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800"
                >
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        A temporary password will be generated and shown once.
                        Relay it to the new user directly — they will be
                        required to set their own password on first login.
                    </p>

                    <div>
                        <InputLabel htmlFor="name" value="Name" />
                        <TextInput
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            className="mt-1 block w-full"
                            isFocused
                            required
                        />
                        <InputError message={errors.name} className="mt-2" />
                    </div>

                    <div>
                        <InputLabel htmlFor="email" value="Email" />
                        <TextInput
                            id="email"
                            type="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            className="mt-1 block w-full"
                            required
                        />
                        <InputError message={errors.email} className="mt-2" />
                    </div>

                    <div>
                        <InputLabel htmlFor="role" value="Role" />
                        <PremiumSelect
                            id="role"
                            value={data.role}
                            onChange={(role) => setData('role', role)}
                            options={[
                                { value: 'tenant_operator', label: 'Operator (view-only)' },
                                { value: 'tenant_admin', label: 'Admin (full access)' },
                            ]}
                            invalid={Boolean(errors.role)}
                            className="mt-1 block w-full"
                        />
                        <InputError message={errors.role} className="mt-2" />
                    </div>

                    <div className="flex items-center gap-3">
                        <PrimaryButton disabled={processing}>Create User</PrimaryButton>
                        <Link href={route('portal.users.index')}>
                            <SecondaryButton type="button">Cancel</SecondaryButton>
                        </Link>
                    </div>
                </form>
            </div>
        </AdminLayout>
    );
}

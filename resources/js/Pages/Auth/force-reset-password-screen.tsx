import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm } from '@inertiajs/react';

export default function ForceResetPasswordScreen() {
    const { data, setData, put, processing, errors, reset } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        put(route('password.force-reset.update'), {
            onFinish: () => reset('current_password', 'password', 'password_confirmation'),
        });
    }

    return (
        <GuestLayout>
            <Head title="Set Your Password" />

            <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                Your account was created with a temporary password. Set a new
                password before continuing.
            </div>

            <form onSubmit={submit}>
                <div>
                    <InputLabel htmlFor="current_password" value="Temporary password" />
                    <TextInput
                        id="current_password"
                        type="password"
                        value={data.current_password}
                        onChange={(e) => setData('current_password', e.target.value)}
                        className="mt-1 block w-full"
                        isFocused
                        required
                    />
                    <InputError message={errors.current_password} className="mt-2" />
                </div>

                <div className="mt-4">
                    <InputLabel htmlFor="password" value="New password" />
                    <TextInput
                        id="password"
                        type="password"
                        value={data.password}
                        onChange={(e) => setData('password', e.target.value)}
                        className="mt-1 block w-full"
                        required
                    />
                    <InputError message={errors.password} className="mt-2" />
                </div>

                <div className="mt-4">
                    <InputLabel htmlFor="password_confirmation" value="Confirm new password" />
                    <TextInput
                        id="password_confirmation"
                        type="password"
                        value={data.password_confirmation}
                        onChange={(e) => setData('password_confirmation', e.target.value)}
                        className="mt-1 block w-full"
                        required
                    />
                    <InputError message={errors.password_confirmation} className="mt-2" />
                </div>

                <div className="mt-4 flex items-center justify-end">
                    <PrimaryButton disabled={processing}>Set Password</PrimaryButton>
                </div>
            </form>
        </GuestLayout>
    );
}

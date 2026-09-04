import AuthInput from '@/Components/AuthInput';
import AuthLayout from '@/Layouts/AuthLayout';
import { useForm } from '@inertiajs/react';

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
        <AuthLayout
            title="Set Your Password"
            eyebrow="SECURITY CHECK"
            heading="Set a permanent password."
            caption="Your account was created with a temporary password — set a new one to continue."
            formHeading="Set your password"
            formSubheading="Your account was created with a temporary password. Set a new password before continuing."
        >
            <form onSubmit={submit} className="auth-login-form" noValidate>
                <AuthInput
                    id="current_password"
                    type="password"
                    label="Temporary password"
                    value={data.current_password}
                    onChange={(e) => setData('current_password', e.target.value)}
                    error={errors.current_password}
                    autoFocus
                    placeholder="Enter your temporary password"
                    required
                />

                <AuthInput
                    id="password"
                    type="password"
                    label="New password"
                    value={data.password}
                    onChange={(e) => setData('password', e.target.value)}
                    error={errors.password}
                    placeholder="Create a new password"
                    required
                />

                <AuthInput
                    id="password_confirmation"
                    type="password"
                    label="Confirm new password"
                    value={data.password_confirmation}
                    onChange={(e) => setData('password_confirmation', e.target.value)}
                    error={errors.password_confirmation}
                    placeholder="Re-enter your new password"
                    required
                />

                <button type="submit" className="auth-submit" disabled={processing}>
                    {processing ? 'Setting password…' : 'Set password'}
                </button>
            </form>
        </AuthLayout>
    );
}

import AuthInput from '@/Components/AuthInput';
import AuthLayout from '@/Layouts/AuthLayout';
import { useForm } from '@inertiajs/react';

interface ResetPasswordProps {
    token: string;
    email: string;
}

export default function ResetPassword({ token, email }: ResetPasswordProps) {
    const { data, setData, post, processing, errors, reset } = useForm({
        token: token,
        email: email,
        password: '',
        password_confirmation: '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();

        post(route('password.store'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <AuthLayout
            title="Reset Password"
            eyebrow="SET NEW PASSWORD"
            heading="Choose a new password."
            caption="Pick a strong password to keep your account secure."
            formHeading="Reset your password"
            formSubheading="Enter a new password for your account."
        >
            <form onSubmit={submit} className="auth-login-form" noValidate>
                <AuthInput
                    id="email"
                    type="email"
                    label="Email"
                    name="email"
                    value={data.email}
                    autoComplete="username"
                    onChange={(e) => setData('email', e.target.value)}
                    error={errors.email}
                    placeholder="you@company.com"
                />

                <AuthInput
                    id="password"
                    type="password"
                    label="Password"
                    name="password"
                    value={data.password}
                    autoComplete="new-password"
                    autoFocus
                    onChange={(e) => setData('password', e.target.value)}
                    error={errors.password}
                    placeholder="Create a new password"
                />

                <AuthInput
                    id="password_confirmation"
                    type="password"
                    label="Confirm password"
                    name="password_confirmation"
                    value={data.password_confirmation}
                    autoComplete="new-password"
                    onChange={(e) => setData('password_confirmation', e.target.value)}
                    error={errors.password_confirmation}
                    placeholder="Re-enter your new password"
                />

                <button type="submit" className="auth-submit" disabled={processing}>
                    {processing ? 'Resetting…' : 'Reset password'}
                </button>
            </form>
        </AuthLayout>
    );
}

import AuthInput from '@/Components/AuthInput';
import AuthLayout from '@/Layouts/AuthLayout';
import { useForm } from '@inertiajs/react';
import { useState } from 'react';

export default function Register() {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const [confirmError, setConfirmError] = useState('');

    const submit = (e: React.FormEvent) => {
        e.preventDefault();

        if (data.password !== data.password_confirmation) {
            setConfirmError('Passwords do not match.');
            return;
        }

        setConfirmError('');
        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <AuthLayout
            title="Register"
            eyebrow="REQUEST ACCESS"
            heading="Join the workspace."
            caption="Create an account to start tracking attendance in seconds."
            formHeading="Create your account"
            formSubheading="Fill in your details to request access."
            topbarPrompt="Already have an account?"
            topbarLinkText="Sign in"
            topbarLinkHref={route('login')}
        >
            <form onSubmit={submit} className="auth-login-form" noValidate>
                <AuthInput
                    id="name"
                    type="text"
                    label="Name"
                    name="name"
                    value={data.name}
                    autoComplete="name"
                    autoFocus
                    onChange={(e) => setData('name', e.target.value)}
                    error={errors.name}
                    placeholder="Your full name"
                    required
                />

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
                    required
                />

                <AuthInput
                    id="password"
                    type="password"
                    label="Password"
                    name="password"
                    value={data.password}
                    autoComplete="new-password"
                    onChange={(e) => setData('password', e.target.value)}
                    error={errors.password}
                    placeholder="Create a password"
                    required
                />

                {data.password.length > 0 && data.password.length < 8 && (
                    <p style={{ margin: '-8px 0 8px', fontSize: 12, color: 'var(--as-warning)' }}>
                        Use at least 8 characters for a strong password.
                    </p>
                )}

                <AuthInput
                    id="password_confirmation"
                    type="password"
                    label="Confirm password"
                    name="password_confirmation"
                    value={data.password_confirmation}
                    autoComplete="new-password"
                    onChange={(e) => {
                        setData('password_confirmation', e.target.value);
                        if (confirmError) setConfirmError('');
                    }}
                    error={errors.password_confirmation || confirmError}
                    placeholder="Re-enter your password"
                    required
                />

                <button
                    type="submit"
                    className={'auth-submit' + (processing ? ' auth-submit--loading' : '')}
                    disabled={processing}
                >
                    {processing ? 'Creating account…' : 'Create account'}
                </button>
            </form>
        </AuthLayout>
    );
}

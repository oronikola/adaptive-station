import AuthInput from '@/Components/AuthInput';
import AuthLayout from '@/Layouts/AuthLayout';
import { useForm } from '@inertiajs/react';

interface ForgotPasswordProps {
    status?: string;
}

export default function ForgotPassword({ status }: ForgotPasswordProps) {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();

        post(route('password.email'));
    };

    return (
        <AuthLayout
            title="Forgot Password"
            eyebrow="ACCOUNT RECOVERY"
            heading="Reset access, fast."
            caption="We'll email you a secure link to choose a new password."
            formHeading="Forgot your password?"
            formSubheading="No problem. Enter your email and we'll send you a password reset link."
            status={status}
            topbarPrompt="Remember your password?"
            topbarLinkText="Sign in"
            topbarLinkHref={route('login')}
        >
            <form onSubmit={submit} className="auth-login-form" noValidate>
                <AuthInput
                    id="email"
                    type="email"
                    label="Email"
                    name="email"
                    value={data.email}
                    autoComplete="username"
                    autoFocus
                    onChange={(e) => setData('email', e.target.value)}
                    error={errors.email}
                    placeholder="you@company.com"
                />

                <button type="submit" className="auth-submit" disabled={processing}>
                    {processing ? 'Sending link…' : 'Email password reset link'}
                </button>
            </form>
        </AuthLayout>
    );
}

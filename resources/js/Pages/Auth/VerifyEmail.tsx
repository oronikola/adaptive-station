import AuthLayout from '@/Layouts/AuthLayout';
import { Link, useForm } from '@inertiajs/react';

interface VerifyEmailProps {
    status?: string;
}

export default function VerifyEmail({ status }: VerifyEmailProps) {
    const { post, processing } = useForm({});

    const submit = (e: React.FormEvent) => {
        e.preventDefault();

        post(route('verification.send'));
    };

    return (
        <AuthLayout
            title="Email Verification"
            eyebrow="ALMOST THERE"
            heading="Verify your email."
            caption="Confirm your address to unlock full access to your workspace."
            formHeading="Verify your email"
            status={
                status === 'verification-link-sent'
                    ? 'A new verification link has been sent to the email address you provided during registration.'
                    : undefined
            }
        >
            <p className="auth-helper-text">
                Thanks for signing up! Before getting started, could you verify your email address by clicking on the
                link we just emailed to you? If you didn't receive the email, we will gladly send you another.
            </p>

            <form onSubmit={submit} noValidate>
                <div className="auth-form-actions">
                    <button type="submit" className="auth-submit" disabled={processing}>
                        {processing ? 'Sending…' : 'Resend verification email'}
                    </button>

                    <Link href={route('logout')} method="post" as="button" className="auth-text-link">
                        Log out
                    </Link>
                </div>
            </form>
        </AuthLayout>
    );
}

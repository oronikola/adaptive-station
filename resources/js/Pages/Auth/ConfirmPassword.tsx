import AuthInput from '@/Components/AuthInput';
import AuthLayout from '@/Layouts/AuthLayout';
import { useForm } from '@inertiajs/react';

export default function ConfirmPassword() {
    const { data, setData, post, processing, errors, reset } = useForm({
        password: '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();

        post(route('password.confirm'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <AuthLayout
            title="Confirm Password"
            eyebrow="SECURE AREA"
            heading="Confirm it's you."
            caption="This is a protected part of the workspace — confirm your password to continue."
            formHeading="Confirm your password"
            formSubheading="This is a secure area of the application. Please confirm your password before continuing."
        >
            <form onSubmit={submit} className="auth-login-form" noValidate>
                <AuthInput
                    id="password"
                    type="password"
                    label="Password"
                    name="password"
                    value={data.password}
                    autoComplete="current-password"
                    autoFocus
                    onChange={(e) => setData('password', e.target.value)}
                    error={errors.password}
                    placeholder="Enter your password"
                />

                <button type="submit" className="auth-submit" disabled={processing}>
                    {processing ? 'Confirming…' : 'Confirm'}
                </button>
            </form>
        </AuthLayout>
    );
}

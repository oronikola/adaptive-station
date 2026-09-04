import InputError from '@/Components/InputError';
import StationLogo from '@/Components/StationLogo';
import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';
import '../../../css/login.css';

interface EyeIconProps {
    isVisible: boolean;
}

function EyeIcon({ isVisible }: EyeIconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
            <circle cx="12" cy="12" r="2.5" />
            {isVisible && <path d="m4 4 16 16" />}
        </svg>
    );
}

function TapIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M8.5 8.5a5 5 0 0 1 0 7M12 5a10 10 0 0 1 0 14M5 11a1.5 1.5 0 0 1 0 2" />
        </svg>
    );
}

interface LoginProps {
    status?: string;
    canResetPassword: boolean;
}

export default function Login({ status, canResetPassword }: LoginProps) {
    const [showPassword, setShowPassword] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (event: React.FormEvent) => {
        event.preventDefault();

        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <>
            <Head title="Sign in" />

            <main className="auth-login-page">
                <section className="auth-login-card">
                    <aside className="auth-login-showcase">
                        <Link href="/" className="auth-login-brand">
                            <span className="station-logo">
                                <StationLogo />
                            </span>
                            <span>Adaptive Station</span>
                        </Link>

                        <div className="auth-showcase-content">
                            <p className="auth-eyebrow">SMARTER TIME, ONE TAP AWAY</p>
                            <h2>Make every tap count.</h2>

                            <div className="auth-tap-visual" aria-hidden="true">
                                <div className="auth-tap-reader">
                                    <div className="auth-reader-topline">
                                        <span className="auth-reader-status">
                                            <i /> Ready to tap
                                        </span>
                                        <span>08:01</span>
                                    </div>

                                    <div className="auth-reader-prompt">
                                        <span className="auth-reader-rings">
                                            <TapIcon />
                                        </span>
                                        <span>
                                            <strong>Hold your card</strong>
                                            <small>near the reader</small>
                                        </span>
                                    </div>

                                    <div className="auth-reader-footer">
                                        <span>ADAPTIVE STATION</span>
                                        <span>STATION 01</span>
                                    </div>
                                </div>

                                <div className="auth-student-card">
                                    <span className="auth-card-slot" />

                                    <div className="auth-student-brand">
                                        <span className="auth-school-mark">A</span>
                                        <span>
                                            <strong>ADAPTIVE STATION</strong>
                                            <small>STUDENT ID</small>
                                        </span>
                                    </div>

                                    <div className="auth-student-photo">
                                        <svg viewBox="0 0 48 48" fill="none">
                                            <circle cx="24" cy="18" r="8" />
                                            <path d="M10 42c1.6-9.2 6.3-14 14-14s12.4 4.8 14 14" />
                                        </svg>
                                    </div>

                                    <strong className="auth-student-name">Jordan Diaz</strong>
                                    <span className="auth-student-number">2026-0428</span>

                                    <div className="auth-student-footer">
                                        <span>BSIT · 1A</span>
                                        <TapIcon />
                                    </div>
                                </div>

                                <div className="auth-tap-confirmation">
                                    <span className="auth-confirmation-icon">
                                        <svg viewBox="0 0 20 20" fill="none">
                                            <path d="m5 10 3.2 3.2L15 6.8" />
                                        </svg>
                                    </span>
                                    <span>
                                        <strong>Tap recorded</strong>
                                        <small>Clock-in · 08:01 AM</small>
                                    </span>
                                    <b>ON TIME</b>
                                </div>
                            </div>
                        </div>

                        <p className="auth-showcase-caption">
                            Fast, accurate attendance records — from a single tap.
                        </p>
                    </aside>

                    <div className="auth-login-main">
                        <div className="auth-login-topbar">
                            <Link href="/" className="auth-mobile-brand" aria-label="Adaptive Station home">
                                <span className="station-logo">
                                    <StationLogo />
                                </span>
                            </Link>

                            <p>
                                New here?{' '}
                                <Link href={route('register')}>Request access</Link>
                            </p>
                        </div>

                        <div className="auth-form-wrap">
                            <div className="auth-form-heading">
                                <p className="auth-mobile-kicker">ADAPTIVE STATION · TAPPING SYSTEM</p>
                                <h1>Welcome back</h1>
                                <p>Enter your details to return to your workspace.</p>
                            </div>

                            {status && (
                                <div className="auth-status" role="status">
                                    {status}
                                </div>
                            )}

                            <form onSubmit={submit} className="auth-login-form" noValidate>
                                <div className="auth-field">
                                    <label htmlFor="email">Email</label>
                                    <input
                                        id="email"
                                        type="email"
                                        name="email"
                                        value={data.email}
                                        autoComplete="username"
                                        autoFocus
                                        onChange={(event) => setData('email', event.target.value)}
                                        aria-invalid={Boolean(errors.email)}
                                        aria-describedby={errors.email ? 'email-error' : undefined}
                                        placeholder="you@company.com"
                                    />
                                    <InputError id="email-error" message={errors.email} className="auth-field-error" />
                                </div>

                                <div className="auth-field">
                                    <div className="auth-label-row">
                                        <label htmlFor="password">Password</label>
                                        {canResetPassword && (
                                            <Link href={route('password.request')}>Forgot password?</Link>
                                        )}
                                    </div>

                                    <div className="auth-password-field">
                                        <input
                                            id="password"
                                            type={showPassword ? 'text' : 'password'}
                                            name="password"
                                            value={data.password}
                                            autoComplete="current-password"
                                            onChange={(event) => setData('password', event.target.value)}
                                            aria-invalid={Boolean(errors.password)}
                                            aria-describedby={errors.password ? 'password-error' : undefined}
                                            placeholder="Enter your password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword((isVisible) => !isVisible)}
                                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                                        >
                                            <EyeIcon isVisible={showPassword} />
                                        </button>
                                    </div>
                                    <InputError id="password-error" message={errors.password} className="auth-field-error" />
                                </div>

                                <label className="auth-remember">
                                    <input
                                        name="remember"
                                        type="checkbox"
                                        checked={data.remember}
                                        onChange={(event) => setData('remember', event.target.checked)}
                                    />
                                    <span>Keep me signed in</span>
                                </label>

                                <button type="submit" className="auth-submit" disabled={processing}>
                                    {processing ? 'Signing in…' : 'Sign in'}
                                </button>
                            </form>

                            <div className="auth-divider">
                                <span>or</span>
                            </div>

                            <div className="auth-secondary-actions">
                                <Link href="/" className="auth-secondary-button">
                                    <TapIcon />
                                    Open tapping station
                                </Link>
                                <Link href={route('register')} className="auth-secondary-button">
                                    Request a new account
                                </Link>
                            </div>
                        </div>

                        <div className="auth-login-footer">
                            <Link href="/">View system</Link>
                            <span aria-hidden="true">•</span>
                            <span>Protected workspace access</span>
                        </div>
                    </div>
                </section>
            </main>
        </>
    );
}

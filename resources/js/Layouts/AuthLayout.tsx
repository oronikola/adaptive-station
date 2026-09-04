import StationLogo from '@/Components/StationLogo';
import { Head, Link } from '@inertiajs/react';
import '../../css/login.css';

interface AuthLayoutProps {
    /** <Head title> for the page. */
    title: string;
    /** Small uppercase tagline shown above the showcase heading. */
    eyebrow: string;
    /** Large heading shown in the decorative showcase panel. */
    heading: string;
    /** Supporting caption at the bottom of the showcase panel. */
    caption: string;
    /** Main heading above the form. */
    formHeading: string;
    /** Supporting copy under the form heading. */
    formSubheading?: string;
    /** Success/info banner (e.g. "Reset link sent"). */
    status?: string;
    /** Prompt shown before the topbar link, e.g. "New here?" */
    topbarPrompt?: string;
    topbarLinkText?: string;
    topbarLinkHref?: string;
    /** Overrides the default footer links. */
    footer?: React.ReactNode;
    children: React.ReactNode;
}

/**
 * Shared visual shell for the Auth pages (sign in, register, password
 * reset/confirm, email verification). Mirrors Login.tsx's design: a
 * split card with a decorative showcase panel and the page's own form.
 */
export default function AuthLayout({
    title,
    eyebrow,
    heading,
    caption,
    formHeading,
    formSubheading,
    status,
    topbarPrompt,
    topbarLinkText,
    topbarLinkHref,
    footer,
    children,
}: AuthLayoutProps) {
    return (
        <>
            <Head title={title} />

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
                            <p className="auth-eyebrow">{eyebrow}</p>
                            <h2>{heading}</h2>
                        </div>

                        <p className="auth-showcase-caption">{caption}</p>
                    </aside>

                    <div className="auth-login-main">
                        <div className="auth-login-topbar">
                            <Link href="/" className="auth-mobile-brand" aria-label="Adaptive Station home">
                                <span className="station-logo">
                                    <StationLogo />
                                </span>
                            </Link>

                            {topbarPrompt && topbarLinkText && topbarLinkHref && (
                                <p>
                                    {topbarPrompt} <Link href={topbarLinkHref}>{topbarLinkText}</Link>
                                </p>
                            )}
                        </div>

                        <div className="auth-form-wrap">
                            <div className="auth-form-heading">
                                <p className="auth-mobile-kicker">ADAPTIVE STATION · TAPPING SYSTEM</p>
                                <h1>{formHeading}</h1>
                                {formSubheading && <p>{formSubheading}</p>}
                            </div>

                            {status && (
                                <div className="auth-status" role="status">
                                    {status}
                                </div>
                            )}

                            {children}
                        </div>

                        <div className="auth-login-footer">
                            {footer ?? (
                                <>
                                    <Link href="/">View system</Link>
                                    <span aria-hidden="true">•</span>
                                    <span>Protected workspace access</span>
                                </>
                            )}
                        </div>
                    </div>
                </section>
            </main>
        </>
    );
}

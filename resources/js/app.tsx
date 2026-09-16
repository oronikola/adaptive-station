import '../css/app.css';
import './bootstrap';

import { createInertiaApp, usePage, ResolvedComponent } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import React, { ReactNode } from 'react';
import { applicationLogoUrl } from '@/Components/Branding/ApplicationLogo';
import PageTransition, {
    isAppShellPage,
} from '@/Components/Navigation/PageTransition';
import { ThemeProvider } from '@/Components/Theme/ThemeProvider';
import { ToastProvider } from '@/Components/toast/ToastProvider';

import { CircleHelpIcon } from '@/Components/icons/circle-help';
const configuredAppName = import.meta.env.VITE_APP_NAME;
const appName =
    configuredAppName && configuredAppName !== 'Laravel'
        ? configuredAppName
        : 'Adaptive Station';

function setFavicon() {
    let favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');

    if (!favicon) {
        favicon = document.createElement('link');
        favicon.rel = 'icon';
        document.head.appendChild(favicon);
    }

    favicon.type = 'image/png';
    favicon.href = applicationLogoUrl;
}

/**
 * Persistent Inertia layout wrapper. Portal/platform screens animate
 * inside AppShell (sidebar stays put). Auth, landing, kiosk, and other
 * full-page views use the same fade/lift here.
 */
function RootPageTransition({ children }: { children: ReactNode }) {
    const { component } = usePage();

    if (isAppShellPage(component)) {
        return <>{children}</>;
    }

    return <PageTransition>{children}</PageTransition>;
}

const withPageTransition = (page: ReactNode) => (
    <RootPageTransition>{page}</RootPageTransition>
);

interface ErrorBoundaryProps {
    children: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('Unhandled application error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 font-sans dark:bg-slate-900">
                    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg dark:border-slate-800 dark:bg-slate-950">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                            <CircleHelpIcon size={28} />
                        </div>
                        <h2 className="mt-5 text-xl font-bold text-slate-900 dark:text-white">
                            Unable to display this view
                        </h2>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                            A transient rendering error occurred. You can reload or return to the sign-in screen.
                        </p>
                        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
                            <button
                                type="button"
                                onClick={() => {
                                    window.location.href = '/login';
                                }}
                                className="inline-flex items-center justify-center rounded-xl bg-[#234ef4] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1b36c8] focus:outline-none focus:ring-2 focus:ring-[#234ef4]"
                            >
                                Go to Sign In
                            </button>
                            <button
                                type="button"
                                onClick={() => window.location.reload()}
                                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                            >
                                Reload
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

createInertiaApp({
    title: (title: string) => `${title} - ${appName}`,
    resolve: async (name: string) => {
        const module = (await resolvePageComponent(
            `./Pages/${name}.tsx`,
            import.meta.glob('./Pages/**/*.tsx'),
        )) as { default: ResolvedComponent };

        module.default.layout = withPageTransition;

        return module;
    },
    setup({ el, App, props }) {
        setFavicon();

        const root = createRoot(el);

        // ThemeProvider sits above everything so the `.dark` class it
        // manages (see Components/Theme/ThemeProvider.tsx) is already
        // correct before ErrorBoundary, ToastProvider, or any page mounts.
        // ToastProvider itself lives above the Inertia page swap so toasts
        // persist across navigations (e.g. a create action that redirects).
        // See Components/Toast/ToastProvider.tsx for the useToast() usage.
        root.render(
            <ThemeProvider>
                <ErrorBoundary>
                    <ToastProvider>
                        <App {...props} />
                    </ToastProvider>
                </ErrorBoundary>
            </ThemeProvider>,
        );
    },
    progress: {
        color: '#4B5563',
    },
});

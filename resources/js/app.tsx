import '../css/app.css';
import './bootstrap';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { applicationLogoUrl } from '@/Components/Branding/ApplicationLogo';
import { ThemeProvider } from '@/Components/Theme/ThemeProvider';
import { ToastProvider } from '@/Components/toast/ToastProvider';

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

createInertiaApp({
    title: (title: string) => `${title} - ${appName}`,
    resolve: (name: string) =>
        resolvePageComponent(
            `./Pages/${name}.tsx`,
            import.meta.glob('./Pages/**/*.tsx'),
        ),
    setup({ el, App, props }) {
        setFavicon();

        const root = createRoot(el);

        // ThemeProvider sits above everything so the `.dark` class it
        // manages (see Components/Theme/ThemeProvider.tsx) is already
        // correct before ToastProvider or any page mounts. ToastProvider
        // itself lives above the Inertia page swap so toasts persist
        // across navigations (e.g. a create action that redirects). See
        // Components/Toast/ToastProvider.tsx for the useToast() usage.
        root.render(
            <ThemeProvider>
                <ToastProvider>
                    <App {...props} />
                </ToastProvider>
            </ThemeProvider>,
        );
    },
    progress: {
        color: '#4B5563',
    },
});

import '../css/app.css';
import './bootstrap';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { applicationLogoUrl } from '@/Components/Branding/ApplicationLogo';
import { ToastProvider } from '@/Components/Toast/ToastProvider';

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

        // ToastProvider lives above the Inertia page swap so toasts persist
        // across navigations (e.g. a create action that redirects). See
        // Components/Toast/ToastProvider.tsx for the useToast() usage.
        root.render(
            <ToastProvider>
                <App {...props} />
            </ToastProvider>,
        );
    },
    progress: {
        color: '#4B5563',
    },
});

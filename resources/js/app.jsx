import '../css/app.css';
import './bootstrap';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { ToastProvider } from '@/Components/toast/ToastProvider';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.jsx`,
            import.meta.glob('./Pages/**/*.jsx'),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);

        // ToastProvider lives above the Inertia page swap so toasts persist
        // across navigations (e.g. a create action that redirects). See
        // Components/toast/ToastProvider.jsx for the useToast() usage.
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

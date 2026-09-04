import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
    // The app has no dark-mode toggle anywhere — `dark:` utilities were
    // activating off the visitor's OS color-scheme preference (Tailwind's
    // default 'media' strategy), which clashed with the light-only pf-*
    // design system (no `.dark` class is ever applied, so `class` strategy
    // makes `dark:` utilities permanently inert until a real toggle exists).
    darkMode: 'class',
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.tsx',
    ],

    theme: {
        extend: {
            colors: {
                station: {
                    canvas: '#f4f7fd',
                    panel: '#edf3fc',
                    line: '#dbe3ef',
                    muted: '#64748b',
                    ink: '#0f172a',
                    navy: '#071c44',
                    'navy-soft': '#0b2a5b',
                    blue: '#174a96',
                    'blue-bright': '#2863bd',
                    success: '#188352',
                    'success-soft': '#e3f6ea',
                    warning: '#c1791f',
                    'warning-soft': '#fdf1e0',
                },
            },
            fontFamily: {
                sans: ['Figtree', ...defaultTheme.fontFamily.sans],
            },
            boxShadow: {
                'station-float': '0 30px 70px -42px rgba(7, 28, 68, 0.58)',
            },
            keyframes: {
                'capability-marquee': {
                    from: { transform: 'translateX(0)' },
                    to: { transform: 'translateX(-50%)' },
                },
                'signal-pulse': {
                    '0%, 100%': { opacity: '0.45', transform: 'scale(0.92)' },
                    '50%': { opacity: '1', transform: 'scale(1)' },
                },
            },
            animation: {
                'capability-marquee': 'capability-marquee 30s linear infinite',
                'signal-pulse': 'signal-pulse 2.4s ease-in-out infinite',
            },
        },
    },

    plugins: [forms],
};

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
                    canvas: '#f4f6f9',
                    panel: '#f1f5f9',
                    line: '#e2e8f0',
                    muted: '#64748b',
                    ink: '#0f172a',
                    navy: '#1e293b',
                    'navy-soft': '#334155',
                    blue: '#475569',
                    'blue-bright': '#64748b',
                    success: '#188352',
                    'success-soft': '#e3f6ea',
                    warning: '#c1791f',
                    'warning-soft': '#fdf1e0',
                },
                royal: {
                    DEFAULT: '#234EF4',
                    deep: '#1B36C8',
                    ink: '#0A1B73',
                    sky: '#9DB4FF',
                    mist: '#D5DEFF',
                    mint: '#8FF0C6',
                },
            },
            fontFamily: {
                sans: ['Plus Jakarta Sans', ...defaultTheme.fontFamily.sans],
                display: ['Plus Jakarta Sans', 'Inter', ...defaultTheme.fontFamily.sans],
                mono: ['JetBrains Mono', ...defaultTheme.fontFamily.mono],
            },
            boxShadow: {
                'station-float': '0 30px 70px -42px rgba(15, 23, 42, 0.45)',
                'card-blue':
                    'inset 0 1px 0 0 rgba(255, 255, 255, 0.9), inset 0 -1px 0 0 rgba(15, 23, 42, 0.03), 0 6px 18px -6px rgba(10, 27, 115, 0.22)',
                'station-header':
                    '0 1px 2px rgba(7, 28, 68, 0.08), 0 10px 26px -12px rgba(7, 28, 68, 0.28), 0 20px 48px -20px rgba(7, 28, 68, 0.16)',
                'station-header-scrolled':
                    '0 2px 4px rgba(7, 28, 68, 0.08), 0 14px 34px -14px rgba(7, 28, 68, 0.36), 0 26px 56px -24px rgba(7, 28, 68, 0.22)',
            },
            keyframes: {
                'header-enter': {
                    from: { opacity: '0', transform: 'translateY(-16px) scale(0.96)' },
                    to: { opacity: '1', transform: 'translateY(0) scale(1)' },
                },
                'capability-marquee': {
                    from: { transform: 'translateX(0)' },
                    to: { transform: 'translateX(-50%)' },
                },
                'signal-pulse': {
                    '0%, 100%': { opacity: '0.45', transform: 'scale(0.92)' },
                    '50%': { opacity: '1', transform: 'scale(1)' },
                },
                'float-soft': {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-4px)' },
                },
                'texture-pan': {
                    from: { 'background-position': '0 0' },
                    to: { 'background-position': '70px 0' },
                },
            },
            animation: {
                'header-enter': 'header-enter 0.7s cubic-bezier(0.23, 1, 0.32, 1) backwards',
                'texture-pan': 'texture-pan 18s linear infinite',
                'capability-marquee': 'capability-marquee 30s linear infinite',
                'signal-pulse': 'signal-pulse 2.4s ease-in-out infinite',
                'float-soft': 'float-soft 4s ease-in-out infinite',
            },
        },
    },

    plugins: [forms],
};

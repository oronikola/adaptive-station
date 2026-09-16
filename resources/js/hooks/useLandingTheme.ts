import { useCallback, useState } from 'react';

export type LandingTheme = 'dark' | 'light';

const STORAGE_KEY = 'adaptive-station-landing-theme';

function readStoredTheme(): LandingTheme {
    if (typeof window === 'undefined') {
        return 'dark';
    }

    try {
        const requested = new URLSearchParams(window.location.search).get('theme');

        if (requested === 'light' || requested === 'dark') {
            return requested;
        }

        return window.localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark';
    } catch {
        return 'dark';
    }
}

export function useLandingTheme(): {
    theme: LandingTheme;
    toggleTheme: () => void;
} {
    const [theme, setTheme] = useState<LandingTheme>(readStoredTheme);

    const toggleTheme = useCallback(() => {
        setTheme((current) => {
            const next = current === 'dark' ? 'light' : 'dark';

            try {
                window.localStorage.setItem(STORAGE_KEY, next);
            } catch {
                // Private mode and quota errors should not block the toggle.
            }

            return next;
        });
    }, []);

    return { theme, toggleTheme };
}

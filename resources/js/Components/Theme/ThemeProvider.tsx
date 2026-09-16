import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
}

const THEME_STORAGE_KEY = 'as-theme';
const ThemeContext = createContext<ThemeContextType | null>(null);

function getSystemTheme(): Theme {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
}

/** Reads the persisted theme synchronously so the first render already
 * matches what the anti-FOUC inline script in resources/views/app.blade.php
 * set on <html> before hydration — keep the storage key ('as-theme') and
 * fallback logic in sync between both places. */
function readStoredTheme(): Theme {
    try {
        const stored = localStorage.getItem(THEME_STORAGE_KEY);
        if (stored === 'light' || stored === 'dark') {
            return stored;
        }
    } catch {
        // Private browsing / storage disabled — fall through to system pref.
    }
    return getSystemTheme();
}

/** Global theme state mounted once above the Inertia page swap, alongside
 * ToastProvider. Drives the `.dark` class on <html> that every --as-* token
 * (resources/css/app.css) and Tailwind `dark:` utility keys off (see
 * darkMode: 'class' in tailwind.config.js). */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>(readStoredTheme);

    useEffect(() => {
        const root = document.documentElement;

        // Briefly enable the global theme-transition rule (see app.css)
        // so this toggle animates, then remove it — keeping the rule off
        // the rest of the time avoids it fighting hover/route transitions.
        root.classList.add('theme-transition');
        root.classList.toggle('dark', theme === 'dark');
        const timeout = window.setTimeout(() => {
            root.classList.remove('theme-transition');
        }, 360);

        try {
            localStorage.setItem(THEME_STORAGE_KEY, theme);
        } catch {
            // Storage disabled — theme still applies for this session.
        }

        return () => window.clearTimeout(timeout);
    }, [theme]);

    // Follow the OS preference live only while the user has never made an
    // explicit choice (no stored key yet).
    useEffect(() => {
        let hasStoredPreference = false;
        try {
            hasStoredPreference = localStorage.getItem(THEME_STORAGE_KEY) !== null;
        } catch {
            hasStoredPreference = false;
        }
        if (hasStoredPreference) {
            return;
        }

        const media = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (event: MediaQueryListEvent) => {
            setThemeState(event.matches ? 'dark' : 'light');
        };
        media.addEventListener('change', handleChange);
        return () => media.removeEventListener('change', handleChange);
    }, []);

    const setTheme = useCallback((next: Theme) => setThemeState(next), []);
    const toggleTheme = useCallback(() => {
        setThemeState((current) => (current === 'dark' ? 'light' : 'dark'));
    }, []);

    const value = useMemo(
        () => ({ theme, setTheme, toggleTheme }),
        [theme, setTheme, toggleTheme],
    );

    return (
        <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
    );
}

export function useTheme(): ThemeContextType {
    const context = useContext(ThemeContext);

    if (!context) {
        throw new Error('useTheme() must be used within <ThemeProvider>.');
    }

    return context;
}

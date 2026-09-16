import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
}

const THEME_STORAGE_KEY = 'as-theme';

/** Matches the `theme-snapshot-out` / `.theme-transition` timings in
 * resources/css/app.css. Keep the three in sync. */
const TRANSITION_MS = 280;

const ThemeContext = createContext<ThemeContextType | null>(null);

function prefersReducedMotion(): boolean {
    return (
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    );
}

function getSystemTheme(): Theme {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
}

function readStoredTheme(): Theme | null {
    try {
        const stored = localStorage.getItem(THEME_STORAGE_KEY);

        return stored === 'light' || stored === 'dark' ? stored : null;
    } catch {
        // Private browsing / storage disabled.
        return null;
    }
}

/** Reads the persisted theme synchronously so the first render already
 * matches what the anti-FOUC inline script in resources/views/app.blade.php
 * set on <html> before hydration — keep the storage key ('as-theme') and
 * fallback logic in sync between both places. */
function resolveInitialTheme(): Theme {
    return readStoredTheme() ?? getSystemTheme();
}

/** The single mutation that defines the theme. Everything else in this file
 * exists only to decide *how* to animate around this call. */
function applyThemeToDocument(theme: Theme): void {
    document.documentElement.classList.toggle('dark', theme === 'dark');
}

/** Global theme state mounted once above the Inertia page swap, alongside
 * ToastProvider. Drives the `.dark` class on <html> that every --as-* token
 * (resources/css/app.css) and Tailwind `dark:` utility keys off (see
 * darkMode: 'class' in tailwind.config.js). */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>(resolveInitialTheme);

    /** True once the user has picked a theme explicitly. Captured from
     * storage at mount — before this provider ever writes the key itself —
     * so the "follow the OS live" listener below stays armed for visitors
     * who have never toggled. (Previously the provider persisted on every
     * render, which set the key on first paint and permanently disabled
     * OS-preference following.) */
    const hasExplicitPreference = useRef(readStoredTheme() !== null);

    /** The blade script already put the right class on <html> before first
     * paint, so the initial pass must not animate anything. */
    const isFirstApply = useRef(true);

    const cleanupTimeout = useRef<number | undefined>(undefined);

    useLayoutEffect(() => {
        const root = document.documentElement;

        if (isFirstApply.current) {
            isFirstApply.current = false;
            applyThemeToDocument(theme);

            return;
        }

        if (prefersReducedMotion()) {
            applyThemeToDocument(theme);

            return;
        }

        // Preferred path: one composited cross-fade of the whole document.
        // Gradients, shadows, backdrop-filter panels and native scrollbars
        // all change in the same frame instead of racing each other.
        // (The lib types this as always present; older browsers do not have it.)
        if (typeof document.startViewTransition === 'function') {
            document.startViewTransition(() => applyThemeToDocument(theme));

            return;
        }

        // Fallback: per-element color transitions. The class has to land in
        // its own style resolution *before* the palette flips, otherwise the
        // before-change style has no transition-property and Safari/WebKit
        // snap instead of interpolating.
        window.clearTimeout(cleanupTimeout.current);
        root.classList.add('theme-transition');
        void root.offsetWidth;
        applyThemeToDocument(theme);

        cleanupTimeout.current = window.setTimeout(() => {
            root.classList.remove('theme-transition');
        }, TRANSITION_MS + 40);
    }, [theme]);

    useEffect(
        () => () => window.clearTimeout(cleanupTimeout.current),
        [],
    );

    // Follow the OS preference live only while the user has never made an
    // explicit choice.
    useEffect(() => {
        const media = window.matchMedia?.('(prefers-color-scheme: dark)');

        if (!media) {
            return;
        }

        const handleChange = (event: MediaQueryListEvent) => {
            if (hasExplicitPreference.current) {
                return;
            }

            setThemeState(event.matches ? 'dark' : 'light');
        };

        media.addEventListener('change', handleChange);

        return () => media.removeEventListener('change', handleChange);
    }, []);

    // Keep every open tab in step when the choice changes in one of them.
    useEffect(() => {
        const handleStorage = (event: StorageEvent) => {
            if (event.key !== THEME_STORAGE_KEY) {
                return;
            }

            hasExplicitPreference.current = event.newValue !== null;
            setThemeState(
                event.newValue === 'light' || event.newValue === 'dark'
                    ? event.newValue
                    : getSystemTheme(),
            );
        };

        window.addEventListener('storage', handleStorage);

        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    /** Persisting only here — rather than in the apply effect — is what keeps
     * an untouched visitor tracking their OS setting. */
    const persistTheme = useCallback((next: Theme) => {
        hasExplicitPreference.current = true;

        try {
            localStorage.setItem(THEME_STORAGE_KEY, next);
        } catch {
            // Storage disabled — theme still applies for this session.
        }
    }, []);

    const setTheme = useCallback(
        (next: Theme) => {
            persistTheme(next);
            setThemeState(next);
        },
        [persistTheme],
    );

    const toggleTheme = useCallback(() => {
        setThemeState((current) => {
            const next: Theme = current === 'dark' ? 'light' : 'dark';
            persistTheme(next);

            return next;
        });
    }, [persistTheme]);

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

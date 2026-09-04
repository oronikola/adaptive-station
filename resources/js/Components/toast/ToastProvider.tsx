import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ShowToastOptions, ToastType } from '@/types';
import '../../../css/toast.css';

/**
 * Global toast/snackbar system.
 *
 * `<ToastProvider>` is mounted once in resources/js/app.jsx, above the
 * Inertia page swap, so toasts survive page navigations and any
 * screen/component in the app can trigger one without importing or
 * rendering anything extra.
 *
 * Usage from any component:
 *
 *   import { useToast } from '@/Components/toast/ToastProvider';
 *
 *   const { showToast } = useToast();
 *   showToast({ type: 'success', message: 'Tenant created successfully' });
 *
 * Available `type`s (color + icon are chosen automatically):
 *   - 'success' — a create action completed (green)
 *   - 'update'  — an edit/save/status-change completed (blue)
 *   - 'delete'  — a delete/deactivate completed (amber — see note below)
 *   - 'error'   — a create/read/update/delete action failed (red)
 *   - 'info'    — anything else worth surfacing that isn't a CRUD result (gray)
 *
 * Why delete is amber, not red: red is reserved exclusively for `error` so
 * "something went wrong" always reads unambiguously. A delete that
 * succeeded is an expected, intentional outcome — amber flags it as
 * "notable/irreversible" without making a successful action look like a
 * failure.
 *
 * Optional second key: `description` for a secondary line, and `duration`
 * (ms) to override the default auto-dismiss timeout.
 *
 * Automatic flash toasts: any controller that already does
 * `->with('success', '...')` or `->with('error', '...')` (see
 * HandleInertiaRequests) gets a toast for free on the next page it
 * renders — AppShell.jsx watches those flash props and calls showToast()
 * for you. Reach for a manual showToast() call instead when you need an
 * exact type (create vs. update vs. delete) or when the feedback happens
 * without a full page visit (e.g. a failed client-side validation).
 */

interface ToastContextType {
    showToast: (options?: ShowToastOptions) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

const DEFAULT_DURATION = 4500;
const MAX_VISIBLE_TOASTS = 4;
const EXIT_ANIMATION_MS = 200;

const ICONS: Record<ToastType, React.ReactNode> = {
    success: (
        <svg viewBox="0 0 24 24">
            <path d="m5 12 4.5 4.5L19 7" />
        </svg>
    ),
    update: (
        <svg viewBox="0 0 24 24">
            <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
    ),
    delete: (
        <svg viewBox="0 0 24 24">
            <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" />
        </svg>
    ),
    error: (
        <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5M12 16h.01" />
        </svg>
    ),
    info: (
        <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 10.5v5.5M12 7.5h.01" />
        </svg>
    ),
};

const CLOSE_ICON = (
    <svg viewBox="0 0 24 24">
        <path d="M6 18L18 6M6 6l12 12" />
    </svg>
);

/**
 * Best-effort classification of a generic server flash message into a
 * toast type, used only for the automatic flash → toast wiring (see
 * AppShell.jsx) since `flash.success` doesn't carry an action type. Screens
 * calling showToast() directly should always pass an explicit `type`
 * instead of relying on this.
 */
export function classifyFlashMessage(message: string): ToastType {
    if (/delete|deactivat|revok|remov|suspend/i.test(message)) {
        return 'delete';
    }

    if (/updat|sav|configur|reactivat|issu|assign|replac|reset/i.test(message)) {
        return 'update';
    }

    return 'success';
}

interface ToastItemData {
    id: number;
    type: ToastType;
    message: string;
    description?: string;
    duration: number;
}

function ToastItem({ toast, onDismiss }: { toast: ToastItemData; onDismiss: (id: number) => void }) {
    const [visible, setVisible] = useState(false);
    const [leaving, setLeaving] = useState(false);
    const timeoutRef = useRef<number | undefined>(undefined);
    const remainingRef = useRef(toast.duration);
    const startedAtRef = useRef<number | undefined>(undefined);

    const startTimer = useCallback((duration: number) => {
        startedAtRef.current = Date.now();
        timeoutRef.current = window.setTimeout(() => {
            setLeaving(true);
            window.setTimeout(() => onDismiss(toast.id), EXIT_ANIMATION_MS);
        }, duration);
    }, [onDismiss, toast.id]);

    useEffect(() => {
        // Mount animation: flip to visible on the next frame.
        const frame = window.requestAnimationFrame(() => setVisible(true));
        startTimer(remainingRef.current);

        return () => {
            window.cancelAnimationFrame(frame);
            window.clearTimeout(timeoutRef.current ?? undefined);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function pause() {
        if (!timeoutRef.current) {
            return;
        }
        window.clearTimeout(timeoutRef.current ?? undefined);
        timeoutRef.current = undefined;
        remainingRef.current = Math.max(
            remainingRef.current - (Date.now() - startedAtRef.current!),
            600,
        );
    }

    function resume() {
        if (timeoutRef.current || leaving) {
            return;
        }
        startTimer(remainingRef.current);
    }

    function close() {
        window.clearTimeout(timeoutRef.current ?? undefined);
        setLeaving(true);
        window.setTimeout(() => onDismiss(toast.id), EXIT_ANIMATION_MS);
    }

    return (
        <div
            className={
                'pf-toast pf-toast--' +
                toast.type +
                (visible && !leaving ? ' pf-toast--visible' : '') +
                (leaving ? ' pf-toast--leaving' : '')
            }
            role={toast.type === 'error' ? 'alert' : 'status'}
            aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
            onMouseEnter={pause}
            onMouseLeave={resume}
        >
            <span className="pf-toast-icon">{ICONS[toast.type] ?? ICONS.info}</span>
            <div className="pf-toast-body">
                <p className="pf-toast-message">{toast.message}</p>
                {toast.description && (
                    <p className="pf-toast-description">{toast.description}</p>
                )}
            </div>
            <button
                type="button"
                className="pf-toast-close"
                onClick={close}
                aria-label="Dismiss notification"
            >
                {CLOSE_ICON}
            </button>
        </div>
    );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<ToastItemData[]>([]);
    const idRef = useRef(0);

    const dismissToast = useCallback((id: number) => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
    }, []);

    const showToast = useCallback(({ type = 'info', message, description, duration }: ShowToastOptions = { message: '' }) => {
        if (!message) {
            return;
        }

        idRef.current += 1;
        const toast: ToastItemData = {
            id: idRef.current,
            type: ICONS[type] ? type : 'info',
            message,
            description,
            duration: duration ?? DEFAULT_DURATION,
        };

        setToasts((current) => [...current.slice(-(MAX_VISIBLE_TOASTS - 1)), toast]);
    }, []);

    const value = useMemo(() => ({ showToast }), [showToast]);

    return (
        <ToastContext.Provider value={value}>
            {children}
            <div className="pf-toast-viewport">
                {toasts.map((toast) => (
                    <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast(): ToastContextType {
    const context = useContext(ToastContext);

    if (!context) {
        throw new Error('useToast() must be used within <ToastProvider>.');
    }

    return context;
}

import ToastItem, {
    isToastType,
    ToastItemData,
} from '@/Components/toast/ToastItem';
import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useRef,
    useState,
} from 'react';
import { ShowToastOptions, ToastType } from '@/types';
import '../../../css/components/toast.css';

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

/** Global toast state mounted once above the Inertia page swap. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<ToastItemData[]>([]);
    const idRef = useRef(0);

    const dismissToast = useCallback((id: number) => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
    }, []);

    const showToast = useCallback(
        ({
            type = 'info',
            message,
            description,
            duration,
        }: ShowToastOptions = { message: '' }) => {
            if (!message) {
                return;
            }

            idRef.current += 1;
            const toast: ToastItemData = {
                id: idRef.current,
                type: isToastType(type) ? type : 'info',
                message,
                description,
                duration: duration ?? DEFAULT_DURATION,
            };

            setToasts((current) => [
                ...current.slice(-(MAX_VISIBLE_TOASTS - 1)),
                toast,
            ]);
        },
        [],
    );

    const value = useMemo(() => ({ showToast }), [showToast]);

    return (
        <ToastContext.Provider value={value}>
            {children}
            <div className="pf-toast-viewport">
                {toasts.map((toast) => (
                    <ToastItem
                        key={toast.id}
                        toast={toast}
                        onDismiss={dismissToast}
                    />
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

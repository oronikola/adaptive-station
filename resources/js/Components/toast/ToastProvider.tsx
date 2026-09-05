import ToastItem, {
    isToastType,
    ToastItemData,
} from '@/Components/Toast/ToastItem';
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

interface ToastContextType {
    showToast: (options?: ShowToastOptions) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);
const DEFAULT_DURATION = 4500;
const MAX_VISIBLE_TOASTS = 4;

/** Classifies server flash messages for automatic toast presentation. */
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

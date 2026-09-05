import { useCallback, useEffect, useRef, useState } from 'react';
import { ToastType } from '@/types';

export interface ToastItemData {
    id: number;
    type: ToastType;
    message: string;
    description?: string;
    duration: number;
}

const EXIT_ANIMATION_MS = 200;

const icons: Record<ToastType, React.ReactNode> = {
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

const closeIcon = (
    <svg viewBox="0 0 24 24">
        <path d="M6 18L18 6M6 6l12 12" />
    </svg>
);

export function isToastType(type: ToastType): boolean {
    return type in icons;
}

export default function ToastItem({
    toast,
    onDismiss,
}: {
    toast: ToastItemData;
    onDismiss: (id: number) => void;
}) {
    const [visible, setVisible] = useState(false);
    const [leaving, setLeaving] = useState(false);
    const timeoutRef = useRef<number | undefined>(undefined);
    const remainingRef = useRef(toast.duration);
    const startedAtRef = useRef<number | undefined>(undefined);

    const startTimer = useCallback(
        (duration: number) => {
            startedAtRef.current = Date.now();
            timeoutRef.current = window.setTimeout(() => {
                setLeaving(true);
                window.setTimeout(
                    () => onDismiss(toast.id),
                    EXIT_ANIMATION_MS,
                );
            }, duration);
        },
        [onDismiss, toast.id],
    );

    useEffect(() => {
        const frame = window.requestAnimationFrame(() => setVisible(true));
        startTimer(remainingRef.current);

        return () => {
            window.cancelAnimationFrame(frame);
            window.clearTimeout(timeoutRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function pause() {
        if (!timeoutRef.current) {
            return;
        }

        window.clearTimeout(timeoutRef.current);
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
        window.clearTimeout(timeoutRef.current);
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
            <span className="pf-toast-icon">{icons[toast.type]}</span>
            <div className="pf-toast-body">
                <p className="pf-toast-message">{toast.message}</p>
                {toast.description && (
                    <p className="pf-toast-description">
                        {toast.description}
                    </p>
                )}
            </div>
            <button
                type="button"
                className="pf-toast-close"
                onClick={close}
                aria-label="Dismiss notification"
            >
                {closeIcon}
            </button>
        </div>
    );
}

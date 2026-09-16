import { BadgeAlertIcon } from '@/Components/icons/badge-alert';
import { CheckIcon } from '@/Components/icons/check';
import { CircleHelpIcon } from '@/Components/icons/circle-help';
import { DeleteIcon } from '@/Components/icons/delete';
import { SquarePenIcon } from '@/Components/icons/square-pen';
import { XIcon } from '@/Components/icons/x';
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
    success: <CheckIcon size={18} />,
    update: <SquarePenIcon size={18} />,
    delete: <DeleteIcon size={18} />,
    error: <BadgeAlertIcon size={18} />,
    info: <CircleHelpIcon size={18} />,
};

const closeIcon = <XIcon size={16} />;

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

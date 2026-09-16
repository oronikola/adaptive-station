import { usePage } from '@inertiajs/react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ReactNode } from 'react';

interface PageTransitionProps {
    children: ReactNode;
    className?: string;
    /** When false, play the enter fade/lift on mount only (used inside
     * AppShell, which remounts with each Inertia page). */
    withExit?: boolean;
}

const ENTER_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/**
 * Inertia page-swap from 988106e: fade + 14px lift on enter, fade + 10px
 * rise on exit. Portal screens use enter-only inside AppShell so the
 * sidebar stays put; auth/landing/kiosk use the full enter/exit wrapper.
 */
export default function PageTransition({
    children,
    className = 'pf-page-transition',
    withExit = true,
}: PageTransitionProps) {
    const { url } = usePage();
    const reduceMotion = useReducedMotion();

    const initial = reduceMotion
        ? { opacity: 0 }
        : { opacity: 0, transform: 'translateY(14px)' };

    const animate = {
        opacity: 1,
        transform: 'translateY(0px)',
        transition: {
            duration: reduceMotion ? 0.16 : 0.32,
            ease: ENTER_EASE,
        },
    };

    const exit = {
        opacity: 0,
        transform: reduceMotion ? 'translateY(0px)' : 'translateY(-10px)',
        transition: {
            duration: 0.18,
            ease: ENTER_EASE,
        },
    };

    if (!withExit) {
        return (
            <motion.div className={className} initial={initial} animate={animate}>
                {children}
            </motion.div>
        );
    }

    return (
        <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
                key={url}
                className={className}
                initial={initial}
                animate={animate}
                exit={exit}
            >
                {children}
            </motion.div>
        </AnimatePresence>
    );
}

export function isAppShellPage(component: string): boolean {
    return (
        component.startsWith('Admin/') ||
        component.startsWith('Platform/') ||
        component.startsWith('Notifications/') ||
        component.startsWith('Profile/')
    );
}

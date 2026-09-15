import {
    Children,
    isValidElement,
    useCallback,
    useRef,
    type HTMLAttributes,
    type ReactNode,
} from 'react';
import { cn } from '@/lib/utils';

type ShiftPhase = 'in' | 'out';

function readTokenNumber(styles: CSSStyleDeclaration, name: string, fallback: number): number {
    const value = parseFloat(styles.getPropertyValue(name));

    return Number.isFinite(value) ? value : fallback;
}

function readTokenEase(styles: CSSStyleDeclaration, name: string, fallback: string): string {
    return styles.getPropertyValue(name).trim() || fallback;
}

function shouldAnimateHover(): boolean {
    return (
        window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
        !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
}

interface AvatarGroupProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
}

export default function AvatarGroup({ children, className, onMouseLeave, ...props }: AvatarGroupProps) {
    const rootRef = useRef<HTMLDivElement>(null);

    const setShifts = useCallback((activeIdx: number | null, phase: ShiftPhase) => {
        const root = rootRef.current;

        if (!root || !shouldAnimateHover()) {
            return;
        }

        const avatars = root.querySelectorAll<HTMLElement>('.t-avatar');
        const tokens = getComputedStyle(document.documentElement);
        const lift = readTokenNumber(tokens, '--avatar-lift', -4);
        const falloff = readTokenNumber(tokens, '--avatar-falloff', 0.45);
        const scale = readTokenNumber(tokens, '--avatar-scale', 1.05);
        const timingFunction =
            phase === 'out'
                ? readTokenEase(tokens, '--avatar-ease-out', 'cubic-bezier(0.34, 3.85, 0.64, 1)')
                : readTokenEase(tokens, '--avatar-ease-in', 'cubic-bezier(0.22, 1, 0.36, 1)');

        avatars.forEach((el, i) => {
            el.style.transitionTimingFunction = timingFunction;

            if (activeIdx === null) {
                el.style.setProperty('--shift', '0px');
                el.style.setProperty('--scale-active', '1');
                el.style.zIndex = '';
                return;
            }

            const distance = Math.abs(i - activeIdx);

            el.style.setProperty('--shift', `${(lift * Math.pow(falloff, distance)).toFixed(3)}px`);
            el.style.setProperty('--scale-active', i === activeIdx ? String(scale) : '1');
            el.style.zIndex = String(avatars.length - distance);
        });
    }, []);

    return (
        <div
            ref={rootRef}
            className={cn('t-avatar-group', className)}
            onMouseLeave={(event) => {
                setShifts(null, 'out');
                onMouseLeave?.(event);
            }}
            {...props}
        >
            {Children.map(children, (child, index) => {
                if (!isValidElement(child)) {
                    return child;
                }

                return (
                    <div
                        key={child.key ?? index}
                        className="t-avatar"
                        onMouseEnter={() => setShifts(index, 'in')}
                    >
                        {child}
                    </div>
                );
            })}
        </div>
    );
}

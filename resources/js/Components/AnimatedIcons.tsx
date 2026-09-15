import { forwardRef, useCallback, useImperativeHandle } from 'react';
import { motion, useAnimate } from 'framer-motion';

export interface AnimatedIconHandle {
    startAnimation: () => void;
    stopAnimation: () => void;
}

interface AnimatedIconProps {
    size?: number;
    className?: string;
}

/**
 * Tap signal waves that ripple outward on hover, triggered by the icon
 * itself or imperatively by a parent card. Path data from Reicon's Wifi
 * icon (MIT, https://reicon.dev), animated with the itshover pattern.
 */
export const TapWavesIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
    function TapWavesIcon({ size = 32, className = '' }, ref) {
        const [scope, animate] = useAnimate();

        const start = useCallback(() => {
            animate(
                '.tap-wave-1',
                { opacity: [1, 0.3, 1] },
                { duration: 0.6, ease: 'easeInOut' },
            );
            animate(
                '.tap-wave-2',
                { opacity: [1, 0.3, 1] },
                { duration: 0.6, ease: 'easeInOut', delay: 0.15 },
            );
            animate(
                '.tap-wave-3',
                { opacity: [1, 0.3, 1] },
                { duration: 0.6, ease: 'easeInOut', delay: 0.3 },
            );
        }, [animate]);

        const stop = useCallback(() => {
            animate(
                '.tap-wave-1, .tap-wave-2, .tap-wave-3',
                { opacity: 1 },
                { duration: 0.2, ease: 'easeOut' },
            );
        }, [animate]);

        useImperativeHandle(ref, () => ({ startAnimation: start, stopAnimation: stop }), [
            start,
            stop,
        ]);

        return (
            <motion.svg
                ref={scope}
                onHoverStart={start}
                onHoverEnd={stop}
                width={size}
                height={size}
                viewBox="0 0 24 24"
                fill="none"
                className={className}
                style={{ overflow: 'visible' }}
                aria-hidden="true"
            >
                <motion.path
                    className="tap-wave-1"
                    fill="currentColor"
                    d="M1.53568 9.02492C4.18496 6.32136 7.88549 4.75 12 4.75C16.1145 4.75 19.815 6.32136 22.4643 9.02492C22.7542 9.32077 23.2291 9.32559 23.5249 9.03568C23.8208 8.74577 23.8256 8.27092 23.5357 7.97507C20.5947 4.97382 16.5037 3.25 12 3.25C7.49628 3.25 3.40531 4.97382 0.46432 7.97507C0.174412 8.27092 0.179227 8.74577 0.475075 9.03568C0.770924 9.32559 1.24577 9.32077 1.53568 9.02492Z"
                />
                <motion.path
                    className="tap-wave-2"
                    fill="currentColor"
                    d="M5.01537 12.543C6.8499 10.8078 9.3034 9.75 11.999 9.75C14.6955 9.75 17.1498 10.8085 18.9845 12.5448C19.2854 12.8295 19.76 12.8164 20.0448 12.5155C20.3295 12.2146 20.3164 11.74 20.0155 11.4552C17.9159 9.4684 15.0975 8.25 11.999 8.25C8.90154 8.25 6.08397 9.46759 3.98463 11.4532C3.6837 11.7379 3.67049 12.2126 3.95512 12.5135C4.23975 12.8144 4.71444 12.8276 5.01537 12.543Z"
                />
                <motion.path
                    className="tap-wave-3"
                    fill="currentColor"
                    d="M8.76261 16.0475C9.6272 15.2379 10.7073 14.75 11.9999 14.75C13.2926 14.75 14.3728 15.238 15.2374 16.0475C15.5398 16.3306 16.0144 16.315 16.2975 16.0126C16.5806 15.7102 16.565 15.2356 16.2626 14.9525C15.1457 13.9067 13.707 13.25 11.9999 13.25C10.2928 13.25 8.85429 13.9067 7.73739 14.9525C7.43503 15.2356 7.41942 15.7102 7.70253 16.0126C7.98563 16.315 8.46025 16.3306 8.76261 16.0475Z"
                />
                <path
                    fill="currentColor"
                    d="M12 18C11.4477 18 11 18.4477 11 19C11 19.5523 11.4477 20 12 20C12.5523 20 13.0001 19.5523 13.0001 19C13.0001 18.4477 12.5523 18 12 18Z"
                />
            </motion.svg>
        );
    },
);

/**
 * Shield whose check mark pops on hover. Path data from Reicon's
 * ShieldCheck icon (MIT, https://reicon.dev).
 */
export const ShieldCheckIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
    function ShieldCheckIcon({ size = 32, className = '' }, ref) {
        const [scope, animate] = useAnimate();

        const start = useCallback(() => {
            animate(
                '.shield-tick',
                { scale: [0.7, 1.08, 1], opacity: [0.4, 1, 1] },
                { duration: 0.45, ease: 'easeOut' },
            );
        }, [animate]);

        const stop = useCallback(() => {
            animate(
                '.shield-tick',
                { scale: 1, opacity: 1 },
                { duration: 0.2, ease: 'easeOut' },
            );
        }, [animate]);

        useImperativeHandle(ref, () => ({ startAnimation: start, stopAnimation: stop }), [
            start,
            stop,
        ]);

        return (
            <motion.svg
                ref={scope}
                onHoverStart={start}
                onHoverEnd={stop}
                width={size}
                height={size}
                viewBox="0 0 24 24"
                fill="none"
                className={className}
                style={{ overflow: 'visible' }}
                aria-hidden="true"
            >
                <path
                    fill="currentColor"
                    d="M15.0595 10.4995C15.3353 10.1905 15.3085 9.71642 14.9995 9.44055C14.6905 9.16467 14.2164 9.19151 13.9405 9.50049L10.9286 12.8739L10.0595 11.9005C9.78358 11.5915 9.30947 11.5647 9.00049 11.8405C8.69151 12.1164 8.66467 12.5905 8.94055 12.8995L10.3691 14.4995C10.5114 14.6589 10.7149 14.75 10.9286 14.75C11.1422 14.75 11.3457 14.6589 11.488 14.4995L15.0595 10.4995Z"
                    className="shield-tick"
                    style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                />
                <motion.path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    fill="currentColor"
                    d="M12 1.25C11.0625 1.25 10.1673 1.55658 8.72339 2.05112L7.99595 2.30014C6.51462 2.8072 5.3714 3.19852 4.55303 3.53099C4.14078 3.69846 3.78637 3.86067 3.50098 4.02641C3.22634 4.1859 2.95082 4.38484 2.76363 4.65154C2.5786 4.91516 2.48293 5.23924 2.42281 5.55122C2.36031 5.87556 2.32262 6.26464 2.2983 6.71136C2.25 7.59836 2.25 8.81351 2.25 10.3896V11.9914C2.25 18.0924 6.85803 21.0175 9.59833 22.2146L9.62543 22.2264C9.96523 22.3749 10.2846 22.5144 10.6516 22.6084C11.0391 22.7076 11.4507 22.75 12 22.75C12.5493 22.75 12.9609 22.7076 13.3484 22.6084C13.7154 22.5144 14.0348 22.3749 14.3745 22.2264L14.4017 22.2146C17.142 21.0175 21.75 18.0924 21.75 11.9914V10.3898C21.75 8.81361 21.75 7.5984 21.7017 6.71136C21.6774 6.26464 21.6397 5.87556 21.5772 5.55122C21.5171 5.23924 21.4214 4.91516 21.2364 4.65154C21.0492 4.38484 20.7737 4.1859 20.499 4.02641C20.2136 3.86067 19.8592 3.69846 19.447 3.53099C18.6286 3.19852 17.4854 2.8072 16.004 2.30013L15.2766 2.05112C13.8327 1.55658 12.9375 1.25 12 1.25ZM9.08062 3.5143C10.6951 2.96164 11.3423 2.75 12 2.75C12.6577 2.75 13.3049 2.96164 14.9194 3.5143L15.4922 3.71037C17.0048 4.22814 18.1079 4.60605 18.8824 4.92069C19.269 5.07774 19.5491 5.20935 19.7457 5.32353C19.8428 5.3799 19.9097 5.42642 19.9543 5.46273C19.9922 5.49349 20.0066 5.51092 20.0087 5.51348C20.0106 5.5166 20.0231 5.53737 20.0406 5.58654C20.0606 5.64265 20.0827 5.72309 20.1043 5.83506C20.148 6.06169 20.1811 6.37301 20.2039 6.79292C20.2497 7.63411 20.25 8.80833 20.25 10.4167V11.9914C20.25 17.1665 16.3801 19.7135 13.8012 20.84C13.4297 21.0023 13.2152 21.0941 12.9764 21.1552C12.7483 21.2136 12.47 21.25 12 21.25C11.53 21.25 11.2517 21.2136 11.0236 21.1552C10.7848 21.0941 10.5703 21.0023 10.1988 20.84C7.6199 19.7135 3.75 17.1665 3.75 11.9914V10.4167C3.75 8.80833 3.75028 7.63411 3.79608 6.79292C3.81894 6.37301 3.85204 6.06169 3.89571 5.83506C3.91729 5.72309 3.93944 5.64265 3.95943 5.58654C3.97693 5.5374 3.98936 5.51663 3.99129 5.51349C3.99336 5.51095 4.0078 5.49351 4.04567 5.46273C4.09034 5.42642 4.15722 5.3799 4.25429 5.32353C4.4509 5.20935 4.731 5.07774 5.11759 4.92069C5.8921 4.60605 6.99521 4.22814 8.5078 3.71037L9.08062 3.5143Z"
                />
            </motion.svg>
        );
    },
);

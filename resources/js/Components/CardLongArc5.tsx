import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Wifi } from 'reicon-react';
import StationLogo from '@/Components/StationLogo';

interface CardLongArc5Props {
    angle?: number;
    gap?: number;
    yOffset?: number;
    duration?: number;
    hoverIntensity?: number;
    cardClassName?: string;
    widthClass?: string;
    heightClass?: string;
    className?: string;
}

interface RfidCardFace {
    role: string;
    holderId: string;
    number: string;
    accent: string;
}

const cardFaces: RfidCardFace[] = [
    { role: 'Student', holderId: 'STD-20491', number: '•••• 7682', accent: '#234EF4' },
    { role: 'Visitor', holderId: 'VST-00512', number: '•••• 0114', accent: '#c1791f' },
    { role: 'Staff', holderId: 'STF-10377', number: '•••• 5520', accent: '#188352' },
    { role: 'Admin', holderId: 'ADM-00089', number: '•••• 9033', accent: '#071c44' },
    { role: 'Service', holderId: 'SVC-03110', number: '•••• 3276', accent: '#2863bd' },
];

export default function CardLongArc5({
    angle = 15,
    gap = 140,
    yOffset = 20,
    duration = 0.5,
    hoverIntensity = 1,
    cardClassName = 'bg-white',
    widthClass = 'w-[13rem]',
    heightClass = 'h-[18rem]',
    className = '',
}: CardLongArc5Props) {
    const [isHovered, setIsHovered] = useState(false);
    const [isPinned, setIsPinned] = useState(false);
    const reduceMotion = useReducedMotion();
    const isActive = isHovered || isPinned;
    const cards = [0, 1, 2, 3, 4];
    const center = 2;

    return (
        <button
            type="button"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => setIsPinned((pinned) => !pinned)}
            aria-expanded={isActive}
            aria-label="RFID card deck. Activate to spread the cards."
            className={`relative flex cursor-pointer items-center justify-center rounded-3xl bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${widthClass} ${heightClass} ${className}`}
        >
            {cards.map((i) => {
                const dist = i - center;
                const targetRotate = isActive ? dist * (angle / center) * hoverIntensity : 0;
                const targetX = isActive ? dist * (gap / center) * hoverIntensity : 0;

                let targetY = 0;
                if (isActive) {
                    if (Math.abs(dist) === 2) {
                        targetY = yOffset;
                    } else if (Math.abs(dist) === 1) {
                        targetY = 0.25 * yOffset;
                    } else {
                        targetY = -0.25 * yOffset;
                    }
                    targetY = targetY * hoverIntensity;
                }

                const face = cardFaces[i];

                return (
                    <motion.div
                        key={face.holderId}
                        animate={{
                            rotate: targetRotate,
                            x: targetX,
                            y: targetY,
                            scale: isActive && dist === 0 ? 1.05 : 1,
                        }}
                        transition={
                            reduceMotion
                                ? { duration: 0 }
                                : {
                                      type: 'spring',
                                      stiffness: 180,
                                      damping: 20,
                                      mass: 0.8,
                                      duration,
                                  }
                        }
                        style={{
                            zIndex: 3 - Math.abs(dist),
                            originX: 0.5,
                            originY: 1,
                        }}
                        className={`absolute inset-0 rounded-2xl border border-white/5 shadow-[0_2px_8px_-2px_rgba(7,28,68,0.25)] ${cardClassName}`}
                    >
                        <span aria-hidden="true" className="flex h-full flex-col justify-between p-4 text-left">
                            <span className="flex items-center gap-1.5 text-station-navy">
                                <StationLogo className="h-5 w-5" />
                                <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-station-navy/60">
                                    Adaptive
                                </span>
                            </span>
                            <span>
                                <span className="block text-sm font-bold leading-tight tracking-[-0.01em] text-station-navy">
                                    {face.role}
                                </span>
                                <span className="mt-0.5 block text-[10px] font-semibold text-station-muted">
                                    {face.holderId}
                                </span>
                            </span>
                            <span className="flex items-center justify-between">
                                <span className="grid h-8 w-11 place-items-center rounded border border-station-line bg-station-panel">
                                    <span className="flex flex-col gap-[3px]">
                                        <span className="h-px w-6 bg-[#b9c9df]" />
                                        <span className="h-px w-6 bg-[#b9c9df]" />
                                        <span className="h-px w-6 bg-[#b9c9df]" />
                                    </span>
                                </span>
                                <Wifi size={20} className="text-station-blue" />
                            </span>
                            <span className="font-mono text-[11px] font-semibold text-station-blue">
                                {face.number}
                            </span>
                            <span
                                className="h-1 rounded-full"
                                style={{ backgroundColor: face.accent }}
                            />
                        </span>
                    </motion.div>
                );
            })}
        </button>
    );
}

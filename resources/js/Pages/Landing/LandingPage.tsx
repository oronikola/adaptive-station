import { useEffect, useRef, useState } from 'react';
import { motion, useMotionTemplate, useMotionValue } from 'framer-motion';
import StationLogo from '@/Components/Branding/StationLogo';
import FloatingHeader from '@/Components/FloatingHeader';
import turnstileGateImage from '@/assets/turnstile-gate.png';
import CardLongArc5 from '@/Components/CardLongArc5';
import { ShieldCheckIcon, TapWavesIcon } from '@/Components/AnimatedIcons';
import { ArrowRightIcon as ArrowRight } from '@/Components/icons/arrow-right';
import { ChartBarIncreasingIcon as ChartBar } from '@/Components/icons/chart-bar-increasing';
import { CheckIcon as Check } from '@/Components/icons/check';
import { ChevronDownIcon as ChevronDown } from '@/Components/icons/chevron-down';
import { CloudSyncIcon as CloudCheck } from '@/Components/icons/cloud-sync';
import { CursorClickIcon as Cursor } from '@/Components/icons/cursor-click';
import { ServerIcon as Database } from '@/Components/icons/server';
import { EyeIcon as Eye } from '@/Components/icons/eye';
import { LinkIcon } from '@/Components/icons/link';
import { WifiIcon as Wifi } from '@/Components/icons/wifi';
import { WifiLowIcon as WifiOff } from '@/Components/icons/wifi-low';
import type { AnimatedIconHandle } from '@/Components/AnimatedIcons';
import { Head, Link } from '@inertiajs/react';
import { User } from '@/types';

const primaryNavItems = [
    { label: 'Capabilities', href: '#capabilities' },
    { label: 'How it works', href: '#workflow' },
    { label: 'RFID cards', href: '#rfid' },
    { label: 'Compare', href: '#comparison' },
    { label: 'FAQ', href: '#faq' },
];

const capabilitySignals = [
    'Offline-first capture',
    'Safe retry sync',
    'School-isolated data',
    'Multiple stations per school',
    'Attendance reporting',
    'Legacy system connectivity',
];

const workflowSteps = [
    {
        icon: 'provision' as const,
        title: 'Provision the school',
        subtitle: 'Roster, people and cards',
        description:
            'Set up the school, administrators, station records, people, and cards in one controlled workspace.',
    },
    {
        icon: 'capture' as const,
        title: 'Record every tap locally',
        subtitle: 'Offline-first capture',
        description:
            'The kiosk validates the card and saves the attendance event to local storage before the network is involved.',
    },
    {
        icon: 'sync' as const,
        title: 'Synchronize safely',
        subtitle: 'Retries without duplicates',
        description:
            'Pending events retry after connectivity returns, with device-generated IDs preventing duplicate records.',
    },
    {
        icon: 'review' as const,
        title: 'Review and export',
        subtitle: 'Portal visibility',
        description:
            'School teams monitor station health, search attendance, and export the records their operations need.',
    },
];

const comparisonRows = [
    {
        concern: 'At the moment of tap',
        conventional: 'Waits for a live network or central database response.',
        adaptive: 'Saves locally first and gives immediate kiosk feedback.',
    },
    {
        concern: 'After an outage',
        conventional: 'Requires manual recovery or leaves uncertain gaps.',
        adaptive: 'Queues pending events and retries them when connectivity returns.',
    },
    {
        concern: 'Duplicate protection',
        conventional: 'Retries can create conflicting or repeated records.',
        adaptive: 'Uses immutable event IDs for logically one-time cloud acceptance.',
    },
    {
        concern: 'Device credentials',
        conventional: 'Kiosks may depend on direct database access.',
        adaptive: 'Stations communicate through authenticated HTTPS APIs.',
    },
    {
        concern: 'Operational visibility',
        conventional: 'Health and pending activity are checked device by device.',
        adaptive: 'The portal surfaces station status, last contact, and pending counts.',
    },
    {
        concern: 'School-system transition',
        conventional: 'A replacement can force an immediate cutover.',
        adaptive: 'Imports and optional exports support a staged, traceable rollout.',
    },
];

const problemIcons = {
    connection: WifiOff,
    database: Database,
    visibility: Eye,
};

function ProblemGlyph({ type }: { type: keyof typeof problemIcons }) {
    const Glyph = problemIcons[type];

    return <Glyph size={20} />;
}

interface BrandProps {
    compact?: boolean;
    light?: boolean;
}

function Brand({ compact = false, light = false }: BrandProps) {
    return (
        <span className="inline-flex items-center gap-3">
            <span
                className={`grid place-items-center rounded-xl shadow-station-float ${
                    light
                        ? 'bg-white/15 text-white ring-1 ring-white/25'
                        : 'bg-station-navy-soft text-white'
                } ${compact ? 'h-9 w-9' : 'h-11 w-11'}`}
            >
                <StationLogo className={compact ? 'h-6 w-6' : 'h-7 w-7'} />
            </span>
            <span
                className={`text-[15px] font-bold tracking-[-0.02em] ${
                    light ? 'text-white' : 'text-station-navy'
                }`}
            >
                Adaptive Station
            </span>
        </span>
    );
}

function CapabilityMarquee() {
    return (
        <section
            className="relative overflow-hidden bg-royal py-4"
            aria-label="Adaptive Station capabilities"
        >
            <p className="sr-only">{capabilitySignals.join(', ')}</p>
            <div
                className="flex w-max animate-capability-marquee items-center motion-reduce:animate-none"
                aria-hidden="true"
            >
                {[...capabilitySignals, ...capabilitySignals].map((signal, index) => (
                    <div
                        key={`${signal}-${index}`}
                        className="flex items-center gap-4 px-6 text-xs font-bold uppercase tracking-[0.13em] text-white sm:px-8"
                    >
                        <span className="h-1.5 w-1.5 rounded-full bg-royal-mint" />
                        <span>{signal}</span>
                    </div>
                ))}
            </div>
        </section>
    );
}

function useScrollReveals() {
    useEffect(() => {
        const targets = Array.from(document.querySelectorAll('[data-reveal]'));

        if (
            !('IntersectionObserver' in window) ||
            window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ) {
            targets.forEach((target) => target.classList.add('reveal-visible'));

            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('reveal-visible');
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.15 },
        );

        targets.forEach((target) => observer.observe(target));

        return () => observer.disconnect();
    }, []);
}

function SectionTexture() {
    return (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 bg-dot-grid opacity-60 [mask-image:radial-gradient(ellipse_75%_65%_at_50%_28%,black,transparent)]" />
            <div className="absolute left-10 top-10 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0)_70%)]" />
            <div className="absolute bottom-10 right-10 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(10,27,115,0.35)_0%,rgba(10,27,115,0)_70%)]" />
        </div>
    );
}

const pulseStats = [
    { label: 'Taps captured today', value: '1,284', trend: 'Across every station' },
    { label: 'Stations online', value: '4 / 4', trend: 'Full gate coverage' },
    { label: 'Events pending sync', value: '3', trend: 'Retrying safely' },
    { label: 'Duplicates recorded', value: '0', trend: 'By design, always' },
];

const pulseTiles = [
    { station: 'Main gate', count: '412' },
    { station: 'Library', count: '238' },
    { station: 'Staff room', count: '156' },
    { station: 'Gym hall', count: '98' },
];

const pulseEvents = [
    { time: 'Just now', event: 'Tap saved locally · Main gate — IN' },
    { time: '38s ago', event: 'Sync accepted · Library — 24 events' },
    { time: '1m ago', event: 'Card frozen from portal · Office' },
    { time: '2m ago', event: 'Attendance export ready · Staff room' },
];

function StatsBand() {
    return (
        <section className="relative overflow-hidden bg-royal px-5 py-24 sm:px-8 lg:py-28" aria-label="Live station network">
            <SectionTexture />
            <div data-reveal className="reveal relative mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] bg-station-navy p-8 text-white shadow-station-float ring-1 ring-white/10 sm:p-14">
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-dot-grid opacity-20" />
                <div className="relative grid items-center gap-12 lg:grid-cols-12">
                    <div className="lg:col-span-6">
                        <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1 text-xs font-semibold text-royal-mint">
                            <Wifi size={14} />
                            <span>Live station network</span>
                        </p>
                        <h2 className="mt-4 font-display text-3xl font-bold tracking-[-0.02em] sm:text-4xl lg:text-5xl">
                            Every tap, visible the second it lands.
                        </h2>
                        <p className="mt-5 text-base leading-relaxed text-white/70">
                            Zero manual polling, zero stale registers. Every local
                            save, safe retry, and cloud acceptance streams into one
                            operations view the moment it happens.
                        </p>

                        <div className="mt-8">
                            <span className="text-xs font-bold uppercase tracking-[0.14em] text-white/50">
                                Today&apos;s taps by station
                            </span>
                            <div className="mt-3 grid grid-cols-4 gap-3 text-center">
                                {pulseTiles.map((tile) => (
                                    <div key={tile.station} className="rounded-xl bg-white/5 p-2.5">
                                        <span className="block text-xs font-bold text-white">{tile.station}</span>
                                        <span className="font-mono text-[11px] text-royal-mint">{tile.count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-6">
                        <div className="rounded-3xl bg-white/5 p-6 backdrop-blur lg:p-8">
                            <div className="flex items-center justify-between border-b border-white/10 pb-4">
                                <div className="flex items-center gap-2">
                                    <span className="relative flex h-2 w-2">
                                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-royal-mint opacity-75 motion-reduce:animate-none" />
                                        <span className="relative inline-flex h-2 w-2 rounded-full bg-royal-mint" />
                                    </span>
                                    <span className="font-display text-sm font-bold text-white">Operations Live Feed</span>
                                </div>
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-bold text-royal-mint">
                                    Broadcasting
                                </span>
                            </div>

                            <dl className="mt-6 grid grid-cols-2 gap-4">
                                {pulseStats.map((stat) => (
                                    <div key={stat.label} className="rounded-2xl bg-white/[0.04] p-4">
                                        <dt className="text-xs text-white/60">{stat.label}</dt>
                                        <dd className="mt-1 font-mono text-2xl font-medium text-white">
                                            {stat.value}
                                        </dd>
                                        <span className="mt-1 block text-[10px] font-medium text-white/45">{stat.trend}</span>
                                    </div>
                                ))}
                            </dl>

                            <div className="mt-6 space-y-2.5">
                                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/50">
                                    Recent station stream
                                </span>
                                {pulseEvents.map((item) => (
                                    <div key={item.event} className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.04] px-3.5 py-2 text-xs">
                                        <div className="flex min-w-0 items-center gap-2">
                                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-royal-mint" />
                                            <span className="truncate text-white/80">{item.event}</span>
                                        </div>
                                        <span className="shrink-0 font-mono text-[10px] text-white/45">{item.time}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

const testimonialItems = [
    {
        quote: 'The gate line keeps moving through every network dip. The office stopped chasing missing taps.',
        role: 'School operations lead',
    },
    {
        quote: 'Retries used to mean duplicates. Now the portal shows every event exactly once, with proof.',
        role: 'School administrator',
    },
    {
        quote: 'We staged the rollout alongside our old system instead of cutting over overnight. No drama.',
        role: 'IT coordinator',
    },
];

function TestimonialsSection() {
    return (
        <section className="relative overflow-hidden bg-royal px-5 py-24 sm:px-8 lg:py-32">
            <SectionTexture />
            <div data-reveal className="reveal relative mx-auto max-w-7xl">
                <div className="max-w-3xl">
                    <p className="eyebrow-badge">
                        Field notes
                    </p>
                    <h2 className="mt-5 font-display text-4xl font-bold leading-[1.08] tracking-[-0.02em] text-white sm:text-5xl">
                        School teams feel the difference at the gate.
                    </h2>
                </div>

                <div className="mt-12 grid gap-5 lg:grid-cols-3">
                    {testimonialItems.map((item) => (
                        <figure
                            key={item.role}
                            className="glass-hover flex flex-col justify-between rounded-[32px] border border-white/10 bg-white/10 p-7 shadow-station-float backdrop-blur-sm"
                        >
                            <div>
                                <div aria-label="Rated 5 out of 5" className="text-sm tracking-[0.2em] text-royal-mint">
                                    ★★★★★
                                </div>
                                <blockquote className="mt-5 text-base leading-7 text-white">
                                    “{item.quote}”
                                </blockquote>
                            </div>
                            <figcaption className="mt-7 pt-4 text-xs font-bold uppercase tracking-[0.14em] text-white/70">
                                {item.role}
                            </figcaption>
                        </figure>
                    ))}
                </div>
            </div>
        </section>
    );
}

const faqItems = [
    {
        question: 'What happens when the network drops during arrival rush?',
        answer: 'Nothing stops. The kiosk validates the card and saves the attendance event to local storage first, then synchronizes safely when connectivity returns. Students and staff keep moving.',
    },
    {
        question: 'Won’t automatic retries create duplicate attendance records?',
        answer: 'No. Every tap carries a device-generated immutable event ID, so the cloud accepts known retries without inserting attendance twice. Duplicates are impossible by design, not by cleanup.',
    },
    {
        question: 'Do kiosks need direct access to our database?',
        answer: 'No. Stations communicate through authenticated HTTPS APIs only. Device credentials, remote tables and attendance capture stay decoupled and easy to secure.',
    },
    {
        question: 'Can we keep our existing school management system?',
        answer: 'Yes. Import school rosters and RFID mappings to get started, then optionally export attendance back during a staged, traceable transition. There is no forced overnight cutover.',
    },
    {
        question: 'Is each school’s data isolated?',
        answer: 'Yes. Schools, people, cards, stations and attendance are strictly school-scoped, with multiple stations supported per school and role-based access for your team.',
    },
    {
        question: 'What hardware does a station need?',
        answer: 'An RFID reader kiosk with local storage for offline-first capture. The management portal itself is web-based, so school teams just need a browser.',
    },
];

function FaqSection() {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    return (
        <section id="faq" className="relative scroll-mt-32 overflow-hidden bg-royal px-5 py-24 sm:px-8 lg:py-32">
            <SectionTexture />
            <div data-reveal className="reveal relative mx-auto max-w-5xl">
                <div className="mx-auto max-w-2xl text-center">
                    <p className="eyebrow-badge">
                        Questions
                    </p>
                    <h2 className="mt-5 font-display text-4xl font-bold leading-[1.08] tracking-[-0.02em] text-white sm:text-5xl">
                        Everything schools ask before switching.
                    </h2>
                    <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-white/75">
                        Straight answers about offline capture, duplicates,
                        hardware and living alongside your current system.
                    </p>
                </div>

                <div className="mx-auto mt-14 flex max-w-3xl flex-col gap-3">
                    {faqItems.map((item, index) => {
                        const isOpen = openIndex === index;

                        return (
                            <div
                                key={item.question}
                                className={`faq-hover overflow-hidden rounded-3xl border border-white/10 backdrop-blur-sm ${
                                    isOpen ? 'bg-white/15' : 'bg-white/[0.07]'
                                }`}
                            >
                                <button
                                    type="button"
                                    onClick={() => setOpenIndex(isOpen ? null : index)}
                                    aria-expanded={isOpen}
                                    className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/60"
                                >
                                    <span className="text-base font-bold tracking-[-0.01em] text-white">
                                        {item.question}
                                    </span>
                                    <span
                                        aria-hidden="true"
                                        className={`grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/15 text-white transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none ${
                                            isOpen ? 'rotate-180' : 'rotate-0'
                                        }`}
                                    >
                                        <ChevronDown size={18} />
                                    </span>
                                </button>
                                <div
                                    className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none ${
                                        isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                                    }`}
                                >
                                    <div className="overflow-hidden">
                                        <p className="px-6 pb-6 text-sm leading-6 text-white/80">
                                            {item.answer}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

function ProblemSection() {
    const problems = [
        {
            icon: 'connection' as const,
            title: 'A weak connection becomes an attendance problem.',
            description:
                'When capture depends on a round trip to a remote system, a routine network interruption can stop the line at the gate.',
        },
        {
            icon: 'database' as const,
            title: 'Direct database access puts the wrong responsibility on a kiosk.',
            description:
                'Device credentials, remote tables, and attendance capture become tightly coupled and harder to secure or evolve.',
        },
        {
            icon: 'visibility' as const,
            title: 'Fragmented tools hide the state of the operation.',
            description:
                'School teams need one place to see people, cards, stations, pending activity, and attendance records together.',
        },
    ];

    return (
        <section className="relative overflow-hidden bg-royal px-5 py-24 sm:px-8 lg:py-32">
            <SectionTexture />
            <div data-reveal className="reveal relative mx-auto max-w-7xl">
                <div className="max-w-2xl">
                    <p className="eyebrow-badge">
                        The problem
                    </p>
                    <h2 className="mt-5 font-display text-4xl font-bold leading-[1.08] tracking-[-0.02em] text-white sm:text-5xl">
                        Attendance should not inherit every weakness of the network.
                    </h2>
                    <p className="mt-6 text-base leading-7 text-white/75">
                        The moment a student or staff member taps is too important to
                        make conditional. Adaptive Station separates reliable local
                        capture from cloud coordination.
                    </p>
                </div>

                <div className="mt-14 grid gap-5 md:grid-cols-3">
                    {problems.map((problem, index) => (
                        <div
                            key={problem.title}
                            style={{ transitionDelay: `${index * 70}ms` }}
                            className="group card-hover rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-card-blue"
                        >
                            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#EDF5FF] text-royal transition-transform duration-200 group-hover:scale-110 motion-reduce:transition-none motion-reduce:group-hover:scale-100">
                                <ProblemGlyph type={problem.icon} />
                            </span>
                            <h3 className="mt-6 font-display text-lg font-bold text-station-navy">
                                {problem.title}
                            </h3>
                            <p className="mt-2 text-sm leading-6 text-station-muted">
                                {problem.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function FeaturesSection() {
    const tapNodeRef = useRef<AnimatedIconHandle>(null);
    const shieldRef = useRef<AnimatedIconHandle>(null);
    const spotX = useMotionValue(150);
    const spotY = useMotionValue(150);
    const spotMask = useMotionTemplate`radial-gradient(220px circle at ${spotX}px ${spotY}px, black 20%, transparent 80%)`;
    const spotGlow = useMotionTemplate`radial-gradient(240px circle at ${spotX}px ${spotY}px, rgba(35, 78, 244, 0.07), transparent 75%)`;

    const handleSpotMove = (event: { currentTarget: HTMLElement; clientX: number; clientY: number }) => {
        const rect = event.currentTarget.getBoundingClientRect();
        spotX.set(event.clientX - rect.left);
        spotY.set(event.clientY - rect.top);
    };

    return (
        <section id="capabilities" className="relative scroll-mt-32 overflow-hidden bg-royal px-5 py-24 sm:px-8 lg:py-32">
            <SectionTexture />
            <div data-reveal className="reveal relative mx-auto max-w-7xl">
                <div className="mx-auto max-w-3xl text-center">
                    <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white shadow-lg backdrop-blur">
                        <TapWavesIcon size={15} className="text-royal-mint" />
                        <span>Intelligent capture architecture</span>
                    </p>
                    <h2 className="mt-4 font-display text-4xl font-bold tracking-[-0.02em] text-white sm:text-5xl">
                        One attendance operation, from the reader to the report.
                    </h2>
                    <p className="mt-4 text-base leading-relaxed text-white/75 sm:text-lg">
                        Each layer has a clear job: kiosks keep tapping responsive,
                        the cloud coordinates safely, and the portal gives school
                        teams control.
                    </p>
                </div>

                <div className="mt-16 grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <article
                        onMouseEnter={() => tapNodeRef.current?.startAnimation()}
                        onMouseLeave={() => tapNodeRef.current?.stopAnimation()}
                        className="card-hover-dark group relative flex min-h-[420px] flex-col justify-between overflow-hidden rounded-[2rem] border border-white/10 bg-station-navy p-7 text-white lg:col-span-2 lg:p-9"
                    >
                        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-dot-grid opacity-20" />
                        <div className="relative z-10 mb-8 flex flex-1 items-center justify-center">
                            <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                                <div className="flex items-center justify-between pb-4 text-[11px] font-semibold text-[#bcd4f7]">
                                    <span>Tap path</span>
                                    <span className="text-royal-mint">Available offline</span>
                                </div>
                                <div className="relative z-10 flex items-center gap-3.5 rounded-xl bg-white/[0.06] p-3.5">
                                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/10 text-[#97bff6]">
                                        <TapWavesIcon ref={tapNodeRef} size={18} />
                                    </span>
                                    <div className="flex flex-1 items-center justify-between gap-3">
                                        <div>
                                            <span className="block text-xs font-bold text-white">
                                                Card validated
                                            </span>
                                            <span className="text-xs text-[#bcd4f7]/80">
                                                RFID lookup on this station
                                            </span>
                                        </div>
                                        <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-[#97bff6]">
                                            RFID
                                        </span>
                                    </div>
                                </div>
                                <div aria-hidden="true" className="relative mx-auto my-1.5 h-5 w-0.5 bg-white/10">
                                    <div className="absolute inset-x-0 top-0 h-0 bg-royal-mint transition-[height] duration-500 group-hover:h-full motion-reduce:transition-none" />
                                </div>
                                <div className="relative z-10 flex items-center gap-3.5 rounded-xl bg-white/[0.06] p-3.5">
                                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/10 text-royal-mint">
                                        <Check size={16} />
                                    </span>
                                    <div className="flex flex-1 items-center justify-between gap-3">
                                        <div>
                                            <span className="block text-xs font-bold text-white">
                                                Event written locally
                                            </span>
                                            <span className="text-xs text-[#bcd4f7]/80">
                                                SQLite-first persistence
                                            </span>
                                        </div>
                                        <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-[#bcd4f7]">
                                            SQLite
                                        </span>
                                    </div>
                                </div>
                                <div aria-hidden="true" className="relative mx-auto my-1.5 h-5 w-0.5 bg-white/10">
                                    <div className="absolute inset-x-0 top-0 h-0 bg-royal-mint transition-[height] duration-500 delay-150 group-hover:h-full motion-reduce:transition-none" />
                                </div>
                                <div className="relative z-10 flex items-center gap-3.5 rounded-xl bg-white/[0.06] p-3.5">
                                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/10 text-white">
                                        <StationLogo className="h-[18px] w-[18px]" />
                                    </span>
                                    <div className="flex flex-1 items-center justify-between gap-3">
                                        <div>
                                            <span className="block text-xs font-bold text-white">
                                                Feedback shown
                                            </span>
                                            <span className="text-xs text-[#bcd4f7]/80">
                                                Kiosk confirms instantly
                                            </span>
                                        </div>
                                        <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-royal-mint">
                                            Instant
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="relative z-10">
                            <h3 className="font-display text-2xl font-bold tracking-[-0.02em] text-white">
                                The kiosk keeps the line moving.
                            </h3>
                            <p className="mt-2 max-w-xl text-sm leading-6 text-[#bcd4f7]">
                                Local card lookup, duplicate protection, IN/OUT
                                determination, and SQLite-first persistence happen
                                before any network request.
                            </p>
                        </div>
                    </article>

                    <article
                        onMouseMove={handleSpotMove}
                        onMouseEnter={() => shieldRef.current?.startAnimation()}
                        onMouseLeave={() => shieldRef.current?.stopAnimation()}
                        className="card-hover group relative flex min-h-[420px] flex-col justify-between overflow-hidden rounded-[2.5rem] border border-[#E2E8F0] bg-white p-7 shadow-card-blue lg:col-span-1 lg:p-9"
                    >
                        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(15,23,42,0.12)_1px,transparent_1.4px)] bg-[size:24px_24px] opacity-60" />
                        <motion.div
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-0 bg-[radial-gradient(#64748b_1px,transparent_1px)] bg-[size:24px_24px] opacity-0 transition-opacity duration-300 group-hover:opacity-30 motion-reduce:transition-none"
                            style={{ maskImage: spotMask, WebkitMaskImage: spotMask }}
                        />
                        <motion.div
                            aria-hidden="true"
                            className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 group-hover:opacity-100 motion-reduce:transition-none"
                            style={{ background: spotGlow }}
                        />
                        <div className="relative z-10 flex flex-1 items-center justify-center py-6">
                            <div className="w-full max-w-[220px] rounded-2xl border border-station-line bg-white p-5 text-center shadow-card-blue">
                                <span className="mx-auto grid h-14 w-14 place-items-center rounded-xl bg-[#EDF5FF] text-royal">
                                    <ShieldCheckIcon ref={shieldRef} size={28} />
                                </span>
                                <code className="mt-3 block font-mono text-xs font-bold text-station-blue">
                                    evt_7f2a
                                </code>
                                <span className="mt-1 block text-[11px] font-semibold text-station-success">
                                    Accepted · exactly once
                                </span>
                                <span className="mt-3 block rounded-lg bg-station-panel px-2.5 py-1.5 text-[10px] font-semibold leading-4 text-station-muted">
                                    Known retry? Absorbed, never duplicated.
                                </span>
                            </div>
                        </div>
                        <div className="relative z-10">
                            <h3 className="font-display text-xl font-bold tracking-[-0.01em] text-station-navy">
                                Retries are safe by design.
                            </h3>
                            <p className="mt-2 text-sm leading-6 text-station-muted">
                                Device-generated event IDs let the cloud accept known
                                retries without inserting attendance twice.
                            </p>
                        </div>
                    </article>

                    <article className="group card-hover relative flex min-h-[320px] flex-col justify-between overflow-hidden rounded-[2rem] border border-[#E2E8F0] bg-white p-7 shadow-card-blue lg:col-span-2 lg:flex-row lg:items-center lg:gap-8 lg:p-9">
                        <div className="relative z-10 flex-1">
                            <ChartBar size={32} className="icon-nudge text-station-blue-bright" />
                            <h3 className="mt-6 font-display text-2xl font-bold tracking-[-0.02em] text-station-navy sm:text-3xl">
                                School operations stay visible.
                            </h3>
                            <p className="mt-3 max-w-lg text-sm leading-6 text-station-muted sm:text-base">
                                Manage people, RFID assignments, attendance searches,
                                exports, users, and station settings from the portal.
                            </p>
                            <div className="mt-6 grid grid-cols-2 gap-3">
                                {['People', 'RFID cards', 'Attendance', 'Stations'].map((item) => (
                                    <div
                                        key={item}
                                        className="rounded-xl bg-station-canvas px-4 py-3 text-xs font-bold text-station-blue"
                                    >
                                        {item}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="relative mt-8 flex flex-1 items-center justify-center lg:mt-0">
                            <div className="relative w-full max-w-md rounded-2xl border border-station-line bg-[#f8faff] p-5">
                                <div className="flex items-center justify-between border-b border-station-line pb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="h-2 w-2 rounded-full bg-station-success" />
                                        <span className="text-xs font-bold text-station-navy">
                                            Attendance · Main gate
                                        </span>
                                    </div>
                                    <span className="rounded-full bg-station-success-soft px-2.5 py-0.5 text-[10px] font-bold text-station-success">
                                        LIVE
                                    </span>
                                </div>
                                <div className="relative mt-4 space-y-2.5">
                                    <div className="h-3.5 w-[75%] rounded bg-[#dbe3ef] transition-[width] duration-500 group-hover:w-[90%] motion-reduce:transition-none" />
                                    <div className="h-2.5 w-[85%] rounded bg-[#dbe3ef]/70 transition-[width] duration-500 delay-75 group-hover:w-[95%] motion-reduce:transition-none" />
                                    <div className="h-2.5 w-[60%] rounded bg-[#dbe3ef]/70 transition-[width] duration-500 delay-150 group-hover:w-[70%] motion-reduce:transition-none" />
                                    <div className="absolute z-20 -translate-x-2 translate-y-8 transition-transform duration-700 ease-out group-hover:translate-x-16 group-hover:translate-y-2 motion-reduce:transition-none">
                                        <Cursor size={14} className="text-[#e11d48] drop-shadow-md" />
                                        <div className="ml-1.5 mt-1 inline-flex animate-float-soft items-center gap-1.5 whitespace-nowrap rounded-full border border-white/30 bg-[#e11d48]/95 px-2.5 py-1 text-[9px] font-bold text-white shadow-lg motion-reduce:animate-none">
                                            <span className="h-1.5 w-1.5 rounded-full bg-white" />
                                            <span>Office · reviewing</span>
                                        </div>
                                    </div>
                                    <div className="absolute bottom-6 right-2 z-20 translate-x-0 translate-y-0 transition-transform duration-700 ease-out group-hover:-translate-x-14 group-hover:-translate-y-3 motion-reduce:transition-none">
                                        <Cursor size={14} className="text-royal drop-shadow-md" />
                                        <div
                                            className="ml-1.5 mt-1 inline-flex animate-float-soft items-center gap-1.5 whitespace-nowrap rounded-full border border-white/30 bg-royal/95 px-2.5 py-1 text-[9px] font-bold text-white shadow-lg motion-reduce:animate-none"
                                            style={{ animationDelay: '1.6s' }}
                                        >
                                            <span className="h-1.5 w-1.5 rounded-full bg-white" />
                                            <span>Gate · syncing</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </article>

                    <article className="group card-hover relative flex min-h-[320px] flex-col justify-between overflow-hidden rounded-[2rem] border border-[#E2E8F0] bg-[#dfeafb] p-7 shadow-card-blue lg:col-span-1 lg:p-9">
                        <div className="relative z-10">
                                <LinkIcon size={32} className="icon-nudge text-station-blue" />
                            <h3 className="mt-6 font-display text-xl font-bold tracking-[-0.01em] text-station-navy">
                                Connect without making the connection a dependency.
                            </h3>
                            <p className="mt-3 text-sm leading-6 text-[#526989]">
                                Import school rosters and RFID mappings, then
                                optionally export attendance back during a staged transition.
                            </p>
                        </div>
                        <div className="relative z-10 mx-auto mt-8 flex w-full max-w-[220px] flex-col items-stretch gap-0" aria-hidden="true">
                            <span className="rounded-xl bg-white px-4 py-3 text-center text-[10px] font-bold uppercase tracking-[0.1em] text-station-blue shadow-sm">
                                School system
                            </span>
                            <span className="relative mx-auto h-10 w-0.5 bg-station-blue/20">
                                <span className="absolute inset-x-0 top-0 h-0 bg-royal transition-[height] duration-500 group-hover:h-full motion-reduce:transition-none" />
                            </span>
                            <span className="grid place-items-center rounded-xl bg-station-navy px-4 py-3 text-white shadow-sm">
                                <StationLogo className="h-6 w-6" />
                            </span>
                        </div>
                    </article>
                </div>
            </div>
        </section>
    );
}

const workflowIcons = {
    provision: LinkIcon,
    capture: Wifi,
    sync: CloudCheck,
    review: ChartBar,
};

function WorkflowSection() {
    return (
        <section id="workflow" className="relative scroll-mt-32 overflow-hidden bg-royal px-5 py-24 sm:px-8 lg:py-32">
            <SectionTexture />
            <div data-reveal className="reveal relative mx-auto max-w-7xl">
                <div className="max-w-2xl">
                    <p className="eyebrow-badge">
                        How it works
                    </p>
                    <h2 className="mt-5 font-display text-4xl font-bold leading-[1.08] tracking-[-0.02em] text-white sm:text-5xl">
                        From first setup to daily attendance.
                    </h2>
                    <p className="mt-6 text-base leading-7 text-white/75">
                        A deliberate path lets a school introduce Adaptive Station
                        without abandoning a working process overnight.
                    </p>
                </div>

                <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {workflowSteps.map((step, index) => {
                        const StepIcon = workflowIcons[step.icon];

                        return (
                            <div
                                key={step.title}
                                style={{ transitionDelay: `${index * 80}ms` }}
                                className="group card-hover relative flex flex-col justify-between rounded-[32px] border border-[#E2E8F0] bg-white p-7 shadow-card-blue"
                            >
                                <div>
                                    <div className="flex items-center justify-between">
                                        <span className="font-mono text-2xl font-medium text-royal">
                                            0{index + 1}
                                        </span>
                                        <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#EDF5FF] text-royal transition-transform duration-200 group-hover:scale-110 motion-reduce:transition-none motion-reduce:group-hover:scale-100">
                                            <StepIcon size={20} />
                                        </span>
                                    </div>
                                    <h3 className="mt-6 font-display text-lg font-bold text-station-navy">
                                        {step.title}
                                    </h3>
                                    <p className="mt-1 text-xs font-semibold text-royal">
                                        {step.subtitle}
                                    </p>
                                    <p className="mt-3 text-sm leading-6 text-station-muted">
                                        {step.description}
                                    </p>
                                </div>
                                <div className="mt-6 flex items-center gap-1.5 text-xs font-bold text-station-muted/70">
                                    <span>Phase {index + 1}</span>
                                    {index < workflowSteps.length - 1 && (
                                        <ArrowRight size={14} />
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

const rfidPoints = [
    'Assign, replace or freeze cards from the portal in one click',
    'IN or OUT decided on the kiosk at the moment of tap',
    'A lost card is blocked across every station instantly',
];

function useDeckLayout() {
    const [isDesktop, setIsDesktop] = useState(
        () => window.matchMedia('(min-width: 1024px)').matches,
    );

    useEffect(() => {
        const query = window.matchMedia('(min-width: 1024px)');
        const applyLayout = () => setIsDesktop(query.matches);
        applyLayout();
        query.addEventListener('change', applyLayout);

        return () => query.removeEventListener('change', applyLayout);
    }, []);

    return isDesktop
        ? { gap: 128, yOffset: 28, widthClass: 'w-[13rem]', heightClass: 'h-[18rem]' }
        : { gap: 70, yOffset: 20, widthClass: 'w-[11rem]', heightClass: 'h-[15rem]' };
}

function RfidSection() {
    const deckLayout = useDeckLayout();
    return (
        <section id="rfid" className="relative scroll-mt-32 overflow-hidden bg-royal px-5 py-24 sm:px-8 lg:py-32">
            <SectionTexture />
            <div data-reveal className="reveal relative mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-2 lg:gap-20">
                <div>
                    <p className="eyebrow-badge">
                        RFID cards
                    </p>
                    <h2 className="mt-5 font-display text-4xl font-bold leading-[1.08] tracking-[-0.02em] text-white sm:text-5xl">
                        One card per person. Zero queues at the reader.
                    </h2>
                    <p className="mt-6 max-w-lg text-base leading-7 text-white/75">
                        Every student and staff member gets a card the office
                        controls. Stations validate locally, so the line keeps
                        moving even when the network does not.
                    </p>
                    <ul className="mt-8 flex flex-col gap-3">
                        {rfidPoints.map((point) => (
                            <li key={point} className="flex items-start gap-3 text-sm font-semibold leading-6 text-white/85">
                                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/15 text-royal-mint">
                                    <Check size={14} />
                                </span>
                                {point}
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="relative flex min-h-[460px] flex-col items-center justify-center">
                    <div aria-hidden="true" className="pointer-events-none absolute h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0)_70%)]" />
                    <div aria-hidden="true" className="pointer-events-none absolute h-[26rem] w-[26rem] rounded-full border border-dashed border-white/20" />
                    <CardLongArc5
                        gap={deckLayout.gap}
                        angle={12}
                        yOffset={deckLayout.yOffset}
                        widthClass={deckLayout.widthClass}
                        heightClass={deckLayout.heightClass}
                    />
                    <p className="mt-12 text-xs font-semibold uppercase tracking-[0.16em] text-white/60">
                        Hover or tap to spread the deck
                    </p>
                </div>
            </div>
        </section>
    );
}

function DifferentiatorSection() {
    return (
        <section id="architecture" className="relative scroll-mt-32 overflow-hidden bg-royal px-5 py-24 text-white sm:px-8 lg:py-32">
            <SectionTexture />
            <div data-reveal className="reveal relative mx-auto max-w-7xl">
                <div className="grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-24">
                    <div>
                        <p className="eyebrow-badge">
                            Why local-first
                        </p>
                        <h2 className="mt-4 text-4xl font-bold leading-[1.08] tracking-[-0.035em] sm:text-5xl">
                            Local-first is the architecture, not an emergency mode.
                        </h2>
                        <p className="mt-6 max-w-xl text-base leading-7 text-[#bcd4f7]">
                            The critical path ends with a durable local event and clear
                            kiosk feedback. Cloud synchronization follows as a separate,
                            recoverable process—so connectivity can change without
                            changing whether the tap was captured.
                        </p>
                    </div>

                    <div className="rounded-2xl bg-white/[0.07] p-5 sm:p-7">
                        <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center">
                            {[
                                ['01', 'Tap', 'Card read'],
                                ['02', 'Local', 'Event secured'],
                                ['03', 'Cloud', 'Synced safely'],
                            ].map(([number, title, detail], index) => (
                                <div key={title} className="contents">
                                    <div className="rounded-2xl bg-white/[0.08] p-5">
                                        <span className="text-[10px] font-bold tracking-[0.14em] text-[#75e2ae]">
                                            {number}
                                        </span>
                                        <strong className="mt-5 block text-lg">{title}</strong>
                                        <span className="mt-1 block text-xs text-[#bcd4f7]">{detail}</span>
                                    </div>
                                    {index < 2 && (
                                        <ArrowRight size={20} className="hidden text-[#75e2ae] sm:block" />
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="mt-5 flex items-center gap-3 rounded-2xl bg-[#e3f6ea] px-5 py-4 text-[#16472f]">
                            <Check size={20} className="shrink-0 text-station-success" />
                            <span className="text-sm font-bold">
                                Immediate feedback does not wait for the final step.
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

function ComparisonSection() {
    return (
        <section id="comparison" className="relative scroll-mt-32 overflow-hidden bg-royal px-5 py-24 sm:px-8 lg:py-32">
            <SectionTexture />
            <div data-reveal className="reveal relative mx-auto max-w-7xl">
                <div className="max-w-3xl">
                    <p className="eyebrow-badge">
                        Compare
                    </p>
                    <h2 className="mt-5 font-display text-4xl font-bold leading-[1.08] tracking-[-0.02em] text-white sm:text-5xl">
                        A more dependable operating model.
                    </h2>
                    <p className="mt-6 text-base leading-7 text-white/75">
                        Adaptive Station changes where reliability lives: on the
                        station at capture time, with the cloud coordinating everything
                        that follows.
                    </p>
                </div>

                <div className="mt-12 space-y-4 md:hidden">
                    {comparisonRows.map((row) => (
                        <article
                            key={row.concern}
                            className="card-hover overflow-hidden rounded-[32px] border border-[#E2E8F0] bg-white shadow-card-blue"
                        >
                            <h3 className="px-5 py-4 text-sm font-bold text-station-ink">
                                {row.concern}
                            </h3>
                            <div className="border-t border-station-line px-5 py-4">
                                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-station-muted">
                                    Network-dependent setup
                                </span>
                                <p className="mt-2 text-sm leading-6 text-station-muted">
                                    {row.conventional}
                                </p>
                            </div>
                            <div className="bg-[#f5f8fe] px-5 py-4">
                                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-station-blue">
                                    Adaptive Station
                                </span>
                                <p className="mt-2 flex items-start gap-3 text-sm leading-6 text-station-navy">
                                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-station-success-soft text-station-success">
                                        <Check size={14} />
                                    </span>
                                    {row.adaptive}
                                </p>
                            </div>
                        </article>
                    ))}
                </div>

                <div className="mt-12 hidden overflow-hidden rounded-[32px] border border-[#E2E8F0] bg-white shadow-card-blue md:block">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] border-collapse text-left">
                            <caption className="sr-only">
                                Comparison of network-dependent attendance systems and Adaptive Station
                            </caption>
                            <thead>
                                <tr className="bg-station-panel">
                                    <th className="w-[22%] px-6 py-5 text-xs font-bold uppercase tracking-[0.12em] text-station-muted">
                                        Operating concern
                                    </th>
                                    <th className="w-[36%] px-6 py-5 text-xs font-bold uppercase tracking-[0.12em] text-station-muted">
                                        Network-dependent setup
                                    </th>
                                    <th className="w-[42%] bg-[#dfeafb] px-6 py-5 text-xs font-bold uppercase tracking-[0.12em] text-station-blue">
                                        Adaptive Station
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-station-line">
                                {comparisonRows.map((row) => (
                                    <tr key={row.concern} className="align-top">
                                        <th className="px-6 py-5 text-sm font-bold text-station-ink">
                                            {row.concern}
                                        </th>
                                        <td className="px-6 py-5 text-sm leading-6 text-station-muted">
                                            {row.conventional}
                                        </td>
                                        <td className="bg-[#f5f8fe] px-6 py-5 text-sm leading-6 text-station-navy">
                                            <span className="flex items-start gap-3">
                                                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-station-success-soft text-station-success">
                                                    <Check size={14} />
                                                </span>
                                                {row.adaptive}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </section>
    );
}

interface FinalCallToActionProps {
    workspaceHref: string;
    workspaceLabel: string;
}

const ctaTrustPoints = [
    'Offline-first capture',
    'Zero duplicate records',
    'School-isolated data',
    'Staged rollout',
];

const ctaStations = [
    { initials: 'MG', name: 'Main gate', tint: 'from-royal to-royal-deep' },
    { initials: 'LB', name: 'Library', tint: 'from-[#5C7AE8] to-royal' },
    { initials: 'SR', name: 'Staff room', tint: 'from-royal-deep to-royal-ink' },
];

function FinalCallToAction({ workspaceHref, workspaceLabel }: FinalCallToActionProps) {
    return (
        <section className="bg-royal px-5 pb-28 sm:px-8">
            <div data-reveal className="reveal relative mx-auto max-w-7xl overflow-hidden rounded-[3rem] bg-gradient-to-br from-royal-ink via-[#142780] to-station-navy px-6 py-20 text-center shadow-station-float ring-1 ring-white/15 sm:px-16 sm:py-24">
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="absolute left-12 top-12 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(35,78,244,0.55)_0%,rgba(35,78,244,0)_70%)]" />
                    <div className="absolute bottom-12 right-12 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(92,122,232,0.35)_0%,rgba(92,122,232,0)_70%)]" />
                    <div className="absolute inset-0 bg-dot-grid opacity-10" />
                </div>

                <div className="relative inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white shadow-lg backdrop-blur-md">
                    <span className="relative flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-royal-mint opacity-75 motion-reduce:animate-none" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-royal-mint" />
                    </span>
                    <span>Station network online</span>
                    <span className="text-white/30">·</span>
                    <span className="text-royal-mist">Taps flowing now</span>
                </div>

                <h2 className="relative mx-auto mt-6 max-w-4xl font-display text-4xl font-extrabold tracking-[-0.02em] text-white sm:text-5xl lg:text-6xl">
                    Keep the tap simple.{' '}
                    <span className="bg-gradient-to-r from-white via-royal-mist to-white bg-clip-text text-transparent">
                        Make everything around it stronger.
                    </span>
                </h2>

                <p className="relative mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/75 sm:text-lg">
                    See how Adaptive Station protects the moment of capture,
                    then gives school teams the visibility to manage what comes next.
                </p>

                <div className="relative mx-auto mt-10 max-w-2xl rounded-3xl border border-white/20 bg-white/10 p-5 text-left shadow-2xl backdrop-blur-xl">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3.5">
                            <div className="flex -space-x-2.5">
                                {ctaStations.map((station) => (
                                    <span
                                        key={station.initials}
                                        title={station.name}
                                        className={`grid h-10 w-10 place-items-center rounded-full bg-gradient-to-tr text-xs font-bold text-white ring-2 ring-white/60 ${station.tint}`}
                                    >
                                        {station.initials}
                                    </span>
                                ))}
                                <span className="grid h-10 w-10 place-items-center rounded-full bg-white/15 text-xs font-bold text-white ring-2 ring-white/60">
                                    +9
                                </span>
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-white">Stations reporting in</span>
                                    <span className="inline-flex items-center gap-1 rounded-full bg-royal-mint/20 px-2 py-0.5 text-[10px] font-bold text-royal-mint">
                                        <span className="h-1.5 w-1.5 rounded-full bg-royal-mint" />
                                        Live
                                    </span>
                                </div>
                                <span className="mt-1 block text-[11px] text-white/65">Gates, libraries and offices on one view</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 font-mono text-xs font-medium text-royal-mint">
                            <span>99.98% local capture</span>
                        </div>
                    </div>
                </div>

                <div className="relative mt-9 flex flex-wrap items-center justify-center gap-4">
                    <Link
                        href={workspaceHref}
                        className="ds-btn-hero group focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-royal-ink"
                    >
                        {workspaceLabel}
                        <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-1" />
                    </Link>
                    <a
                        href="#architecture"
                        className="tactile-press btn-glass-secondary inline-flex items-center gap-2 rounded-full bg-white/80 px-8 py-4 text-sm font-semibold text-slate-800 shadow-sm backdrop-blur transition duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-0.5 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-royal-ink"
                    >
                        <span className="relative z-10">Explore Architecture</span>
                    </a>
                </div>

                <div className="relative mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-2.5 text-xs font-semibold text-white/70">
                    {ctaTrustPoints.map((point) => (
                        <span key={point} className="inline-flex items-center gap-1.5">
                            <Check size={14} className="text-royal-mint" />
                            {point}
                        </span>
                    ))}
                </div>
            </div>
        </section>
    );
}

interface LandingPageProps {
    auth?: { user?: User };
}

export default function LandingPage({ auth }: LandingPageProps) {
    const isAuthenticated = Boolean(auth?.user);
    const workspaceHref = isAuthenticated ? route('dashboard') : route('login');
    const workspaceLabel = isAuthenticated ? 'Open dashboard' : 'Log in';
    useScrollReveals();

    return (
        <div className="min-h-screen overflow-x-hidden bg-royal font-sans text-white selection:bg-white selection:text-royal">
            <Head>
                <title>Offline-first RFID attendance for schools</title>
                <meta
                    head-key="description"
                    name="description"
                    content="Adaptive Station helps schools record RFID attendance locally, synchronize safely, monitor stations, and manage attendance from one portal."
                />
            </Head>

            <a
                href="#main-content"
                className="fixed left-4 top-4 z-[60] -translate-y-24 rounded-full bg-station-navy px-5 py-3 text-sm font-bold text-white transition-transform focus:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-station-blue-bright focus-visible:ring-offset-2"
            >
                Skip to content
            </a>

            <FloatingHeader
                homeHref={route('home')}
                navItems={primaryNavItems}
                ctaHref={workspaceHref}
                ctaLabel={workspaceLabel}
            />

            <main id="main-content">
                <section className="relative overflow-hidden bg-royal px-6 pb-20 pt-40 sm:pb-24 sm:pt-48 lg:px-8 lg:pt-52">
                    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
                        <div className="absolute inset-0 animate-texture-pan bg-dot-grid opacity-70 motion-reduce:animate-none [mask-image:radial-gradient(ellipse_80%_65%_at_50%_25%,black,transparent)]" />
                        <div className="absolute inset-0 bg-dot-grid opacity-40 [mask-image:radial-gradient(ellipse_75%_70%_at_50%_35%,black,transparent)]" />
                        <div className="absolute left-10 top-24 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.22)_0%,rgba(255,255,255,0)_70%)]" />
                        <div className="absolute right-10 top-48 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(10,27,115,0.4)_0%,rgba(10,27,115,0)_70%)]" />
                    </div>
                    <div
                        className="reveal relative mx-auto grid max-w-7xl items-center gap-12 text-center lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:text-left"
                        data-reveal
                    >
                        <div>
                            <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white shadow-lg backdrop-blur">
                                <span className="relative flex h-2 w-2">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-royal-mint opacity-75 motion-reduce:animate-none" />
                                    <span className="relative inline-flex h-2 w-2 rounded-full bg-royal-mint" />
                                </span>
                                <span>Offline-first RFID attendance</span>
                                <span className="text-white/30">·</span>
                                <span className="font-bold">No network needed</span>
                            </p>
                            <h1 className="mx-auto mt-8 max-w-4xl font-display text-5xl font-extrabold leading-[1.05] tracking-[-0.02em] text-white sm:text-6xl lg:mx-0 lg:text-7xl">
                                Attendance that keeps moving —{' '}
                                <span className="bg-gradient-to-r from-white via-white to-royal-mist bg-clip-text text-transparent">
                                    even when the network doesn&apos;t.
                                </span>
                            </h1>
                            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg sm:leading-8 lg:mx-0">
                                Adaptive Station records RFID taps on the kiosk first,
                                synchronizes them safely when connectivity returns, and
                                gives school teams one clear place to manage attendance.
                            </p>
                            <div className="mt-10 flex flex-wrap items-center justify-center gap-4 lg:justify-start">
                                <Link
                                    href={workspaceHref}
                                    className="ds-btn-hero group focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-royal"
                                >
                                    {workspaceLabel}
                                    <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-1" />
                                </Link>
                                <a
                                    href="#architecture"
                                    className="tactile-press btn-glass-secondary inline-flex items-center gap-2 rounded-full bg-white/80 px-8 py-4 text-sm font-semibold text-slate-800 shadow-sm backdrop-blur transition duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-0.5 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-royal"
                                >
                                    <span className="relative z-10">Explore Architecture</span>
                                </a>
                            </div>
                            <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs font-semibold text-white/75 lg:justify-start">
                                <span className="inline-flex items-center gap-2">
                                    <Check size={16} className="text-royal-mint" />
                                    Built for student and staff attendance
                                </span>
                                <span className="inline-flex items-center gap-2">
                                    <Check size={16} className="text-royal-mint" />
                                    Works alongside existing school systems
                                </span>
                            </div>
                        </div>

                        <div className="relative mx-auto w-full max-w-sm lg:max-w-none">
                            <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden">
                                <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.3)_0%,rgba(255,255,255,0)_70%)]" />
                                <div className="absolute bottom-0 right-4 h-52 w-52 rounded-full bg-[radial-gradient(circle,rgba(143,240,198,0.4)_0%,rgba(143,240,198,0)_70%)]" />
                            </div>
                            <img
                                src={turnstileGateImage}
                                alt="Adaptive Station RFID swing gate turnstile hardware"
                                width={1374}
                                height={1145}
                                className="relative mx-auto w-full max-w-[420px] drop-shadow-[0_35px_65px_rgba(8,15,45,0.5)] lg:max-w-[480px]"
                            />
                        </div>
                    </div>
                </section>

                <CapabilityMarquee />
                <StatsBand />
                <ProblemSection />
                <FeaturesSection />
                <WorkflowSection />
                <RfidSection />
                <DifferentiatorSection />
                <ComparisonSection />
                <TestimonialsSection />
                <FaqSection />
                <FinalCallToAction
                    workspaceHref={workspaceHref}
                    workspaceLabel={workspaceLabel}
                />
            </main>

            <div className="bg-royal px-5 pb-6 sm:px-8">
                <footer className="mx-auto max-w-7xl rounded-3xl border border-[#E2E8F0] bg-white shadow-card-blue">
                    <div className="px-6 py-10 lg:px-10">
                        <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
                            <Brand compact />
                            <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-sm font-semibold text-station-muted">
                                <a
                                    href="#capabilities"
                                    className="transition-colors hover:text-royal focus:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-royal"
                                >
                                    Capabilities
                                </a>
                                <a
                                    href="#rfid"
                                    className="transition-colors hover:text-royal focus:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-royal"
                                >
                                    RFID cards
                                </a>
                                <a
                                    href="#faq"
                                    className="transition-colors hover:text-royal focus:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-royal"
                                >
                                    FAQ
                                </a>
                            </div>
                            <Link
                                href={workspaceHref}
                                className="pressable hover-lift inline-flex w-fit items-center gap-2 rounded-full bg-royal px-5 py-2.5 text-sm font-bold text-white shadow-card-blue transition-[transform,background-color,box-shadow] duration-200 hover:bg-royal-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-royal focus-visible:ring-offset-2"
                            >
                                {workspaceLabel}
                                <ArrowRight size={16} />
                            </Link>
                        </div>
                        <div className="mt-10 flex flex-col gap-4 border-t border-station-line pt-8 text-xs text-station-muted sm:flex-row sm:items-center sm:justify-between">
                            <p>© {new Date().getFullYear()} Adaptive Station. Attendance that keeps moving.</p>
                            <div className="flex items-center gap-5 font-semibold">
                                <span>Offline-first</span>
                                <span>No duplicates</span>
                                <span>School-isolated</span>
                            </div>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}

import StationLogo from '@/Components/Branding/StationLogo';
import { Head, Link } from '@inertiajs/react';
import { User } from '@/types';

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
        title: 'Provision the school',
        description:
            'Set up the school, administrators, station records, people, and cards in one controlled workspace.',
    },
    {
        title: 'Record every tap locally',
        description:
            'The kiosk validates the card and saves the attendance event to local storage before the network is involved.',
    },
    {
        title: 'Synchronize safely',
        description:
            'Pending events retry after connectivity returns, with device-generated IDs preventing duplicate records.',
    },
    {
        title: 'Review and export',
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

interface ArrowIconProps {
    className?: string;
}

function ArrowIcon({ className = 'h-4 w-4' }: ArrowIconProps) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
        >
            <path
                d="M5 12h14m-5-5 5 5-5 5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

interface CheckIconProps {
    className?: string;
}

function CheckIcon({ className = 'h-4 w-4' }: CheckIconProps) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
        >
            <path
                d="m5 12.5 4.2 4.2L19 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

interface TapSignalIconProps {
    className?: string;
}

function TapSignalIcon({ className = 'h-6 w-6' }: TapSignalIconProps) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
        >
            <path
                d="M8.5 8.5a5 5 0 0 1 0 7M12 5a10 10 0 0 1 0 14M5 11a1.5 1.5 0 0 1 0 2"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
            />
        </svg>
    );
}

interface CloudIconProps {
    className?: string;
}

function CloudIcon({ className = 'h-6 w-6' }: CloudIconProps) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
        >
            <path
                d="M7 18h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.2 8.2 4.8 4.8 0 0 0 7 18Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="m9 14 2 2 4-4"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

interface ChartIconProps {
    className?: string;
}

function ChartIcon({ className = 'h-6 w-6' }: ChartIconProps) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
        >
            <path
                d="M5 19V9m7 10V5m7 14v-7M3 19h18"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

interface LinkIconProps {
    className?: string;
}

function LinkIcon({ className = 'h-6 w-6' }: LinkIconProps) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
        >
            <path
                d="M8.5 15.5 15.5 8M7 17H5a4 4 0 0 1 0-8h4m6 6h4a4 4 0 0 0 0-8h-2"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
            />
        </svg>
    );
}

interface ProblemIconProps {
    type: 'connection' | 'database' | 'visibility';
}

function ProblemIcon({ type }: ProblemIconProps) {
    const paths = {
        connection: (
            <>
                <path d="M5 9.5a10.5 10.5 0 0 1 14 0M8.5 13a5.5 5.5 0 0 1 7 0" />
                <path d="M12 17h.01M4 4l16 16" />
            </>
        ),
        database: (
            <>
                <ellipse cx="12" cy="5.5" rx="7" ry="3" />
                <path d="M5 5.5v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6M5 11.5v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
            </>
        ),
        visibility: (
            <>
                <path d="M3 12s3.4-6 9-6 9 6 9 6-3.4 6-9 6-9-6-9-6Z" />
                <circle cx="12" cy="12" r="2.5" />
            </>
        ),
    };

    return (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <g
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                {paths[type]}
            </g>
        </svg>
    );
}

interface BrandProps {
    compact?: boolean;
}

function Brand({ compact = false }: BrandProps) {
    return (
        <span className="inline-flex items-center gap-3">
            <span
                className={`grid place-items-center ${
                    compact ? 'h-9 w-9' : 'h-11 w-11'
                }`}
            >
                <StationLogo className="h-full w-full object-contain" />
            </span>
            <span className="text-[15px] font-bold tracking-[-0.02em] text-station-navy">
                Adaptive Station
            </span>
        </span>
    );
}

function HeroDemonstration() {
    return (
        <div
            className="relative mx-auto w-full max-w-[590px] lg:mx-0"
            aria-label="Illustrative Adaptive Station tap and synchronization workflow"
        >
            <div className="absolute -left-10 top-16 h-44 w-44 rounded-full bg-[#d9f3e4] opacity-60 blur-3xl" />
            <div className="absolute -right-8 bottom-4 h-52 w-52 rounded-full bg-[#d6e5f9] opacity-80 blur-3xl" />

            <div className="relative overflow-hidden rounded-2xl bg-white shadow-station-float">
                <div className="flex items-center justify-between border-b border-station-line px-5 py-4 sm:px-6">
                    <div className="flex items-center gap-2.5">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-station-success opacity-30 motion-reduce:animate-none" />
                            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-station-success" />
                        </span>
                        <span className="text-xs font-bold uppercase tracking-[0.14em] text-station-blue">
                            Station ready
                        </span>
                    </div>
                    <span className="text-xs font-semibold tabular-nums text-station-muted">
                        08:01 AM
                    </span>
                </div>

                <div className="grid gap-5 p-5 sm:grid-cols-[1fr_0.8fr] sm:p-6">
                    <div className="relative flex min-h-[270px] flex-col overflow-hidden rounded-2xl bg-station-navy p-5 text-white">
                        <div className="flex items-center justify-between gap-4">
                            <span className="text-xs font-semibold text-[#bcd4f7]">
                                Main gate · Station 01
                            </span>
                            <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#bcd4f7]">
                                Local mode
                            </span>
                        </div>

                        <div className="my-auto flex flex-col items-center py-6 text-center">
                            <span className="relative grid h-24 w-24 place-items-center rounded-full border border-white/20 bg-white/[0.06]">
                                <span className="absolute h-16 w-16 animate-signal-pulse rounded-full border border-[#97bff6]/40 motion-reduce:animate-none" />
                                <TapSignalIcon className="relative h-10 w-10" />
                            </span>
                            <strong className="mt-5 text-xl tracking-[-0.02em]">
                                Hold your card near the reader
                            </strong>
                            <span className="mt-2 text-xs leading-5 text-[#bcd4f7]">
                                Validation and event capture happen on this station first.
                            </span>
                        </div>

                        <div className="flex items-center justify-between border-t border-white/10 pt-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#bcd4f7]">
                            <span>RFID ready</span>
                            <span>SQLite active</span>
                        </div>
                    </div>

                    <div className="flex min-h-[270px] flex-col gap-3">
                        <div className="rounded-2xl bg-station-success-soft p-4 text-[#16472f]">
                            <div className="flex items-start gap-3">
                                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-station-success">
                                    <CheckIcon className="h-5 w-5" />
                                </span>
                                <div>
                                    <strong className="block text-sm">Tap saved locally</strong>
                                    <span className="mt-1 block text-xs leading-5 text-[#527663]">
                                        Clock-in · event ID secured
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-1 flex-col justify-between rounded-2xl bg-station-panel p-4">
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-station-blue">
                                    Sync queue
                                </span>
                                <div className="mt-4 flex items-center gap-3">
                                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-station-blue-bright">
                                        <CloudIcon />
                                    </span>
                                    <div>
                                        <strong className="block text-sm text-station-ink">
                                            Safe to reconnect
                                        </strong>
                                        <span className="mt-0.5 block text-xs text-station-muted">
                                            Known events will not duplicate
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-5">
                                <div className="flex items-center justify-between text-[11px] font-semibold text-station-muted">
                                    <span>Local save</span>
                                    <span>Cloud accepted</span>
                                </div>
                                <div className="relative mt-3 h-1.5 rounded-full bg-[#cfddf0]">
                                    <div className="absolute inset-y-0 left-0 w-[82%] rounded-full bg-station-blue-bright" />
                                    <span className="absolute -top-1 right-[16%] h-3.5 w-3.5 rounded-full border-2 border-white bg-station-blue-bright" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 bg-[#f8faff] px-5 py-3 text-[11px] text-station-muted sm:px-6">
                    <span className="font-semibold">Illustrative workflow</span>
                    <span>Local save → safe queue → authenticated sync</span>
                </div>
            </div>
        </div>
    );
}

function CapabilityMarquee() {
    return (
        <section
            className="overflow-hidden border-y border-station-line bg-white py-4"
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
                        className="flex items-center gap-4 px-6 text-xs font-bold uppercase tracking-[0.13em] text-station-blue sm:px-8"
                    >
                        <span className="h-1.5 w-1.5 rounded-full bg-station-success" />
                        <span>{signal}</span>
                    </div>
                ))}
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
        <section className="bg-white px-5 py-24 sm:px-8 lg:py-32">
            <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[0.86fr_1.14fr] lg:gap-24">
                <div>
                    <h2 className="max-w-xl text-4xl font-bold leading-[1.08] tracking-[-0.035em] text-station-navy sm:text-5xl">
                        Attendance should not inherit every weakness of the network.
                    </h2>
                    <p className="mt-6 max-w-lg text-base leading-7 text-station-muted">
                        The moment a student or staff member taps is too important to
                        make conditional. Adaptive Station separates reliable local
                        capture from cloud coordination.
                    </p>
                </div>

                <div className="divide-y divide-station-line border-y border-station-line">
                    {problems.map((problem) => (
                        <div
                            key={problem.title}
                            className="grid gap-4 py-7 sm:grid-cols-[44px_1fr] sm:gap-6"
                        >
                            <span className="grid h-11 w-11 place-items-center rounded-xl bg-station-warning-soft text-station-warning">
                                <ProblemIcon type={problem.icon} />
                            </span>
                            <div>
                                <h3 className="text-lg font-bold tracking-[-0.02em] text-station-ink">
                                    {problem.title}
                                </h3>
                                <p className="mt-2 max-w-2xl text-sm leading-6 text-station-muted">
                                    {problem.description}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function FeaturesSection() {
    return (
        <section id="capabilities" className="scroll-mt-24 bg-station-canvas px-5 py-24 sm:px-8 lg:py-32">
            <div className="mx-auto max-w-7xl">
                <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
                    <h2 className="max-w-3xl text-4xl font-bold leading-[1.08] tracking-[-0.035em] text-station-navy sm:text-5xl">
                        One attendance operation, from the reader to the report.
                    </h2>
                    <p className="max-w-md text-sm leading-6 text-station-muted lg:text-right">
                        Each layer has a clear job: kiosks keep tapping responsive,
                        the cloud coordinates safely, and the portal gives school
                        teams control.
                    </p>
                </div>

                <div className="mt-14 grid gap-5 lg:grid-cols-12">
                    <article className="overflow-hidden rounded-2xl bg-station-navy p-7 text-white lg:col-span-7 lg:p-9">
                        <div className="grid gap-10 md:grid-cols-[0.9fr_1.1fr] md:items-end">
                            <div>
                                <TapSignalIcon className="h-8 w-8 text-[#97bff6]" />
                                <h3 className="mt-8 text-3xl font-bold tracking-[-0.03em]">
                                    The kiosk keeps the line moving.
                                </h3>
                                <p className="mt-4 text-sm leading-6 text-[#bcd4f7]">
                                    Local card lookup, duplicate protection, IN/OUT
                                    determination, and SQLite-first persistence happen
                                    before any network request.
                                </p>
                            </div>
                            <div className="rounded-2xl bg-white/[0.07] p-4">
                                <div className="flex items-center justify-between border-b border-white/10 pb-4 text-[11px] font-semibold text-[#bcd4f7]">
                                    <span>Tap path</span>
                                    <span className="text-[#75e2ae]">Available offline</span>
                                </div>
                                <div className="mt-4 space-y-3">
                                    {['Card validated', 'Event written locally', 'Feedback shown'].map(
                                        (item) => (
                                            <div
                                                key={item}
                                                className="flex items-center gap-3 rounded-xl bg-white/[0.06] px-4 py-3 text-sm font-semibold"
                                            >
                                                <CheckIcon className="h-4 w-4 text-[#75e2ae]" />
                                                {item}
                                            </div>
                                        ),
                                    )}
                                </div>
                            </div>
                        </div>
                    </article>

                    <article className="rounded-2xl border border-station-line bg-white p-7 lg:col-span-5 lg:p-9">
                        <CloudIcon className="h-8 w-8 text-station-blue-bright" />
                        <h3 className="mt-8 text-2xl font-bold tracking-[-0.03em] text-station-navy">
                            Retries are safe by design.
                        </h3>
                        <p className="mt-4 text-sm leading-6 text-station-muted">
                            Device-generated event IDs let the cloud accept known
                            retries without inserting attendance twice.
                        </p>
                        <div className="mt-8 divide-y divide-station-line rounded-2xl bg-station-panel px-5">
                            {[
                                ['evt_7f2a', 'Accepted'],
                                ['evt_7f2b', 'Accepted'],
                                ['evt_7f2a', 'Known retry'],
                            ].map(([event, state]) => (
                                <div
                                    key={`${event}-${state}`}
                                    className="flex items-center justify-between gap-4 py-3 text-xs"
                                >
                                    <code className="font-mono text-station-blue">{event}</code>
                                    <span className="font-semibold text-station-success">{state}</span>
                                </div>
                            ))}
                        </div>
                    </article>

                    <article className="rounded-2xl border border-station-line bg-white p-7 lg:col-span-5 lg:p-9">
                        <ChartIcon className="h-8 w-8 text-station-blue-bright" />
                        <h3 className="mt-8 text-2xl font-bold tracking-[-0.03em] text-station-navy">
                            School operations stay visible.
                        </h3>
                        <p className="mt-4 text-sm leading-6 text-station-muted">
                            Manage people, RFID assignments, attendance searches,
                            exports, users, and station settings from the portal.
                        </p>
                        <div className="mt-8 grid grid-cols-2 gap-3">
                            {['People', 'RFID cards', 'Attendance', 'Stations'].map((item) => (
                                <div
                                    key={item}
                                    className="rounded-xl bg-station-canvas px-4 py-3 text-xs font-bold text-station-blue"
                                >
                                    {item}
                                </div>
                            ))}
                        </div>
                    </article>

                    <article className="overflow-hidden rounded-2xl bg-[#dfeafb] p-7 lg:col-span-7 lg:p-9">
                        <div className="grid gap-10 md:grid-cols-[1fr_0.9fr] md:items-center">
                            <div>
                                <LinkIcon className="h-8 w-8 text-station-blue" />
                                <h3 className="mt-8 text-3xl font-bold tracking-[-0.03em] text-station-navy">
                                    Connect without making the connection a dependency.
                                </h3>
                                <p className="mt-4 text-sm leading-6 text-[#526989]">
                                    Import school rosters and RFID mappings, then
                                    optionally export attendance back to an existing
                                    School Management System during a staged transition.
                                </p>
                            </div>
                            <div className="flex items-center justify-center gap-3" aria-hidden="true">
                                <span className="grid h-20 w-20 place-items-center rounded-2xl bg-white text-center text-[10px] font-bold uppercase tracking-[0.1em] text-station-blue">
                                    School
                                    <br /> system
                                </span>
                                <span className="relative h-px flex-1 bg-station-blue/30">
                                    <span className="absolute -top-1 right-0 h-2 w-2 rotate-45 border-r border-t border-station-blue" />
                                    <span className="absolute -bottom-1 left-0 h-2 w-2 -rotate-[135deg] border-r border-t border-station-blue" />
                                </span>
                                <span className="grid h-20 w-20 place-items-center">
                                    <StationLogo className="h-full w-full object-contain" />
                                </span>
                            </div>
                        </div>
                    </article>
                </div>
            </div>
        </section>
    );
}

function WorkflowSection() {
    return (
        <section id="workflow" className="scroll-mt-24 bg-white px-5 py-24 sm:px-8 lg:py-32">
            <div className="mx-auto max-w-7xl">
                <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24">
                    <div>
                        <h2 className="text-4xl font-bold leading-[1.08] tracking-[-0.035em] text-station-navy sm:text-5xl">
                            From first setup to daily attendance.
                        </h2>
                        <p className="mt-6 max-w-md text-base leading-7 text-station-muted">
                            A deliberate path lets a school introduce Adaptive Station
                            without abandoning a working process overnight.
                        </p>
                    </div>

                    <ol className="relative border-l border-station-line pl-8 sm:pl-10">
                        {workflowSteps.map((step, index) => (
                            <li
                                key={step.title}
                                className="relative pb-10 last:pb-0"
                            >
                                <span className="absolute -left-[49px] top-0 grid h-9 w-9 place-items-center rounded-full bg-station-navy-soft text-xs font-bold tabular-nums text-white sm:-left-[57px]">
                                    {index + 1}
                                </span>
                                <h3 className="text-xl font-bold tracking-[-0.02em] text-station-ink">
                                    {step.title}
                                </h3>
                                <p className="mt-2 max-w-2xl text-sm leading-6 text-station-muted">
                                    {step.description}
                                </p>
                            </li>
                        ))}
                    </ol>
                </div>
            </div>
        </section>
    );
}

function DifferentiatorSection() {
    return (
        <section className="bg-station-navy px-5 py-24 text-white sm:px-8 lg:py-32">
            <div className="mx-auto max-w-7xl">
                <div className="grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-24">
                    <div>
                        <h2 className="text-4xl font-bold leading-[1.08] tracking-[-0.035em] sm:text-5xl">
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
                                        <ArrowIcon className="hidden h-5 w-5 text-[#75e2ae] sm:block" />
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="mt-5 flex items-center gap-3 rounded-2xl bg-[#e3f6ea] px-5 py-4 text-[#16472f]">
                            <CheckIcon className="h-5 w-5 shrink-0 text-station-success" />
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
        <section id="comparison" className="scroll-mt-24 bg-station-canvas px-5 py-24 sm:px-8 lg:py-32">
            <div className="mx-auto max-w-7xl">
                <div className="max-w-3xl">
                    <h2 className="text-4xl font-bold leading-[1.08] tracking-[-0.035em] text-station-navy sm:text-5xl">
                        A more dependable operating model.
                    </h2>
                    <p className="mt-6 text-base leading-7 text-station-muted">
                        Adaptive Station changes where reliability lives: on the
                        station at capture time, with the cloud coordinating everything
                        that follows.
                    </p>
                </div>

                <div className="mt-12 space-y-4 md:hidden">
                    {comparisonRows.map((row) => (
                        <article
                            key={row.concern}
                            className="overflow-hidden rounded-2xl border border-station-line bg-white"
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
                                        <CheckIcon className="h-3.5 w-3.5" />
                                    </span>
                                    {row.adaptive}
                                </p>
                            </div>
                        </article>
                    ))}
                </div>

                <div className="mt-12 hidden overflow-hidden rounded-2xl border border-station-line bg-white md:block">
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
                                                    <CheckIcon className="h-3.5 w-3.5" />
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

function FinalCallToAction({ workspaceHref, workspaceLabel }: FinalCallToActionProps) {
    return (
        <section className="bg-white px-5 py-16 sm:px-8 lg:py-24">
            <div className="mx-auto max-w-7xl overflow-hidden rounded-2xl bg-[#dfeafb] px-6 py-14 sm:px-12 lg:px-16 lg:py-16">
                <div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
                    <div>
                        <h2 className="max-w-3xl text-4xl font-bold leading-[1.08] tracking-[-0.035em] text-station-navy sm:text-5xl">
                            Keep the tap simple. Make everything around it stronger.
                        </h2>
                        <p className="mt-6 max-w-2xl text-base leading-7 text-[#526989]">
                            See how Adaptive Station protects the moment of capture,
                            then gives school teams the visibility to manage what comes next.
                        </p>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                        <a
                            href="#workflow"
                            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-station-navy-soft px-6 text-sm font-bold text-white transition-colors hover:bg-station-navy focus:outline-none focus-visible:ring-2 focus-visible:ring-station-blue-bright focus-visible:ring-offset-2"
                        >
                            Review the workflow
                            <ArrowIcon />
                        </a>
                        <Link
                            href={workspaceHref}
                            className="inline-flex h-12 items-center justify-center rounded-full border border-[#b9c9df] bg-white px-6 text-sm font-bold text-station-navy transition-colors hover:border-station-blue-bright hover:bg-[#f8faff] focus:outline-none focus-visible:ring-2 focus-visible:ring-station-blue-bright focus-visible:ring-offset-2"
                        >
                            {workspaceLabel}
                        </Link>
                    </div>
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
    const workspaceLabel = isAuthenticated ? 'Open dashboard' : 'Sign in';

    return (
        <div className="min-h-screen overflow-x-hidden bg-station-canvas font-sans text-station-ink selection:bg-station-blue selection:text-white">
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

            <header className="sticky top-0 z-50 border-b border-station-line/80 bg-white/95 backdrop-blur-md">
                <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between gap-6 px-5 sm:px-8">
                    <Link
                        href={route('home')}
                        aria-label="Adaptive Station home"
                        className="rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-station-blue-bright focus-visible:ring-offset-2"
                    >
                        <Brand compact />
                    </Link>

                    <nav className="hidden items-center gap-8 lg:flex" aria-label="Main navigation">
                        <a
                            href="#capabilities"
                            className="text-sm font-semibold text-station-muted underline-offset-4 transition-colors hover:text-station-blue focus:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-station-blue-bright"
                        >
                            Capabilities
                        </a>
                        <a
                            href="#workflow"
                            className="text-sm font-semibold text-station-muted underline-offset-4 transition-colors hover:text-station-blue focus:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-station-blue-bright"
                        >
                            How it works
                        </a>
                        <a
                            href="#comparison"
                            className="text-sm font-semibold text-station-muted underline-offset-4 transition-colors hover:text-station-blue focus:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-station-blue-bright"
                        >
                            Compare
                        </a>
                    </nav>

                    <Link
                        href={workspaceHref}
                        className="inline-flex h-10 items-center justify-center rounded-full bg-station-navy-soft px-5 text-sm font-bold text-white transition-colors hover:bg-station-navy focus:outline-none focus-visible:ring-2 focus-visible:ring-station-blue-bright focus-visible:ring-offset-2"
                    >
                        {workspaceLabel}
                    </Link>
                </div>
            </header>

            <main id="main-content">
                <section className="relative overflow-hidden px-5 pb-20 pt-16 sm:px-8 sm:pb-24 sm:pt-20 lg:pb-28 lg:pt-24">
                    <div className="absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(circle_at_78%_22%,rgba(40,99,189,0.13),transparent_32%),radial-gradient(circle_at_10%_15%,rgba(83,222,160,0.1),transparent_25%)]" />
                    <div className="relative mx-auto grid max-w-7xl gap-14 lg:grid-cols-[0.88fr_1.12fr] lg:items-center lg:gap-16">
                        <div className="min-w-0 max-w-2xl">
                            <h1 className="text-5xl font-bold leading-[1.02] tracking-[-0.04em] text-station-navy sm:text-6xl lg:text-[72px]">
                                Attendance that keeps moving—<wbr />even when the network doesn't.
                            </h1>
                            <p className="mt-7 max-w-xl text-lg leading-8 text-station-muted">
                                Adaptive Station records RFID taps on the kiosk first,
                                synchronizes them safely when connectivity returns, and
                                gives school teams one clear place to manage attendance.
                            </p>
                            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                                <a
                                    href="#workflow"
                                    className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-station-navy-soft px-6 text-sm font-bold text-white transition-colors hover:bg-station-navy focus:outline-none focus-visible:ring-2 focus-visible:ring-station-blue-bright focus-visible:ring-offset-2"
                                >
                                    See how it works
                                    <ArrowIcon />
                                </a>
                                <Link
                                    href={workspaceHref}
                                    className="inline-flex h-12 items-center justify-center rounded-full border border-[#b9c9df] bg-white px-6 text-sm font-bold text-station-navy transition-colors hover:border-station-blue-bright hover:bg-[#f8faff] focus:outline-none focus-visible:ring-2 focus-visible:ring-station-blue-bright focus-visible:ring-offset-2"
                                >
                                    {workspaceLabel}
                                </Link>
                            </div>
                            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-xs font-semibold text-[#526989]">
                                <span className="inline-flex items-center gap-2">
                                    <CheckIcon className="h-4 w-4 text-station-success" />
                                    Built for student and staff attendance
                                </span>
                                <span className="inline-flex items-center gap-2">
                                    <CheckIcon className="h-4 w-4 text-station-success" />
                                    Works alongside existing school systems
                                </span>
                            </div>
                        </div>

                        <HeroDemonstration />
                    </div>
                </section>

                <CapabilityMarquee />
                <ProblemSection />
                <FeaturesSection />
                <WorkflowSection />
                <DifferentiatorSection />
                <ComparisonSection />
                <FinalCallToAction
                    workspaceHref={workspaceHref}
                    workspaceLabel={workspaceLabel}
                />
            </main>

            <footer className="border-t border-station-line bg-white px-5 py-8 sm:px-8">
                <div className="mx-auto flex max-w-7xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <Brand compact />
                    <div className="flex items-center gap-6 text-xs font-semibold text-station-muted">
                        <a
                            href="#capabilities"
                            className="transition-colors hover:text-station-blue focus:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-station-blue-bright"
                        >
                            Capabilities
                        </a>
                        <Link
                            href={workspaceHref}
                            className="transition-colors hover:text-station-blue focus:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-station-blue-bright"
                        >
                            {workspaceLabel}
                        </Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}

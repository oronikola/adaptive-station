import { Link } from '@inertiajs/react';
import { ArrowRightIcon } from '@/Components/icons/arrow-right';
import StationLogo from '@/Components/Branding/StationLogo';
import type { LandingTheme } from '@/hooks/useLandingTheme';

interface NavItem {
    label: string;
    href: string;
}

interface FloatingFooterProps {
    theme: LandingTheme;
    navItems: NavItem[];
    ctaHref: string;
    ctaLabel: string;
}

export default function FloatingFooter({
    theme,
    navItems,
    ctaHref,
    ctaLabel,
}: FloatingFooterProps) {
    const isLight = theme === 'light';

    return (
        <div className="relative z-40 flex justify-center px-4 pb-5 pt-2 sm:px-6 sm:pb-6">
            <div className="w-full max-w-5xl animate-footer-enter motion-reduce:animate-none">
                <footer
                    className={`relative overflow-hidden rounded-[1.75rem] shadow-station-header ring-1 backdrop-blur-xl sm:rounded-full ${
                        isLight
                            ? 'bg-white/88 ring-station-navy/10'
                            : 'bg-station-navy/90 ring-white/10'
                    }`}
                >
                    <div
                        aria-hidden="true"
                        className={`pointer-events-none absolute -inset-3 -z-10 rounded-[2rem] blur-2xl motion-reduce:hidden ${
                            isLight ? 'bg-station-navy/5' : 'bg-station-navy/10'
                        }`}
                    />
                    <div className="flex flex-col gap-4 px-4 py-4 sm:h-14 sm:flex-row sm:items-center sm:gap-3 sm:px-1.5 sm:py-0">
                        <a
                            href="#main-content"
                            aria-label="Adaptive Station home"
                            className={`pressable hover-lift grid h-11 w-11 shrink-0 place-items-center rounded-full focus:outline-none focus-visible:ring-2 ${
                                isLight
                                    ? 'bg-station-navy text-white hover:bg-station-navy-soft focus-visible:ring-royal'
                                    : 'bg-black/30 text-white hover:bg-black/45 focus-visible:ring-white/60'
                            }`}
                        >
                            <StationLogo className="icon-nudge h-5 w-5" />
                        </a>

                        <nav
                            className="flex flex-wrap items-center gap-1 sm:flex-1"
                            aria-label="Footer"
                        >
                            {navItems.map((item) => (
                                <a
                                    key={item.href}
                                    href={item.href}
                                    className={`hover-lift rounded-full px-3 py-2 text-sm font-semibold transition-[transform,background-color,color] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] focus:outline-none focus-visible:ring-2 motion-reduce:transition-none ${
                                        isLight
                                            ? 'text-station-navy/70 hover:bg-station-navy/5 hover:text-station-navy focus-visible:ring-royal'
                                            : 'text-white/75 hover:bg-white/10 hover:text-white focus-visible:ring-white/60'
                                    }`}
                                >
                                    {item.label}
                                </a>
                            ))}
                        </nav>

                        <p
                            className={`px-2 text-xs sm:ml-auto sm:px-0 ${
                                isLight ? 'text-station-muted' : 'text-white/55'
                            }`}
                        >
                            © {new Date().getFullYear()} Adaptive Station
                        </p>

                        <Link
                            href={ctaHref}
                            className={`pressable hover-lift inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 text-sm font-bold ${
                                isLight
                                    ? 'bg-royal text-white hover:bg-royal-deep'
                                    : 'bg-white text-station-navy hover:bg-station-canvas'
                            }`}
                        >
                            {ctaLabel}
                            <ArrowRightIcon size={16} />
                        </Link>
                    </div>
                </footer>
            </div>
        </div>
    );
}

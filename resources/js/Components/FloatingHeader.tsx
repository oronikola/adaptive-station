import { useEffect, useState } from 'react';
import { Link } from '@inertiajs/react';
import { Menu, X } from 'reicon-react';
import StationLogo from '@/Components/StationLogo';

interface NavItem {
    label: string;
    href: string;
}

interface FloatingHeaderProps {
    homeHref: string;
    navItems: NavItem[];
    ctaHref: string;
    ctaLabel: string;
}

export default function FloatingHeader({
    homeHref,
    navItems,
    ctaHref,
    ctaLabel,
}: FloatingHeaderProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const frame = requestAnimationFrame(() => setIsMounted(true));

        const handleScroll = () => {
            setIsScrolled(window.scrollY > 24);
        };

        handleScroll();
        window.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    useEffect(() => {
        if (!isMenuOpen) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsMenuOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isMenuOpen]);

    return (
        <div className="fixed inset-x-0 top-4 z-50 flex justify-center px-4 sm:top-6">
            <div
                className={`w-full max-w-fit animate-header-enter motion-reduce:animate-none ${
                    isMounted ? 'opacity-100' : 'opacity-0'
                }`}
            >
                <div
                    className={`relative bg-station-navy/90 shadow-station-header ring-1 ring-white/10 backdrop-blur-xl transition-[border-radius,background-color,box-shadow] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none ${
                        isMenuOpen ? 'rounded-3xl' : 'rounded-full'
                    } ${
                        isScrolled
                            ? 'bg-station-navy/95 shadow-station-header-scrolled'
                            : 'bg-station-navy/85'
                    }`}
                >
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute -inset-3 -z-10 rounded-[2rem] bg-station-navy/10 blur-2xl transition-opacity duration-300 motion-reduce:hidden"
                    />
                    <div className="flex h-14 items-center gap-1 px-1.5">
                    <Link
                        href={homeHref}
                        aria-label="Adaptive Station home"
                        className="pressable hover-lift group grid h-11 w-11 shrink-0 place-items-center rounded-full bg-black/30 text-white hover:bg-black/45 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 motion-reduce:transition-none"
                    >
                        <StationLogo className="icon-nudge h-5 w-5" />
                    </Link>

                    <nav
                        className="hidden items-center gap-1 px-2 lg:flex"
                        aria-label="Main navigation"
                    >
                        {navItems.map((item, index) => (
                            <a
                                key={item.href}
                                href={item.href}
                                style={{ transitionDelay: `${index * 40}ms` }}
                                className={`hover-lift group relative rounded-full px-4 py-2 text-sm font-semibold text-white/75 transition-[transform,background-color,color] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 motion-reduce:transition-none ${
                                    isMounted
                                        ? 'opacity-100'
                                        : '-translate-y-1 opacity-0'
                                }`}
                            >
                                {item.label}
                                <span
                                    aria-hidden="true"
                                    className="absolute inset-x-4 -bottom-px h-px origin-left scale-x-0 rounded-full bg-white/70 transition-transform duration-200 group-hover:scale-x-100 motion-reduce:hidden"
                                />
                            </a>
                        ))}
                    </nav>

                    <Link
                        href={ctaHref}
                        className="pressable hover-lift ml-1 hidden h-11 items-center justify-center whitespace-nowrap rounded-full bg-white px-5 text-sm font-bold text-station-navy hover:bg-station-canvas lg:inline-flex"
                    >
                        {ctaLabel}
                    </Link>

                    <button
                        type="button"
                        onClick={() => setIsMenuOpen((open) => !open)}
                        aria-expanded={isMenuOpen}
                        aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
                        className="pressable grid h-11 w-11 place-items-center rounded-full text-white transition-[transform,background-color] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 lg:hidden"
                    >
                        <span className="relative grid h-5 w-5 place-items-center">
                            <span
                                aria-hidden="true"
                                className={`absolute transition-[transform,opacity] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none ${
                                    isMenuOpen
                                        ? 'rotate-90 scale-50 opacity-0'
                                        : 'opacity-100'
                                }`}
                            >
                                <Menu size={20} />
                            </span>
                            <span
                                aria-hidden="true"
                                className={`absolute transition-[transform,opacity] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none ${
                                    isMenuOpen
                                        ? 'opacity-100'
                                        : '-rotate-90 scale-50 opacity-0'
                                }`}
                            >
                                <X size={20} />
                            </span>
                        </span>
                    </button>
                </div>

                <div
                    className={`grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none lg:hidden ${
                        isMenuOpen
                            ? 'grid-rows-[1fr] opacity-100'
                            : 'grid-rows-[0fr] opacity-0'
                    }`}
                >
                    <div className="overflow-hidden">
                        <div className="border-t border-white/10 px-3 pb-3 pt-2">
                            <nav className="flex flex-col" aria-label="Mobile navigation">
                                {navItems.map((item, index) => (
                                    <a
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setIsMenuOpen(false)}
                                        style={{
                                            transitionDelay: isMenuOpen
                                                ? `${80 + index * 60}ms`
                                                : '0ms',
                                        }}
                                        className={`rounded-xl px-4 py-3 text-sm font-semibold text-white/80 transition-[transform,background-color,color] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-white/10 hover:text-white motion-reduce:transition-none ${
                                            isMenuOpen
                                                ? 'opacity-100'
                                                : '-translate-y-1 opacity-0'
                                        }`}
                                    >
                                        {item.label}
                                    </a>
                                ))}
                            </nav>
                            <Link
                                href={ctaHref}
                                style={{
                                    transitionDelay: isMenuOpen
                                        ? `${80 + navItems.length * 60}ms`
                                        : '0ms',
                                }}
                                className={`pressable mt-2 flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-bold text-station-navy transition-[transform,background-color] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-station-canvas ${
                                    isMenuOpen
                                        ? 'opacity-100'
                                        : '-translate-y-1 opacity-0'
                                }`}
                            >
                                {ctaLabel}
                            </Link>
                        </div>
                    </div>
                </div>
                </div>
            </div>
        </div>
    );
}

import { useEffect, useState } from 'react';
import { Link } from '@inertiajs/react';
import { IdCardIcon } from '@/Components/icons/id-card';
import { MenuIcon } from '@/Components/icons/menu';
import { MoonIcon } from '@/Components/icons/moon';
import { SunIcon } from '@/Components/icons/sun';
import { XIcon } from '@/Components/icons/x';
import StationLogo from '@/Components/Branding/StationLogo';
import type { LandingTheme } from '@/hooks/useLandingTheme';

interface NavItem {
    label: string;
    href: string;
}

interface FloatingHeaderProps {
    homeHref: string;
    navItems: NavItem[];
    ctaHref: string;
    ctaLabel: string;
    theme: LandingTheme;
    onToggleTheme: () => void;
    parentCredentialsHref: string;
}

export default function FloatingHeader({
    homeHref,
    navItems,
    ctaHref,
    ctaLabel,
    theme,
    onToggleTheme,
    parentCredentialsHref,
}: FloatingHeaderProps) {
    const isLight = theme === 'light';
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
                    className={`relative shadow-station-header ring-1 backdrop-blur-xl transition-[border-radius,background-color,box-shadow] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none ${
                        isMenuOpen ? 'rounded-3xl' : 'rounded-full'
                    } ${
                        isLight
                            ? isScrolled
                                ? 'bg-white/95 ring-station-navy/10 shadow-station-header-scrolled'
                                : 'bg-white/88 ring-station-navy/10'
                            : isScrolled
                              ? 'bg-station-navy/95 ring-white/10 shadow-station-header-scrolled'
                              : 'bg-station-navy/85 ring-white/10'
                    }`}
                >
                    <div
                        aria-hidden="true"
                        className={`pointer-events-none absolute -inset-3 -z-10 rounded-[2rem] blur-2xl transition-opacity duration-300 motion-reduce:hidden ${
                            isLight ? 'bg-station-navy/5' : 'bg-station-navy/10'
                        }`}
                    />
                    <div className="flex h-14 items-center gap-1 px-1.5">
                    <Link
                        href={homeHref}
                        aria-label="Adaptive Station home"
                        className={`pressable hover-lift group grid h-11 w-11 shrink-0 place-items-center rounded-full focus:outline-none focus-visible:ring-2 motion-reduce:transition-none ${
                            isLight
                                ? 'bg-station-navy text-white hover:bg-station-navy-soft focus-visible:ring-royal'
                                : 'bg-black/30 text-white hover:bg-black/45 focus-visible:ring-white/60'
                        }`}
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
                                className={`hover-lift group relative rounded-full px-4 py-2 text-sm font-semibold transition-[transform,background-color,color] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] focus:outline-none focus-visible:ring-2 motion-reduce:transition-none ${
                                    isLight
                                        ? 'text-station-navy/70 hover:bg-station-navy/5 hover:text-station-navy focus-visible:ring-royal'
                                        : 'text-white/75 hover:bg-white/10 hover:text-white focus-visible:ring-white/60'
                                } ${
                                    isMounted
                                        ? 'opacity-100'
                                        : '-translate-y-1 opacity-0'
                                }`}
                            >
                                {item.label}
                                <span
                                    aria-hidden="true"
                                    className={`absolute inset-x-4 -bottom-px h-px origin-left scale-x-0 rounded-full transition-transform duration-200 group-hover:scale-x-100 motion-reduce:hidden ${
                                        isLight ? 'bg-station-navy/70' : 'bg-white/70'
                                    }`}
                                />
                            </a>
                        ))}
                    </nav>

                    <Link
                        href={parentCredentialsHref}
                        className={`pressable hover-lift ml-1 hidden h-11 items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-sm font-semibold lg:inline-flex focus:outline-none focus-visible:ring-2 ${
                            isLight
                                ? 'text-station-navy/70 hover:bg-station-navy/5 hover:text-station-navy focus-visible:ring-royal'
                                : 'text-white/75 hover:bg-white/10 hover:text-white focus-visible:ring-white/60'
                        }`}
                    >
                        <IdCardIcon size={16} />
                        Parent credentials
                    </Link>

                    <button
                        type="button"
                        onClick={onToggleTheme}
                        aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
                        className={`pressable hover-lift ml-1 hidden h-11 w-11 place-items-center rounded-full lg:grid focus:outline-none focus-visible:ring-2 ${
                            isLight
                                ? 'text-station-navy hover:bg-station-navy/5 focus-visible:ring-royal'
                                : 'text-white hover:bg-white/10 focus-visible:ring-white/60'
                        }`}
                    >
                        {isLight ? <MoonIcon size={18} /> : <SunIcon size={18} />}
                    </button>

                    <Link
                        href={ctaHref}
                        className={`pressable hover-lift ml-1 hidden h-11 items-center justify-center whitespace-nowrap rounded-full px-5 text-sm font-bold lg:inline-flex ${
                            isLight
                                ? 'bg-royal text-white hover:bg-royal-deep'
                                : 'bg-white text-station-navy hover:bg-station-canvas'
                        }`}
                    >
                        {ctaLabel}
                    </Link>

                    <button
                        type="button"
                        onClick={() => setIsMenuOpen((open) => !open)}
                        aria-expanded={isMenuOpen}
                        aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
                        className={`pressable grid h-11 w-11 place-items-center rounded-full transition-[transform,background-color] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] focus:outline-none focus-visible:ring-2 lg:hidden ${
                            isLight
                                ? 'text-station-navy hover:bg-station-navy/5 focus-visible:ring-royal'
                                : 'text-white hover:bg-white/10 focus-visible:ring-white/60'
                        }`}
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
                                <MenuIcon size={20} />
                            </span>
                            <span
                                aria-hidden="true"
                                className={`absolute transition-[transform,opacity] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none ${
                                    isMenuOpen
                                        ? 'opacity-100'
                                        : '-rotate-90 scale-50 opacity-0'
                                }`}
                            >
                                <XIcon size={20} />
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
                        <div
                            className={`px-3 pb-3 pt-2 ${
                                isLight ? 'border-t border-station-navy/10' : 'border-t border-white/10'
                            }`}
                        >
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
                                        className={`rounded-xl px-4 py-3 text-sm font-semibold transition-[transform,background-color,color] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none ${
                                            isLight
                                                ? 'text-station-navy/80 hover:bg-station-navy/5 hover:text-station-navy'
                                                : 'text-white/80 hover:bg-white/10 hover:text-white'
                                        } ${
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
                                href={parentCredentialsHref}
                                onClick={() => setIsMenuOpen(false)}
                                style={{
                                    transitionDelay: isMenuOpen
                                        ? `${80 + navItems.length * 60}ms`
                                        : '0ms',
                                }}
                                className={`rounded-xl px-4 py-3 text-sm font-semibold transition-[transform,background-color,color] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none ${
                                    isLight
                                        ? 'text-station-navy/80 hover:bg-station-navy/5 hover:text-station-navy'
                                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                                } ${
                                    isMenuOpen
                                        ? 'opacity-100'
                                        : '-translate-y-1 opacity-0'
                                }`}
                            >
                                Parent credentials
                            </Link>
                            <button
                                type="button"
                                onClick={onToggleTheme}
                                style={{
                                    transitionDelay: isMenuOpen
                                        ? `${80 + (navItems.length + 1) * 60}ms`
                                        : '0ms',
                                }}
                                className={`pressable mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold ${
                                    isLight
                                        ? 'bg-station-navy/5 text-station-navy'
                                        : 'bg-white/10 text-white'
                                } ${isMenuOpen ? 'opacity-100' : '-translate-y-1 opacity-0'}`}
                            >
                                {isLight ? <MoonIcon size={16} /> : <SunIcon size={16} />}
                                {isLight ? 'Switch to dark mode' : 'Switch to light mode'}
                            </button>
                            <Link
                                href={ctaHref}
                                style={{
                                    transitionDelay: isMenuOpen
                                        ? `${80 + (navItems.length + 2) * 60}ms`
                                        : '0ms',
                                }}
                                className={`pressable mt-2 flex h-11 items-center justify-center rounded-full px-5 text-sm font-bold transition-[transform,background-color] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] ${
                                    isLight
                                        ? 'bg-royal text-white hover:bg-royal-deep'
                                        : 'bg-white text-station-navy hover:bg-station-canvas'
                                } ${
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

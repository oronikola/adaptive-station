import PremiumSelect from '@/Components/PremiumSelect';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import type { PaginatedData, PaginationLink, Person, RfidCard } from '@/types';
import ManageHolderModal from './ManageHolderModal';
import '../../../../css/platform-dashboard.css';

interface RfidCardWithPerson extends RfidCard {
    card_uid: string;
    assigned_at: string;
    person?: Person;
}

interface RfidCardsListScreenProps {
    rfidCards: PaginatedData<RfidCardWithPerson>;
    stats?: {
        total_cards: number;
        active_cards: number;
        inactive_cards: number;
        assigned_cards: number;
    };
    filters: {
        search?: string;
        status?: string;
    };
}

interface StatCardProps {
    label: string;
    value: number;
    icon: 'cards' | 'active' | 'inactive' | 'assigned';
    tone: 'blue' | 'green' | 'amber' | 'violet';
}

const STAT_ICONS: Record<StatCardProps['icon'], React.ReactNode> = {
    cards: (
        <svg viewBox="0 0 24 24">
            <rect x="3" y="5" width="18" height="14" rx="3" />
            <path d="M3 10h18" />
            <path d="M7 15h2" />
        </svg>
    ),
    active: (
        <svg viewBox="0 0 24 24">
            <path d="m5 12 4.5 4.5L19 7" />
        </svg>
    ),
    inactive: (
        <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" />
            <path d="m4.9 4.9 14.2 14.2" />
        </svg>
    ),
    assigned: (
        <svg viewBox="0 0 24 24">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M19 11v6M22 14h-6" />
        </svg>
    ),
};

function StatCard({ label, value, icon, tone }: StatCardProps) {
    return (
        <div className="pf-stat-card">
            <span className={`pf-stat-icon pf-stat-icon--${tone}`}>
                {STAT_ICONS[icon]}
            </span>
            <div>
                <p className="pf-stat-label">{label}</p>
                <p className="pf-stat-value">{value}</p>
            </div>
        </div>
    );
}

function PaginationBar({ links }: { links: PaginationLink[] }) {
    if (!links || links.length <= 3) {
        return null;
    }

    return (
        <nav className="pf-pagination">
            {links.map((link: PaginationLink, index: number) => {
                const label = link.label
                    .replace('&laquo; Previous', '‹ Previous')
                    .replace('Next &raquo;', 'Next ›');

                if (link.url === null) {
                    return (
                        <span key={index} className="pf-page-link pf-page-link--disabled">
                            {label}
                        </span>
                    );
                }

                return (
                    <Link
                        key={index}
                        href={link.url}
                        preserveScroll
                        className={
                            'pf-page-link' +
                            (link.active ? ' pf-page-link--active' : '')
                        }
                    >
                        {label}
                    </Link>
                );
            })}
        </nav>
    );
}

export default function RfidCardsListScreen({
    rfidCards,
    stats,
    filters,
}: RfidCardsListScreenProps) {
    const [viewMode, setViewMode] = useState<'table' | 'gallery'>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('as-rfid-cards-view');
            if (saved === 'table' || saved === 'gallery') {
                return saved;
            }
        }
        return 'table';
    });

    useEffect(() => {
        localStorage.setItem('as-rfid-cards-view', viewMode);
    }, [viewMode]);

    const { data, setData } = useForm({
        search: filters.search ?? '',
        status: filters.status ?? '',
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        router.get(route('portal.rfid-cards.index'), data, {
            preserveState: true,
        });
    }

    const [selectedCardForManage, setSelectedCardForManage] = useState<RfidCardWithPerson | null>(null);
    const [copiedUid, setCopiedUid] = useState<string | null>(null);

    function handleCopyUid(uid: string) {
        navigator.clipboard.writeText(uid);
        setCopiedUid(uid);
        setTimeout(() => setCopiedUid(null), 2000);
    }

    // Default stats if not provided by backend
    const cardStats = stats ?? {
        total_cards: rfidCards.data.length,
        active_cards: rfidCards.data.filter((c) => c.is_active).length,
        inactive_cards: rfidCards.data.filter((c) => !c.is_active).length,
        assigned_cards: rfidCards.data.filter((c) => c.person_id && c.is_active).length,
    };

    return (
        <AdminLayout>
            <Head title="RFID Cards" />

            <div className="pf-dashboard">
                {/* Header */}
                <div className="pf-dashboard-header">
                    <div>
                        <h1 className="pf-dashboard-title">RFID Cards</h1>
                        <p className="pf-dashboard-subtitle">
                            Monitor, audit, and manage physical RFID access cards issued across students and staff.
                        </p>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="pf-stat-grid">
                    <StatCard
                        label="Total Cards"
                        value={cardStats.total_cards}
                        icon="cards"
                        tone="blue"
                    />
                    <StatCard
                        label="Active Cards"
                        value={cardStats.active_cards}
                        icon="active"
                        tone="green"
                    />
                    <StatCard
                        label="Inactive Cards"
                        value={cardStats.inactive_cards}
                        icon="inactive"
                        tone="amber"
                    />
                    <StatCard
                        label="Assigned Cards"
                        value={cardStats.assigned_cards}
                        icon="assigned"
                        tone="violet"
                    />
                </div>

                {/* Filter Bar */}
                <form onSubmit={submit} className="pf-filter-bar">
                    <div className="pf-field">
                        <label htmlFor="search">Card UID or Holder Name</label>
                        <input
                            id="search"
                            type="text"
                            value={data.search}
                            onChange={(e) => setData('search', e.target.value)}
                            placeholder="e.g. 04A1B2C3 or Juan..."
                        />
                    </div>

                    <div className="pf-field">
                        <label htmlFor="status">Status</label>
                        <PremiumSelect
                            id="status"
                            value={data.status}
                            onChange={(status) => setData('status', status)}
                            options={[
                                { value: '', label: 'All Cards' },
                                { value: 'active', label: 'Active' },
                                { value: 'inactive', label: 'Inactive' },
                            ]}
                        />
                    </div>

                    <div className="pf-filter-bar-actions">
                        <button type="submit" className="pf-btn pf-btn-primary">
                            Filter
                        </button>
                        <Link
                            href={route('portal.rfid-cards.index')}
                            className="pf-btn pf-btn-secondary"
                        >
                            Reset
                        </Link>
                    </div>
                </form>

                {/* Main Content Panel */}
                <div className="pf-panel">
                    <div className="pf-panel-header flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2 className="pf-panel-title">All RFID Cards</h2>
                            <p className="pf-panel-count">
                                {rfidCards.data.length} shown
                            </p>
                        </div>

                        {/* Superadmin Segmented Toggle */}
                        <div className="pf-view-toggle" role="group" aria-label="View mode">
                            <button
                                type="button"
                                className={`pf-view-toggle-btn ${viewMode === 'table' ? 'pf-view-toggle-btn--active' : ''}`}
                                onClick={() => setViewMode('table')}
                                aria-pressed={viewMode === 'table'}
                            >
                                <svg viewBox="0 0 24 24">
                                    <path d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                                Table
                            </button>
                            <button
                                type="button"
                                className={`pf-view-toggle-btn ${viewMode === 'gallery' ? 'pf-view-toggle-btn--active' : ''}`}
                                onClick={() => setViewMode('gallery')}
                                aria-pressed={viewMode === 'gallery'}
                            >
                                <svg viewBox="0 0 24 24">
                                    <rect x="3" y="3" width="7" height="7" rx="1.2" />
                                    <rect x="14" y="3" width="7" height="7" rx="1.2" />
                                    <rect x="3" y="14" width="7" height="7" rx="1.2" />
                                    <rect x="14" y="14" width="7" height="7" rx="1.2" />
                                </svg>
                                Gallery
                            </button>
                        </div>
                    </div>

                    {/* View Modes */}
                    {viewMode === 'table' ? (
                        <div className="pf-table-wrap">
                            <table className="pf-table">
                                <thead>
                                    <tr>
                                        <th scope="col">Card UID</th>
                                        <th scope="col">Assigned Holder</th>
                                        <th scope="col">Status</th>
                                        <th scope="col">Assigned Date</th>
                                        <th scope="col">
                                            <span className="sr-only">Actions</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rfidCards.data.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="pf-empty">
                                                No RFID cards found.
                                            </td>
                                        </tr>
                                    )}

                                    {rfidCards.data.map((card: RfidCardWithPerson) => {
                                        const initials = card.person
                                            ? (card.person.first_name?.[0] || '') +
                                              (card.person.last_name?.[0] || '')
                                            : '';
                                        const isStudent = card.person?.person_type === 'student';

                                        return (
                                            <tr key={card.id}>
                                                <td>
                                                    <div className="flex items-center gap-2.5">
                                                        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-blue-200/80 bg-blue-50 text-blue-600 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-400">
                                                            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-currentColor stroke-2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M6 8.32a7.43 7.43 0 0 1 0 7.36" />
                                                                <path d="M9.46 6.21a11.76 11.76 0 0 1 0 11.58" />
                                                                <path d="M12.91 4.1a15.91 15.91 0 0 1 0 15.8" />
                                                            </svg>
                                                        </span>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-mono text-xs font-bold tracking-wider text-slate-800 dark:text-slate-200">
                                                                {card.card_uid}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleCopyUid(card.card_uid)}
                                                                className="flex h-5 w-5 items-center justify-center text-slate-400 hover:text-blue-600 dark:text-slate-500 dark:hover:text-blue-400 transition"
                                                                title="Copy Card UID"
                                                            >
                                                                {copiedUid === card.card_uid ? (
                                                                    <svg viewBox="0 0 24 24" className="h-3 w-3 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                                        <path d="M20 6L9 17l-5-5" />
                                                                    </svg>
                                                                ) : (
                                                                    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
                                                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                                                    </svg>
                                                                )}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    {card.person ? (
                                                        <div className="flex items-center gap-2.5">
                                                            <span
                                                                className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                                                                    isStudent
                                                                        ? 'bg-gradient-to-br from-blue-500 to-indigo-600'
                                                                        : 'bg-gradient-to-br from-purple-500 to-indigo-600'
                                                                }`}
                                                            >
                                                                {initials || '?'}
                                                            </span>
                                                            <div>
                                                                <div className="text-xs font-bold text-slate-900 dark:text-white">
                                                                    {card.person.display_name}
                                                                </div>
                                                                <div className="text-[11px] text-slate-500 capitalize dark:text-slate-400">
                                                                    {card.person.person_type}
                                                                    {card.person.grade_level
                                                                        ? ` · Gr. ${card.person.grade_level}`
                                                                        : ''}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-slate-400">— Unassigned —</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <span
                                                        className={
                                                            'pf-pill text-[10px] ' +
                                                            (card.is_active
                                                                ? 'pf-pill--active'
                                                                : 'pf-pill--inactive')
                                                        }
                                                    >
                                                        {card.is_active ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td className="text-xs text-slate-600 dark:text-slate-300">
                                                    {card.assigned_at
                                                        ? new Date(card.assigned_at).toLocaleDateString(undefined, {
                                                              year: 'numeric',
                                                              month: 'short',
                                                              day: 'numeric',
                                                          })
                                                        : '—'}
                                                </td>
                                                <td>
                                                    {card.person ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedCardForManage(card)}
                                                            className="pf-row-action"
                                                        >
                                                            Manage Holder
                                                            <svg viewBox="0 0 24 24">
                                                                <path d="M9 6l6 6-6 6" />
                                                            </svg>
                                                        </button>
                                                    ) : (
                                                        <span className="text-xs text-slate-400">—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        /* Gallery Cards View */
                        rfidCards.data.length === 0 ? (
                            <div className="py-16 text-center">
                                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                                    <svg viewBox="0 0 24 24" className="h-7 w-7 fill-none stroke-currentColor stroke-1.8">
                                        <rect x="3" y="5" width="18" height="14" rx="3" />
                                        <path d="M3 10h18" />
                                    </svg>
                                </div>
                                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No RFID cards found</h3>
                                <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
                                    Try adjusting your search filters to find registered cards.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 sm:p-6">
                                {rfidCards.data.map((card: RfidCardWithPerson) => {
                                    const initials = card.person
                                        ? (card.person.first_name?.[0] || '') +
                                          (card.person.last_name?.[0] || '')
                                        : '';
                                    const isStudent = card.person?.person_type === 'student';

                                    return (
                                        <div
                                            key={card.id}
                                            className="group relative flex flex-col justify-between overflow-hidden rounded-[22px] border border-slate-200/90 bg-white p-5 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)] transition-all duration-200 hover:-translate-y-1 hover:border-blue-300/90 hover:shadow-[0_12px_28px_-8px_rgba(35,78,244,0.12)] dark:border-slate-800 dark:bg-slate-900/90 dark:hover:border-blue-700"
                                        >
                                            {/* Top card header */}
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                                                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <rect x="3" y="5" width="18" height="14" rx="3" />
                                                        <path d="M3 10h18" />
                                                    </svg>
                                                    <span>RFID PASS</span>
                                                </div>

                                                <span
                                                    className={
                                                        'pf-pill text-[10px] ' +
                                                        (card.is_active
                                                            ? 'pf-pill--active'
                                                            : 'pf-pill--inactive')
                                                    }
                                                >
                                                    {card.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>

                                            {/* RFID Chip Graphic and UID */}
                                            <div className="my-3.5 rounded-xl border border-slate-200/70 bg-gradient-to-br from-slate-50 to-slate-100/60 p-3.5 dark:border-slate-800 dark:from-slate-800/60 dark:to-slate-900/80">
                                                <div className="flex items-center justify-between">
                                                    {/* Chip graphic and contactless waves */}
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="h-6 w-8 rounded border border-amber-400/80 bg-gradient-to-tr from-amber-300 via-amber-200 to-amber-100 shadow-inner flex items-center justify-center">
                                                            <div className="h-3 w-4 border border-amber-600/40 rounded-sm" />
                                                        </div>
                                                        <svg viewBox="0 0 24 24" className="h-4 w-4 text-blue-600/70 dark:text-blue-400/70" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M6 8.32a7.43 7.43 0 0 1 0 7.36" />
                                                            <path d="M9.46 6.21a11.76 11.76 0 0 1 0 11.58" />
                                                            <path d="M12.91 4.1a15.91 15.91 0 0 1 0 15.8" />
                                                        </svg>
                                                    </div>
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                        CARD UID
                                                    </span>
                                                </div>
                                                <div className="mt-2.5 flex items-center justify-between">
                                                    <div className="flex items-center gap-2 font-mono text-sm font-extrabold tracking-wider text-slate-800 dark:text-white">
                                                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <rect x="2" y="5" width="20" height="14" rx="2" />
                                                            <line x1="2" y1="10" x2="22" y2="10" />
                                                        </svg>
                                                        <span>{card.card_uid}</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleCopyUid(card.card_uid);
                                                        }}
                                                        className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200/80 bg-white text-slate-500 hover:border-blue-300 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-blue-400 transition shadow-xs"
                                                        title="Copy Card UID"
                                                    >
                                                        {copiedUid === card.card_uid ? (
                                                            <svg viewBox="0 0 24 24" className="h-3 w-3 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                                <path d="M20 6L9 17l-5-5" />
                                                            </svg>
                                                        ) : (
                                                            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                                            </svg>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Card Holder Info */}
                                            <div className="mb-3 flex items-center gap-3">
                                                {card.person ? (
                                                    <>
                                                        <span
                                                            className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white shadow-sm ${
                                                                isStudent
                                                                    ? 'bg-gradient-to-br from-blue-500 to-indigo-600'
                                                                    : 'bg-gradient-to-br from-purple-500 to-indigo-600'
                                                            }`}
                                                        >
                                                            {initials || '?'}
                                                        </span>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="truncate text-xs font-bold text-slate-900 dark:text-white">
                                                                {card.person.display_name}
                                                            </div>
                                                            <div className="truncate text-[11px] text-slate-500 dark:text-slate-400 capitalize">
                                                                {card.person.person_type}
                                                                {card.person.grade_level
                                                                    ? ` · Gr. ${card.person.grade_level}`
                                                                    : ''}
                                                            </div>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="text-xs text-slate-400 italic">
                                                        No holder assigned
                                                    </div>
                                                )}
                                            </div>

                                            {/* Assigned Date & Card Footer */}
                                            <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
                                                <div className="mb-2.5 flex items-center justify-between text-[11px] text-slate-400">
                                                    <span>Assigned</span>
                                                    <span className="font-medium text-slate-600 dark:text-slate-300">
                                                        {card.assigned_at
                                                            ? new Date(card.assigned_at).toLocaleDateString()
                                                            : '—'}
                                                    </span>
                                                </div>
                                                {card.person ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedCardForManage(card)}
                                                        className="pf-row-action !w-full justify-center !py-2 rounded-xl text-xs font-semibold cursor-pointer"
                                                    >
                                                        Manage Holder
                                                        <svg viewBox="0 0 24 24">
                                                            <path d="M9 6l6 6-6 6" />
                                                        </svg>
                                                    </button>
                                                ) : (
                                                    <div className="py-2 text-center text-xs text-slate-400">
                                                        Unassigned
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )
                    )}

                    <PaginationBar links={rfidCards.links} />
                </div>
            </div>

            <ManageHolderModal
                show={selectedCardForManage !== null}
                card={selectedCardForManage}
                onClose={() => setSelectedCardForManage(null)}
                onCardUpdated={() => {
                    router.reload({ only: ['rfidCards', 'stats'] });
                }}
            />
        </AdminLayout>
    );
}

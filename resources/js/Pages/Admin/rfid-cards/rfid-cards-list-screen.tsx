import Pagination from '@/Components/admin/Pagination';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import type { PaginatedData, Person, RfidCard } from '@/types';
import { personRouteKey } from '@/types';
import '../../../../css/platform-dashboard.css';
import '../../../../css/platform-overview.css';

interface RfidCardWithPerson extends RfidCard {
    card_uid: string;
    assigned_at: string;
    person?: Person;
}

export default function RfidCardsListScreen({ rfidCards, filters }: { rfidCards: PaginatedData<RfidCardWithPerson>; filters: { search?: string; status?: string } }) {
    const hasFilters = Boolean(filters.search || filters.status);
    const [isFiltering, setIsFiltering] = useState(false);
    const { data, setData } = useForm({
        search: filters.search ?? '',
        status: filters.status ?? '',
    });

    function submit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsFiltering(true);
        router.get(route('portal.rfid-cards.index'), data, {
            preserveState: true,
            onFinish: () => setIsFiltering(false),
        });
    }

    return (
        <AdminLayout>
            <Head title="RFID Cards" />

            <div className="pf-dashboard pft-page">
                <div className="pft-hero">
                    <div className="pft-hero-main">
                        <span className="pft-hero-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24">
                                <rect x="3" y="6" width="18" height="12" rx="2.4" />
                            </svg>
                        </span>
                        <div>
                            <h1 className="pft-hero-title">RFID Cards</h1>
                            <p className="pft-hero-subtitle">
                                Track every card assigned to students and staff.
                            </p>
                        </div>
                    </div>
                </div>

                <form onSubmit={submit} className="pf-filter-bar" role="search">
                    <div className="pf-field">
                        <label htmlFor="search">Card UID</label>
                        <input
                            id="search"
                            type="text"
                            value={data.search}
                            onChange={(e) => setData('search', e.target.value)}
                            placeholder="Search by UID..."
                        />
                    </div>

                    <div className="pf-field">
                        <label htmlFor="status">Status</label>
                        <select
                            id="status"
                            value={data.status}
                            onChange={(e) => setData('status', e.target.value)}
                        >
                            <option value="">All</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>

                    <div className="pf-filter-bar-actions">
                        <button
                            type="submit"
                            className={'pf-btn pf-btn-primary' + (isFiltering ? ' pf-btn--loading' : '')}
                            disabled={isFiltering}
                        >
                            Filter
                        </button>
                        {hasFilters && (
                            <Link
                                href={route('portal.rfid-cards.index')}
                                className="pf-btn pf-btn-secondary"
                            >
                                Reset
                            </Link>
                        )}
                    </div>
                </form>

                <div className="pf-panel">
                    <div className="pf-panel-header">
                        <div>
                            <h2 className="pf-panel-title">All Cards</h2>
                            <p className="pf-panel-count">
                                {rfidCards.from !== null ? `${rfidCards.from}–${rfidCards.to} of ${rfidCards.total}` : 'No results'}
                            </p>
                        </div>
                    </div>

                    <div className="pf-table-wrap">
                        <table className="pf-table">
                            <thead>
                                <tr>
                                    <th scope="col">Card UID</th>
                                    <th scope="col">Assigned To</th>
                                    <th scope="col">Status</th>
                                    <th scope="col">Assigned</th>
                                    <th scope="col">
                                        <span className="sr-only">Actions</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {rfidCards.data.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="pf-empty">
                                            No cards found.
                                        </td>
                                    </tr>
                                )}

                                {rfidCards.data.map((card: RfidCardWithPerson) => (
                                    <tr key={card.id}>
                                        <td className="font-mono">{card.card_uid}</td>
                                        <td>{card.person?.display_name ?? '—'}</td>
                                        <td>
                                            <span
                                                className={
                                                    'pf-pill ' +
                                                    (card.is_active
                                                        ? 'pf-pill--active'
                                                        : 'pf-pill--inactive')
                                                }
                                            >
                                                {card.is_active ? 'active' : 'inactive'}
                                            </span>
                                        </td>
                                        <td>
                                            {new Date(card.assigned_at).toLocaleDateString()}
                                        </td>
                                        <td>
                                            {card.person && (
                                                <Link
                                                    href={route(
                                                        'portal.people.edit',
                                                        personRouteKey(card.person),
                                                    )}
                                                    className="pf-row-action"
                                                >
                                                    Manage
                                                    <svg viewBox="0 0 24 24">
                                                        <path d="M9 6l6 6-6 6" />
                                                    </svg>
                                                </Link>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <Pagination links={rfidCards.links} />
                </div>
            </div>
        </AdminLayout>
    );
}

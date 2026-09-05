import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import type { PaginatedData, PaginationLink, Person, RfidCard } from '@/types';
import '../../../../css/platform-dashboard.css';

interface RfidCardWithPerson extends RfidCard {
    card_uid: string;
    assigned_at: string;
    person?: Person;
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

export default function RfidCardsListScreen({ rfidCards, filters }: { rfidCards: PaginatedData<RfidCardWithPerson>; filters: { search?: string; status?: string } }) {
    const { data, setData } = useForm({
        search: filters.search ?? '',
        status: filters.status ?? '',
    });

    function submit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        router.get(route('portal.rfid-cards.index'), data, {
            preserveState: true,
        });
    }

    return (
        <AdminLayout>
            <Head title="RFID Cards" />

            <div className="pf-dashboard">
                <div className="pf-dashboard-header">
                    <div>
                        <p className="pf-dashboard-kicker">Admin overview</p>
                        <h1 className="pf-dashboard-title">RFID Cards</h1>
                        <p className="pf-dashboard-subtitle">
                            Track every card assigned to students and staff.
                        </p>
                    </div>
                </div>

                <form onSubmit={submit} className="pf-filter-bar">
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

                <div className="pf-panel">
                    <div className="pf-panel-header">
                        <div>
                            <h2 className="pf-panel-title">All Cards</h2>
                            <p className="pf-panel-count">
                                {rfidCards.data.length} shown
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
                                                        card.person.id,
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

                    <PaginationBar links={rfidCards.links} />
                </div>
            </div>
        </AdminLayout>
    );
}

import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import type { PaginatedData, Person, PaginationLink } from '@/types';
import '../../../../css/platform-dashboard.css';
import '../../../../css/platform-overview.css';

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

export default function PeopleListScreen({ people, filters }: { people: PaginatedData<Person>; filters: { search?: string; status?: string } }) {
    const { data, setData } = useForm({
        search: filters.search ?? '',
        status: filters.status ?? '',
    });

    function submit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        router.get(route('portal.people.index'), data, { preserveState: true });
    }

    return (
        <AdminLayout>
            <Head title="People" />

            <div className="pf-dashboard pft-page">
                <div className="pft-hero">
                    <div className="pft-hero-main">
                        <span className="pft-hero-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24">
                                <circle cx="8.5" cy="8.5" r="3" />
                                <circle cx="16" cy="9.5" r="2.6" />
                                <path d="M3.2 19.5a5.5 4.6 0 0 1 11 0z" />
                                <path d="M12.8 19.5a5.2 4.2 0 0 1 10.4 0z" />
                            </svg>
                        </span>
                        <div>
                            <h1 className="pft-hero-title">People</h1>
                            <p className="pft-hero-subtitle">
                                Manage every student and staff record for your school.
                            </p>
                        </div>
                    </div>
                    <div className="pft-hero-actions">
                        <Link href={route('portal.people.create')} className="pf-btn pf-btn-primary">
                            <svg viewBox="0 0 24 24">
                                <path d="M12 5v14M5 12h14" />
                            </svg>
                            Add Person
                        </Link>
                    </div>
                </div>

                <form onSubmit={submit} className="pf-filter-bar">
                    <div className="pf-field">
                        <label htmlFor="search">Search</label>
                        <input
                            id="search"
                            type="text"
                            value={data.search}
                            onChange={(e) => setData('search', e.target.value)}
                            placeholder="Name or ID..."
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
                            href={route('portal.people.index')}
                            className="pf-btn pf-btn-secondary"
                        >
                            Reset
                        </Link>
                    </div>
                </form>

                <div className="pf-panel">
                    <div className="pf-panel-header">
                        <div>
                            <h2 className="pf-panel-title">All People</h2>
                            <p className="pf-panel-count">
                                {people.data.length} shown
                            </p>
                        </div>
                    </div>

                    <div className="pf-table-wrap">
                        <table className="pf-table">
                            <thead>
                                <tr>
                                    <th scope="col">Name</th>
                                    <th scope="col">Type</th>
                                    <th scope="col">Grade / Section</th>
                                    <th scope="col">External ID</th>
                                    <th scope="col">Status</th>
                                    <th scope="col">
                                        <span className="sr-only">Actions</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {people.data.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="pf-empty">
                                            No people found.
                                        </td>
                                    </tr>
                                )}

                                {people.data.map((person: Person) => (
                                    <tr key={person.id}>
                                        <td className="pf-tenant-name">
                                            {person.display_name}
                                        </td>
                                        <td className="capitalize">
                                            {person.person_type}
                                        </td>
                                        <td>
                                            {[person.grade_level, person.section]
                                                .filter(Boolean)
                                                .join(' / ') || '—'}
                                        </td>
                                        <td>{person.external_id ?? '—'}</td>
                                        <td>
                                            <span
                                                className={
                                                    'pf-pill ' +
                                                    (person.is_active
                                                        ? 'pf-pill--active'
                                                        : 'pf-pill--inactive')
                                                }
                                            >
                                                {person.is_active ? 'active' : 'inactive'}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 14 }}>
                                                <Link
                                                    href={route(
                                                        'portal.people.edit',
                                                        person.id,
                                                    )}
                                                    className="pf-row-action"
                                                >
                                                    View
                                                    <svg viewBox="0 0 24 24">
                                                        <path d="M9 6l6 6-6 6" />
                                                    </svg>
                                                </Link>
                                                <Link
                                                    href={route(
                                                        'portal.attendance.students.show',
                                                        person.id,
                                                    )}
                                                    className="pf-row-action"
                                                >
                                                    Attendance
                                                    <svg viewBox="0 0 24 24">
                                                        <path d="M9 6l6 6-6 6" />
                                                    </svg>
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <PaginationBar links={people.links} />
                </div>
            </div>
        </AdminLayout>
    );
}

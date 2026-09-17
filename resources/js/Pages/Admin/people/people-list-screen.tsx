import Pagination from '@/Components/admin/Pagination';
import AdminLayout from '@/Layouts/AdminLayout';
import PremiumSelect from '@/Components/PremiumSelect';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import type { PaginatedData, Person } from '@/types';
import { personRouteKey } from '@/types';
import AddPersonModal from './AddPersonModal';
import { MenuIcon } from '@/Components/icons/menu';
import { UserIcon } from '@/Components/icons/user';
import { UsersIcon } from '@/Components/icons/users';
import { ChevronRightIcon } from '@/Components/icons/chevron-right';
import { PlusIcon } from '@/Components/icons/plus';
import { LayoutGridIcon } from '@/Components/icons/layout-grid';
import '../../../../css/platform-dashboard.css';
import '../../../../css/platform-overview.css';

const hasFilters = (filters: { search?: string; status?: string }) =>
    Boolean(filters.search || filters.status);

export default function PeopleListScreen({ people, filters }: { people: PaginatedData<Person>; filters: { search?: string; status?: string } }) {
    const [isFiltering, setIsFiltering] = useState(false);
    const [viewMode, setViewMode] = useState<'gallery' | 'table'>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('as-people-view');
            if (saved === 'gallery' || saved === 'table') {
                return saved;
            }
        }
        return 'gallery';
    });
    const [addPersonOpen, setAddPersonOpen] = useState(false);

    useEffect(() => {
        localStorage.setItem('as-people-view', viewMode);
    }, [viewMode]);

    const { data, setData } = useForm({
        search: filters.search ?? '',
        status: filters.status ?? '',
    });

    function submit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsFiltering(true);
        router.get(route('portal.people.index'), data, {
            preserveState: true,
            onFinish: () => setIsFiltering(false),
        });
    }

    return (
        <AdminLayout>
            <Head title="People" />

            <div className="pf-dashboard pft-page">
                <div className="pft-hero">
                    <div className="pft-hero-main">
                        <span className="pft-hero-icon" aria-hidden="true">
                            <UsersIcon size={22} />
                        </span>
                        <div>
                            <h1 className="pft-hero-title">People</h1>
                            <p className="pft-hero-subtitle">
                                Manage every student and staff record for your school.
                            </p>
                        </div>
                    </div>
                    <div className="pft-hero-actions">
                        <button
                            type="button"
                            onClick={() => setAddPersonOpen(true)}
                            className="pf-btn pf-btn-primary"
                        >
                            <PlusIcon size={16} />
                            Add Person
                        </button>
                    </div>
                </div>

                <form onSubmit={submit} className="pf-filter-bar" role="search">
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
                        <PremiumSelect
                            id="status"
                            value={data.status}
                            onChange={(status) => setData('status', status)}
                            options={[
                                { value: '', label: 'All' },
                                { value: 'active', label: 'Active' },
                                { value: 'inactive', label: 'Inactive' },
                            ]}
                        />
                    </div>

                    <div className="pf-filter-bar-actions">
                        <button
                            type="submit"
                            className={'pf-btn pf-btn-primary' + (isFiltering ? ' pf-btn--loading' : '')}
                            disabled={isFiltering}
                        >
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
                    <div className="pf-panel-header flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2 className="pf-panel-title">All People</h2>
                            <p className="pf-panel-count">
                                {people.from !== null
                                    ? `${people.from}–${people.to} of ${people.total}`
                                    : 'No results'}
                            </p>
                        </div>
                        <div className="pf-view-toggle" role="group" aria-label="View mode">
                            <button
                                type="button"
                                className={`pf-view-toggle-btn ${viewMode === 'gallery' ? 'pf-view-toggle-btn--active' : ''}`}
                                onClick={() => setViewMode('gallery')}
                                aria-pressed={viewMode === 'gallery'}
                            >
                                <LayoutGridIcon size={20} />
                                Gallery
                            </button>
                            <button
                                type="button"
                                className={`pf-view-toggle-btn ${viewMode === 'table' ? 'pf-view-toggle-btn--active' : ''}`}
                                onClick={() => setViewMode('table')}
                                aria-pressed={viewMode === 'table'}
                            >
                                <MenuIcon size={20} />
                                Table
                            </button>
                        </div>
                    </div>

                    {viewMode === 'gallery' ? (
                        people.data.length === 0 ? (
                            <div className="pf-empty-state">
                                <div className="pf-empty-state-icon" aria-hidden="true">
                                    <UserIcon size={28} />
                                </div>
                                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No people found</h3>
                                <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
                                    {hasFilters(filters)
                                        ? 'No people match these filters.'
                                        : 'Add a new person to your school roster to get started.'}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setAddPersonOpen(true)}
                                    className="pf-btn pf-btn-primary mt-4 text-xs"
                                >
                                    <PlusIcon size={20} />
                                    Add Person
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 sm:p-6">
                                {people.data.map((person: Person) => {
                                    const isStudent = person.person_type === 'student';

                                    return (
                                        <div
                                            key={person.id}
                                            className="group relative flex flex-col justify-between overflow-hidden rounded-[22px] border border-slate-200/90 bg-white p-5 shadow-[0_4px_8px_-4px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-1 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/90 dark:hover:border-slate-600"
                                        >
                                            {/* Top badges */}
                                            <div className="flex items-center justify-between gap-2">
                                                <span
                                                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-slate-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300"
                                                >
                                                    <UserIcon size={11} aria-hidden="true" />
                                                    {person.person_type}
                                                </span>

                                                <span
                                                    className={
                                                        'pf-pill text-[10px] ' +
                                                        (person.is_active
                                                            ? 'pf-pill--active'
                                                            : 'pf-pill--inactive')
                                                    }
                                                >
                                                    {person.is_active ? 'active' : 'inactive'}
                                                </span>
                                            </div>

                                            {/* Profile center info */}
                                            <div className="my-4 flex flex-col items-center text-center">
                                                {person.photo_url ? (
                                                    <img
                                                        src={person.photo_url}
                                                        alt={person.display_name}
                                                        className="h-16 w-16 rounded-2xl object-cover shadow-sm ring-1 ring-slate-200 dark:ring-slate-700"
                                                        onError={(e) => {
                                                            (e.target as HTMLElement).style.display = 'none';
                                                        }}
                                                    />
                                                ) : (
                                                    <div
                                                        className="pf-person-avatar-glass flex h-16 w-16 items-center justify-center rounded-2xl"
                                                        aria-hidden="true"
                                                    >
                                                        <UserIcon size={28} />
                                                    </div>
                                                )}

                                                <h3
                                                    className="mt-3.5 text-base font-bold text-slate-900 line-clamp-1 dark:text-white"
                                                    title={person.display_name}
                                                >
                                                    {person.display_name}
                                                </h3>

                                                <p className="mt-0.5 text-xs font-medium text-slate-500 line-clamp-1 dark:text-slate-400">
                                                    {[person.grade_level, person.section]
                                                        .filter(Boolean)
                                                        .join(' · ') || (isStudent ? 'Student' : 'Staff Member')}
                                                </p>

                                                {/* External ID Badge */}
                                                <div className="mt-2.5 inline-flex items-center gap-1 rounded-lg border border-slate-200/80 bg-slate-50 px-2.5 py-0.5 font-mono text-[11px] text-slate-600 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-300">
                                                    <span className="text-slate-400">ID:</span>
                                                    <span className="font-semibold">{person.external_id || '—'}</span>
                                                </div>
                                            </div>

                                            {/* Card Footer */}
                                            <div className="border-t border-slate-100 pt-3 dark:border-slate-800 flex gap-2">
                                                <Link
                                                    href={route('portal.people.edit', personRouteKey(person))}
                                                    className="pf-row-action !flex-1 justify-center !py-2 rounded-xl text-xs font-semibold"
                                                >
                                                    View Profile
                                                    <ChevronRightIcon size={20} />
                                                </Link>
                                                <Link
                                                    href={route('portal.attendance.students.show', personRouteKey(person))}
                                                    className="pf-row-action !flex-1 justify-center !py-2 rounded-xl text-xs font-semibold"
                                                >
                                                    Attendance
                                                    <ChevronRightIcon size={14} />
                                                </Link>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )
                    ) : (
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
                                                {hasFilters(filters) ? (
                                                    'No people match these filters.'
                                                ) : (
                                                    <>
                                                        No people yet.{' '}
                                                        <button
                                                            type="button"
                                                            onClick={() => setAddPersonOpen(true)}
                                                            className="pf-row-action"
                                                            style={{ display: 'inline' }}
                                                        >
                                                            Add your first person →
                                                        </button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    )}

                                    {people.data.map((person: Person) => (
                                        <tr key={person.id}>
                                            <td>
                                                <div className="flex items-center gap-3">
                                                    <span
                                                        className="pf-person-avatar-glass flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                                                        aria-hidden="true"
                                                    >
                                                        <UserIcon size={17} />
                                                    </span>
                                                    <span className="pf-tenant-name">
                                                        {person.display_name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold capitalize text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                                    <UserIcon size={12} aria-hidden="true" />
                                                    {person.person_type}
                                                </span>
                                            </td>
                                            <td>
                                                {person.grade_level || person.section ? (
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        {person.grade_level && (
                                                            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                                                                {person.grade_level}
                                                            </span>
                                                        )}
                                                        {person.section && (
                                                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                                                {person.section}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400">—</span>
                                                )}
                                            </td>
                                            <td>
                                                <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 font-mono text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                                    {person.external_id ?? '—'}
                                                </span>
                                            </td>
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
                                                <div className="flex items-center justify-end gap-2">
                                                    <Link
                                                        href={route(
                                                            'portal.people.edit',
                                                            personRouteKey(person),
                                                        )}
                                                        className="pf-row-action rounded-full border border-slate-200 px-3 py-1.5 text-xs dark:border-slate-700"
                                                    >
                                                        View
                                                        <ChevronRightIcon size={20} />
                                                    </Link>
                                                    <Link
                                                        href={route(
                                                            'portal.attendance.students.show',
                                                            personRouteKey(person),
                                                        )}
                                                        className="pf-row-action rounded-full border border-slate-200 px-3 py-1.5 text-xs dark:border-slate-700"
                                                    >
                                                        Attendance
                                                        <ChevronRightIcon size={20} />
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <Pagination links={people.links} />
                </div>
            </div>

            <AddPersonModal
                show={addPersonOpen}
                onClose={() => setAddPersonOpen(false)}
            />
        </AdminLayout>
    );
}

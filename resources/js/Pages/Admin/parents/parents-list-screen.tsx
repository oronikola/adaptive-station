import Pagination from '@/Components/admin/Pagination';
import { UserPlusIcon } from '@/Components/icons/user-plus';
import AdminLayout from '@/Layouts/AdminLayout';
import type { PaginatedData } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { AddParentModal } from './parent-form-screen';
import '../../../../css/platform-dashboard.css';
import '../../../../css/platform-overview.css';

interface ParentAccount {
    id: string;
    name: string;
    email: string;
    login_id: string | null;
    password_plaintext: string | null;
    is_active: boolean;
    student_links_count: number;
}

export default function ParentsListScreen({ parents, filters }: {
    parents: PaginatedData<ParentAccount>;
    filters: { search: string };
}) {
    const { data, setData, get, processing } = useForm({ search: filters.search });
    const [isAddParentOpen, setIsAddParentOpen] = useState(false);

    return (
        <AdminLayout>
            <Head title="Parents" />
            <div className="pf-dashboard pft-page">
                <div className="pft-hero">
                    <div>
                        <h1 className="pft-hero-title">Parents</h1>
                        <p className="pft-hero-subtitle">Manage parent accounts and approve which students they can access.</p>
                    </div>
                    <button
                        type="button"
                        className="pf-btn pf-btn-primary"
                        onClick={() => setIsAddParentOpen(true)}
                    >
                        <UserPlusIcon size={16} />
                        Add parent
                    </button>
                </div>
                <form className="pf-filter-bar" onSubmit={(event) => { event.preventDefault(); get(route('portal.parents.index')); }}>
                    <div className="pf-field">
                        <label htmlFor="parent-search">Search parents</label>
                        <input id="parent-search" value={data.search} maxLength={100} placeholder="Name, email, or login ID" onChange={(event) => setData('search', event.target.value)} />
                    </div>
                    <div className="pf-filter-bar-actions">
                        <button type="submit" className={'pf-btn pf-btn-primary' + (processing ? ' pf-btn--loading' : '')} disabled={processing}>Search</button>
                        {filters.search && <Link href={route('portal.parents.index')} className="pf-btn pf-btn-secondary">Clear</Link>}
                    </div>
                </form>
                <div className="pf-panel">
                    <div className="pf-table-wrap">
                        <table className="pf-table">
                            <thead><tr><th scope="col">Parent</th><th scope="col">Login ID</th><th scope="col">Password</th><th scope="col">Email</th><th scope="col">Linked students</th><th scope="col">Status</th><th scope="col">Manage</th></tr></thead>
                            <tbody>
                                {parents.data.length === 0 && <tr><td colSpan={7} className="pf-empty">{filters.search ? 'No parents match your search.' : 'No parent accounts yet. Add a parent to begin linking their children.'}</td></tr>}
                                {parents.data.map((parent) => (
                                    <tr key={parent.id}>
                                        <td className="pf-tenant-name">{parent.name}</td>
                                        <td style={{ fontFamily: 'monospace' }}>{parent.login_id ?? '—'}</td>
                                        <td style={{ fontFamily: 'monospace' }}>{parent.password_plaintext ?? '—'}</td>
                                        <td>{parent.email}</td>
                                        <td>{parent.student_links_count}</td>
                                        <td><span className={`pf-pill ${parent.is_active ? 'pf-pill--active' : 'pf-pill--inactive'}`}>{parent.is_active ? 'Active' : 'Inactive'}</span></td>
                                        <td><Link href={route('portal.parents.edit', parent.id)} className="pf-row-action" aria-label={`Manage ${parent.name}`}>Manage</Link></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Pagination links={parents.links} />
                </div>
            </div>
            {isAddParentOpen && (
                <AddParentModal
                    show
                    onClose={() => setIsAddParentOpen(false)}
                />
            )}
        </AdminLayout>
    );
}

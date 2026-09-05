import SecretOnceCallout from '@/Components/SecretOnceCallout';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import type { PaginatedData, PaginationLink, User, PageProps } from '@/types';
import '../../../../css/platform-dashboard.css';

interface UserListItem extends User {
    is_active: boolean;
}

interface UsersListPageProps extends PageProps {
    flash?: PageProps['flash'] & { temporaryPassword?: string };
}

const roleLabels: Record<string, string> = {
    tenant_admin: 'Admin',
    tenant_operator: 'Operator',
};

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

export default function UsersListScreen({ users }: { users: PaginatedData<UserListItem> }) {
    const { auth, flash } = usePage<UsersListPageProps>().props;
    const canManage = auth.user.role === 'tenant_admin';

    return (
        <AdminLayout>
            <Head title="Users" />

            <div className="pf-dashboard">
                <div className="pf-dashboard-header">
                    <div>
                        <p className="pf-dashboard-kicker">Admin overview</p>
                        <h1 className="pf-dashboard-title">Users</h1>
                        <p className="pf-dashboard-subtitle">
                            Manage the admin and operator accounts for your school.
                        </p>
                    </div>
                    {canManage && (
                        <Link href={route('portal.users.create')} className="pf-btn pf-btn-primary">
                            <svg viewBox="0 0 24 24">
                                <path d="M12 5v14M5 12h14" />
                            </svg>
                            Add User
                        </Link>
                    )}
                </div>

                <SecretOnceCallout label="Temporary password" value={flash?.temporaryPassword} />

                <div className="pf-panel">
                    <div className="pf-panel-header">
                        <div>
                            <h2 className="pf-panel-title">All Users</h2>
                            <p className="pf-panel-count">
                                {users.data.length} shown
                            </p>
                        </div>
                    </div>

                    <div className="pf-table-wrap">
                        <table className="pf-table">
                            <thead>
                                <tr>
                                    <th scope="col">Name</th>
                                    <th scope="col">Email</th>
                                    <th scope="col">Role</th>
                                    <th scope="col">Status</th>
                                    <th scope="col">
                                        <span className="sr-only">Actions</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.data.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="pf-empty">
                                            No users yet.
                                        </td>
                                    </tr>
                                )}

                                {users.data.map((user: UserListItem) => (
                                    <tr key={user.id}>
                                        <td className="pf-tenant-name">
                                            {user.name}
                                            {user.id === auth.user.id && (
                                                <span className="ms-2 text-xs text-gray-400"> (you)</span>
                                            )}
                                        </td>
                                        <td>{user.email}</td>
                                        <td>{roleLabels[user.role] ?? user.role}</td>
                                        <td>
                                            <span
                                                className={
                                                    'pf-pill ' +
                                                    (user.is_active
                                                        ? 'pf-pill--active'
                                                        : 'pf-pill--inactive')
                                                }
                                            >
                                                {user.is_active ? 'active' : 'inactive'}
                                            </span>
                                        </td>
                                        <td>
                                            {canManage && user.id !== auth.user.id && (
                                                <div className="pft-row-actions">
                                                    {user.is_active ? (
                                                        <Link
                                                            href={route('portal.users.deactivate', user.id)}
                                                            method="patch"
                                                            as="button"
                                                            className="pf-row-action pf-row-action--danger"
                                                        >
                                                            <svg viewBox="0 0 24 24">
                                                                <path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m-7 0v12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V7" />
                                                            </svg>
                                                            Deactivate
                                                        </Link>
                                                    ) : (
                                                        <Link
                                                            href={route('portal.users.reactivate', user.id)}
                                                            method="patch"
                                                            as="button"
                                                            className="pf-row-action"
                                                        >
                                                            <svg viewBox="0 0 24 24">
                                                                <path d="M4 4v6h6M20 20v-6h-6M5 15a7 7 0 0 0 12.6 3M19 9A7 7 0 0 0 6.4 6" />
                                                            </svg>
                                                            Reactivate
                                                        </Link>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <PaginationBar links={users.links} />
                </div>
            </div>
        </AdminLayout>
    );
}

import Pagination from '@/Components/admin/Pagination';
import SecretOnceCallout from '@/Components/SecretOnceCallout';
import Modal from '@/Components/Modal';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import type { PaginatedData, User, PageProps } from '@/types';
import '../../../../css/platform-dashboard.css';
import '../../../../css/platform-overview.css';

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

export default function UsersListScreen({ users }: { users: PaginatedData<UserListItem> }) {
    const { auth, flash } = usePage<UsersListPageProps>().props;
    const canManage = auth.user.role === 'tenant_admin';
    const [deactivatingUser, setDeactivatingUser] = useState<UserListItem | null>(null);
    const [isDeactivating, setIsDeactivating] = useState(false);

    function submitDeactivate() {
        if (!deactivatingUser) { return; }
        setIsDeactivating(true);
        router.patch(route('portal.users.deactivate', deactivatingUser.id), {}, {
            onFinish: () => {
                setIsDeactivating(false);
                setDeactivatingUser(null);
            },
        });
    }

    return (
        <AdminLayout>
            <Head title="Users" />

            <div className="pf-dashboard pft-page">
                <div className="pft-hero">
                    <div className="pft-hero-main">
                        <span className="pft-hero-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24">
                                <circle cx="12" cy="8.4" r="3.6" />
                                <path d="M4.5 19.6a7.5 6 0 0 1 15 0z" />
                            </svg>
                        </span>
                        <div>
                            <h1 className="pft-hero-title">Users</h1>
                            <p className="pft-hero-subtitle">
                                Manage the admin and operator accounts for your school.
                            </p>
                        </div>
                    </div>
                    {canManage && (
                        <div className="pft-hero-actions">
                            <Link href={route('portal.users.create')} className="pf-btn pf-btn-primary">
                                <svg viewBox="0 0 24 24">
                                    <path d="M12 5v14M5 12h14" />
                                </svg>
                                Add User
                            </Link>
                        </div>
                    )}
                </div>

                <SecretOnceCallout label="Temporary password" value={flash?.temporaryPassword} />

                <div className="pf-panel">
                    <div className="pf-panel-header">
                        <div>
                            <h2 className="pf-panel-title">All Users</h2>
                            <p className="pf-panel-count">
                                {users.from !== null ? `${users.from}–${users.to} of ${users.total}` : 'No results'}
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
                                                <span style={{ marginLeft: '0.5rem', fontSize: '11px', color: 'var(--as-text-muted)' }}>(you)</span>
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
                                                        <button
                                                            type="button"
                                                            onClick={() => setDeactivatingUser(user)}
                                                            className="pf-row-action pf-row-action--danger"
                                                        >
                                                            <svg viewBox="0 0 24 24">
                                                                <path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m-7 0v12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V7" />
                                                            </svg>
                                                            Deactivate
                                                        </button>
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

                    <Pagination links={users.links} />
                </div>
            </div>
            <Modal show={deactivatingUser !== null} onClose={() => setDeactivatingUser(null)}>
                <div className="pf-modal">
                    <div className="pf-modal-header">
                        <h2 className="pf-modal-title">Deactivate user?</h2>
                        <button
                            type="button"
                            className="pf-modal-close"
                            onClick={() => setDeactivatingUser(null)}
                            aria-label="Close"
                        >
                            <svg viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    {/* User summary card */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 14,
                            padding: '14px 16px',
                            borderRadius: 14,
                            border: '1px solid var(--as-border)',
                            background: 'var(--as-surface-active)',
                            marginBottom: 14,
                        }}
                    >
                        <div
                            style={{
                                width: 42,
                                height: 42,
                                borderRadius: '50%',
                                background: 'var(--as-brand-blue)',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: 16,
                                flexShrink: 0,
                            }}
                        >
                            {deactivatingUser?.name?.charAt(0).toUpperCase() ?? '?'}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--as-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {deactivatingUser?.name}
                            </span>
                            <span style={{ fontSize: 12, color: 'var(--as-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {deactivatingUser?.email}
                            </span>
                            <span style={{ fontSize: 11, color: 'var(--as-text-muted)', marginTop: 2 }}>
                                {roleLabels[deactivatingUser?.role ?? ''] ?? deactivatingUser?.role}
                            </span>
                        </div>
                    </div>

                    {/* Consequence notice */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 10,
                            padding: '11px 14px',
                            borderRadius: 12,
                            border: '1px solid var(--as-danger-bg-alt)',
                            background: 'var(--as-danger-bg)',
                            marginBottom: 18,
                        }}
                    >
                        <svg viewBox="0 0 24 24" style={{ width: 15, height: 15, flexShrink: 0, fill: 'none', stroke: 'var(--as-danger)', strokeWidth: 2, marginTop: 1 }}>
                            <circle cx="12" cy="12" r="9" />
                            <path d="M12 7v5" />
                            <circle cx="12" cy="16.5" r=".5" fill="var(--as-danger)" />
                        </svg>
                        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--as-danger)', lineHeight: 1.5 }}>
                            This user will lose access <strong>immediately</strong>. They will not be notified.
                            You can reactivate them at any time from this screen.
                        </p>
                    </div>

                    {/* Actions — stacked column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <button
                            type="button"
                            className={'pf-btn pf-btn-danger' + (isDeactivating ? ' pf-btn--loading' : '')}
                            onClick={submitDeactivate}
                            disabled={isDeactivating}
                        >
                            Deactivate {deactivatingUser?.name?.split(' ')[0]}
                        </button>
                        <button
                            type="button"
                            className="pf-btn pf-btn-secondary"
                            onClick={() => setDeactivatingUser(null)}
                            disabled={isDeactivating}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </Modal>
        </AdminLayout>
    );
}

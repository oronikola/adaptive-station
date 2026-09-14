import InputError from '@/Components/InputError';
import Modal from '@/Components/Modal';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { PageProps, Tenant } from '@/types';
import '../../../../css/platform-dashboard.css';
import '../../../../css/platform-overview.css';

interface Admin {
    id: number;
    name: string;
    email: string;
    is_active: boolean;
    password_plaintext: string | null;
}

interface StationDetail {
    id: number;
    name: string;
    station_code: string;
    status: string;
}

interface TenantDetailScreenProps {
    tenant: Tenant;
    admins: Admin[];
    stations: StationDetail[];
}

const STATUS_PILL_CLASS: Record<Tenant['status'], string> = {
    active: 'pf-pill--active',
    suspended: 'pf-pill--suspended',
    archived: 'pf-pill--archived',
};

const STATION_STATUS_PILL: Record<string, string> = {
    active: 'pf-pill--active',
    pending_activation: 'pf-pill--suspended',
    disabled: 'pf-pill--archived',
    retired: 'pf-pill--archived',
};

export default function TenantDetailScreen({ tenant, admins, stations }: TenantDetailScreenProps) {
    const { auth } = usePage<PageProps>().props;
    const canManage = auth.user.role === 'platform_super_admin';
    const [revealedPasswords, setRevealedPasswords] = useState<Record<number, boolean>>({});

    function togglePasswordReveal(adminId: number) {
        setRevealedPasswords((current) => ({ ...current, [adminId]: !current[adminId] }));
    }

    // Create admin modal
    const [createAdminOpen, setCreateAdminOpen] = useState(false);
    const adminForm = useForm({ name: '', email: '' });

    function submitAdmin(e: React.FormEvent) {
        e.preventDefault();
        adminForm.post(route('platform.tenants.admins.store', tenant.code), {
            onSuccess: () => { setCreateAdminOpen(false); adminForm.reset(); },
        });
    }

    // Edit admin modal
    const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
    const editForm = useForm({ name: '', email: '' });

    function openEditAdmin(admin: Admin) {
        setEditingAdmin(admin);
        editForm.setData({ name: admin.name, email: admin.email });
    }

    function closeEditAdmin() {
        setEditingAdmin(null);
        editForm.reset();
        editForm.clearErrors();
    }

    function submitEditAdmin(e: React.FormEvent) {
        e.preventDefault();
        if (!editingAdmin) return;
        editForm.patch(route('platform.tenants.admins.update', [tenant.code, editingAdmin.id] as unknown as Record<string, unknown>), {
            onSuccess: closeEditAdmin,
        });
    }

    // Remove admin modal
    const [removeAdminTarget, setRemoveAdminTarget] = useState<Admin | null>(null);
    const revokeAdminForm = useForm({});

    function submitRemoveAdmin(e: React.FormEvent) {
        e.preventDefault();
        if (!removeAdminTarget) return;
        revokeAdminForm.patch(
            route('platform.tenants.admins.deactivate', [tenant.code, removeAdminTarget.id] as unknown as Record<string, unknown>),
            { preserveScroll: true, onSuccess: () => setRemoveAdminTarget(null) },
        );
    }

    function reactivateAdmin(admin: Admin) {
        router.patch(route('platform.tenants.admins.reactivate', [tenant.code, admin.id] as unknown as Record<string, unknown>), {}, { preserveScroll: true });
    }

    // Suspend modal
    const [suspendOpen, setSuspendOpen] = useState(false);
    const [statusProcessing, setStatusProcessing] = useState(false);

    function handleSuspend(e: React.FormEvent) {
        e.preventDefault();
        setStatusProcessing(true);
        router.patch(
            route('platform.tenants.status', tenant.code),
            { status: 'suspended' },
            { onFinish: () => { setStatusProcessing(false); setSuspendOpen(false); } },
        );
    }

    function reactivateClient() {
        setStatusProcessing(true);
        router.patch(
            route('platform.tenants.status', tenant.code),
            { status: 'active' },
            { onFinish: () => setStatusProcessing(false) },
        );
    }

    // Delete modal
    const [deleteOpen, setDeleteOpen] = useState(false);
    const deleteForm = useForm({ confirm_code: '' });
    const deleteConfirmed = deleteForm.data.confirm_code === tenant.code;

    function submitDelete(e: React.FormEvent) {
        e.preventDefault();
        if (!deleteConfirmed) return;
        deleteForm.delete(route('platform.tenants.destroy', tenant.code));
    }

    return (
        <PlatformLayout>
            <Head title={tenant.name} />

            <div className="pf-dashboard pft-page">
                <div style={{ marginBottom: 16 }}>
                    <Link href={route('platform.tenants.index')} className="pft-panel-link">
                        <svg viewBox="0 0 24 24"><path d="m15 6-6 6 6 6" /></svg>
                        Back to Clients
                    </Link>
                </div>

                <div className="pft-hero">
                    <div className="pft-hero-main">
                        <span className="pft-hero-icon" aria-hidden="true" style={{ fontSize: 22, fontWeight: 800 }}>
                            {tenant.name.charAt(0).toUpperCase()}
                        </span>
                        <div>
                            <h1 className="pft-hero-title">{tenant.name}</h1>
                            <p className="pft-hero-subtitle">
                                <span className="font-mono">{tenant.code}</span> · {tenant.timezone}
                            </p>
                        </div>
                    </div>
                    <div className="pft-hero-actions">
                        <span className={'pf-pill ' + STATUS_PILL_CLASS[tenant.status]}>
                            {tenant.status}
                        </span>
                        {canManage && (tenant.status === 'active' ? (
                            <button
                                type="button"
                                className={'pf-btn pf-btn-danger' + (statusProcessing ? ' pf-btn--loading' : '')}
                                onClick={() => setSuspendOpen(true)}
                                disabled={statusProcessing}
                            >
                                Suspend Client
                            </button>
                        ) : (
                            <button
                                type="button"
                                className={'pf-btn pf-btn-primary' + (statusProcessing ? ' pf-btn--loading' : '')}
                                onClick={reactivateClient}
                                disabled={statusProcessing}
                            >
                                Reactivate Client
                            </button>
                        ))}
                    </div>
                </div>

                <div className="pft-grid-2 pft-tab-panel" style={{ alignItems: 'start' }}>
                    <div className="pf-panel">
                        <div className="pf-panel-header">
                            <div>
                                <h2 className="pf-panel-title">Admin Users</h2>
                                <p className="pf-panel-count">
                                    {admins.length} admin{admins.length === 1 ? '' : 's'}
                                </p>
                            </div>
                            {canManage && (
                                <button
                                    type="button"
                                    className="pf-btn pf-btn-primary"
                                    onClick={() => setCreateAdminOpen(true)}
                                >
                                    <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>
                                    Add Admin
                                </button>
                            )}
                        </div>

                        <div className="pf-table-wrap">
                            <table className="pf-table">
                                <thead>
                                    <tr>
                                        <th scope="col" style={{ textAlign: 'center' }}>Name</th>
                                        <th scope="col">Email</th>
                                        <th scope="col">Password</th>
                                        <th scope="col">Status</th>
                                        <th scope="col"><span className="sr-only">Actions</span></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {admins.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="pf-empty">No admin users yet.</td>
                                        </tr>
                                    )}

                                    {admins.map((admin) => {
                                        const revealed = Boolean(revealedPasswords[admin.id]);
                                        return (
                                            <tr key={admin.id}>
                                                <td className="pf-tenant-name" style={{ textAlign: 'center' }}>{admin.name}</td>
                                                <td>{admin.email}</td>
                                                <td>
                                                    {admin.password_plaintext ? (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            <code className="font-mono" style={{ fontSize: 12.5 }}>
                                                                {revealed
                                                                    ? admin.password_plaintext
                                                                    : '•'.repeat(Math.min(admin.password_plaintext.length, 14))}
                                                            </code>
                                                            <button
                                                                type="button"
                                                                onClick={() => togglePasswordReveal(admin.id)}
                                                                aria-label={revealed ? 'Hide password' : 'Show password'}
                                                                aria-pressed={revealed}
                                                                style={{
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    width: 26,
                                                                    height: 26,
                                                                    flex: '0 0 26px',
                                                                    border: '1px solid var(--as-border)',
                                                                    borderRadius: 8,
                                                                    background: 'var(--as-surface)',
                                                                    color: 'var(--as-brand-blue-light)',
                                                                    cursor: 'pointer',
                                                                    transition: 'border-color 150ms ease, background 150ms ease',
                                                                }}
                                                            >
                                                                {revealed ? (
                                                                    <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                                                        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                                                                        <circle cx="12" cy="12" r="3" />
                                                                    </svg>
                                                                ) : (
                                                                    <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                                                        <path d="M3 3l18 18" />
                                                                        <path d="M10.6 5.1A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a15.3 15.3 0 0 1-4.2 4.6M6.3 6.3C3.4 8.2 2 12 2 12s3.5 7 10 7c1.4 0 2.6-.3 3.7-.8" />
                                                                        <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
                                                                    </svg>
                                                                )}
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span style={{ color: 'var(--as-text-muted)', fontSize: 12.5 }}>—</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <span className={'pf-pill ' + (admin.is_active ? 'pf-pill--active' : 'pf-pill--archived')}>
                                                        {admin.is_active ? 'active' : 'inactive'}
                                                    </span>
                                                </td>
                                                <td>
                                                    {canManage ? (
                                                        <div className="pft-row-actions">
                                                            <button
                                                                type="button"
                                                                className="pf-row-action"
                                                                onClick={() => openEditAdmin(admin)}
                                                            >
                                                                <svg viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                                                                Edit
                                                            </button>
                                                            {admin.is_active ? (
                                                                <button
                                                                    type="button"
                                                                    className="pf-row-action pf-row-action--danger"
                                                                    onClick={() => setRemoveAdminTarget(admin)}
                                                                >
                                                                    <svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m-7 0v12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V7" /></svg>
                                                                    Remove
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    className="pf-row-action"
                                                                    onClick={() => reactivateAdmin(admin)}
                                                                >
                                                                    <svg viewBox="0 0 24 24"><path d="M4 4v6h6M20 20v-6h-6M5 15a7 7 0 0 0 12.6 3M19 9A7 7 0 0 0 6.4 6" /></svg>
                                                                    Reactivate
                                                                </button>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span style={{ color: 'var(--as-text-muted)', fontSize: 12.5 }}>—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="pf-panel">
                        <div className="pf-panel-header">
                            <div>
                                <h2 className="pf-panel-title">Stations</h2>
                                <p className="pf-panel-count">
                                    {stations.length} station{stations.length === 1 ? '' : 's'}
                                </p>
                            </div>
                            <Link href={route('platform.stations.index')} className="pft-panel-link">
                                Manage stations
                                <svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" /></svg>
                            </Link>
                        </div>

                        <div className="pf-table-wrap">
                            <table className="pf-table">
                                <thead>
                                    <tr>
                                        <th scope="col" style={{ textAlign: 'center' }}>Name</th>
                                        <th scope="col">Code</th>
                                        <th scope="col">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stations.length === 0 && (
                                        <tr>
                                            <td colSpan={3} className="pf-empty">No stations yet.</td>
                                        </tr>
                                    )}
                                    {stations.map((station) => (
                                        <tr key={station.id}>
                                            <td className="pf-tenant-name" style={{ textAlign: 'center' }}>{station.name}</td>
                                            <td className="font-mono">{station.station_code}</td>
                                            <td>
                                                <span className={'pf-pill ' + (STATION_STATUS_PILL[station.status] ?? 'pf-pill--inactive')}>
                                                    {station.status.replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {canManage && (
                    <div className="pf-panel pft-tab-panel" style={{ marginTop: 16, borderColor: 'var(--as-danger-bg-alt)', background: 'linear-gradient(180deg, var(--as-danger-bg) 0%, var(--as-surface) 60%)' }}>
                        <div className="pf-panel-header" style={{ borderBottomColor: 'var(--as-danger-bg-alt)' }}>
                            <div>
                                <h2 className="pf-panel-title" style={{ color: 'var(--as-danger-dark)' }}>
                                    Danger Zone
                                </h2>
                                <p className="pf-panel-count">
                                    Permanently deletes this client and every row it owns —
                                    admins, people, cards, stations, attendance history, and
                                    integrations. This cannot be undone.
                                </p>
                            </div>
                            <button
                                type="button"
                                className="pf-btn pf-btn-danger"
                                onClick={() => setDeleteOpen(true)}
                            >
                                Delete Client
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Suspend Client modal */}
            <Modal show={suspendOpen} onClose={() => setSuspendOpen(false)}>
                <form onSubmit={handleSuspend} className="pf-modal">
                    <div className="pf-modal-header">
                        <div>
                            <h3 className="pf-modal-title" style={{ color: 'var(--as-danger-dark)' }}>
                                Suspend Client
                            </h3>
                        </div>
                        <button type="button" className="pf-modal-close" onClick={() => setSuspendOpen(false)} aria-label="Close">
                            <svg viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                    <p style={{ marginBottom: 20, color: 'var(--as-text-body)', fontSize: 13, lineHeight: 1.6 }}>
                        Suspend <strong>{tenant.name}</strong>? Its stations will stop accepting taps and the portal will be inaccessible until you reactivate it.
                    </p>
                    <div className="pf-modal-footer">
                        <button type="button" className="pf-btn pf-btn-secondary" onClick={() => setSuspendOpen(false)}>
                            Cancel
                        </button>
                        <button type="submit" className={'pf-btn pf-btn-danger' + (statusProcessing ? ' pf-btn--loading' : '')} disabled={statusProcessing}>
                            Suspend
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Remove Admin modal */}
            <Modal show={removeAdminTarget !== null} onClose={() => setRemoveAdminTarget(null)}>
                <form onSubmit={submitRemoveAdmin} className="pf-modal">
                    <div className="pf-modal-header">
                        <div>
                            <h3 className="pf-modal-title">Remove Admin Access</h3>
                        </div>
                        <button type="button" className="pf-modal-close" onClick={() => setRemoveAdminTarget(null)} aria-label="Close">
                            <svg viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                    <p style={{ marginBottom: 20, color: 'var(--as-text-body)', fontSize: 13, lineHeight: 1.6 }}>
                        Remove admin access for <strong>{removeAdminTarget?.name}</strong>? They won't be able to log into the portal until reactivated.
                    </p>
                    <div className="pf-modal-footer">
                        <button type="button" className="pf-btn pf-btn-secondary" onClick={() => setRemoveAdminTarget(null)}>
                            Cancel
                        </button>
                        <button type="submit" className={'pf-btn pf-btn-danger' + (revokeAdminForm.processing ? ' pf-btn--loading' : '')} disabled={revokeAdminForm.processing}>
                            Remove Access
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Delete Client modal */}
            <Modal show={deleteOpen} onClose={() => setDeleteOpen(false)}>
                <form onSubmit={submitDelete} className="pf-modal">
                    <div className="pf-modal-header">
                        <h3 className="pf-modal-title" style={{ color: 'var(--as-danger-dark)' }}>
                            Delete "{tenant.name}"?
                        </h3>
                        <button type="button" className="pf-modal-close" onClick={() => setDeleteOpen(false)} aria-label="Close">
                            <svg viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                    <p className="pf-field-hint" style={{ marginBottom: 16 }}>
                        This permanently deletes all of this client's people, cards, stations, attendance history, users, and integrations. This cannot be undone.
                    </p>
                    <div className="pf-field">
                        <label htmlFor="confirm_code">Type "{tenant.code}" to confirm</label>
                        <input
                            id="confirm_code"
                            type="text"
                            value={deleteForm.data.confirm_code}
                            onChange={(e) => deleteForm.setData('confirm_code', e.target.value)}
                            className="font-mono"
                            autoFocus
                            autoComplete="off"
                        />
                        <InputError message={deleteForm.errors.confirm_code} className="mt-2" />
                    </div>
                    <div className="pf-modal-footer">
                        <button type="button" className="pf-btn pf-btn-secondary" onClick={() => { setDeleteOpen(false); deleteForm.reset(); }}>
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className={'pf-btn pf-btn-danger' + (deleteForm.processing ? ' pf-btn--loading' : '')}
                            disabled={!deleteConfirmed || deleteForm.processing}
                        >
                            Permanently Delete
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Create Admin modal */}
            <Modal show={createAdminOpen} onClose={() => { setCreateAdminOpen(false); adminForm.reset(); }}>
                <form onSubmit={submitAdmin} className="pf-modal">
                    <div className="pf-modal-header">
                        <div>
                            <h3 className="pf-modal-title">Add Admin User</h3>
                            <p className="pf-field-hint">Saving generates a password automatically — reveal it afterward from the Admin Users table.</p>
                        </div>
                        <button type="button" className="pf-modal-close" onClick={() => { setCreateAdminOpen(false); adminForm.reset(); }} aria-label="Close">
                            <svg viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                    <div className="pf-field">
                        <label htmlFor="admin_name">Name</label>
                        <input id="admin_name" type="text" value={adminForm.data.name} onChange={(e) => adminForm.setData('name', e.target.value)} autoFocus required />
                        <InputError message={adminForm.errors.name} className="mt-2" />
                    </div>
                    <div className="pf-field">
                        <label htmlFor="admin_email">Email</label>
                        <input id="admin_email" type="email" value={adminForm.data.email} onChange={(e) => adminForm.setData('email', e.target.value)} required />
                        <InputError message={adminForm.errors.email} className="mt-2" />
                    </div>
                    <div className="pf-modal-footer">
                        <button type="button" className="pf-btn pf-btn-secondary" onClick={() => { setCreateAdminOpen(false); adminForm.reset(); }}>Cancel</button>
                        <button type="submit" className={'pf-btn pf-btn-primary' + (adminForm.processing ? ' pf-btn--loading' : '')} disabled={adminForm.processing}>Create</button>
                    </div>
                </form>
            </Modal>

            {/* Edit Admin modal */}
            <Modal show={editingAdmin !== null} onClose={closeEditAdmin}>
                <form onSubmit={submitEditAdmin} className="pf-modal">
                    <div className="pf-modal-header">
                        <div>
                            <h3 className="pf-modal-title">Edit Admin User</h3>
                            <p className="pf-field-hint">Saving generates a new password automatically — reveal it afterward from the Admin Users table.</p>
                        </div>
                        <button type="button" className="pf-modal-close" onClick={closeEditAdmin} aria-label="Close">
                            <svg viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                    <div className="pf-field">
                        <label htmlFor="edit_admin_name">Name</label>
                        <input id="edit_admin_name" type="text" value={editForm.data.name} onChange={(e) => editForm.setData('name', e.target.value)} autoFocus required />
                        <InputError message={editForm.errors.name} className="mt-2" />
                    </div>
                    <div className="pf-field">
                        <label htmlFor="edit_admin_email">Email</label>
                        <input id="edit_admin_email" type="email" value={editForm.data.email} onChange={(e) => editForm.setData('email', e.target.value)} required />
                        <InputError message={editForm.errors.email} className="mt-2" />
                    </div>
                    <div className="pf-modal-footer">
                        <button type="button" className="pf-btn pf-btn-secondary" onClick={closeEditAdmin}>Cancel</button>
                        <button type="submit" className={'pf-btn pf-btn-primary' + (editForm.processing ? ' pf-btn--loading' : '')} disabled={editForm.processing}>Save Changes</button>
                    </div>
                </form>
            </Modal>
        </PlatformLayout>
    );
}

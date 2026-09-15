import InputError from '@/Components/InputError';
import { PlusIcon } from '@/Components/icons/plus';
import { UserIcon } from '@/Components/icons/user';
import { UserPlusIcon } from '@/Components/icons/user-plus';
import { XIcon } from '@/Components/icons/x';
import Modal, { ModalHero } from '@/Components/Modal';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Head, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import '../../../../css/platform-dashboard.css';
import '../../../../css/platform-overview.css';

interface AdminRow {
    id: string;
    name: string;
    email: string;
    is_active: boolean;
    password_plaintext: string | null;
}

interface PagePropsWithFlash {
    flash?: {
        success?: string;
    };
}

export default function PlatformAdminsListScreen({ admins }: { admins: AdminRow[] }) {
    const { flash } = usePage().props as PagePropsWithFlash;
    const [createOpen, setCreateOpen] = useState(false);
    const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
    const [deactivatingAdmin, setDeactivatingAdmin] = useState<AdminRow | null>(null);
    const { data, setData, post, processing, errors, reset } = useForm({ name: '', email: '' });
    const deactivateForm = useForm({});
    const reactivateForm = useForm({});

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post(route('platform.platform-admins.store'), {
            onSuccess: () => {
                setCreateOpen(false);
                reset();
            },
        });
    }

    function submitDeactivate(e: React.FormEvent) {
        e.preventDefault();
        if (!deactivatingAdmin) return;
        deactivateForm.patch(route('platform.platform-admins.deactivate', deactivatingAdmin.id), {
            onSuccess: () => setDeactivatingAdmin(null),
        });
    }

    function reactivate(admin: AdminRow) {
        reactivateForm.patch(route('platform.platform-admins.reactivate', admin.id));
    }

    function togglePasswordReveal(adminId: string) {
        setRevealedPasswords((current) => ({ ...current, [adminId]: !current[adminId] }));
    }

    return (
        <PlatformLayout>
            <Head title="Platform Admins" />

            <div className="pf-dashboard pft-page">
                <div className="pft-hero">
                    <div className="pft-hero-main">
                        <span className="pft-hero-icon" aria-hidden="true">
                            <UserIcon size={22} />
                        </span>
                        <div>
                            <h1 className="pft-hero-title">Platform Admins</h1>
                            <p className="pft-hero-subtitle">
                                Read-only, platform-wide staff accounts — they see every
                                school's stations, SMS delivery log, and audit trail, but
                                can never create/suspend a school or manage credentials.
                            </p>
                        </div>
                    </div>
                    <div className="pft-hero-actions">
                        <button
                            type="button"
                            className="pf-btn pf-btn-primary"
                            onClick={() => setCreateOpen(true)}
                        >
                            <PlusIcon size={16} />
                            Add Admin
                        </button>
                    </div>
                </div>

                {flash?.success && (
                    <div className="pf-panel" style={{ marginBottom: 16, padding: 16 }}>
                        {flash.success}
                    </div>
                )}

                <div className="pf-panel">
                    <div className="pf-panel-header">
                        <div>
                            <h2 className="pf-panel-title">Accounts</h2>
                            <p className="pf-panel-count">{admins.length} account{admins.length === 1 ? '' : 's'}</p>
                        </div>
                    </div>

                    <div className="pf-table-wrap">
                        <table className="pf-table">
                            <thead>
                                <tr>
                                    <th scope="col">Name</th>
                                    <th scope="col">Email</th>
                                    <th scope="col">Password</th>
                                    <th scope="col">Status</th>
                                    <th scope="col"><span className="sr-only">Actions</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                {admins.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="pf-empty">No platform admin accounts yet.</td>
                                    </tr>
                                )}

                                {admins.map((admin) => {
                                    const revealed = Boolean(revealedPasswords[admin.id]);
                                    return (
                                        <tr key={admin.id}>
                                            <td className="pf-tenant-name">{admin.name}</td>
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
                                                            className="pf-row-action"
                                                            style={{ padding: '2px 8px' }}
                                                        >
                                                            {revealed ? 'Hide' : 'Show'}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span style={{ color: '#94a3b8', fontSize: 12.5 }}>—</span>
                                                )}
                                            </td>
                                            <td>
                                                <span className={'pf-pill ' + (admin.is_active ? 'pf-pill--active' : 'pf-pill--archived')}>
                                                    {admin.is_active ? 'active' : 'inactive'}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="pft-row-actions">
                                                    {admin.is_active ? (
                                                        <button
                                                            type="button"
                                                            className="pf-row-action pf-row-action--danger"
                                                            onClick={() => setDeactivatingAdmin(admin)}
                                                        >
                                                            Deactivate
                                                        </button>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            className="pf-row-action"
                                                            onClick={() => reactivate(admin)}
                                                        >
                                                            Reactivate
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Add Admin modal */}
            <Modal show={createOpen} onClose={() => setCreateOpen(false)}>
                <form onSubmit={submit} className="pf-modal">
                    <ModalHero
                        tone="blue"
                        title="Add Platform Admin"
                        subtitle="A read-only oversight account — the password shown next works immediately, no forced reset."
                        onClose={() => setCreateOpen(false)}
                    >
                        <UserPlusIcon size={22} />
                    </ModalHero>

                    <div className="pf-field">
                        <label htmlFor="name">Name</label>
                        <input
                            id="name"
                            type="text"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            autoFocus
                            required
                        />
                        <InputError message={errors.name} className="mt-2" />
                    </div>

                    <div className="pf-field">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            required
                        />
                        <InputError message={errors.email} className="mt-2" />
                    </div>

                    <div className="pf-modal-footer">
                        <button
                            type="button"
                            className="pf-btn pf-btn-secondary"
                            onClick={() => setCreateOpen(false)}
                        >
                            Cancel
                        </button>
                        <button type="submit" className="pf-btn pf-btn-primary" disabled={processing}>
                            Add
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Deactivate modal */}
            <Modal show={deactivatingAdmin !== null} onClose={() => setDeactivatingAdmin(null)}>
                <form onSubmit={submitDeactivate} className="pf-modal">
                    <ModalHero
                        tone="red"
                        title="Deactivate Account"
                        subtitle="They immediately lose access to the platform area."
                        onClose={() => setDeactivatingAdmin(null)}
                    >
                        <XIcon size={22} />
                    </ModalHero>

                    <p style={{ padding: '0 0 8px' }}>
                        Deactivate <strong>{deactivatingAdmin?.name}</strong>? They will
                        immediately lose access to the platform area.
                    </p>

                    <div className="pf-modal-footer">
                        <button
                            type="button"
                            className="pf-btn pf-btn-secondary"
                            onClick={() => setDeactivatingAdmin(null)}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="pf-btn pf-btn-danger"
                            disabled={deactivateForm.processing}
                        >
                            Deactivate
                        </button>
                    </div>
                </form>
            </Modal>
        </PlatformLayout>
    );
}

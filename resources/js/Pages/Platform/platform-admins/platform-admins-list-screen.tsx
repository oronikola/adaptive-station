import InputError from '@/Components/InputError';
import { CheckIcon } from '@/Components/icons/check';
import { CopyIcon } from '@/Components/icons/copy';
import { EyeIcon } from '@/Components/icons/eye';
import { EyeOffIcon } from '@/Components/icons/eye-off';
import { LockIcon } from '@/Components/icons/lock';
import { PlusIcon } from '@/Components/icons/plus';
import { ShieldCheckIcon } from '@/Components/icons/shield-check';
import { UserIcon } from '@/Components/icons/user';
import { UserPlusIcon } from '@/Components/icons/user-plus';
import { XIcon } from '@/Components/icons/x';
import Modal, { ModalHero } from '@/Components/Modal';
import { useToast } from '@/Components/toast/ToastProvider';
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
    const { showToast } = useToast();
    const [createOpen, setCreateOpen] = useState(false);
    const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
    const [copiedField, setCopiedField] = useState<string | null>(null);
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

    async function copyValue(value: string, label: string, fieldKey: string): Promise<void> {
        try {
            await navigator.clipboard.writeText(value);
            setCopiedField(fieldKey);
            showToast({ type: 'success', message: `${label} copied.` });
            window.setTimeout(() => {
                setCopiedField((current) => (current === fieldKey ? null : current));
            }, 1800);
        } catch {
            showToast({
                type: 'error',
                message: `Could not copy ${label.toLowerCase()}.`,
                description: 'Copy it manually and try again.',
            });
        }
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
                            <p className="pft-hero-subtitle">Manage read-only staff access across the platform.</p>
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
                        <table className="pf-table pfa-admin-table">
                            <thead>
                                <tr>
                                    <th scope="col">Administrator</th>
                                    <th scope="col">Email</th>
                                    <th scope="col">Credentials</th>
                                    <th scope="col">Status</th>
                                    <th scope="col"><span className="sr-only">Actions</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                {admins.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="pf-empty">
                                            <div className="pfa-empty-state">
                                                <span className="pfa-admin-avatar" aria-hidden="true"><ShieldCheckIcon size={18} /></span>
                                                <strong>No platform admins yet</strong>
                                                <span>Add an admin to grant read-only oversight access.</span>
                                            </div>
                                        </td>
                                    </tr>
                                )}

                                {admins.map((admin) => {
                                    const revealed = Boolean(revealedPasswords[admin.id]);
                                    return (
                                        <tr key={admin.id}>
                                            <td>
                                                <div className="pfa-admin-identity">
                                                    <span className="pfa-admin-avatar" aria-hidden="true">{admin.name.charAt(0).toUpperCase()}</span>
                                                    <span>
                                                        <strong>{admin.name}</strong>
                                                        <small><ShieldCheckIcon size={12} aria-hidden="true" />Read-only oversight</small>
                                                    </span>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="pfa-data-field pfa-data-field--email">
                                                    <span className="pfa-data-field-value">
                                                        <span>{admin.email}</span>
                                                    </span>
                                                    <button
                                                        type="button"
                                                        className={`pfa-copy-button ${copiedField === `${admin.id}:email` ? 'pfa-copy-button--copied' : ''}`}
                                                        onClick={() => copyValue(admin.email, 'Email', `${admin.id}:email`)}
                                                        aria-label={`Copy ${admin.name}'s email address`}
                                                        title={copiedField === `${admin.id}:email` ? 'Copied' : 'Copy email'}
                                                    >
                                                        {copiedField === `${admin.id}:email` ? <CheckIcon size={14} aria-hidden="true" /> : <CopyIcon size={14} aria-hidden="true" />}
                                                    </button>
                                                </div>
                                            </td>
                                            <td>
                                                {admin.password_plaintext ? (
                                                    <div className="pfa-credential">
                                                        <span className="pfa-credential-icon" aria-hidden="true"><LockIcon size={14} /></span>
                                                        <span className="pfa-data-field-value">
                                                            <code>{revealed ? admin.password_plaintext : '•'.repeat(Math.min(admin.password_plaintext.length, 12))}</code>
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => togglePasswordReveal(admin.id)}
                                                            aria-label={revealed ? 'Hide password' : 'Show password'}
                                                            aria-pressed={revealed}
                                                            title={revealed ? 'Hide password' : 'Show password'}
                                                            className="pfa-reveal-button"
                                                        >
                                                            {revealed ? <EyeOffIcon size={14} aria-hidden="true" /> : <EyeIcon size={14} aria-hidden="true" />}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className={`pfa-copy-button ${copiedField === `${admin.id}:password` ? 'pfa-copy-button--copied' : ''}`}
                                                            onClick={() => copyValue(admin.password_plaintext as string, 'Password', `${admin.id}:password`)}
                                                            aria-label={`Copy ${admin.name}'s password`}
                                                            title={copiedField === `${admin.id}:password` ? 'Copied' : 'Copy password'}
                                                        >
                                                            {copiedField === `${admin.id}:password` ? <CheckIcon size={14} aria-hidden="true" /> : <CopyIcon size={14} aria-hidden="true" />}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="pfa-credential-unavailable"><LockIcon size={13} aria-hidden="true" />Not retained</span>
                                                )}
                                            </td>
                                            <td>
                                                <span className={'pf-pill ' + (admin.is_active ? 'pf-pill--active' : 'pf-pill--archived')}>
                                                    {admin.is_active ? 'active' : 'inactive'}
                                                </span>
                                            </td>
                                            <td className="pfa-admin-action-cell">
                                                <div className="pft-row-actions">
                                                    {admin.is_active ? (
                                                        <button
                                                            type="button"
                                                            className="pf-row-action pf-row-action--control pf-row-action--danger"
                                                            onClick={() => setDeactivatingAdmin(admin)}
                                                        >
                                                            <XIcon size={15} aria-hidden="true" />
                                                            Deactivate
                                                        </button>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            className="pf-row-action pf-row-action--control pf-row-action--success"
                                                            onClick={() => reactivate(admin)}
                                                            disabled={reactivateForm.processing}
                                                        >
                                                            <CheckIcon size={15} aria-hidden="true" />
                                                            {reactivateForm.processing ? 'Reactivating…' : 'Reactivate'}
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
                        subtitle="Create a read-only oversight account."
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
                        subtitle="Access ends immediately."
                        onClose={() => setDeactivatingAdmin(null)}
                    >
                        <XIcon size={22} />
                    </ModalHero>

                    <p style={{ padding: '0 0 8px' }}>
                        Deactivate <strong>{deactivatingAdmin?.name}</strong>? They will lose platform access.
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

import InputError from '@/Components/InputError';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import '../../../../css/platform-dashboard.css';
import '../../../../css/platform-overview.css';

const ROLE_INFO: Record<string, { label: string; description: string; capabilities: string[] }> = {
    tenant_operator: {
        label: 'Operator',
        description: 'Can view attendance records and monitor station activity.',
        capabilities: ['View attendance logs', 'View people & RFID cards', 'View station status', 'Cannot edit or create records'],
    },
    tenant_admin: {
        label: 'Admin',
        description: 'Full access to all school data and settings.',
        capabilities: ['All Operator capabilities', 'Add and edit people & parents', 'Manage stations and integrations', 'Create and manage user accounts'],
    },
};

export default function UsersCreateScreen() {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        email: '',
        role: 'tenant_operator',
    });

    function submit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        post(route('portal.users.store'));
    }

    const role = ROLE_INFO[data.role] ?? ROLE_INFO.tenant_operator;

    return (
        <AdminLayout>
            <Head title="Add User" />

            <div className="pf-dashboard pft-page">
                <Link href={route('portal.users.index')} className="pft-panel-link" style={{ marginBottom: 14 }}>
                    <svg viewBox="0 0 24 24">
                        <path d="m15 6-6 6 6 6" />
                    </svg>
                    Back to Users
                </Link>

                <div className="pft-hero">
                    <div className="pft-hero-main">
                        <span className="pft-hero-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24">
                                <circle cx="12" cy="8.4" r="3.6" />
                                <path d="M4.5 19.6a7.5 6 0 0 1 15 0z" />
                            </svg>
                        </span>
                        <div>
                            <h1 className="pft-hero-title">Add User</h1>
                            <p className="pft-hero-subtitle">
                                A temporary password will be generated and shown once after creation.
                                Relay it to the new user — they must set their own password on first login.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="pf-panel">
                    <form onSubmit={submit} className="pft-form-panel">
                        <div className="pft-form-grid">
                            <div className="pf-field">
                                <label htmlFor="name">Full name <span aria-hidden="true" style={{ color: 'var(--as-danger)' }}>*</span></label>
                                <input
                                    id="name"
                                    type="text"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    autoFocus
                                    required
                                    autoComplete="name"
                                    placeholder="e.g. Maria Santos"
                                />
                                <p className="pf-field-hint">Displayed in all screens and activity logs.</p>
                                <InputError message={errors.name} className="mt-2" />
                            </div>

                            <div className="pf-field">
                                <label htmlFor="email">Email address <span aria-hidden="true" style={{ color: 'var(--as-danger)' }}>*</span></label>
                                <input
                                    id="email"
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    required
                                    autoComplete="email"
                                    placeholder="e.g. maria@school.edu.ph"
                                />
                                <p className="pf-field-hint">Used to log in and receive notifications. Must be unique.</p>
                                <InputError message={errors.email} className="mt-2" />
                            </div>
                        </div>

                        <div className="pf-field">
                            <label htmlFor="role">Role <span aria-hidden="true" style={{ color: 'var(--as-danger)' }}>*</span></label>
                            <select
                                id="role"
                                value={data.role}
                                onChange={(e) => setData('role', e.target.value)}
                            >
                                <option value="tenant_operator">Operator (view-only)</option>
                                <option value="tenant_admin">Admin (full access)</option>
                            </select>
                            <InputError message={errors.role} className="mt-2" />
                        </div>

                        {/* Role capability card */}
                        <div
                            style={{
                                padding: '14px 18px',
                                borderRadius: 16,
                                border: '1px solid var(--as-border)',
                                background: 'var(--as-surface)',
                                marginBottom: 8,
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
                                <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--as-text)' }}>{role.label}</span>
                                <span style={{ fontSize: 12, color: 'var(--as-text-secondary)' }}>{role.description}</span>
                            </div>
                            <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {role.capabilities.map((cap) => (
                                    <li key={cap} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--as-text-secondary)' }}>
                                        <svg
                                            viewBox="0 0 24 24"
                                            style={{ width: 13, height: 13, flexShrink: 0, fill: 'none', stroke: 'var(--as-success)', strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' }}
                                        >
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                        {cap}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Temp password notice */}
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 12,
                                padding: '12px 16px',
                                borderRadius: 14,
                                border: '1px solid #fde68a',
                                background: '#fffbeb',
                                marginBottom: 4,
                            }}
                        >
                            <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, flexShrink: 0, fill: 'none', stroke: '#d97706', strokeWidth: 2, strokeLinecap: 'round', marginTop: 1 }}>
                                <circle cx="12" cy="12" r="9" />
                                <path d="M12 7v5" />
                                <circle cx="12" cy="16.5" r=".5" fill="#d97706" />
                            </svg>
                            <p style={{ margin: 0, fontSize: 12, color: '#92400e', lineHeight: 1.5 }}>
                                A system-generated temporary password will be shown <strong>once</strong> after this form is submitted.
                                Copy and share it with the new user immediately — it cannot be retrieved later.
                            </p>
                        </div>

                        <div className="pft-form-actions">
                            <Link href={route('portal.users.index')} className="pf-btn pf-btn-secondary">
                                Cancel
                            </Link>
                            <button
                                type="submit"
                                className={'pf-btn pf-btn-primary' + (processing ? ' pf-btn--loading' : '')}
                                disabled={processing || !data.name.trim() || !data.email.trim()}
                            >
                                <svg viewBox="0 0 24 24">
                                    <path d="M12 5v14M5 12h14" />
                                </svg>
                                Create User
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AdminLayout>
    );
}

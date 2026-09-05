import InputError from '@/Components/InputError';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import '../../../../css/platform-dashboard.css';
import '../../../../css/platform-overview.css';

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
                                A temporary password will be generated and shown once.
                                Relay it to the new user directly — they will be
                                required to set their own password on first login.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="pf-panel">
                    <form onSubmit={submit} className="pft-form-grid">
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

                        <div className="pf-field">
                            <label htmlFor="role">Role</label>
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

                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <button type="submit" className="pf-btn pf-btn-primary" disabled={processing}>
                                Create User
                            </button>
                            <Link href={route('portal.users.index')} className="pf-btn pf-btn-secondary">
                                Cancel
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </AdminLayout>
    );
}

import AdminLayout from '@/Layouts/AdminLayout';
import PlatformLayout from '@/Layouts/PlatformLayout';
import type { PageProps } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import '../../../css/platform-dashboard.css';
import '../../../css/platform-overview.css';
import '../../../css/profile.css';
import DeleteUserForm from './Partials/DeleteUserForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';

interface EditProps {
    mustVerifyEmail: boolean;
    status?: string;
}

export default function Edit({ mustVerifyEmail, status }: EditProps) {
    const { auth } = usePage<PageProps>().props;
    const user = auth.user;
    const isSuperAdmin = user.role === 'platform_super_admin';
    const Layout = isSuperAdmin ? PlatformLayout : AdminLayout;
    const roleLabel = isSuperAdmin ? 'Superadmin' : user.role === 'tenant_admin' ? 'Admin' : 'Operator';
    const initials = user.name.trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join('').toUpperCase();

    return (
        <Layout>
            <Head title="Profile" />

            <div className="pf-dashboard profile-page pft-page">
                <div className="pft-hero">
                    <div className="pft-hero-main">
                        <span className="pft-hero-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24">
                                <circle cx="12" cy="8.4" r="3.6" />
                                <path d="M4.5 19.6a7.5 6 0 0 1 15 0z" />
                            </svg>
                        </span>
                        <div>
                            <h1 className="pft-hero-title">My Profile</h1>
                            <p className="pft-hero-subtitle">Manage your personal details and keep your account secure.</p>
                        </div>
                    </div>
                </div>

                <div className="profile-grid">
                    <aside className="profile-summary" aria-label="Account summary">
                        <div className="profile-summary-cover" />
                        <div className="profile-summary-body">
                            <div className="profile-avatar" aria-hidden="true">{initials}</div>
                            <span className="profile-role">{roleLabel}</span>
                            <h2 className="profile-name">{user.name}</h2>
                            <p className="profile-email">{user.email}</p>
                            <div className="profile-summary-note">
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Z" />
                                    <path d="m8.5 12 2.5 2.5 4.5-5" />
                                </svg>
                                <div>
                                    <strong>Your account, in one place</strong>
                                    <p>Keep your contact information up to date and use a unique password.</p>
                                </div>
                            </div>
                        </div>
                    </aside>

                    <div className="profile-settings">
                        <UpdateProfileInformationForm
                            mustVerifyEmail={mustVerifyEmail}
                            status={status}
                            className="profile-card"
                        />
                        <UpdatePasswordForm className="profile-card" />
                        <DeleteUserForm className="profile-card profile-card--danger" />
                    </div>
                </div>
            </div>
        </Layout>
    );
}

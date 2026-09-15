import AdminLayout from '@/Layouts/AdminLayout';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Head, usePage } from '@inertiajs/react';
import React from 'react';
import type { PageProps } from '@/types';
import DeleteUserForm from './Partials/DeleteUserForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';
import { ShieldCheckIcon } from '@/Components/icons/shield-check';
import '../../../css/platform-dashboard.css';
import '../../../css/platform-overview.css';

interface EditProps {
    mustVerifyEmail: boolean;
    status?: string;
}

export default function Edit({ mustVerifyEmail, status }: EditProps) {
    const { props } = usePage<PageProps>();
    const user = props.auth?.user;

    const isPlatformSuperAdmin = user?.role === 'platform_super_admin';
    const isTenantAdmin = user?.role === 'tenant_admin';
    const Layout = isPlatformSuperAdmin ? PlatformLayout : AdminLayout;

    const roleBadgeLabel = isPlatformSuperAdmin
        ? 'Platform Super Administrator'
        : isTenantAdmin
        ? 'School Administrator'
        : 'Station Operator';

    return (
        <Layout
            header={
                <div className="flex items-center justify-between">
                    <div>
                        <span className="pf-dashboard-kicker">Account &amp; Security</span>
                        <h1 className="pf-dashboard-title">Profile Settings</h1>
                        <p className="pf-dashboard-subtitle">
                            Manage your personal credentials, contact details, and account security.
                        </p>
                    </div>
                </div>
            }
        >
            <Head title="Profile Settings" />

            <div className="pf-dashboard">
                {/* 2-Column Grid */}
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
                    {/* Primary Forms Column */}
                    <div className="space-y-8 lg:col-span-8">
                        {/* Profile Info Form */}
                        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
                            <UpdateProfileInformationForm
                                mustVerifyEmail={mustVerifyEmail}
                                status={status}
                            />
                        </div>

                        {/* Password Form */}
                        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
                            <UpdatePasswordForm />
                        </div>
                    </div>

                    {/* Secondary Information & Danger Zone Column */}
                    <div className="space-y-8 lg:col-span-4">
                        {/* Role & Access Privileges Summary Card */}
                        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
                                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[#234ef4] dark:bg-blue-950/40 dark:text-blue-300">
                                    <ShieldCheckIcon size={16} />
                                </span>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                        Access &amp; Permissions
                                    </h3>
                                    <span className="text-xs text-slate-500 dark:text-slate-400">
                                        Assigned system capabilities
                                    </span>
                                </div>
                            </div>

                            <ul className="mt-4 space-y-3 text-xs text-slate-600 dark:text-slate-400">
                                {isPlatformSuperAdmin ? (
                                    <>
                                        <li className="flex items-start gap-2">
                                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#234ef4] shrink-0" />
                                            <span>Full cross-tenant infrastructure oversight and provisioning.</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#234ef4] shrink-0" />
                                            <span>Tenant lifecycle management and database controls.</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#234ef4] shrink-0" />
                                            <span>System-wide audit trail and security log review.</span>
                                        </li>
                                    </>
                                ) : isTenantAdmin ? (
                                    <>
                                        <li className="flex items-start gap-2">
                                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#234ef4] shrink-0" />
                                            <span>Kiosk stations configuration and activation code generation.</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#234ef4] shrink-0" />
                                            <span>People management and RFID card assignments.</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#234ef4] shrink-0" />
                                            <span>Attendance reporting, exports, and SIS synchronization.</span>
                                        </li>
                                    </>
                                ) : (
                                    <>
                                        <li className="flex items-start gap-2">
                                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#234ef4] shrink-0" />
                                            <span>Real-time station monitoring and heartbeat tracking.</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#234ef4] shrink-0" />
                                            <span>Attendance search and daily log verification.</span>
                                        </li>
                                    </>
                                )}
                            </ul>

                            <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/50 p-3.5 text-[11px] leading-relaxed text-blue-900 dark:border-blue-900/30 dark:bg-blue-950/20 dark:text-blue-200">
                                <strong>Security Recommendation:</strong> Use a password manager and ensure unique credentials across devices to protect kiosk communication tokens.
                            </div>
                        </div>

                        {/* Danger Zone Card */}
                        <div className="rounded-2xl border border-rose-200/80 bg-white p-6 shadow-sm dark:border-rose-900/40 dark:bg-slate-900">
                            <DeleteUserForm />
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}

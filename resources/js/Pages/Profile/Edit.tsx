import AdminLayout from '@/Layouts/AdminLayout';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Head, usePage } from '@inertiajs/react';
import React from 'react';
import type { PageProps } from '@/types';
import DeleteUserForm from './Partials/DeleteUserForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';
import { GraduationCapIcon } from '@/Components/icons/graduation-cap';
import { CircleCheckIcon } from '@/Components/icons/circle-check';
import { ShieldCheckIcon } from '@/Components/icons/shield-check';
import '../../../css/platform-dashboard.css';

interface EditProps {
    mustVerifyEmail: boolean;
    status?: string;
}

export default function Edit({ mustVerifyEmail, status }: EditProps) {
    const { props } = usePage<PageProps>();
    const user = props.auth?.user;
    const tenant = props.tenant;

    const isPlatformSuperAdmin = user?.role === 'platform_super_admin';
    const isTenantAdmin = user?.role === 'tenant_admin';
    const Layout = isPlatformSuperAdmin ? PlatformLayout : AdminLayout;

    const roleBadgeLabel = isPlatformSuperAdmin
        ? 'Platform Super Administrator'
        : isTenantAdmin
        ? 'School Administrator'
        : 'Station Operator';

    const memberSinceDate = user?.created_at
        ? new Date(user.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
          })
        : null;

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
                {/* User Identity Hero Banner */}
                <div className="mb-8 overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
                    <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-5">
                            <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#234ef4] via-[#3b68f5] to-[#1b36c8] text-2xl font-extrabold text-white shadow-card-blue ring-4 ring-white dark:ring-slate-800">
                                {(user?.name?.charAt(0) || 'U').toUpperCase()}
                                <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-white ring-2 ring-white dark:bg-slate-900 dark:ring-slate-900">
                                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                </span>
                            </div>
                            <div>
                                <div className="flex items-center gap-2.5 flex-wrap">
                                    <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                                        {user?.name || 'User'}
                                    </h2>
                                    <span
                                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                            isPlatformSuperAdmin
                                                ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                                                : isTenantAdmin
                                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800'
                                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                                        }`}
                                    >
                                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                        {roleBadgeLabel}
                                    </span>
                                </div>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                    {user?.email || ''}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4 sm:border-t-0 sm:pt-0 dark:border-slate-800">
                            {tenant && (
                                <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-300">
                                    <GraduationCapIcon size={16} className="text-[#234ef4]" />
                                    <div>
                                        <span className="font-semibold block">{tenant.name}</span>
                                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
                                            {tenant.timezone ?? 'UTC'}
                                        </span>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-300">
                                <CircleCheckIcon size={16} className="text-emerald-600" />
                                <div>
                                    <span className="font-semibold block">Session Active</span>
                                    <span className="text-[10px] text-slate-400">
                                        {memberSinceDate ? `Joined ${memberSinceDate}` : 'Protected'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

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

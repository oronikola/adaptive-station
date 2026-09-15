import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PremiumSelect from '@/Components/PremiumSelect';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import '../../../../css/platform-dashboard.css';

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
            <Head title="Add User — Access Management" />

            <div className="pf-dashboard max-w-3xl mx-auto">
                {/* Back Link */}
                <div className="mb-6">
                    <Link
                        href={route('portal.users.index')}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                        Back to Users Directory
                    </Link>
                </div>

                {/* Hero Header */}
                <div className="pf-dashboard-header mb-6">
                    <div>
                        <p className="pf-dashboard-kicker">ACCESS PROVISIONING</p>
                        <h1 className="pf-dashboard-title">Add Staff User</h1>
                        <p className="pf-dashboard-subtitle">
                            Provision a new account for your school workspace. A temporary password will be generated for the user.
                        </p>
                    </div>
                </div>

                {/* Information Callout */}
                <div className="mb-6 flex items-start gap-3.5 rounded-2xl border border-blue-200/80 bg-blue-50/60 p-4 text-xs text-blue-900 shadow-xs dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="16" x2="12" y2="12" />
                            <line x1="12" y1="8" x2="12.01" y2="8" />
                        </svg>
                    </span>
                    <div className="leading-relaxed">
                        <span className="font-bold">Temporary Password Security:</span> A random one-time password will be generated and shown only once after creating this user. Relay it to the user directly — they will be required to set their own permanent password on their first login.
                    </div>
                </div>

                {/* Main Form Panel */}
                <div className="pf-panel">
                    <div className="pf-panel-header">
                        <h2 className="pf-panel-title">User Account Details</h2>
                    </div>

                    <form onSubmit={submit} className="p-6 space-y-6">
                        {/* Name */}
                        <div>
                            <InputLabel htmlFor="name" value="Full Name" />
                            <input
                                id="name"
                                type="text"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                placeholder="e.g. Eleanor Vance"
                                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-600/15 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                                autoFocus
                                required
                            />
                            <InputError message={errors.name} className="mt-1.5" />
                        </div>

                        {/* Email */}
                        <div>
                            <InputLabel htmlFor="email" value="Email Address" />
                            <input
                                id="email"
                                type="email"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                placeholder="e.g. eleanor@school.edu"
                                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-600/15 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                                required
                            />
                            <InputError message={errors.email} className="mt-1.5" />
                        </div>

                        {/* Role */}
                        <div>
                            <InputLabel htmlFor="role" value="Portal Access Role" />
                            <div className="mt-1.5">
                                <PremiumSelect
                                    id="role"
                                    value={data.role}
                                    onChange={(role) => setData('role', role)}
                                    options={[
                                        { value: 'tenant_operator', label: 'Operator (Kiosk & Attendance Management)' },
                                        { value: 'tenant_admin', label: 'Admin (Full School Management & Billing)' },
                                    ]}
                                    invalid={Boolean(errors.role)}
                                />
                            </div>
                            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                                Operators can manage tap stations and attendance. Admins can additionally invite staff and modify school settings.
                            </p>
                            <InputError message={errors.role} className="mt-1.5" />
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-gray-800">
                            <button
                                type="submit"
                                disabled={processing}
                                className="pf-btn pf-btn-primary"
                            >
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                    <circle cx="9" cy="7" r="4" />
                                    <line x1="19" y1="8" x2="19" y2="14" />
                                    <line x1="22" y1="11" x2="16" y2="11" />
                                </svg>
                                {processing ? 'Creating...' : 'Create User'}
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

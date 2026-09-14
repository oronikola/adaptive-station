import InputError from '@/Components/InputError';
import Modal from '@/Components/Modal';
import { useToast } from '@/Components/toast/ToastProvider';
import { Tenant } from '@/types';
import { Link, router } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useState } from 'react';

interface Admin {
    id: number;
    name: string;
    email: string;
    is_active: boolean;
}

interface StationDetail {
    id: number;
    name: string;
    station_code: string;
    status: string;
}

interface ManageSchoolModalProps {
    tenant: Tenant | null;
    show: boolean;
    onClose: () => void;
    onUpdated?: (updatedTenant: Tenant) => void;
}

type TabKey = 'overview' | 'admins' | 'stations' | 'danger';

export default function ManageSchoolModal({
    tenant,
    show,
    onClose,
    onUpdated,
}: ManageSchoolModalProps) {
    const { showToast } = useToast();

    const [activeTab, setActiveTab] = useState<TabKey>('overview');
    const [currentTenant, setCurrentTenant] = useState<Tenant | null>(tenant);

    // Overview form state
    const [name, setName] = useState('');
    const [timezone, setTimezone] = useState('');
    const [isSavingDetails, setIsSavingDetails] = useState(false);
    const [overviewErrors, setOverviewErrors] = useState<{ name?: string; timezone?: string }>({});

    // Related data
    const [admins, setAdmins] = useState<Admin[]>([]);
    const [stations, setStations] = useState<StationDetail[]>([]);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);

    // Status toggling
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    // Add admin form state
    const [isAddingAdmin, setIsAddingAdmin] = useState(false);
    const [adminName, setAdminName] = useState('');
    const [adminEmail, setAdminEmail] = useState('');
    const [adminErrors, setAdminErrors] = useState<{ name?: string; email?: string }>({});
    const [isSubmittingAdmin, setIsSubmittingAdmin] = useState(false);
    const [newAdminPassword, setNewAdminPassword] = useState<string | null>(null);
    const [copiedSecret, setCopiedSecret] = useState(false);

    // Delete state
    const [deleteCode, setDeleteCode] = useState('');
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Reset and fetch when modal opens with a tenant
    useEffect(() => {
        if (!show || !tenant) {
            setActiveTab('overview');
            setNewAdminPassword(null);
            setIsAddingAdmin(false);
            setDeleteCode('');
            setDeleteError(null);
            setOverviewErrors({});
            setAdminErrors({});
            return;
        }

        setCurrentTenant(tenant);
        setName(tenant.name);
        setTimezone(tenant.timezone || 'Asia/Manila');
        setIsLoadingDetails(true);
        setNewAdminPassword(null);

        axios
            .get(route('platform.tenants.show', tenant.id), {
                headers: { Accept: 'application/json' },
            })
            .then((res) => {
                if (res.data.tenant) {
                    setCurrentTenant(res.data.tenant);
                    setName(res.data.tenant.name);
                    setTimezone(res.data.tenant.timezone);
                }
                setAdmins(res.data.admins || []);
                setStations(res.data.stations || []);
            })
            .catch(() => {
                showToast({
                    type: 'error',
                    message: 'Could not load school details.',
                    description: 'Please check your connection and try again.',
                });
            })
            .finally(() => {
                setIsLoadingDetails(false);
            });
    }, [show, tenant]);

    if (!currentTenant) {
        return null;
    }

    const deleteConfirmed = deleteCode === currentTenant.code;

    // Save general details (name, timezone)
    async function handleSaveDetails(e: React.FormEvent) {
        e.preventDefault();
        if (!currentTenant) return;

        setIsSavingDetails(true);
        setOverviewErrors({});

        try {
            const res = await axios.patch(
                route('platform.tenants.update', currentTenant.id),
                { name, timezone },
                { headers: { Accept: 'application/json' } },
            );

            const updated = res.data.tenant;
            setCurrentTenant(updated);
            if (onUpdated) onUpdated(updated);

            showToast({
                type: 'update',
                message: 'School details updated.',
                description: `Successfully updated ${updated.name}.`,
            });

            router.reload({ only: ['tenants', 'recentTenants', 'stats', 'growth'] });
        } catch (error: any) {
            if (error.response?.data?.errors) {
                setOverviewErrors(error.response.data.errors);
            } else {
                showToast({
                    type: 'error',
                    message: 'Failed to update school details.',
                });
            }
        } finally {
            setIsSavingDetails(false);
        }
    }

    // Toggle active / suspended status
    async function handleToggleStatus() {
        if (!currentTenant || isUpdatingStatus) return;

        const nextStatus = currentTenant.status === 'active' ? 'suspended' : 'active';

        if (
            nextStatus === 'suspended' &&
            !confirm(
                'Suspend this school? Its stations and portal will stop working until reactivated.',
            )
        ) {
            return;
        }

        setIsUpdatingStatus(true);
        try {
            const res = await axios.patch(
                route('platform.tenants.status', currentTenant.id),
                { status: nextStatus },
                { headers: { Accept: 'application/json' } },
            );

            const updated = res.data.tenant || { ...currentTenant, status: nextStatus };
            setCurrentTenant(updated);
            if (onUpdated) onUpdated(updated);

            showToast({
                type: 'update',
                message: nextStatus === 'active' ? 'School reactivated.' : 'School suspended.',
                description: `${currentTenant.name} is now ${nextStatus}.`,
            });

            router.reload({ only: ['tenants', 'recentTenants', 'stats', 'growth'] });
        } catch {
            showToast({
                type: 'error',
                message: 'Could not change school status.',
            });
        } finally {
            setIsUpdatingStatus(false);
        }
    }

    // Add Admin user
    async function handleCreateAdmin(e: React.FormEvent) {
        e.preventDefault();
        if (!currentTenant) return;

        setIsSubmittingAdmin(true);
        setAdminErrors({});

        try {
            const res = await axios.post(
                route('platform.tenants.admins.store', currentTenant.id),
                { name: adminName, email: adminEmail },
                { headers: { Accept: 'application/json' } },
            );

            if (res.data.admin) {
                setAdmins((prev) => [...prev, res.data.admin]);
            }
            if (res.data.temporaryPassword) {
                setNewAdminPassword(res.data.temporaryPassword);
            }

            setAdminName('');
            setAdminEmail('');
            setIsAddingAdmin(false);

            showToast({
                type: 'success',
                message: 'School admin created.',
                description: 'Temporary password generated. Copy it below.',
            });
        } catch (error: any) {
            if (error.response?.data?.errors) {
                setAdminErrors(error.response.data.errors);
            } else {
                showToast({
                    type: 'error',
                    message: 'Could not create school admin.',
                });
            }
        } finally {
            setIsSubmittingAdmin(false);
        }
    }

    // Copy temporary password helper
    const handleCopySecret = async (secret: string) => {
        try {
            if (navigator?.clipboard?.writeText) {
                await navigator.clipboard.writeText(secret);
            } else {
                const textArea = document.createElement('textarea');
                textArea.value = secret;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }
            setCopiedSecret(true);
            setTimeout(() => setCopiedSecret(false), 2000);
        } catch {
            // fallback
        }
    };

    // Permanently delete school
    async function handleDeleteSchool(e: React.FormEvent) {
        e.preventDefault();
        if (!currentTenant || !deleteConfirmed || isDeleting) return;

        setIsDeleting(true);
        setDeleteError(null);

        try {
            await axios.delete(route('platform.tenants.destroy', currentTenant.id), {
                data: { confirm_code: deleteCode },
                headers: { Accept: 'application/json' },
            });

            showToast({
                type: 'delete',
                message: `School "${currentTenant.name}" permanently deleted.`,
            });

            onClose();
            router.reload({ only: ['tenants', 'recentTenants', 'stats', 'growth'] });
        } catch (error: any) {
            if (error.response?.data?.errors?.confirm_code) {
                setDeleteError(error.response.data.errors.confirm_code[0]);
            } else {
                setDeleteError('Failed to delete school. Please check and try again.');
            }
        } finally {
            setIsDeleting(false);
        }
    }

    return (
        <Modal show={show} onClose={onClose} maxWidth="3xl">
            <div className="pf-modal relative p-6 sm:p-8">
                {/* Modal Header */}
                <div className="pf-modal-header mb-5">
                    <div className="pf-modal-hero">
                        <span
                            className={
                                'pf-modal-hero-icon ' +
                                (currentTenant.status === 'active'
                                    ? 'pf-modal-hero-icon--blue'
                                    : 'pf-modal-hero-icon--amber')
                            }
                            aria-hidden="true"
                        >
                            <svg viewBox="0 0 24 24">
                                <path d="M4 21V7l8-4 8 4v14M9 21v-6h6v6M4 11h16" />
                            </svg>
                        </span>
                        <div className="pf-modal-hero-text">
                            <div className="flex flex-wrap items-center gap-2.5">
                                <h3 className="pf-modal-title text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                                    Manage {currentTenant.name}
                                </h3>
                                <span
                                    className={
                                        'pf-pill text-[11px] ' +
                                        (currentTenant.status === 'active'
                                            ? 'pf-pill--active'
                                            : 'pf-pill--inactive')
                                    }
                                >
                                    {currentTenant.status}
                                </span>
                            </div>
                            <p className="pf-modal-subtitle text-xs text-slate-500 dark:text-slate-400">
                                Code:{' '}
                                <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                                    {currentTenant.code}
                                </span>{' '}
                                · Timezone: {currentTenant.timezone}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="pf-modal-close"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        <svg viewBox="0 0 24 24">
                            <path d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Tab Navigation */}
                <div className="mb-6 flex flex-wrap items-center gap-1.5 rounded-2xl border border-slate-200/90 bg-slate-100/90 p-1 dark:border-slate-700/80 dark:bg-slate-800/80">
                    <button
                        type="button"
                        onClick={() => setActiveTab('overview')}
                        className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all duration-150 ${
                            activeTab === 'overview'
                                ? 'border border-slate-200/80 bg-white text-blue-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-blue-400'
                                : 'text-slate-600 hover:bg-white/60 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700/50 dark:hover:text-slate-200'
                        }`}
                    >
                        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-currentColor stroke-2">
                            <circle cx="12" cy="12" r="3" />
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                        </svg>
                        Overview & Status
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('admins')}
                        className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all duration-150 ${
                            activeTab === 'admins'
                                ? 'border border-slate-200/80 bg-white text-blue-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-blue-400'
                                : 'text-slate-600 hover:bg-white/60 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700/50 dark:hover:text-slate-200'
                        }`}
                    >
                        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-currentColor stroke-2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                        School Admins
                        <span className="rounded-full bg-slate-200/90 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                            {isLoadingDetails ? '…' : admins.length}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('stations')}
                        className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all duration-150 ${
                            activeTab === 'stations'
                                ? 'border border-slate-200/80 bg-white text-blue-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-blue-400'
                                : 'text-slate-600 hover:bg-white/60 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700/50 dark:hover:text-slate-200'
                        }`}
                    >
                        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-currentColor stroke-2">
                            <rect x="4" y="5" width="16" height="13" rx="2" />
                            <path d="M8 21h8M9 9h6M9 13h4" />
                        </svg>
                        Stations
                        <span className="rounded-full bg-slate-200/90 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                            {isLoadingDetails ? '…' : stations.length}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('danger')}
                        className={`ml-auto flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all duration-150 ${
                            activeTab === 'danger'
                                ? 'border border-red-200/80 bg-white text-red-600 shadow-sm dark:border-red-900/60 dark:bg-slate-900 dark:text-red-400'
                                : 'text-red-600/80 hover:bg-red-50/70 hover:text-red-700 dark:text-red-400/80 dark:hover:bg-red-950/40 dark:hover:text-red-300'
                        }`}
                    >
                        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-currentColor stroke-2">
                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                        Danger Zone
                    </button>
                </div>

                {/* TAB 1: OVERVIEW & STATUS */}
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        {/* Status Action Card */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 sm:p-5 dark:border-slate-700/80 dark:bg-slate-900/50">
                            <div>
                                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                                    School Operating Status
                                </h4>
                                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                    {currentTenant.status === 'active'
                                        ? 'Kiosks and school portal are fully operational and synchronizing.'
                                        : 'School is currently suspended. Portal logins and kiosk sync are disabled.'}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleToggleStatus}
                                disabled={isUpdatingStatus}
                                className={`pf-btn text-xs font-semibold ${
                                    currentTenant.status === 'active'
                                        ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300'
                                        : 'pf-btn-primary'
                                }`}
                            >
                                {isUpdatingStatus
                                    ? 'Updating...'
                                    : currentTenant.status === 'active'
                                      ? 'Suspend School'
                                      : 'Reactivate School'}
                            </button>
                        </div>

                        {/* Edit School Form */}
                        <form onSubmit={handleSaveDetails}>
                            <div className="pf-field">
                                <label htmlFor="manage_school_name">School Name</label>
                                <input
                                    id="manage_school_name"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="block w-full"
                                    required
                                />
                                <InputError message={overviewErrors.name} className="mt-1" />
                            </div>

                            <div className="pf-field">
                                <label htmlFor="manage_school_code">School Code</label>
                                <input
                                    id="manage_school_code"
                                    type="text"
                                    value={currentTenant.code}
                                    disabled
                                    className="block w-full cursor-not-allowed bg-slate-100/70 font-mono text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                                />
                                <p className="pf-field-hint">
                                    Permanent database identifier. Cannot be modified after provisioning.
                                </p>
                            </div>

                            <div className="pf-field">
                                <label htmlFor="manage_school_tz">Timezone</label>
                                <input
                                    id="manage_school_tz"
                                    type="text"
                                    value={timezone}
                                    onChange={(e) => setTimezone(e.target.value)}
                                    placeholder="e.g. Asia/Manila"
                                    className="block w-full"
                                    required
                                />
                                <InputError message={overviewErrors.timezone} className="mt-1" />
                            </div>

                            <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                                <button
                                    type="button"
                                    className="pf-btn pf-btn-secondary"
                                    onClick={onClose}
                                >
                                    Close
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSavingDetails}
                                    className="pf-btn pf-btn-primary"
                                >
                                    {isSavingDetails ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* TAB 2: SCHOOL ADMINS */}
                {activeTab === 'admins' && (
                    <div className="space-y-5">
                        {/* New Admin Secret Password Banner */}
                        {newAdminPassword && (
                            <div className="overflow-hidden rounded-2xl border border-amber-300/80 bg-[#071c44] p-4 text-white shadow-lg">
                                <div className="flex items-center justify-between border-b border-white/10 pb-2.5 text-xs">
                                    <span className="flex items-center gap-2 font-semibold text-amber-300">
                                        <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
                                        Temporary Admin Password (Shown Once)
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setNewAdminPassword(null)}
                                        className="text-slate-400 hover:text-white"
                                    >
                                        ✕
                                    </button>
                                </div>
                                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                                    <code className="select-all font-mono text-base font-bold text-emerald-300">
                                        {newAdminPassword}
                                    </code>
                                    <button
                                        type="button"
                                        onClick={() => handleCopySecret(newAdminPassword)}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20"
                                    >
                                        {copiedSecret ? '✓ Copied!' : 'Copy Password'}
                                    </button>
                                </div>
                                <p className="mt-2 text-[11px] text-slate-300">
                                    Make sure to copy this temporary password. The school administrator will be required to reset it upon first sign in.
                                </p>
                            </div>
                        )}

                        {/* Top bar with Add Admin toggle */}
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                                    School Administrators
                                </h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Staff members with administrative rights over this school.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsAddingAdmin(!isAddingAdmin)}
                                className="pf-btn pf-btn-secondary text-xs"
                            >
                                <svg viewBox="0 0 24 24" className="h-4 w-4">
                                    <path d="M12 5v14M5 12h14" />
                                </svg>
                                {isAddingAdmin ? 'Cancel' : 'Add Admin'}
                            </button>
                        </div>

                        {/* Add Admin Form */}
                        {isAddingAdmin && (
                            <form
                                onSubmit={handleCreateAdmin}
                                className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-900/40 dark:bg-blue-950/20"
                            >
                                <h5 className="mb-3 text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300">
                                    Create New Admin Account
                                </h5>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <div>
                                        <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                                            Admin Full Name
                                        </label>
                                        <input
                                            type="text"
                                            value={adminName}
                                            onChange={(e) => setAdminName(e.target.value)}
                                            placeholder="e.g. Maria Santos"
                                            className="block h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs dark:border-slate-600 dark:bg-slate-800"
                                            required
                                        />
                                        <InputError message={adminErrors.name} className="mt-1" />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                                            Email Address
                                        </label>
                                        <input
                                            type="email"
                                            value={adminEmail}
                                            onChange={(e) => setAdminEmail(e.target.value)}
                                            placeholder="admin@school.edu.ph"
                                            className="block h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs dark:border-slate-600 dark:bg-slate-800"
                                            required
                                        />
                                        <InputError message={adminErrors.email} className="mt-1" />
                                    </div>
                                </div>
                                <div className="mt-4 flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsAddingAdmin(false)}
                                        className="pf-btn pf-btn-secondary h-9 px-3 text-xs"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmittingAdmin}
                                        className="pf-btn pf-btn-primary h-9 px-4 text-xs"
                                    >
                                        {isSubmittingAdmin ? 'Creating...' : 'Create Admin'}
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* Admins Table */}
                        <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
                            <table className="pf-table">
                                <thead>
                                    <tr>
                                        <th scope="col">Name</th>
                                        <th scope="col">Email</th>
                                        <th scope="col">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isLoadingDetails ? (
                                        <tr>
                                            <td colSpan={3} className="py-6 text-center text-xs text-slate-400">
                                                Loading administrators...
                                            </td>
                                        </tr>
                                    ) : admins.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="py-6 text-center text-xs text-slate-400">
                                                No administrators found. Click "Add Admin" to create one.
                                            </td>
                                        </tr>
                                    ) : (
                                        admins.map((adm) => (
                                            <tr key={adm.id}>
                                                <td className="font-semibold text-slate-900 dark:text-slate-100">
                                                    {adm.name}
                                                </td>
                                                <td className="text-slate-600 dark:text-slate-300">
                                                    {adm.email}
                                                </td>
                                                <td>
                                                    <span
                                                        className={
                                                            'pf-pill text-[10px] ' +
                                                            (adm.is_active
                                                                ? 'pf-pill--active'
                                                                : 'pf-pill--inactive')
                                                        }
                                                    >
                                                        {adm.is_active ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* TAB 3: STATIONS */}
                {activeTab === 'stations' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                                    School Stations & Kiosks
                                </h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Physical RFID attendance reader hardware registered under this school.
                                </p>
                            </div>
                            <Link
                                href={route('platform.stations.index')}
                                className="pf-btn pf-btn-secondary text-xs"
                            >
                                Manage All Stations →
                            </Link>
                        </div>

                        {/* Stations Table */}
                        <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
                            <table className="pf-table">
                                <thead>
                                    <tr>
                                        <th scope="col">Station Name</th>
                                        <th scope="col">Code</th>
                                        <th scope="col">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isLoadingDetails ? (
                                        <tr>
                                            <td colSpan={3} className="py-6 text-center text-xs text-slate-400">
                                                Loading stations...
                                            </td>
                                        </tr>
                                    ) : stations.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="py-6 text-center text-xs text-slate-400">
                                                No stations registered for this school yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        stations.map((st) => (
                                            <tr key={st.id}>
                                                <td className="font-semibold text-slate-900 dark:text-slate-100">
                                                    {st.name}
                                                </td>
                                                <td className="font-mono text-xs text-slate-600 dark:text-slate-300">
                                                    {st.station_code}
                                                </td>
                                                <td>
                                                    <span
                                                        className={
                                                            'pf-pill text-[10px] ' +
                                                            (st.status === 'active'
                                                                ? 'pf-pill--active'
                                                                : 'pf-pill--inactive')
                                                        }
                                                    >
                                                        {st.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* TAB 4: DANGER ZONE */}
                {activeTab === 'danger' && (
                    <form onSubmit={handleDeleteSchool} className="space-y-4">
                        <div className="rounded-2xl border border-red-200 bg-red-50/60 p-5 dark:border-red-900/50 dark:bg-red-950/20">
                            <div className="flex items-start gap-3">
                                <span className="pf-modal-hero-icon pf-modal-hero-icon--red mt-0.5 !h-9 !w-9 !flex-[0_0_36px]">
                                    <svg viewBox="0 0 24 24">
                                        <path d="M12 8v6M12 16h.01M10.8 4.2L4.2 15.6a1.5 1.5 0 0 0 1.3 2.2h13a1.5 1.5 0 0 0 1.3-2.2L13.2 4.2a1.5 1.5 0 0 0-2.4 0Z" />
                                    </svg>
                                </span>
                                <div>
                                    <h4 className="text-sm font-bold text-red-700 dark:text-red-400">
                                        Permanently Delete School
                                    </h4>
                                    <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                                        This action deletes <strong>{currentTenant.name}</strong> and
                                        every row it owns: people, cards, stations, attendance history,
                                        users, and integrations. This action <strong>cannot be undone</strong>.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="pf-field mt-4">
                            <label htmlFor="confirm_code_input">
                                Type <code className="font-mono font-bold text-red-600 dark:text-red-400">{currentTenant.code}</code> to confirm deletion
                            </label>
                            <input
                                id="confirm_code_input"
                                type="text"
                                value={deleteCode}
                                onChange={(e) => setDeleteCode(e.target.value)}
                                placeholder={currentTenant.code}
                                className="block w-full font-mono text-sm"
                                autoComplete="off"
                            />
                            {deleteError && <InputError message={deleteError} className="mt-1" />}
                        </div>

                        <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                            <button
                                type="button"
                                className="pf-btn pf-btn-secondary"
                                onClick={onClose}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={!deleteConfirmed || isDeleting}
                                className={`pf-btn text-xs font-semibold ${
                                    deleteConfirmed
                                        ? 'border-red-600 bg-red-600 text-white hover:bg-red-700'
                                        : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-700 dark:bg-slate-800'
                                }`}
                            >
                                {isDeleting ? 'Deleting...' : 'Permanently Delete School'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </Modal>
    );
}

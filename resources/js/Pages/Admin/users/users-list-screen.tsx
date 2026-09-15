import SecretOnceCallout from '@/Components/SecretOnceCallout';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import type { PaginatedData, User, PageProps, PaginationLink } from '@/types';
import { UserPlusIcon } from '@/Components/icons/user-plus';
import { UsersIcon } from '@/Components/icons/users';
import { ShieldCheckIcon } from '@/Components/icons/shield-check';
import { MonitorCheckIcon } from '@/Components/icons/monitor-check';
import { SearchIcon } from '@/Components/icons/search';
import { MenuIcon } from '@/Components/icons/menu';
import { CircleHelpIcon } from '@/Components/icons/circle-help';
import { CheckIcon } from '@/Components/icons/check';
import { LayoutGridIcon } from '@/Components/icons/layout-grid';
import '../../../../css/platform-dashboard.css';

interface UserListItem extends User {
    is_active: boolean;
}

interface UsersListPageProps extends PageProps {
    flash?: PageProps['flash'] & { temporaryPassword?: string };
}

const roleLabels: Record<string, string> = {
    tenant_admin: 'Admin',
    tenant_operator: 'Operator',
};

function PaginationBar({ links }: { links: PaginationLink[] }) {
    if (!links || links.length <= 3) {
        return null;
    }

    return (
        <nav className="pf-pagination">
            {links.map((link: PaginationLink, index: number) => {
                const label = link.label
                    .replace('&laquo; Previous', '‹ Previous')
                    .replace('Next &raquo;', 'Next ›');

                if (link.url === null) {
                    return (
                        <span key={index} className="pf-page-link pf-page-link--disabled">
                            {label}
                        </span>
                    );
                }

                return (
                    <Link
                        key={index}
                        href={link.url}
                        preserveScroll
                        className={
                            'pf-page-link' +
                            (link.active ? ' pf-page-link--active' : '')
                        }
                    >
                        {label}
                    </Link>
                );
            })}
        </nav>
    );
}

function formatDate(isoString?: string): string {
    if (!isoString) return '—';
    try {
        const date = new Date(isoString);
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        }).format(date);
    } catch {
        return isoString;
    }
}

export default function UsersListScreen({ users }: { users: PaginatedData<UserListItem> }) {
    const { auth, flash } = usePage<UsersListPageProps>().props;
    const canManage = auth?.user?.role === 'tenant_admin';

    const [viewMode, setViewMode] = useState<'table' | 'gallery'>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('as-portal-users-view') as 'table' | 'gallery') || 'table';
        }
        return 'table';
    });

    useEffect(() => {
        localStorage.setItem('as-portal-users-view', viewMode);
    }, [viewMode]);

    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<'all' | 'tenant_admin' | 'tenant_operator'>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

    // Metrics calculations
    const stats = useMemo(() => {
        const total = users.total ?? users.data.length;
        let active = 0;
        let admins = 0;
        let operators = 0;

        users.data.forEach((u) => {
            if (u.is_active) active++;
            if (u.role === 'tenant_admin') admins++;
            if (u.role === 'tenant_operator') operators++;
        });

        return { total, active, admins, operators };
    }, [users]);

    // Client-side filtering for fast interactive searching
    const filteredUsers = useMemo(() => {
        return users.data.filter((u) => {
            if (roleFilter !== 'all' && u.role !== roleFilter) {
                return false;
            }
            if (statusFilter === 'active' && !u.is_active) {
                return false;
            }
            if (statusFilter === 'inactive' && u.is_active) {
                return false;
            }
            if (search.trim()) {
                const query = search.toLowerCase();
                const matchesName = u.name.toLowerCase().includes(query);
                const matchesEmail = u.email.toLowerCase().includes(query);
                return matchesName || matchesEmail;
            }
            return true;
        });
    }, [users.data, search, roleFilter, statusFilter]);

    return (
        <AdminLayout>
            <Head title="Users & Access" />

            <div className="pf-dashboard">
                {/* Hero Header */}
                <div className="pf-dashboard-header">
                    <div>
                        <p className="pf-dashboard-kicker">ACCESS & ROLES</p>
                        <h1 className="pf-dashboard-title">Users & Staff</h1>
                        <p className="pf-dashboard-subtitle">
                            Manage administrators, operators, and staff credentials for your school workspace.
                        </p>
                    </div>
                    {canManage && (
                        <Link href={route('portal.users.create')} className="pf-btn pf-btn-primary">
                            <UserPlusIcon size={16} />
                            Add User
                        </Link>
                    )}
                </div>

                {/* Secret Callout for Temporary Passwords */}
                <SecretOnceCallout label="Temporary password" value={flash?.temporaryPassword} />

                {/* Stat Grid */}
                <div className="pf-stat-grid mb-8">
                    {/* Total Users */}
                    <div className="pf-stat-card">
                        <div className="pf-stat-head">
                            <span className="pf-stat-label">Total Staff</span>
                            <span className="pf-stat-badge pf-stat-badge--blue" aria-hidden="true">
                                <UsersIcon size={16} />
                            </span>
                        </div>
                        <div className="pf-stat-value">{stats.total}</div>
                        <div className="pf-stat-sub">Provisioned portal accounts</div>
                    </div>

                    {/* Active Accounts */}
                    <div className="pf-stat-card">
                        <div className="pf-stat-head">
                            <span className="pf-stat-label">Active Users</span>
                            <span className="pf-stat-badge pf-stat-badge--emerald" aria-hidden="true">
                                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                            </span>
                        </div>
                        <div className="pf-stat-value">{stats.active}</div>
                        <div className="pf-stat-sub">Authorized & sign-in enabled</div>
                    </div>

                    {/* Administrators */}
                    <div className="pf-stat-card">
                        <div className="pf-stat-head">
                            <span className="pf-stat-label">School Admins</span>
                            <span className="pf-stat-badge pf-stat-badge--indigo" aria-hidden="true">
                                <ShieldCheckIcon size={16} />
                            </span>
                        </div>
                        <div className="pf-stat-value">{stats.admins}</div>
                        <div className="pf-stat-sub">Full configuration & staff access</div>
                    </div>

                    {/* Operators */}
                    <div className="pf-stat-card">
                        <div className="pf-stat-head">
                            <span className="pf-stat-label">Operators</span>
                            <span className="pf-stat-badge pf-stat-badge--slate" aria-hidden="true">
                                <MonitorCheckIcon size={16} />
                            </span>
                        </div>
                        <div className="pf-stat-value">{stats.operators}</div>
                        <div className="pf-stat-sub">Attendance & kiosk operations</div>
                    </div>
                </div>

                {/* Main Panel */}
                <div className="pf-panel">
                    <div className="pf-panel-header flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h2 className="pf-panel-title">School User Directory</h2>
                            <p className="pf-panel-count">
                                {filteredUsers.length} of {users.data.length} staff shown
                            </p>
                        </div>

                        {/* Search & Filters Controls */}
                        <div className="flex flex-wrap items-center gap-2.5">
                            {/* Search Input */}
                            <div className="relative min-w-[220px]">
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search name or email..."
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 pl-8 pr-7 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                />
                                <SearchIcon size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                                {search && (
                                    <button
                                        type="button"
                                        onClick={() => setSearch('')}
                                        className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-600"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>

                            {/* Role Filter */}
                            <select
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value as 'all' | 'tenant_admin' | 'tenant_operator')}
                                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-slate-200"
                            >
                                <option value="all">All Roles</option>
                                <option value="tenant_admin">Admins Only</option>
                                <option value="tenant_operator">Operators Only</option>
                            </select>

                            {/* Status Filter */}
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-slate-200"
                            >
                                <option value="all">All Statuses</option>
                                <option value="active">Active Only</option>
                                <option value="inactive">Inactive Only</option>
                            </select>

                            {/* View Toggle */}
                            <div className="pf-view-toggle" role="group" aria-label="View mode">
                                <button
                                    type="button"
                                    className={`pf-view-toggle-btn ${viewMode === 'table' ? 'pf-view-toggle-btn--active' : ''}`}
                                    onClick={() => setViewMode('table')}
                                    aria-pressed={viewMode === 'table'}
                                >
                                    <MenuIcon size={20} />
                                    Table
                                </button>
                                <button
                                    type="button"
                                    className={`pf-view-toggle-btn ${viewMode === 'gallery' ? 'pf-view-toggle-btn--active' : ''}`}
                                    onClick={() => setViewMode('gallery')}
                                    aria-pressed={viewMode === 'gallery'}
                                >
                                    <LayoutGridIcon size={20} />
                                    Cards
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* TABLE VIEW */}
                    {viewMode === 'table' ? (
                        <div className="pf-table-wrap">
                            <table className="pf-table">
                                <thead>
                                    <tr>
                                        <th>Staff User</th>
                                        <th>Role</th>
                                        <th>Status</th>
                                        <th>Joined</th>
                                        <th className="text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUsers.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="pf-empty">
                                                <div className="flex flex-col items-center justify-center py-6">
                                                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3 dark:bg-gray-800">
                                                        <UserPlusIcon size={24} />
                                                    </span>
                                                    <p className="font-semibold text-slate-700 dark:text-slate-200">No users found</p>
                                                    <p className="text-xs text-slate-400 mt-0.5">
                                                        {search || roleFilter !== 'all' || statusFilter !== 'all'
                                                            ? 'Try adjusting your search query or filter settings.'
                                                            : 'Get started by inviting your first school administrator or operator.'}
                                                    </p>
                                                    {canManage && (
                                                        <Link
                                                            href={route('portal.users.create')}
                                                            className="pf-btn pf-btn-secondary text-xs mt-3.5"
                                                        >
                                                            Add User
                                                        </Link>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}

                                    {filteredUsers.map((user: UserListItem) => {
                                        const isCurrentUser = user.id === auth?.user?.id;
                                        const isAdmin = user.role === 'tenant_admin';

                                        return (
                                            <tr key={user.id}>
                                                {/* User Info with Avatar */}
                                                <td>
                                                    <div className="pf-tenant-cell">
                                                        <span
                                                            className={`pf-tenant-avatar ${
                                                                isAdmin
                                                                    ? 'bg-gradient-to-br from-indigo-100 to-indigo-200 text-indigo-700 dark:from-indigo-950 dark:to-indigo-900 dark:text-indigo-300'
                                                                    : 'bg-gradient-to-br from-sky-100 to-slate-200 text-sky-700 dark:from-sky-950 dark:to-slate-900 dark:text-sky-300'
                                                            }`}
                                                        >
                                                            {user.name.charAt(0).toUpperCase()}
                                                        </span>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="pf-tenant-name">{user.name}</span>
                                                                {isCurrentUser && (
                                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                                                                        You
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className="pf-tenant-code">{user.email}</span>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Role Pill */}
                                                <td>
                                                    <span
                                                        className={`pf-pill ${
                                                            isAdmin ? 'pf-pill--role-admin' : 'pf-pill--role-operator'
                                                        }`}
                                                    >
                                                        {roleLabels[user.role] ?? user.role}
                                                    </span>
                                                </td>

                                                {/* Status Pill */}
                                                <td>
                                                    <span
                                                        className={`pf-pill ${
                                                            user.is_active ? 'pf-pill--active' : 'pf-pill--danger'
                                                        }`}
                                                    >
                                                        {user.is_active ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>

                                                {/* Created Date */}
                                                <td>
                                                    <span className="text-xs text-slate-500 dark:text-slate-400">
                                                        {formatDate(user.created_at)}
                                                    </span>
                                                </td>

                                                {/* Action Button */}
                                                <td className="text-right">
                                                    {isCurrentUser ? (
                                                        <span className="text-xs text-slate-400 dark:text-slate-500 italic px-2">
                                                            Current session
                                                        </span>
                                                    ) : canManage ? (
                                                        user.is_active ? (
                                                            <Link
                                                                href={route('portal.users.deactivate', user.id)}
                                                                method="patch"
                                                                as="button"
                                                                className="pf-btn-danger-soft"
                                                            >
                                                                <CircleHelpIcon size={20} />
                                                                Deactivate
                                                            </Link>
                                                        ) : (
                                                            <Link
                                                                href={route('portal.users.reactivate', user.id)}
                                                                method="patch"
                                                                as="button"
                                                                className="pf-btn-success-soft"
                                                            >
                                                                <CheckIcon size={20} />
                                                                Reactivate
                                                            </Link>
                                                        )
                                                    ) : (
                                                        <span className="text-xs text-slate-400">—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        /* GALLERY / CARD VIEW */
                        <div className="p-6">
                            {filteredUsers.length === 0 ? (
                                <p className="pf-empty">No users match the selected filters.</p>
                            ) : (
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {filteredUsers.map((user: UserListItem) => {
                                        const isCurrentUser = user.id === auth?.user?.id;
                                        const isAdmin = user.role === 'tenant_admin';

                                        return (
                                            <div
                                                key={user.id}
                                                className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all duration-200 hover:border-slate-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
                                            >
                                                <div>
                                                    {/* Card Header */}
                                                    <div className="flex items-start justify-between gap-3 mb-3">
                                                        <div className="flex items-center gap-3">
                                                            <span
                                                                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold shadow-xs ${
                                                                    isAdmin
                                                                        ? 'bg-gradient-to-br from-indigo-100 to-indigo-200 text-indigo-700 dark:from-indigo-950 dark:to-indigo-900 dark:text-indigo-300'
                                                                        : 'bg-gradient-to-br from-sky-100 to-slate-200 text-sky-700 dark:from-sky-950 dark:to-slate-900 dark:text-sky-300'
                                                                }`}
                                                            >
                                                                {user.name.charAt(0).toUpperCase()}
                                                            </span>
                                                            <div className="min-w-0">
                                                                <div className="flex items-center gap-1.5">
                                                                    <h3 className="truncate text-sm font-bold text-slate-900 dark:text-white">
                                                                        {user.name}
                                                                    </h3>
                                                                    {isCurrentUser && (
                                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                                                                            You
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                                                                    {user.email}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Pills Row */}
                                                    <div className="flex flex-wrap items-center gap-2 mb-4">
                                                        <span
                                                            className={`pf-pill ${
                                                                isAdmin ? 'pf-pill--role-admin' : 'pf-pill--role-operator'
                                                            }`}
                                                        >
                                                            {roleLabels[user.role] ?? user.role}
                                                        </span>
                                                        <span
                                                            className={`pf-pill ${
                                                                user.is_active ? 'pf-pill--active' : 'pf-pill--danger'
                                                            }`}
                                                        >
                                                            {user.is_active ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Card Footer */}
                                                <div className="border-t border-slate-100 pt-3 dark:border-gray-800 flex items-center justify-between text-xs text-slate-400">
                                                    <span>Joined {formatDate(user.created_at)}</span>

                                                    {isCurrentUser ? (
                                                        <span className="italic text-slate-400">Current session</span>
                                                    ) : canManage ? (
                                                        user.is_active ? (
                                                            <Link
                                                                href={route('portal.users.deactivate', user.id)}
                                                                method="patch"
                                                                as="button"
                                                                className="pf-btn-danger-soft"
                                                            >
                                                                <CircleHelpIcon size={20} />
                                                                Deactivate
                                                            </Link>
                                                        ) : (
                                                            <Link
                                                                href={route('portal.users.reactivate', user.id)}
                                                                method="patch"
                                                                as="button"
                                                                className="pf-btn-success-soft"
                                                            >
                                                                <CheckIcon size={20} />
                                                                Reactivate
                                                            </Link>
                                                        )
                                                    ) : null}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    <PaginationBar links={users.links} />
                </div>
            </div>
        </AdminLayout>
    );
}

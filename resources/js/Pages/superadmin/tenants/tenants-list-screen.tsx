import InputError from '@/Components/InputError';
import { useToast } from '@/Components/toast/ToastProvider';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { PaginatedData, PaginationLink, Tenant } from '@/types';
import '../../../../css/platform-dashboard.css';
import '../../../../css/platform-overview.css';

interface PaginationBarProps {
    links: PaginationLink[];
}

const STATUS_PILL_CLASS: Record<Tenant['status'], string> = {
    active: 'pf-pill--active',
    suspended: 'pft-pill--suspended',
    archived: 'pft-pill--archived',
};

function formatDate(value: string): string {
    return new Date(value).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

function PaginationBar({ links }: PaginationBarProps) {
    if (!links || links.length <= 3) {
        return null;
    }

    return (
        <nav className="pf-pagination">
            {links.map((link, index) => {
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

// Mirrors the server-side Str::slug() normalization in
// StoreTenantRequest::prepareForValidation() — this is only a preview so the
// operator sees the code they'll actually get; the backend re-normalizes
// regardless of what reaches it.
function slugify(value: string): string {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

interface TenantsListScreenProps {
    tenants: PaginatedData<Tenant>;
    filters: {
        search?: string;
        status?: string;
    };
}

type ClientTab = 'all' | 'add';

export default function TenantsListScreen({ tenants, filters }: TenantsListScreenProps) {
    const { showToast } = useToast();
    const [tab, setTab] = useState<ClientTab>('all');
    const [codeTouched, setCodeTouched] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        code: '',
        timezone: 'Asia/Manila',
    });

    const filterForm = useForm({
        search: filters.search ?? '',
        status: filters.status ?? '',
    });

    function submitFilters(e: React.FormEvent) {
        e.preventDefault();
        router.get(route('platform.tenants.index'), filterForm.data, { preserveState: true });
    }

    function handleNameChange(value: string) {
        setData((current) => ({
            ...current,
            name: value,
            code: codeTouched ? current.code : slugify(value),
        }));
    }

    function handleCodeChange(value: string) {
        setCodeTouched(true);
        setData('code', value);
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post(route('platform.tenants.store'), {
            // No onSuccess toast here — the store action redirects to the
            // tenant's detail page, and that redirect's `success` flash is
            // already turned into a toast automatically by AppShell.
            onSuccess: () => {
                setCodeTouched(false);
                reset();
            },
            // A validation failure re-renders this same page (no flash),
            // so it's the one case the automatic flash toast can't cover —
            // this is the one-line manual call for that gap.
            onError: () => {
                showToast({
                    type: 'error',
                    message: 'Could not create the client.',
                    description: 'Check the highlighted fields and try again.',
                });
            },
        });
    }

    const hasFilters = Boolean(filters.search || filters.status);

    return (
        <PlatformLayout>
            <Head title="Client Management" />

            <div className="pf-dashboard pft-page">
                <div className="pft-hero">
                    <div className="pft-hero-main">
                        <span className="pft-hero-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24">
                                <path d="M4 21V7l8-4 8 4v14M9 21v-6h6v6M4 11h16" />
                            </svg>
                        </span>
                        <div>
                            <p className="pft-hero-kicker">Platform overview</p>
                            <h1 className="pft-hero-title">Client Management</h1>
                            <p className="pft-hero-subtitle">
                                View every client school on Adaptive Station, or
                                provision a new one.
                            </p>
                        </div>
                    </div>
                    <div className="pft-hero-actions">
                        <span className="pft-hero-updated">
                            <svg viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="9" />
                                <path d="M12 7v5l3.2 2" />
                            </svg>
                            Live directory
                        </span>
                    </div>
                </div>

                <div className="pft-tabs" role="tablist">
                    <button
                        type="button"
                        role="tab"
                        aria-selected={tab === 'all'}
                        className={'pft-tab' + (tab === 'all' ? ' pft-tab--active' : '')}
                        onClick={() => setTab('all')}
                    >
                        <svg viewBox="0 0 24 24">
                            <path d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                        All Clients
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={tab === 'add'}
                        className={'pft-tab' + (tab === 'add' ? ' pft-tab--active' : '')}
                        onClick={() => setTab('add')}
                    >
                        <svg viewBox="0 0 24 24">
                            <path d="M12 5v14M5 12h14" />
                        </svg>
                        Add Client
                    </button>
                </div>

                {tab === 'all' && (
                    <>
                        <form onSubmit={submitFilters} className="pf-filter-bar">
                            <div className="pf-field pft-search-field">
                                <label htmlFor="search">Search</label>
                                <svg viewBox="0 0 24 24">
                                    <circle cx="11" cy="11" r="7" />
                                    <path d="m20 20-3.5-3.5" />
                                </svg>
                                <input
                                    id="search"
                                    type="text"
                                    value={filterForm.data.search}
                                    onChange={(e) => filterForm.setData('search', e.target.value)}
                                    placeholder="Client name or code..."
                                />
                            </div>

                            <div className="pf-field">
                                <label htmlFor="status">Status</label>
                                <select
                                    id="status"
                                    value={filterForm.data.status}
                                    onChange={(e) => filterForm.setData('status', e.target.value)}
                                >
                                    <option value="">All</option>
                                    <option value="active">Active</option>
                                    <option value="suspended">Suspended</option>
                                    <option value="archived">Archived</option>
                                </select>
                            </div>

                            <div className="pf-filter-bar-actions">
                                <button type="submit" className="pf-btn pf-btn-primary">
                                    Filter
                                </button>
                                {hasFilters && (
                                    <Link
                                        href={route('platform.tenants.index')}
                                        className="pf-btn pf-btn-secondary"
                                    >
                                        Reset
                                    </Link>
                                )}
                            </div>
                        </form>

                        <div className="pf-panel">
                            <div className="pf-panel-header">
                                <div>
                                    <h2 className="pf-panel-title">All Clients</h2>
                                    <p className="pf-panel-count">
                                        {tenants.data.length} shown
                                    </p>
                                </div>
                            </div>

                            <div className="pf-table-wrap">
                                <table className="pf-table">
                                    <thead>
                                        <tr>
                                            <th scope="col">Name</th>
                                            <th scope="col">Timezone</th>
                                            <th scope="col">Created</th>
                                            <th scope="col">Status</th>
                                            <th scope="col">
                                                <span className="sr-only">Actions</span>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tenants.data.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="pf-empty pft-empty">
                                                    <svg viewBox="0 0 24 24">
                                                        <path d="M4 21V7l8-4 8 4v14M9 21v-6h6v6M4 11h16" />
                                                    </svg>
                                                    {hasFilters
                                                        ? 'No clients match these filters.'
                                                        : 'No clients yet.'}
                                                </td>
                                            </tr>
                                        )}

                                        {tenants.data.map((tenant) => (
                                            <tr key={tenant.id}>
                                                <td>
                                                    <div className="pf-tenant-cell">
                                                        <span className="pft-tenant-avatar">
                                                            {tenant.name.charAt(0).toUpperCase()}
                                                        </span>
                                                        <span>
                                                            <span className="pf-tenant-name">
                                                                {tenant.name}
                                                            </span>
                                                            <span className="pf-tenant-code">
                                                                {tenant.code}
                                                            </span>
                                                        </span>
                                                    </div>
                                                </td>
                                                <td>{tenant.timezone}</td>
                                                <td className="pft-created">
                                                    {formatDate(tenant.created_at)}
                                                </td>
                                                <td>
                                                    <span
                                                        className={
                                                            'pf-pill ' + STATUS_PILL_CLASS[tenant.status]
                                                        }
                                                    >
                                                        {tenant.status}
                                                    </span>
                                                </td>
                                                <td>
                                                    <Link
                                                        href={route(
                                                            'platform.tenants.show',
                                                            tenant.code,
                                                        )}
                                                        className="pf-row-action"
                                                    >
                                                        Manage
                                                        <svg viewBox="0 0 24 24">
                                                            <path d="M9 6l6 6-6 6" />
                                                        </svg>
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <PaginationBar links={tenants.links} />
                        </div>
                    </>
                )}

                {tab === 'add' && (
                    <div className="pf-panel">
                        <div className="pf-panel-header">
                            <div>
                                <h2 className="pf-panel-title">Add Client</h2>
                                <p className="pf-panel-count">
                                    Provisions a new school workspace with its own database.
                                </p>
                            </div>
                        </div>

                        <form onSubmit={submit} className="pft-form-panel">
                            <div className="pft-form-grid">
                                <div className="pf-field">
                                    <label htmlFor="name">School name</label>
                                    <input
                                        id="name"
                                        type="text"
                                        value={data.name}
                                        onChange={(e) => handleNameChange(e.target.value)}
                                        required
                                    />
                                    <InputError message={errors.name} className="mt-2" />
                                </div>

                                <div className="pf-field">
                                    <label htmlFor="code">Code (short, unique)</label>
                                    <input
                                        id="code"
                                        type="text"
                                        value={data.code}
                                        onChange={(e) => handleCodeChange(e.target.value)}
                                        className="font-mono"
                                        required
                                    />
                                    <p className="pf-field-hint">
                                        Auto-filled from the school name — edit if you want something different.
                                    </p>
                                    <InputError message={errors.code} className="mt-2" />
                                </div>

                                <div className="pf-field">
                                    <label htmlFor="timezone">Timezone (e.g. Asia/Manila)</label>
                                    <input
                                        id="timezone"
                                        type="text"
                                        value={data.timezone}
                                        onChange={(e) => setData('timezone', e.target.value)}
                                        required
                                    />
                                    <InputError message={errors.timezone} className="mt-2" />
                                </div>
                            </div>

                            <div className="pft-form-actions">
                                <button
                                    type="button"
                                    className="pf-btn pf-btn-secondary"
                                    onClick={() => setTab('all')}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="pf-btn pf-btn-primary"
                                    disabled={processing}
                                >
                                    <svg viewBox="0 0 24 24">
                                        <path d="M12 5v14M5 12h14" />
                                    </svg>
                                    Create Client
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </PlatformLayout>
    );
}

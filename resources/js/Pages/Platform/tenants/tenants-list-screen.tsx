import InputError from '@/Components/InputError';
import Pagination from '@/Components/admin/Pagination';
import { useToast } from '@/Components/toast/ToastProvider';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useRef, useState } from 'react';
import { PaginatedData, Tenant } from '@/types';
import '../../../../css/platform-dashboard.css';
import '../../../../css/platform-overview.css';

const STATUS_PILL_CLASS: Record<Tenant['status'], string> = {
    active: 'pf-pill--active',
    suspended: 'pf-pill--suspended',
    archived: 'pf-pill--archived',
};

const TIMEZONES = [
    'Asia/Manila',
    'Asia/Singapore',
    'Asia/Jakarta',
    'Asia/Bangkok',
    'Asia/Kolkata',
    'Asia/Tokyo',
    'Asia/Seoul',
    'Asia/Shanghai',
    'Asia/Dubai',
    'Europe/London',
    'Europe/Paris',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Pacific/Auckland',
    'Australia/Sydney',
    'UTC',
];

function formatDate(value: string): string {
    return new Date(value).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

// Generates a concise acronym-style code from a school name.
// e.g. "Santo Tomas National High School" → "stnhs"
// e.g. "Pilgrims Christian College" → "pcc"
// The backend always re-normalizes for uniqueness, so this is just a preview.
function generateCode(name: string): string {
    const words = name.trim().split(/\s+/).filter((w) => w.length > 0);
    if (words.length === 0) return '';
    return words.map((w) => w[0].toLowerCase()).join('').slice(0, 8);
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
    const [codeEditing, setCodeEditing] = useState(false);
    const [codeFormatError, setCodeFormatError] = useState('');
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        code: '',
        timezone: 'Asia/Manila',
    });

    // Debounce timer for search
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [searchValue, setSearchValue] = useState(filters.search ?? '');
    const [statusValue, setStatusValue] = useState(filters.status ?? '');

    function handleSearchChange(value: string) {
        setSearchValue(value);
        if (debounceRef.current) { clearTimeout(debounceRef.current); }
        debounceRef.current = setTimeout(() => {
            router.get(route('platform.tenants.index'), { search: value, status: statusValue }, { preserveState: true });
        }, 400);
    }

    function submitFilters(e: React.FormEvent) {
        e.preventDefault();
        if (debounceRef.current) { clearTimeout(debounceRef.current); }
        router.get(route('platform.tenants.index'), { search: searchValue, status: statusValue }, { preserveState: true });
    }

    function handleNameChange(value: string) {
        setData((current) => ({
            ...current,
            name: value,
            code: codeTouched ? current.code : generateCode(value),
        }));
    }

    function handleCodeChange(value: string) {
        setCodeTouched(true);
        setData('code', value);
        if (value && !/^[a-z0-9-]+$/.test(value)) {
            setCodeFormatError('Only lowercase letters, numbers, and hyphens.');
        } else {
            setCodeFormatError('');
        }
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        if (codeFormatError) { return; }
        if (!data.name.trim()) { return; }
        post(route('platform.tenants.store'), {
            onSuccess: () => {
                setCodeTouched(false);
                setCodeEditing(false);
                reset();
            },
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
                                <polygon points="12,3 19,9 5,9" />
                                <rect x="4" y="9" width="16" height="12" rx="1.6" />
                            </svg>
                        </span>
                        <div>
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
                    <div className="pft-tab-panel">
                        <form onSubmit={submitFilters} className="pf-filter-bar" role="search">
                            <div className="pf-field pft-search-field">
                                <label htmlFor="search">Search</label>
                                <svg viewBox="0 0 24 24">
                                    <circle cx="11" cy="11" r="7" />
                                    <path d="m20 20-3.5-3.5" />
                                </svg>
                                <input
                                    id="search"
                                    type="text"
                                    value={searchValue}
                                    onChange={(e) => handleSearchChange(e.target.value)}
                                    placeholder="Client name or code..."
                                />
                            </div>

                            <div className="pf-field">
                                <label htmlFor="status">Status</label>
                                <select
                                    id="status"
                                    value={statusValue}
                                    onChange={(e) => setStatusValue(e.target.value)}
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
                                        {tenants.from !== null ? `${tenants.from}–${tenants.to} of ${tenants.total}` : 'No results'}
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
                                                    {hasFilters ? (
                                                            'No clients match these filters.'
                                                        ) : (
                                                            <>
                                                                No clients yet.{' '}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setTab('add')}
                                                                    className="pf-row-action"
                                                                    style={{ display: 'inline', marginLeft: 4 }}
                                                                >
                                                                    Provision your first client →
                                                                </button>
                                                            </>
                                                        )}
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

                            <Pagination links={tenants.links} />
                        </div>
                    </div>
                )}

                {tab === 'add' && (
                    <div className="pf-panel pft-tab-panel">
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
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <input
                                            id="code"
                                            type="text"
                                            value={data.code}
                                            onChange={(e) => handleCodeChange(e.target.value)}
                                            className="font-mono"
                                            readOnly={!codeEditing}
                                            style={!codeEditing ? { background: 'var(--as-surface-active)', color: 'var(--as-text-muted)', cursor: 'default' } : undefined}
                                            required
                                        />
                                        <button
                                            type="button"
                                            className="pf-btn pf-btn-secondary"
                                            style={{ flexShrink: 0, padding: '0 12px', fontSize: 12 }}
                                            onClick={() => setCodeEditing((v) => !v)}
                                        >
                                            {codeEditing ? 'Lock' : 'Edit'}
                                        </button>
                                    </div>
                                    <p className="pf-field-hint">
                                        Auto-filled from the school name — click Edit to override. Only lowercase letters, numbers, and hyphens.
                                    </p>
                                    {codeFormatError && (
                                        <p className="pf-field-error-msg">{codeFormatError}</p>
                                    )}
                                    <InputError message={errors.code} className="mt-2" />
                                </div>

                                <div className="pf-field">
                                    <label htmlFor="timezone">Timezone</label>
                                    <select
                                        id="timezone"
                                        value={data.timezone}
                                        onChange={(e) => setData('timezone', e.target.value)}
                                        className="font-mono"
                                        required
                                    >
                                        {TIMEZONES.map((tz) => (
                                            <option key={tz} value={tz}>{tz}</option>
                                        ))}
                                    </select>
                                    <p className="pf-field-hint">Select the school's local timezone (IANA name).</p>
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
                                    className={'pf-btn pf-btn-primary' + (processing ? ' pf-btn--loading' : '')}
                                    disabled={processing || Boolean(codeFormatError)}
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

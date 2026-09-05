import InputError from '@/Components/InputError';
import Modal from '@/Components/Modal';
import { useToast } from '@/Components/toast/ToastProvider';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { PaginatedData, PaginationLink, Tenant } from '@/types';
import '../../../../css/platform-dashboard.css';

interface StatCardProps {
    label: string;
    value: number;
    icon: string;
    tone: string;
}

interface PaginationBarProps {
    links: PaginationLink[];
}

const STAT_ICONS: Record<string, React.ReactNode> = {
    tenants: (
        <svg viewBox="0 0 24 24">
            <path d="M4 21V7l8-4 8 4v14M9 21v-6h6v6M4 11h16" />
        </svg>
    ),
    activeTenants: (
        <svg viewBox="0 0 24 24">
            <path d="m5 12 4.5 4.5L19 7" />
        </svg>
    ),
    stations: (
        <svg viewBox="0 0 24 24">
            <rect x="4" y="5" width="16" height="13" rx="2" />
            <path d="M8 21h8M9 9h6M9 13h4" />
        </svg>
    ),
    activeStations: (
        <svg viewBox="0 0 24 24">
            <path d="M12 3v6M8.5 6.5a6.5 6.5 0 1 0 7 0" />
        </svg>
    ),
};

function StatCard({ label, value, icon, tone }: StatCardProps) {
    return (
        <div className="pf-stat-card">
            <span className={`pf-stat-icon pf-stat-icon--${tone}`}>
                {STAT_ICONS[icon]}
            </span>
            <div>
                <p className="pf-stat-label">{label}</p>
                <p className="pf-stat-value">{value}</p>
            </div>
        </div>
    );
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
    stats: {
        tenant_count: number;
        active_tenant_count: number;
        station_count: number;
        active_station_count: number;
    };
}

export default function TenantsListScreen({ tenants, stats }: TenantsListScreenProps) {
    const { showToast } = useToast();
    const [createOpen, setCreateOpen] = useState(false);
    const [codeTouched, setCodeTouched] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        code: '',
        timezone: 'Asia/Manila',
    });

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
                setCreateOpen(false);
                setCodeTouched(false);
                reset();
            },
            // A validation failure re-renders this same page (no flash),
            // so it's the one case the automatic flash toast can't cover —
            // this is the one-line manual call for that gap.
            onError: () => {
                showToast({
                    type: 'error',
                    message: 'Could not create the tenant.',
                    description: 'Check the highlighted fields and try again.',
                });
            },
        });
    }

    return (
        <PlatformLayout>
            <Head title="Schools" />

            <div className="pf-dashboard">
                <div className="pf-dashboard-header">
                    <div>
                        <p className="pf-dashboard-kicker">Platform overview</p>
                        <h1 className="pf-dashboard-title">Schools</h1>
                        <p className="pf-dashboard-subtitle">
                            Manage every school on Adaptive Station and keep tabs on
                            their stations at a glance.
                        </p>
                    </div>
                    <button
                        type="button"
                        className="pf-btn pf-btn-primary"
                        onClick={() => setCreateOpen(true)}
                    >
                        <svg viewBox="0 0 24 24">
                            <path d="M12 5v14M5 12h14" />
                        </svg>
                        Provision a School
                    </button>
                </div>

                <div className="pf-stat-grid">
                    <StatCard
                        label="Schools"
                        value={stats.tenant_count}
                        icon="tenants"
                        tone="blue"
                    />
                    <StatCard
                        label="Active Schools"
                        value={stats.active_tenant_count}
                        icon="activeTenants"
                        tone="green"
                    />
                    <StatCard
                        label="Stations"
                        value={stats.station_count}
                        icon="stations"
                        tone="violet"
                    />
                    <StatCard
                        label="Active Stations"
                        value={stats.active_station_count}
                        icon="activeStations"
                        tone="amber"
                    />
                </div>

                <div className="pf-panel">
                    <div className="pf-panel-header">
                        <div>
                            <h2 className="pf-panel-title">All Schools</h2>
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
                                    <th scope="col">Status</th>
                                    <th scope="col">
                                        <span className="sr-only">Actions</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {tenants.data.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="pf-empty">
                                            No schools yet.
                                        </td>
                                    </tr>
                                )}

                                {tenants.data.map((tenant) => (
                                    <tr key={tenant.id}>
                                        <td>
                                            <div className="pf-tenant-cell">
                                                <span className="pf-tenant-avatar">
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
                                        <td>
                                            <span
                                                className={
                                                    'pf-pill ' +
                                                    (tenant.status === 'active'
                                                        ? 'pf-pill--active'
                                                        : 'pf-pill--inactive')
                                                }
                                            >
                                                {tenant.status}
                                            </span>
                                        </td>
                                        <td>
                                            <Link
                                                href={route(
                                                    'platform.tenants.show',
                                                    tenant.id,
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
            </div>

            <Modal show={createOpen} onClose={() => setCreateOpen(false)}>
                <form onSubmit={submit} className="pf-modal">
                    <div className="pf-modal-header">
                        <h3 className="pf-modal-title">Provision a School</h3>
                        <button
                            type="button"
                            className="pf-modal-close"
                            onClick={() => setCreateOpen(false)}
                            aria-label="Close"
                        >
                            <svg viewBox="0 0 24 24">
                                <path d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="pf-field">
                        <label htmlFor="name">School name</label>
                        <input
                            id="name"
                            type="text"
                            value={data.name}
                            onChange={(e) => handleNameChange(e.target.value)}
                            autoFocus
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

                    <div className="pf-modal-footer">
                        <button
                            type="button"
                            className="pf-btn pf-btn-secondary"
                            onClick={() => setCreateOpen(false)}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="pf-btn pf-btn-primary"
                            disabled={processing}
                        >
                            Create
                        </button>
                    </div>
                </form>
            </Modal>
        </PlatformLayout>
    );
}

import Pagination from '@/Components/admin/Pagination';
import PremiumSelect from '@/Components/PremiumSelect';
import SecretOnceCallout from '@/Components/SecretOnceCallout';
import Modal, { ModalHero } from '@/Components/Modal';
import { CopyIcon } from '@/Components/icons/copy';
import { EyeIcon } from '@/Components/icons/eye';
import { EyeOffIcon } from '@/Components/icons/eye-off';
import { GraduationCapIcon } from '@/Components/icons/graduation-cap';
import { IdCardIcon } from '@/Components/icons/id-card';
import { LockIcon } from '@/Components/icons/lock';
import { UserIcon } from '@/Components/icons/user';
import { UsersIcon } from '@/Components/icons/users';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { PaginatedData } from '@/types';
import '../../../../css/platform-dashboard.css';
import '../../../../css/platform-overview.css';

type AccountType = 'user' | 'parent';

interface TenantRef {
    id: string;
    name: string;
    code: string;
}

interface AccountRow {
    id: string;
    name: string;
    email: string | null;
    is_active: boolean;
    tenant: TenantRef | null;
    login_id: string;
    password: string | null;
    role?: string;
}

interface Filters {
    type: AccountType;
    search: string;
    tenant_id: string;
}

interface PagePropsWithFlash {
    flash?: {
        credentialLoginId?: string;
        credentialPassword?: string;
    };
}

const ROLE_LABEL: Record<string, string> = {
    tenant_admin: 'School admin',
    tenant_operator: 'Operator',
};

function PasswordCell({ value }: { value: string | null }) {
    const [revealed, setRevealed] = useState(false);
    const [copied, setCopied] = useState(false);

    if (!value) {
        return <span className="sms-log-empty-value">Not set</span>;
    }

    function copy() {
        if (!value) return;
        try {
            if (navigator?.clipboard?.writeText) {
                navigator.clipboard.writeText(value);
            } else {
                const textArea = document.createElement('textarea');
                textArea.value = value;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Clipboard unavailable — the revealed password remains visible to copy manually.
        }
    }

    return (
        <span className="pfa-credential-cell">
            <span className="pfa-credential-value font-mono">
                {revealed ? value : '•'.repeat(Math.min(value.length, 12))}
            </span>
            <button
                type="button"
                className="pf-row-action pf-row-action--control"
                onClick={() => setRevealed((prev) => !prev)}
                aria-label={revealed ? 'Hide password' : 'Reveal password'}
            >
                {revealed ? <EyeOffIcon size={14} aria-hidden="true" /> : <EyeIcon size={14} aria-hidden="true" />}
            </button>
            <button
                type="button"
                className="pf-row-action pf-row-action--control"
                onClick={copy}
                aria-label="Copy password"
            >
                {copied ? 'Copied' : <CopyIcon size={14} aria-hidden="true" />}
            </button>
        </span>
    );
}

interface AccountCredentialsScreenProps {
    accounts: PaginatedData<AccountRow>;
    filters: Filters;
    tenants: TenantRef[];
}

export default function AccountCredentialsScreen({ accounts, filters, tenants }: AccountCredentialsScreenProps) {
    const { flash } = usePage().props as PagePropsWithFlash;
    const [isFiltering, setIsFiltering] = useState(false);
    const [resetTarget, setResetTarget] = useState<AccountRow | null>(null);
    const { data, setData } = useForm({
        search: filters.search,
        tenant_id: filters.tenant_id,
    });
    const resetForm = useForm({});

    const hasFilters = Boolean(filters.search || filters.tenant_id);

    function fetchWith(overrides: Partial<{ search: string; tenant_id: string; type: AccountType }>) {
        setIsFiltering(true);
        router.get(route('platform.account-credentials.index'), { ...data, type: filters.type, ...overrides }, {
            preserveState: true,
            onFinish: () => setIsFiltering(false),
        });
    }

    function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        fetchWith({});
    }

    function switchType(type: AccountType) {
        fetchWith({ type });
    }

    function selectTenant(tenantId: string) {
        setData('tenant_id', tenantId);
        fetchWith({ tenant_id: tenantId });
    }

    function submitReset(event: React.FormEvent) {
        event.preventDefault();
        if (!resetTarget) return;

        const routeName = filters.type === 'user'
            ? 'platform.account-credentials.users.reset-password'
            : 'platform.account-credentials.parents.reset-password';

        resetForm.patch(route(routeName, resetTarget.id), {
            onSuccess: () => setResetTarget(null),
        });
    }

    return (
        <PlatformLayout>
            <Head title="Account Credentials" />

            <div className="pf-dashboard pft-page">
                <div className="pft-hero">
                    <div className="pft-hero-main">
                        <span className="pft-hero-icon" aria-hidden="true">
                            <IdCardIcon size={22} />
                        </span>
                        <div>
                            <h1 className="pft-hero-title">Account Credentials</h1>
                            <p className="pft-hero-subtitle">
                                Look up a school user or parent account in any school, reveal its current
                                login credentials, or reset its password.
                            </p>
                        </div>
                    </div>
                </div>

                <form onSubmit={submit} className="pf-filter-bar" role="search">
                    <div className="pf-field">
                        <label htmlFor="search">Name, email, or login ID</label>
                        <input
                            id="search"
                            type="search"
                            value={data.search}
                            onChange={(event) => setData('search', event.target.value)}
                            placeholder="e.g. Juan Dela Cruz"
                        />
                    </div>

                    <div className="pf-field">
                        <label htmlFor="tenant_id">School</label>
                        <PremiumSelect
                            id="tenant_id"
                            value={data.tenant_id}
                            onChange={selectTenant}
                            options={[
                                { value: '', label: 'All schools' },
                                ...tenants.map((tenant) => ({ value: tenant.id, label: tenant.name })),
                            ]}
                            placeholder="All schools"
                        />
                    </div>

                    <div className="pf-filter-bar-actions">
                        <button
                            type="submit"
                            className={'pf-btn pf-btn-primary' + (isFiltering ? ' pf-btn--loading' : '')}
                            disabled={isFiltering}
                        >
                            Search
                        </button>
                        {hasFilters && (
                            <Link
                                href={route('platform.account-credentials.index', { type: filters.type })}
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
                            <h2 className="pf-panel-title">{filters.type === 'user' ? 'School accounts' : 'Parent accounts'}</h2>
                            <p className="pf-panel-count">
                                {accounts.from !== null ? `${accounts.from}–${accounts.to} of ${accounts.total}` : 'No results'}
                            </p>
                        </div>
                        <div className="pft-tabs" role="tablist" aria-label="Account type">
                            <button
                                type="button"
                                role="tab"
                                aria-selected={filters.type === 'user'}
                                className={'pft-tab' + (filters.type === 'user' ? ' pft-tab--active' : '')}
                                onClick={() => switchType('user')}
                            >
                                <UserIcon size={14} />
                                Users
                            </button>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={filters.type === 'parent'}
                                className={'pft-tab' + (filters.type === 'parent' ? ' pft-tab--active' : '')}
                                onClick={() => switchType('parent')}
                            >
                                <UsersIcon size={14} />
                                Parents
                            </button>
                        </div>
                    </div>

                    {accounts.data.length === 0 ? (
                        <div className="pf-empty-state">
                            <span className="pf-empty-state-icon" aria-hidden="true"><IdCardIcon size={26} /></span>
                            <div>
                                <strong>No {filters.type === 'user' ? 'school accounts' : 'parent accounts'} found</strong>
                                <p>Try a different name, email, or school filter.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="pf-table-wrap">
                            <table className="pf-table">
                                <thead>
                                    <tr>
                                        <th scope="col">Name</th>
                                        <th scope="col">School</th>
                                        <th scope="col">{filters.type === 'user' ? 'Role' : 'Login ID'}</th>
                                        <th scope="col">{filters.type === 'user' ? 'Email' : 'Login ID'}</th>
                                        <th scope="col">Password</th>
                                        <th scope="col">Status</th>
                                        <th scope="col"><span className="sr-only">Actions</span></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {accounts.data.map((account) => (
                                        <tr key={account.id}>
                                            <td><span className="pf-tenant-name">{account.name}</span></td>
                                            <td>
                                                {account.tenant ? (
                                                    <span className="pfs-meta-pill pfs-meta-pill--school">
                                                        <GraduationCapIcon size={13} aria-hidden="true" />
                                                        {account.tenant.name}
                                                    </span>
                                                ) : (
                                                    <span className="sms-log-empty-value">Unknown school</span>
                                                )}
                                            </td>
                                            <td>
                                                {filters.type === 'user'
                                                    ? (ROLE_LABEL[account.role ?? ''] ?? account.role)
                                                    : <span className="font-mono">{account.login_id}</span>}
                                            </td>
                                            <td>
                                                {filters.type === 'user'
                                                    ? account.email
                                                    : <span className="font-mono">{account.login_id}</span>}
                                            </td>
                                            <td><PasswordCell value={account.password} /></td>
                                            <td>
                                                <span className={'pf-pill ' + (account.is_active ? 'pf-pill--active' : 'pf-pill--inactive')}>
                                                    {account.is_active ? 'active' : 'inactive'}
                                                </span>
                                            </td>
                                            <td>
                                                <button
                                                    type="button"
                                                    className="pf-row-action pf-row-action--control"
                                                    onClick={() => setResetTarget(account)}
                                                >
                                                    <LockIcon size={15} aria-hidden="true" />
                                                    Reset password
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <Pagination links={accounts.links} />
                </div>
            </div>

            <Modal show={resetTarget !== null} onClose={() => setResetTarget(null)}>
                <form onSubmit={submitReset} className="pf-modal">
                    <ModalHero
                        tone="amber"
                        title="Reset Password"
                        subtitle="The current password stops working immediately and a new one is generated."
                        onClose={() => setResetTarget(null)}
                    >
                        <LockIcon size={22} />
                    </ModalHero>

                    <p style={{ padding: '0 0 8px' }}>
                        Reset the password for <strong>{resetTarget?.name}</strong>
                        {resetTarget?.tenant ? <> at <strong>{resetTarget.tenant.name}</strong></> : null}?
                        This cannot be undone — the account will need the new password shown after this step.
                    </p>

                    <div className="pf-modal-footer">
                        <button type="button" className="pf-btn pf-btn-secondary" onClick={() => setResetTarget(null)}>
                            Cancel
                        </button>
                        <button type="submit" className="pf-btn pf-btn-primary" disabled={resetForm.processing}>
                            Reset Password
                        </button>
                    </div>
                </form>
            </Modal>

            <SecretOnceCallout
                label={flash?.credentialLoginId ? `New password for ${flash.credentialLoginId}` : 'New password'}
                value={flash?.credentialPassword}
            />
        </PlatformLayout>
    );
}

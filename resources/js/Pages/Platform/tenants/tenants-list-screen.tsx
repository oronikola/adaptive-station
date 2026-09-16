import InputError from '@/Components/InputError';
import Modal, { ModalHero } from '@/Components/Modal';
import Pagination from '@/Components/admin/Pagination';
import PremiumSelect from '@/Components/PremiumSelect';
import { CalendarDaysIcon } from '@/Components/icons/calendar-days';
import { ChevronRightIcon } from '@/Components/icons/chevron-right';
import { ClockIcon } from '@/Components/icons/clock';
import { GraduationCapIcon } from '@/Components/icons/graduation-cap';
import { MenuIcon } from '@/Components/icons/menu';
import { PlusIcon } from '@/Components/icons/plus';
import { SearchIcon } from '@/Components/icons/search';
import { useToast } from '@/Components/toast/ToastProvider';
import PlatformLayout from '@/Layouts/PlatformLayout';
import ManageSchoolModal from './ManageSchoolModal';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useRef, useState } from 'react';
import { PageProps, PaginatedData, PaginationLink, Tenant } from '@/types';
import '../../../../css/platform-dashboard.css';
import '../../../../css/platform-overview.css';

interface LegacySchool {
    id: number | null;
    schoolabrv: string;
    schoolname: string;
    eslink: string;
}

/** Essentiel's own school names come through as e.g. "PILGRIM CHRISTIAN
 * COLLEGE" — title-cased here purely so the auto-filled School name field
 * looks like a normal name instead of shouting; still freely editable
 * afterward if this guesses wrong (e.g. "Of", acronyms). */
function titleCase(value: string): string {
    return value
        .toLowerCase()
        .split(' ')
        .map((word) => (word.length > 0 ? word[0].toUpperCase() + word.slice(1) : word))
        .join(' ');
}

// Mirrors server-side slugification for tenant codes
function slugify(value: string): string {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

interface PaginationBarProps {
    links: PaginationLink[];
}

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

export default function TenantsListScreen({ tenants, filters }: TenantsListScreenProps) {
    const { showToast } = useToast();
    const { auth } = usePage<PageProps>().props;
    const canManage = auth.user.role === 'platform_super_admin';
    const [createOpen, setCreateOpen] = useState(false);
    const [manageTenant, setManageTenant] = useState<Tenant | null>(null);
    const [codeTouched, setCodeTouched] = useState(false);
    const [codeEditing, setCodeEditing] = useState(false);
    const [codeFormatError, setCodeFormatError] = useState('');
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        code: '',
        timezone: 'Asia/Manila',
        connect_legacy_system: false,
        legacy_connection: {
            // essentiel scopes each school by its own subdomain, e.g.
            // https://app-hcb.essentiel.ph — no trailing slash.
            base_url: '',
            api_key: '',
            // Reference-only, filled in by the school picker below — never
            // used to connect to anything, just kept for traceability.
            legacy_school_id: null as number | null,
            legacy_schoolabrv: '',
            eslink: '',
        },
    });

    function setLegacyField(field: keyof typeof data.legacy_connection, value: string) {
        setData('legacy_connection', { ...data.legacy_connection, [field]: value });
    }

    // Fetched lazily (only once the legacy checkbox is actually checked) so
    // a superadmin who never touches this section never pays for the call.
    const [legacySchools, setLegacySchools] = useState<LegacySchool[]>([]);
    const [legacySchoolsLoading, setLegacySchoolsLoading] = useState(false);
    const [legacySchoolsError, setLegacySchoolsError] = useState(false);
    const [schoolQuery, setSchoolQuery] = useState('');
    const [schoolPickerOpen, setSchoolPickerOpen] = useState(false);

    useEffect(() => {
        if (!data.connect_legacy_system || legacySchools.length > 0 || legacySchoolsLoading) {
            return;
        }

        setLegacySchoolsLoading(true);
        setLegacySchoolsError(false);
        axios.get<{ schools: LegacySchool[] }>(route('platform.tenants.legacy-schools'))
            .then(({ data }) => setLegacySchools(data.schools))
            .catch(() => setLegacySchoolsError(true))
            .finally(() => setLegacySchoolsLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data.connect_legacy_system]);

    const filteredLegacySchools = schoolQuery.trim() === ''
        ? legacySchools
        : legacySchools.filter((school) => {
            const q = schoolQuery.trim().toLowerCase();
            return school.schoolname.toLowerCase().includes(q) || school.schoolabrv.toLowerCase().includes(q);
        });

    function selectLegacySchool(school: LegacySchool) {
        setData((current) => ({
            ...current,
            name: titleCase(school.schoolname),
            code: slugify(school.schoolabrv),
            legacy_connection: {
                ...current.legacy_connection,
                legacy_school_id: school.id,
                legacy_schoolabrv: school.schoolabrv,
                eslink: school.eslink,
            },
        }));
        setCodeTouched(true);
        setSchoolQuery(`${school.schoolabrv} — ${titleCase(school.schoolname)}`);
        setSchoolPickerOpen(false);
    }

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

    function openCreateModal() {
        setCreateOpen(true);
    }

    function closeCreateModal() {
        setCreateOpen(false);
        setCodeTouched(false);
        setCodeEditing(false);
        setCodeFormatError('');
        setSchoolQuery('');
        setSchoolPickerOpen(false);
        reset();
    }

    useEffect(() => {
        if (!canManage) {
            return;
        }

        const params = new URLSearchParams(window.location.search);
        if (params.get('add') === '1') {
            setCreateOpen(true);
        }
    }, [canManage]);

    const hasFilters = Boolean(filters.search || filters.status);

    return (
        <PlatformLayout>
            <Head title="Client Management" />

            <div className="pf-dashboard pft-page">
                <div className="pft-hero">
                    <div className="pft-hero-main">
                        <span className="pft-hero-icon" aria-hidden="true">
                            <GraduationCapIcon size={22} />
                        </span>
                        <div>
                            <h1 className="pft-hero-title">Client Management</h1>
                            <p className="pft-hero-subtitle">View every client school on Adaptive Station, or provision a new one.</p>
                        </div>
                    </div>
                    <div className="pft-hero-actions">
                        <span className="pft-hero-updated">
                            <ClockIcon size={14} />
                            Live directory
                        </span>
                    </div>
                </div>

                <form onSubmit={submitFilters} className="pf-filter-bar" role="search">
                            <div className="pf-field pft-search-field">
                                <label htmlFor="search">Search</label>
                                <div className="pft-search-input-wrap">
                                    <SearchIcon
                                        size={14}
                                        className="pointer-events-none"
                                        aria-hidden="true"
                                    />
                                    <input
                                        id="search"
                                        type="text"
                                        value={searchValue}
                                        onChange={(e) => handleSearchChange(e.target.value)}
                                        placeholder="Client name or code..."
                                    />
                                </div>
                            </div>

                            <div className="pf-field">
                                <label htmlFor="status">Status</label>
                                <PremiumSelect
                                    id="status"
                                    value={statusValue}
                                    onChange={(value) => setStatusValue(value)}
                                    options={[
                                        { value: '', label: 'All' },
                                        { value: 'active', label: 'Active' },
                                        { value: 'suspended', label: 'Suspended' },
                                        { value: 'archived', label: 'Archived' },
                                    ]}
                                    placeholder="All"
                                />
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

                        <div className="pf-panel pft-client-directory">
                            <div className="pf-panel-header">
                                <div>
                                    <h2 className="pf-panel-title">All Clients</h2>
                                    <p className="pf-panel-count">
                                        {tenants.from !== null ? `${tenants.from}–${tenants.to} of ${tenants.total}` : 'No results'}
                                    </p>
                                </div>
                                <div className="pft-tabs" role="tablist" aria-label="Client directory">
                                    <button
                                        type="button"
                                        role="tab"
                                        aria-selected={!createOpen}
                                        className={'pft-tab' + (!createOpen ? ' pft-tab--active' : '')}
                                        onClick={closeCreateModal}
                                    >
                                        <MenuIcon size={14} />
                                        All Clients
                                    </button>
                                    {canManage && (
                                        <button
                                            type="button"
                                            role="tab"
                                            aria-selected={createOpen}
                                            className={'pft-tab' + (createOpen ? ' pft-tab--active' : '')}
                                            onClick={openCreateModal}
                                        >
                                            <PlusIcon size={14} />
                                            Add Client
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="pf-table-wrap pft-client-table-wrap">
                                <table className="pf-table pft-client-table">
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
                                                <td colSpan={5} className="pf-empty pft-client-empty-cell">
                                                    <div className="pft-empty">
                                                        <GraduationCapIcon size={22} aria-hidden="true" />
                                                        {hasFilters ? (
                                                            'No clients match these filters.'
                                                        ) : (
                                                            <>
                                                                No clients yet.{' '}
                                                                {canManage && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={openCreateModal}
                                                                        className="pf-row-action"
                                                                    >
                                                                        Provision your first client →
                                                                    </button>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
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
                                                <td>
                                                    <span className="pft-meta-pill pft-meta-pill--timezone">
                                                        <ClockIcon size={13} aria-hidden="true" />
                                                        {tenant.timezone}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className="pft-meta-pill pft-meta-pill--created">
                                                        <CalendarDaysIcon size={13} aria-hidden="true" />
                                                        {formatDate(tenant.created_at)}
                                                    </span>
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
                                                <td className="pft-client-action-cell">
                                                    <button
                                                        type="button"
                                                        className="pf-row-action"
                                                        onClick={() => setManageTenant(tenant)}
                                                    >
                                                        Manage
                                                        <ChevronRightIcon size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <Pagination links={tenants.links} />
                        </div>

            {canManage && (
            <Modal show={createOpen} onClose={closeCreateModal} maxWidth="3xl">
                <form onSubmit={submit} className="pf-modal">
                    <ModalHero
                        tone="blue"
                        title="Add Client"
                        subtitle="Provisions a new school workspace with its own database."
                        onClose={closeCreateModal}
                    >
                        <GraduationCapIcon size={22} />
                    </ModalHero>
                            <div className="pft-form-grid">
                                <div className="pf-field">
                                    <label htmlFor="name">School name</label>
                                    <input
                                        id="name"
                                        type="text"
                                        value={data.name}
                                        onChange={(e) => handleNameChange(e.target.value)}
                                        placeholder="e.g. Pilgrim Christian College"
                                        autoFocus
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
                                            placeholder="e.g. pcc"
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

                            <label className="pf-switch-row">
                                <span className="pf-switch-copy">
                                    <strong>This school is an essentiel client</strong>
                                    <small>
                                        Connects this school to essentiel's API — every tap resolves
                                        the student and guardian live through essentiel instead of a
                                        local roster import, and essentiel keeps its own attendance record too.
                                    </small>
                                </span>
                                <span className="pf-switch">
                                    <input
                                        type="checkbox"
                                        checked={data.connect_legacy_system}
                                        onChange={(e) => setData('connect_legacy_system', e.target.checked)}
                                    />
                                    <span aria-hidden="true" />
                                </span>
                            </label>

                            {data.connect_legacy_system && (
                                <div className="pf-field" style={{ marginBottom: 18 }}>
                                    <label htmlFor="legacy-school-search">Find the school in essentiel</label>
                                    <input
                                        id="legacy-school-search"
                                        type="text"
                                        placeholder={legacySchoolsLoading ? 'Loading school list…' : 'Search by name or abbreviation…'}
                                        value={schoolQuery}
                                        disabled={legacySchoolsLoading}
                                        onChange={(e) => {
                                            setSchoolQuery(e.target.value);
                                            setSchoolPickerOpen(true);
                                        }}
                                        onFocus={() => setSchoolPickerOpen(true)}
                                        onBlur={() => setTimeout(() => setSchoolPickerOpen(false), 150)}
                                        autoComplete="off"
                                    />
                                    <p className="pf-field-hint">
                                        Picking a school fills in its name/code automatically below —
                                        the base URL/API key still need to be entered manually, since
                                        the directory only carries identity, not credentials.
                                    </p>
                                    {legacySchoolsError && (
                                        <p className="pf-field-hint" role="alert" style={{ color: 'var(--as-danger-dark)' }}>
                                            Couldn't load the school list — you can still type the
                                            name/code above by hand.
                                        </p>
                                    )}
                                    {schoolPickerOpen && !legacySchoolsLoading && filteredLegacySchools.length > 0 && (
                                        <ul className="pft-school-picker">
                                            {filteredLegacySchools.slice(0, 50).map((school) => (
                                                <li key={`${school.id}-${school.schoolabrv}`}>
                                                    <button type="button" onClick={() => selectLegacySchool(school)}>
                                                        <strong className="font-mono">{school.schoolabrv}</strong>{' '}
                                                        <span style={{ color: 'var(--as-brand-blue-light)' }}>{titleCase(school.schoolname)}</span>
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}

                            {data.connect_legacy_system && (
                                <div className="pft-form-grid">
                                    <div className="pf-field">
                                        <label htmlFor="essentiel-base-url">Base URL</label>
                                        <input
                                            id="essentiel-base-url"
                                            type="text"
                                            placeholder="https://app-XXX.essentiel.ph"
                                            value={data.legacy_connection.base_url}
                                            onChange={(e) => setLegacyField('base_url', e.target.value)}
                                            required={data.connect_legacy_system}
                                            className="font-mono"
                                        />
                                        <p className="pf-field-hint">essentiel scopes each school by its own subdomain — no trailing slash.</p>
                                        <InputError message={errors['legacy_connection.base_url']} className="mt-2" />
                                    </div>

                                    <div className="pf-field">
                                        <label htmlFor="essentiel-api-key">API key</label>
                                        <input
                                            id="essentiel-api-key"
                                            type="password"
                                            value={data.legacy_connection.api_key}
                                            onChange={(e) => setLegacyField('api_key', e.target.value)}
                                            placeholder="Paste the essentiel API key"
                                            autoComplete="new-password"
                                        />
                                        <p className="pf-field-hint">Optional for now while essentiel's test endpoint has no auth — required once it does.</p>
                                        <InputError message={errors['legacy_connection.api_key']} className="mt-2" />
                                    </div>
                                </div>
                            )}

                            <div className="pf-modal-footer">
                                <button
                                    type="button"
                                    className="pf-btn pf-btn-secondary"
                                    onClick={closeCreateModal}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className={'pf-btn pf-btn-primary' + (processing ? ' pf-btn--loading' : '')}
                                    disabled={processing || Boolean(codeFormatError)}
                                >
                                    <PlusIcon size={16} />
                                    Create Client
                                </button>
                            </div>
                </form>
            </Modal>
            )}
            </div>

            <ManageSchoolModal
                tenant={manageTenant}
                show={manageTenant !== null}
                onClose={() => setManageTenant(null)}
                onUpdated={(updated) => setManageTenant(updated)}
            />
        </PlatformLayout>
    );
}

import { BadgeAlertIcon } from '@/Components/icons/badge-alert';
import { CheckIcon } from '@/Components/icons/check';
import { ChevronRightIcon } from '@/Components/icons/chevron-right';
import { GraduationCapIcon } from '@/Components/icons/graduation-cap';
import { SearchIcon } from '@/Components/icons/search';
import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import '../../../css/platform-dashboard.css';
import '../../../css/platform-overview.css';

interface SchoolRow {
    id: string;
    name: string;
    code: string;
    status: 'active' | 'suspended' | 'archived';
}

interface Stats {
    total: number;
    active: number;
    suspended: number;
}

const STATUS_PILL_CLASS: Record<SchoolRow['status'], string> = {
    active: 'pf-pill--active',
    suspended: 'pf-pill--suspended',
    archived: 'pf-pill--archived',
};

interface StatCardProps {
    label: string;
    value: number;
    icon: React.ReactNode;
    tone: 'blue' | 'green' | 'amber';
}

function StatCard({ label, value, icon, tone }: StatCardProps) {
    return (
        <div className="pft-stat-card">
            <div className="pft-stat-card-top">
                <p className="pft-stat-label">{label}</p>
                <span className={`pft-stat-icon pft-stat-icon--${tone}`}>{icon}</span>
            </div>
            <p className="pft-stat-value">{value}</p>
        </div>
    );
}

const ICON_SCHOOLS = <GraduationCapIcon size={19} />;
const ICON_ACTIVE = <CheckIcon size={19} />;
const ICON_SUSPENDED = <BadgeAlertIcon size={19} />;
const ICON_ARROW = <ChevronRightIcon size={15} />;
const ICON_CHECK = <CheckIcon size={15} />;

/** Consistent per-school color from its own code, not a random per-render
 * pick — the same school always gets the same avatar tint. */
function avatarTone(code: string): 'blue' | 'green' | 'violet' | 'amber' {
    const tones: Array<'blue' | 'green' | 'violet' | 'amber'> = ['blue', 'green', 'violet', 'amber'];
    let hash = 0;
    for (let i = 0; i < code.length; i++) {
        hash = (hash * 31 + code.charCodeAt(i)) >>> 0;
    }

    return tones[hash % tones.length];
}

export default function SelectSchoolScreen({
    tenants,
    currentTenantId,
    stats,
}: {
    tenants: SchoolRow[];
    currentTenantId: string | null;
    stats: Stats;
}) {
    const [search, setSearch] = useState('');
    const selectForm = useForm({});
    const [selectingId, setSelectingId] = useState<string | null>(null);

    const filtered = search.trim() === ''
        ? tenants
        : tenants.filter((tenant) => {
            const q = search.trim().toLowerCase();
            return tenant.name.toLowerCase().includes(q) || tenant.code.toLowerCase().includes(q);
        });

    function selectSchool(tenant: SchoolRow) {
        if (tenant.id === currentTenantId) {
            router.visit(route('portal.dashboard'));
            return;
        }

        setSelectingId(tenant.id);
        selectForm.post(route('oversight.schools.select', tenant.code), {
            onFinish: () => setSelectingId(null),
        });
    }

    function logout(e: React.FormEvent) {
        e.preventDefault();
        router.post(route('logout'));
    }

    return (
        <div className="pf-dashboard pft-page" style={{ maxWidth: 960, margin: '0 auto', paddingTop: 48 }}>
            <Head title="Select a School" />

            <div className="pft-hero">
                <div className="pft-hero-main">
                    <span className="pft-hero-icon" aria-hidden="true">
                        <GraduationCapIcon size={22} />
                    </span>
                    <div>
                        <h1 className="pft-hero-title">Select a School</h1>
                        <p className="pft-hero-subtitle">
                            Choose which school's admin portal to view. You can switch to a
                            different one anytime from the sidebar.
                        </p>
                    </div>
                </div>
                <div className="pft-hero-actions">
                    <form onSubmit={logout}>
                        <button type="submit" className="pf-btn pf-btn-secondary">
                            Log out
                        </button>
                    </form>
                </div>
            </div>

            <div className="pft-stat-grid">
                <StatCard label="Schools" value={stats.total} icon={ICON_SCHOOLS} tone="blue" />
                <StatCard label="Active" value={stats.active} icon={ICON_ACTIVE} tone="green" />
                <StatCard label="Suspended" value={stats.suspended} icon={ICON_SUSPENDED} tone="amber" />
            </div>

            <div className="pf-field pft-search-field" style={{ marginBottom: 20 }}>
                <label htmlFor="school-search">Search</label>
                <SearchIcon size={15} aria-hidden="true" />
                <input
                    id="school-search"
                    type="text"
                    placeholder="Search by school name or code..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    autoFocus
                />
            </div>

            {filtered.length === 0 ? (
                <div className="pf-panel" style={{ padding: '48px 24px', textAlign: 'center' }}>
                    <p className="pf-empty">No schools match your search.</p>
                </div>
            ) : (
                <div className="pft-school-grid">
                    {filtered.map((tenant) => {
                        const isCurrent = tenant.id === currentTenantId;
                        const isSelecting = selectingId === tenant.id;

                        return (
                            <button
                                key={tenant.id}
                                type="button"
                                className={'pft-school-card' + (isCurrent ? ' pft-school-card--current' : '')}
                                disabled={selectingId !== null && !isSelecting}
                                onClick={() => selectSchool(tenant)}
                            >
                                <div className="pft-school-card-top">
                                    <span
                                        aria-hidden="true"
                                        className={`pft-school-avatar pft-stat-icon pft-stat-icon--${avatarTone(tenant.code)}`}
                                    >
                                        {tenant.name.charAt(0).toUpperCase()}
                                    </span>
                                    <div style={{ minWidth: 0, flex: 1 }}>
                                        <p className="pft-school-name">{tenant.name}</p>
                                        <p className="pft-school-code font-mono">{tenant.code}</p>
                                    </div>
                                </div>

                                <div className="pft-school-footer">
                                    <span className={'pf-pill ' + STATUS_PILL_CLASS[tenant.status]}>
                                        {tenant.status}
                                    </span>
                                    <span className="pft-school-cta">
                                        {isSelecting ? (
                                            'Loading…'
                                        ) : isCurrent ? (
                                            <>
                                                Viewing {ICON_CHECK}
                                            </>
                                        ) : (
                                            <>
                                                View {ICON_ARROW}
                                            </>
                                        )}
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

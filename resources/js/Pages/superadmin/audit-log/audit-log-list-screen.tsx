import PlatformLayout from '@/Layouts/PlatformLayout';
import { Head, Link } from '@inertiajs/react';
import { PaginatedData, PaginationLink } from '@/types';
import '../../../../css/platform-dashboard.css';

interface AuditLog {
    id: string;
    tenant?: { name: string } | null;
    actor_type: string;
    action: string;
    entity_type: string | null;
    entity_id: string | null;
    created_at: string;
}

interface PaginationBarProps {
    links: PaginationLink[];
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

interface RecencyInfo {
    tier: 'now' | 'today' | 'yesterday' | 'week' | 'older';
    label: string;
    exact: string;
    fullDate: string;
}

function getRecencyInfo(dateString: string): RecencyInfo {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.max(0, Math.floor(diffMs / 1000));
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    const exact = date.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });

    const fullDate = date.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'medium',
    });

    // Tier 1: Under 1 hour (< 60 minutes)
    if (diffMin < 1) {
        return { tier: 'now', label: 'Just now', exact, fullDate };
    }
    if (diffHour < 1) {
        return { tier: 'now', label: `${diffMin}m ago`, exact, fullDate };
    }

    // Tier 2: Today (calendar day match or < 24 hours)
    const isToday =
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear();

    if (isToday || diffHour < 24) {
        return { tier: 'today', label: `${diffHour}h ago`, exact, fullDate };
    }

    // Tier 3: Yesterday (diffDay === 1 or < 48 hours)
    if (diffDay === 1 || diffHour < 48) {
        return { tier: 'yesterday', label: 'Yesterday', exact, fullDate };
    }

    // Tier 4: This week (< 7 days)
    if (diffDay < 7) {
        return { tier: 'week', label: `${diffDay}d ago`, exact, fullDate };
    }

    // Tier 5: Older
    const shortDate = date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
    return { tier: 'older', label: shortDate, exact, fullDate };
}

function WhenCell({ dateString }: { dateString: string }) {
    const info = getRecencyInfo(dateString);

    return (
        <div className="pf-when-cell" title={info.fullDate}>
            <span className={`pf-when-pill pf-when-pill--${info.tier}`}>
                <span className="pf-when-dot" aria-hidden="true" />
                <span>{info.label}</span>
            </span>
            <span className="pf-when-exact">
                {info.exact}
            </span>
        </div>
    );
}

type ActionCategory = 'create' | 'update' | 'danger' | 'security' | 'warning' | 'other';

function parseAction(action: string): {
    namespace: string;
    verb: string;
    category: ActionCategory;
    icon: React.ReactNode;
} {
    let namespace = 'general';
    let verb = action;

    if (action.includes('.')) {
        const parts = action.split('.');
        namespace = parts[0];
        verb = parts.slice(1).join('.');
    }

    const lowerVerb = verb.toLowerCase();

    // 1. Destructive / Purge / Deactivate / Revoke actions
    if (
        lowerVerb.includes('purge') ||
        lowerVerb.includes('deactivat') ||
        lowerVerb.includes('revok') ||
        lowerVerb.includes('delet') ||
        lowerVerb.includes('destroy')
    ) {
        return {
            namespace,
            verb,
            category: 'danger',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
            ),
        };
    }

    // 2. Creation / Provisioning / Activation actions
    if (
        lowerVerb.includes('creat') ||
        lowerVerb.includes('activat') ||
        lowerVerb.includes('reactivat') ||
        lowerVerb.includes('provision')
    ) {
        return {
            namespace,
            verb,
            category: 'create',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 4v16m8-8H4" />
                </svg>
            ),
        };
    }

    // 3. Modification / Update / Configuration actions
    if (
        lowerVerb.includes('updat') ||
        lowerVerb.includes('config') ||
        lowerVerb.includes('replac') ||
        lowerVerb.includes('edit')
    ) {
        return {
            namespace,
            verb,
            category: 'update',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
            ),
        };
    }

    // 4. Security / Credential / Key / Assignment actions
    if (
        lowerVerb.includes('assign') ||
        lowerVerb.includes('issu') ||
        lowerVerb.includes('credential') ||
        lowerVerb.includes('token') ||
        lowerVerb.includes('key')
    ) {
        return {
            namespace,
            verb,
            category: 'security',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
            ),
        };
    }

    // 5. Status / Resolution / Placeholder actions
    if (
        lowerVerb.includes('status') ||
        lowerVerb.includes('resolv') ||
        lowerVerb.includes('placeholder')
    ) {
        return {
            namespace,
            verb,
            category: 'warning',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            ),
        };
    }

    // 6. Other actions
    return {
        namespace,
        verb,
        category: 'other',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
    };
}

function ActionCell({ action }: { action: string }) {
    const { namespace, verb, category, icon } = parseAction(action);
    const formattedVerb = verb.replace(/_/g, ' ');

    return (
        <span className={`pf-action-pill pf-action-pill--${category}`} title={action}>
            {icon}
            <span className="pf-action-prefix">{namespace.replace(/_/g, ' ')}</span>
            <span className="pf-action-dot">/</span>
            <span className="pf-action-verb">{formattedVerb}</span>
        </span>
    );
}

function ActorBadge({ actorType }: { actorType: string }) {
    const normalized = actorType.toLowerCase();

    const icon =
        normalized === 'station' ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <rect x="4" y="5" width="16" height="13" rx="2" strokeWidth="2" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 21h8M9 9h6M9 13h4" />
            </svg>
        ) : normalized === 'system' ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
        ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
        );

    return (
        <span className={`pf-actor-pill pf-actor-pill--${normalized}`}>
            {icon}
            <span className="capitalize">{actorType}</span>
        </span>
    );
}

function TenantCell({ tenant }: { tenant?: { name: string } | null }) {
    if (!tenant?.name) {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" aria-hidden="true" />
                Platform (Global)
            </span>
        );
    }

    return (
        <div className="pf-tenant-cell">
            <span
                className="pf-tenant-avatar"
                style={{ width: 28, height: 28, fontSize: 11, flex: '0 0 28px', borderRadius: 8 }}
                aria-hidden="true"
            >
                {tenant.name.charAt(0).toUpperCase()}
            </span>
            <span className="pf-tenant-name text-[13px]">{tenant.name}</span>
        </div>
    );
}

function EntityCell({
    entityType,
    entityId,
}: {
    entityType: string | null;
    entityId: string | null;
}) {
    if (!entityType) {
        return <span className="text-slate-400">—</span>;
    }

    const label = entityType.replace(/_/g, ' ');

    return (
        <div className="pf-entity-wrap">
            <span className="pf-entity-type">{label}</span>
            {entityId && (
                <span className="pf-entity-id" title={entityId}>
                    #{entityId.slice(0, 8)}
                </span>
            )}
        </div>
    );
}

interface AuditLogListScreenProps {
    logs: PaginatedData<AuditLog>;
}

export default function AuditLogListScreen({ logs }: AuditLogListScreenProps) {
    return (
        <PlatformLayout>
            <Head title="Audit Log" />

            <div className="pf-dashboard">
                <div className="pf-dashboard-header">
                    <div>
                        <div className="pf-dashboard-kicker">Security &amp; Governance</div>
                        <h1 className="pf-dashboard-title">Audit Log</h1>
                        <p className="pf-dashboard-subtitle">
                            Every sensitive action taken across the platform, organized with real-time
                            recency indicators and distinct action typography.
                        </p>
                    </div>
                </div>

                <div className="pf-panel">
                    <div className="pf-panel-header">
                        <div>
                            <h2 className="pf-panel-title">Recent Activity</h2>
                            <p className="pf-panel-count">
                                {logs.data.length} {logs.data.length === 1 ? 'event' : 'events'} shown
                            </p>
                        </div>
                        <div className="hidden md:flex items-center gap-2 text-xs">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mr-1">
                                Recency:
                            </span>
                            <span className="pf-when-pill pf-when-pill--now !py-1 !px-2.5">
                                <span className="pf-when-dot" aria-hidden="true" /> Live (&lt;1h)
                            </span>
                            <span className="pf-when-pill pf-when-pill--today !py-1 !px-2.5">
                                <span className="pf-when-dot" aria-hidden="true" /> Today
                            </span>
                            <span className="pf-when-pill pf-when-pill--yesterday !py-1 !px-2.5">
                                <span className="pf-when-dot" aria-hidden="true" /> Yesterday
                            </span>
                            <span className="pf-when-pill pf-when-pill--older !py-1 !px-2.5">
                                <span className="pf-when-dot" aria-hidden="true" /> Past
                            </span>
                        </div>
                    </div>

                    <div className="pf-table-wrap">
                        <table className="pf-table">
                            <thead>
                                <tr>
                                    <th scope="col">When</th>
                                    <th scope="col">School</th>
                                    <th scope="col">Actor</th>
                                    <th scope="col">Action</th>
                                    <th scope="col">Entity</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.data.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="pf-empty">
                                            <div className="flex flex-col items-center justify-center py-6 gap-2">
                                                <svg className="w-8 h-8 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                    <rect x="6" y="4" width="12" height="17" rx="2" strokeWidth="1.5" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1M9 11h6M9 15h6" />
                                                </svg>
                                                <p className="text-slate-500 font-medium">No audit log entries yet.</p>
                                                <p className="text-xs text-slate-400">Platform security actions will appear here automatically.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}

                                {logs.data.map((log) => (
                                    <tr key={log.id}>
                                        <td>
                                            <WhenCell dateString={log.created_at} />
                                        </td>
                                        <td>
                                            <TenantCell tenant={log.tenant} />
                                        </td>
                                        <td>
                                            <ActorBadge actorType={log.actor_type} />
                                        </td>
                                        <td>
                                            <ActionCell action={log.action} />
                                        </td>
                                        <td>
                                            <EntityCell
                                                entityType={log.entity_type}
                                                entityId={log.entity_id}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <PaginationBar links={logs.links} />
                </div>
            </div>
        </PlatformLayout>
    );
}

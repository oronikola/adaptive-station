export interface User {
    id: number;
    name: string;
    email: string;
    role: string;
    email_verified_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface Tenant {
    id: number;
    name: string;
    code: string;
    timezone: string;
    status: 'active' | 'suspended' | 'archived';
    created_at: string;
    updated_at: string;
}

export interface Station {
    id: number;
    tenant_id: number;
    name: string;
    station_code: string;
    status: 'pending_activation' | 'active' | 'disabled' | 'retired';
    app_version: string | null;
    configuration: Record<string, unknown> | null;
    legacy_station_id: string | null;
    last_seen_at: string | null;
    last_pending_count: number | null;
    created_at: string;
    updated_at: string;
}

export interface Person {
    id: number;
    tenant_id: number;
    person_type: 'student' | 'staff';
    display_name: string;
    first_name: string;
    middle_name?: string | null;
    last_name: string;
    external_id: string | null;
    grade_level: string | null;
    section: string | null;
    photo_url?: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

/**
 * The value to pass as the route parameter for any {person}-bound portal
 * route (people.edit/update/deactivate/reactivate, attendance.students.show)
 * — mirrors Person::getRouteKey() on the backend: external_id when set,
 * UUID otherwise. Never use this for a person_id passed as a plain form
 * field or query filter value — those must stay the real id.
 */
export function personRouteKey(person: Pick<Person, 'id' | 'external_id'>): string | number {
    return person.external_id ?? person.id;
}

export interface RfidCard {
    id: number;
    tenant_id: number;
    person_id: number;
    uid: string;
    label: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface StationCredential {
    id: number;
    station_id: number;
    label: string | null;
    last_used_at: string | null;
    revoked_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

export interface PaginatedData<T> {
    data: T[];
    links: PaginationLink[];
    total: number;
    per_page: number;
    current_page: number;
    from: number | null;
    to: number | null;
}

export interface PageProps {
    auth: {
        user: User | null;
    };
    tenant?: Tenant | null;
    webNotifications?: WebNotificationSummary | null;
    flash?: {
        success?: string;
        error?: string;
        deviceToken?: string;
        activationCode?: string;
        pairingLink?: string;
    };
    [key: string]: unknown;
}

export interface WebNotification {
    id: string;
    category: string;
    title: string;
    message: string;
    severity: 'error' | 'warning' | 'success' | 'info';
    action_url: string;
    tenant_name: string | null;
    read_at: string | null;
    created_at: string;
}

export interface WebNotificationSummary {
    unread_count: number;
    recent: WebNotification[];
}

export type ToastType = 'success' | 'update' | 'delete' | 'error' | 'info';

export interface ShowToastOptions {
    type?: ToastType;
    message: string;
    description?: string;
    duration?: number;
}

export interface NavItem {
    name: string;
    label: string;
    route: string;
    activePattern: string;
    icon: React.ReactNode;
    adminOnly?: boolean;
    /** Shown only to adaptivestation_admin — the platform-level oversight
     * role that acts on whichever school it selected, additive to the
     * shared portal sidebar (see AdminNavigation's sms-log/switch-school
     * items). Never shown to a real tenant_admin/tenant_operator. */
    oversightOnly?: boolean;
    /** Opens in a new tab via a plain <a> instead of an Inertia visit —
     * for links to a page outside this app's own layout/session flow
     * (e.g. the kiosk screen), so navigating there doesn't stow the
     * admin's own sidebar/session in the same tab. */
    external?: boolean;
    /** Optional count/status pill rendered at the end of the nav row
     * (e.g. a pending-items count). Not populated by any nav list yet. */
    badge?: string | number;
}

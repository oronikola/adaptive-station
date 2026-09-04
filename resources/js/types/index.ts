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
    status: 'active' | 'inactive';
    created_at: string;
    updated_at: string;
}

export interface Station {
    id: number;
    tenant_id: number;
    name: string;
    status: 'pending_activation' | 'active' | 'disabled' | 'retired';
    configuration: Record<string, unknown> | null;
    last_heartbeat_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface Person {
    id: number;
    tenant_id: number;
    person_type: 'student' | 'staff';
    display_name: string;
    first_name: string;
    last_name: string;
    external_id: string | null;
    grade_level: string | null;
    section: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
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
}

export interface PageProps {
    auth: {
        user: User;
    };
    tenant?: Tenant;
    flash?: {
        success?: string;
        error?: string;
        deviceToken?: string;
        activationCode?: string;
    };
    [key: string]: unknown;
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
}

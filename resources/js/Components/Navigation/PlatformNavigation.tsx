import { NavItem } from '@/types';

export const platformNavigationItems: NavItem[] = [
    {
        name: 'dashboard',
        label: 'Dashboard',
        route: 'platform.dashboard',
        activePattern: 'platform.dashboard',
        icon: (
            <svg viewBox="0 0 24 24">
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
            </svg>
        ),
    },
    {
        name: 'clients',
        label: 'Client Management',
        route: 'platform.tenants.index',
        activePattern: 'platform.tenants.*',
        icon: (
            <svg viewBox="0 0 24 24">
                <path d="M4 21V7l8-4 8 4v14M9 21v-6h6v6M4 11h16" />
            </svg>
        ),
    },
    {
        name: 'notifications',
        label: 'Notifications',
        route: 'notifications.index',
        activePattern: 'notifications.*',
        icon: (
            <svg viewBox="0 0 24 24">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                <path d="M10 21h4" />
            </svg>
        ),
    },
    {
        name: 'stations',
        label: 'Stations',
        route: 'platform.stations.index',
        activePattern: 'platform.stations.*',
        icon: (
            <svg viewBox="0 0 24 24">
                <rect x="4" y="5" width="16" height="13" rx="2" />
                <path d="M8 21h8M9 9h6M9 13h4" />
            </svg>
        ),
    },
    {
        name: 'sms-gateway',
        label: 'SMS Gateway',
        route: 'platform.sms-gateway.devices.index',
        activePattern: 'platform.sms-gateway.*',
        icon: (
            <svg viewBox="0 0 24 24">
                <rect x="7" y="2" width="10" height="20" rx="2" />
                <path d="M11 18h2" />
            </svg>
        ),
    },
    {
        name: 'sms-log',
        label: 'SMS Delivery Log',
        route: 'platform.sms-log.index',
        activePattern: 'platform.sms-log.*',
        icon: (
            <svg viewBox="0 0 24 24">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
        ),
    },
    {
        name: 'audit-log',
        label: 'Audit Log',
        route: 'platform.audit-log.index',
        activePattern: 'platform.audit-log.*',
        icon: (
            <svg viewBox="0 0 24 24">
                <rect x="6" y="4" width="12" height="17" rx="2" />
                <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1M9 11h6M9 15h6" />
            </svg>
        ),
    },
    {
        name: 'platform-admins',
        label: 'Platform Admins',
        route: 'platform.platform-admins.index',
        activePattern: 'platform.platform-admins.*',
        // Provisions adaptivestation_admin accounts — every visitor to
        // PlatformLayout is already guaranteed platform_super_admin (see
        // EnsurePlatformAccess), so no further gating is needed here.
        icon: (
            <svg viewBox="0 0 24 24">
                <circle cx="12" cy="8" r="3.5" />
                <path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" />
                <path d="M17 6l1.5 1.5L21.5 4.5" />
            </svg>
        ),
    },
];

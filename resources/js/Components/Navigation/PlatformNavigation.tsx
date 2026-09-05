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
];

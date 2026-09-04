import AppShell from '@/Components/AppShell';
import { usePage } from '@inertiajs/react';

const navItems = [
    {
        name: 'people',
        label: 'People',
        route: 'portal.people.index',
        activePattern: 'portal.people.*',
        icon: (
            <svg viewBox="0 0 24 24">
                <circle cx="12" cy="8" r="3.2" />
                <path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" />
            </svg>
        ),
    },
    {
        name: 'rfid-cards',
        label: 'RFID Cards',
        route: 'portal.rfid-cards.index',
        activePattern: 'portal.rfid-cards.*',
        icon: (
            <svg viewBox="0 0 24 24">
                <rect x="3" y="6" width="18" height="12" rx="2" />
                <path d="M3 10h18" />
                <rect x="6" y="13" width="4" height="2.4" rx="0.5" />
            </svg>
        ),
    },
    {
        name: 'stations',
        label: 'Stations',
        route: 'portal.stations.index',
        activePattern: 'portal.stations.*',
        icon: (
            <svg viewBox="0 0 24 24">
                <rect x="4" y="5" width="16" height="13" rx="2" />
                <path d="M8 21h8M9 9h6M9 13h4" />
            </svg>
        ),
    },
    {
        name: 'attendance',
        label: 'Attendance',
        route: 'portal.attendance.index',
        activePattern: 'portal.attendance.*',
        icon: (
            <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="8.5" />
                <path d="M12 7.5V12l3 2" />
            </svg>
        ),
    },
    {
        name: 'users',
        label: 'Users',
        route: 'portal.users.index',
        activePattern: 'portal.users.*',
        icon: (
            <svg viewBox="0 0 24 24">
                <circle cx="9" cy="8" r="3" />
                <path d="M3.5 19.5c0-3.3 2.5-5.5 5.5-5.5s5.5 2.2 5.5 5.5" />
                <path d="M16 8.3a2.6 2.6 0 1 0 0-5.2" />
                <path d="M15 14.3c2.4.5 4.2 2.4 4.6 5.2" />
            </svg>
        ),
    },
    {
        name: 'integrations',
        label: 'Integrations',
        route: 'portal.integrations.index',
        activePattern: 'portal.integrations.*',
        adminOnly: true,
        icon: (
            <svg viewBox="0 0 24 24">
                <path d="M8 16a4 4 0 0 1 0-5.7l2-2a4 4 0 0 1 5.7 5.7l-1 1" />
                <path d="M16 8a4 4 0 0 1 0 5.7l-2 2a4 4 0 0 1-5.7-5.7l1-1" />
            </svg>
        ),
    },
    {
        name: 'imports',
        label: 'Imports',
        route: 'portal.imports.index',
        activePattern: 'portal.imports.*',
        adminOnly: true,
        icon: (
            <svg viewBox="0 0 24 24">
                <path d="M12 4v10m0 0-3.5-3.5M12 14l3.5-3.5" />
                <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
            </svg>
        ),
    },
];

export default function AdminLayout({ header, children }) {
    const { auth } = usePage().props;
    const user = auth.user;

    const visibleNavItems = navItems.filter(
        (item) => !item.adminOnly || user.role !== 'tenant_operator',
    );

    return (
        <AppShell
            brandHref={route('portal.people.index')}
            items={visibleNavItems}
            header={header}
        >
            {children}
        </AppShell>
    );
}

import { BellIcon } from '@/Components/icons/bell';
import { CalendarCheckIcon } from '@/Components/icons/calendar-check';
import { ConnectIcon } from '@/Components/icons/connect';
import { CreditCardIcon } from '@/Components/icons/credit-card';
import { DownloadIcon } from '@/Components/icons/download';
import { GraduationCapIcon } from '@/Components/icons/graduation-cap';
import { HistoryIcon } from '@/Components/icons/history';
import { LayoutGridIcon } from '@/Components/icons/layout-grid';
import { MonitorCogIcon } from '@/Components/icons/monitor-cog';
import { RadioTowerIcon } from '@/Components/icons/radio-tower';
import { SmartphoneNfcIcon } from '@/Components/icons/smartphone-nfc';
import { UserPlusIcon } from '@/Components/icons/user-plus';
import { UsersIcon } from '@/Components/icons/users';
import { NavItem } from '@/types';

const icon = { size: 20 } as const;

export const adminNavigationItems: NavItem[] = [
    {
        name: 'dashboard',
        label: 'Dashboard',
        route: 'portal.dashboard',
        activePattern: 'portal.dashboard',
        icon: <LayoutGridIcon {...icon} />,
    },
    {
        name: 'people',
        label: 'People',
        route: 'portal.people.index',
        activePattern: 'portal.people.*',
        icon: <UsersIcon {...icon} />,
    },
    {
        name: 'notifications',
        label: 'Notifications',
        route: 'notifications.index',
        activePattern: 'notifications.*',
        icon: <BellIcon {...icon} />,
    },
    {
        name: 'rfid-cards',
        label: 'RFID Cards',
        route: 'portal.rfid-cards.index',
        activePattern: 'portal.rfid-cards.*',
        icon: <CreditCardIcon {...icon} />,
    },
    {
        name: 'stations',
        label: 'Stations',
        route: 'portal.stations.index',
        activePattern: 'portal.stations.*',
        icon: <MonitorCogIcon {...icon} />,
    },
    {
        name: 'attendance',
        label: 'Attendance',
        route: 'portal.attendance.index',
        activePattern: 'portal.attendance.*',
        icon: <CalendarCheckIcon {...icon} />,
    },
    {
        name: 'parents',
        label: 'Parents',
        route: 'portal.parents.index',
        activePattern: 'portal.parents.*',
        adminOnly: true,
        icon: <UserPlusIcon {...icon} />,
    },
    {
        name: 'users',
        label: 'Users',
        route: 'portal.users.index',
        activePattern: 'portal.users.*',
        icon: <UsersIcon {...icon} />,
    },
    {
        name: 'integrations',
        label: 'Integrations',
        route: 'portal.integrations.index',
        activePattern: 'portal.integrations.*',
        adminOnly: true,
        icon: <ConnectIcon {...icon} />,
    },
    {
        name: 'imports',
        label: 'Imports',
        route: 'portal.imports.index',
        activePattern: 'portal.imports.*',
        adminOnly: true,
        icon: <DownloadIcon {...icon} />,
    },
    {
        name: 'kiosk',
        label: 'Kiosk',
        route: 'kiosk',
        activePattern: 'kiosk',
        external: true,
        icon: <SmartphoneNfcIcon {...icon} />,
    },
    {
        name: 'sms-log',
        label: 'SMS Delivery Log',
        route: 'portal.sms-log.index',
        activePattern: 'portal.sms-log.*',
        // Additive to the shared portal sidebar only for adaptivestation_admin
        // (the platform-wide oversight role) — a real tenant_admin/
        // tenant_operator never sees this item.
        oversightOnly: true,
        icon: <HistoryIcon {...icon} />,
    },
    {
        name: 'sms-gateway',
        label: 'SMS Gateway Fleet',
        route: 'portal.sms-gateway.index',
        activePattern: 'portal.sms-gateway.*',
        // Read-only mirror of the Platform fleet screen — the fleet is
        // shared across every school, not owned by whichever one is
        // currently selected, so this always shows the whole fleet.
        oversightOnly: true,
        icon: <RadioTowerIcon {...icon} />,
    },
    {
        name: 'switch-school',
        label: 'Switch School',
        route: 'oversight.schools.index',
        activePattern: 'oversight.schools.*',
        oversightOnly: true,
        icon: <GraduationCapIcon {...icon} />,
    },
];

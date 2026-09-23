import { BellIcon } from '@/Components/icons/bell';
import { ClipboardCheckIcon } from '@/Components/icons/clipboard-check';
import { HistoryIcon } from '@/Components/icons/history';
import { HomeIcon } from '@/Components/icons/home';
import { IdCardIcon } from '@/Components/icons/id-card';
import { KeyIcon } from '@/Components/icons/key';
import { LayoutGridIcon } from '@/Components/icons/layout-grid';
import { MonitorCogIcon } from '@/Components/icons/monitor-cog';
import { PhoneIcon } from '@/Components/icons/phone';
import { RadioTowerIcon } from '@/Components/icons/radio-tower';
import { ShieldCheckIcon } from '@/Components/icons/shield-check';
import { NavItem } from '@/types';

const icon = { size: 20 } as const;

export const platformNavigationItems: NavItem[] = [
    {
        name: 'dashboard',
        label: 'Dashboard',
        route: 'platform.dashboard',
        activePattern: 'platform.dashboard',
        icon: <LayoutGridIcon {...icon} />,
    },
    {
        name: 'clients',
        label: 'Client Management',
        route: 'platform.tenants.index',
        activePattern: 'platform.tenants.*',
        icon: <HomeIcon {...icon} />,
    },
    {
        name: 'notifications',
        label: 'Notifications',
        route: 'notifications.index',
        activePattern: 'notifications.*',
        icon: <BellIcon {...icon} />,
    },
    {
        name: 'stations',
        label: 'Stations',
        route: 'platform.stations.index',
        activePattern: 'platform.stations.*',
        icon: <MonitorCogIcon {...icon} />,
    },
    {
        name: 'sms-gateway',
        label: 'SMS Gateway',
        route: 'platform.sms-gateway.devices.index',
        activePattern: 'platform.sms-gateway.*',
        icon: <RadioTowerIcon {...icon} />,
    },
    {
        name: 'sms-log',
        label: 'SMS Delivery Log',
        route: 'platform.sms-log.index',
        activePattern: 'platform.sms-log.*',
        icon: <HistoryIcon {...icon} />,
    },
    {
        name: 'guardian-phone-lookup',
        label: 'Guardian Phone Lookup',
        route: 'platform.guardian-phone-lookup.index',
        activePattern: 'platform.guardian-phone-lookup.*',
        icon: <PhoneIcon {...icon} />,
    },
    {
        name: 'audit-log',
        label: 'Audit Log',
        route: 'platform.audit-log.index',
        activePattern: 'platform.audit-log.*',
        icon: <ClipboardCheckIcon {...icon} />,
    },
    {
        name: 'credential-requests',
        label: 'Credential Requests',
        route: 'platform.credential-requests.index',
        activePattern: 'platform.credential-requests.*',
        icon: <KeyIcon {...icon} />,
    },
    {
        name: 'account-credentials',
        label: 'Account Credentials',
        route: 'platform.account-credentials.index',
        activePattern: 'platform.account-credentials.*',
        icon: <IdCardIcon {...icon} />,
    },
    {
        name: 'platform-admins',
        label: 'Platform Admins',
        route: 'platform.platform-admins.index',
        activePattern: 'platform.platform-admins.*',
        // Provisions adaptivestation_admin accounts — every visitor to
        // PlatformLayout is already guaranteed platform_super_admin (see
        // EnsurePlatformAccess), so no further gating is needed here.
        icon: <ShieldCheckIcon {...icon} />,
    },
];

import AppShell from '@/Components/Navigation/AppShell';
import { platformNavigationItems } from '@/Components/Navigation/PlatformNavigation';
import { PageProps } from '@/types';
import { usePage } from '@inertiajs/react';

interface PlatformLayoutProps {
    header?: React.ReactNode;
    children: React.ReactNode;
}

export default function PlatformLayout({ header, children }: PlatformLayoutProps) {
    const { webNotifications } = usePage<PageProps>().props;
    const navigationItems = platformNavigationItems.map((item) => item.name === 'notifications'
        ? { ...item, badge: webNotifications?.unread_count || undefined }
        : item);

    return (
        <AppShell
            brandHref={route('platform.dashboard')}
            items={navigationItems}
            header={header}
        >
            {children}
        </AppShell>
    );
}

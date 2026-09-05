import { adminNavigationItems } from '@/Components/Navigation/AdminNavigation';
import AppShell from '@/Components/Navigation/AppShell';
import { usePage } from '@inertiajs/react';

interface AdminLayoutProps {
    header?: React.ReactNode;
    children: React.ReactNode;
}

export default function AdminLayout({ header, children }: AdminLayoutProps) {
    const { props } = usePage<import('@/types').PageProps>();
    const user = props.auth.user;

    const visibleNavigationItems = adminNavigationItems.filter(
        (item) => !item.adminOnly || user.role !== 'tenant_operator',
    );

    return (
        <AppShell
            brandHref={route('portal.dashboard')}
            items={visibleNavigationItems}
            header={header}
        >
            {children}
        </AppShell>
    );
}

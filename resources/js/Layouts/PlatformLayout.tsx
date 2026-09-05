import AppShell from '@/Components/Navigation/AppShell';
import { platformNavigationItems } from '@/Components/Navigation/PlatformNavigation';

interface PlatformLayoutProps {
    header?: React.ReactNode;
    children: React.ReactNode;
}

export default function PlatformLayout({ header, children }: PlatformLayoutProps) {
    return (
        <AppShell
            brandHref={route('platform.dashboard')}
            items={platformNavigationItems}
            header={header}
        >
            {children}
        </AppShell>
    );
}

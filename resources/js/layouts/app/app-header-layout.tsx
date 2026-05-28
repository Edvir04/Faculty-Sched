import { AppContent } from '@/components/app-content';
import { AppHeader } from '@/components/app-header';
import { AppShell } from '@/components/app-shell';
import { type BreadcrumbItem } from '@/types';
import { type ReactNode } from 'react';

interface AppHeaderLayoutProps {
    children: ReactNode;
    breadcrumbs?: BreadcrumbItem[];
    contentClassName?: string;
    /** Renders full viewport width between header and main (e.g. dashboard hero). */
    beforeContent?: ReactNode;
}

export default function AppHeaderLayout({ children, breadcrumbs, contentClassName, beforeContent }: AppHeaderLayoutProps) {
    return (
        <AppShell>
            <AppHeader breadcrumbs={breadcrumbs} />
            {beforeContent}
            <AppContent className={contentClassName}>{children}</AppContent>
        </AppShell>
    );
}

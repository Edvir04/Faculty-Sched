import { useRequireAuth } from '@/hooks/use-require-auth';
import AppLayoutTemplate from '@/layouts/app/app-header-layout';
import { type BreadcrumbItem } from '@/types';
import { type ReactNode } from 'react';

interface AppLayoutProps {
    children: React.ReactNode;
    breadcrumbs?: BreadcrumbItem[];
    contentClassName?: string;
    beforeContent?: ReactNode;
}

export default ({ children, breadcrumbs, contentClassName, beforeContent, ...props }: AppLayoutProps) => {
    useRequireAuth();

    return (
        <AppLayoutTemplate breadcrumbs={breadcrumbs} contentClassName={contentClassName} beforeContent={beforeContent} {...props}>
            {children}
        </AppLayoutTemplate>
    );
};

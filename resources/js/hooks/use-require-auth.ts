import { isProtectedPath } from '@/lib/auth-session-guard';
import { type SharedData } from '@/types';
import { router, usePage } from '@inertiajs/react';
import { useEffect } from 'react';

export function useRequireAuth(): void {
    const { auth } = usePage<SharedData>().props;

    useEffect(() => {
        if (!auth.user && isProtectedPath(window.location.pathname)) {
            router.visit(route('home'), { replace: true });
        }
    }, [auth.user]);
}

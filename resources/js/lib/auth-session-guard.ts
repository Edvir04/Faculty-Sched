import { router } from '@inertiajs/react';

const PROTECTED_PATH_PREFIXES = [
    '/dashboard',
    '/schedules',
    '/teachers',
    '/sections-comlabs',
    '/subjects',
    '/settings',
];

export function isProtectedPath(pathname: string): boolean {
    return PROTECTED_PATH_PREFIXES.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );
}

let historyReloadPending = false;

export function reloadAfterHistoryNavigation(): void {
    if (historyReloadPending) {
        return;
    }

    historyReloadPending = true;

    router.reload({
        replace: true,
        onFinish: () => {
            historyReloadPending = false;
        },
        onCancel: () => {
            historyReloadPending = false;
        },
    });
}

export function registerHistoryAuthGuard(): void {
    window.addEventListener('popstate', () => {
        reloadAfterHistoryNavigation();
    });

    document.addEventListener('pageshow', (event: PageTransitionEvent) => {
        if (event.persisted) {
            reloadAfterHistoryNavigation();
        }
    });
}

export function redirectHomeAfterLogout(): void {
    window.location.assign(route('home'));
}

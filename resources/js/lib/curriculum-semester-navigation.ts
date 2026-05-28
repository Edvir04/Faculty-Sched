import { router } from '@inertiajs/react';

/**
 * After the server session active curriculum semester changes, drop stale prefetched
 * visits and reload the current page so shared props and page data stay in sync.
 */
export function refreshAfterCurriculumSemesterChange(): void {
    router.flushAll();
    router.reload();
}

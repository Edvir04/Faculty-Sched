import '../css/app.css';

import { FlashToasts } from '@/components/flash-toasts';
import { registerHistoryAuthGuard } from '@/lib/auth-session-guard';
import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { route as routeFn } from 'ziggy-js';
import { AppearanceProvider, initializeTheme } from './hooks/use-appearance';

declare global {
    const route: typeof routeFn;
}

const appName = import.meta.env.VITE_APP_NAME || 'IT Faculty Comlab Scheduler';

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) => resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob('./pages/**/*.tsx')),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(
            <AppearanceProvider>
                <App {...props}>
                    {({ Component, props: pageProps }) => (
                        <>
                            <FlashToasts />
                            <Component {...pageProps} />
                        </>
                    )}
                </App>
            </AppearanceProvider>,
        );
    },
    progress: {
        color: '#4B5563',
    },
});

// This will set light / dark mode on load...
initializeTheme();

registerHistoryAuthGuard();

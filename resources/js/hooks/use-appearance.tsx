import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Appearance = 'light' | 'dark' | 'system';

type AppearanceContextValue = {
    appearance: Appearance;
    updateAppearance: (mode: Appearance) => void;
};

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

const prefersDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

const mediaQuery = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null;

export const applyTheme = (appearance: Appearance) => {
    if (typeof document === 'undefined') {
        return;
    }

    const isDark = appearance === 'dark' || (appearance === 'system' && prefersDark());

    document.documentElement.classList.toggle('dark', isDark);
};

const handleSystemThemeChange = () => {
    const currentAppearance = (localStorage.getItem('appearance') as Appearance) || 'system';

    if (currentAppearance === 'system') {
        applyTheme('system');
    }
};

export function initializeTheme() {
    if (typeof window === 'undefined') {
        return;
    }

    const savedAppearance = (localStorage.getItem('appearance') as Appearance) || 'system';

    applyTheme(savedAppearance);

    mediaQuery?.addEventListener('change', handleSystemThemeChange);
}

export function AppearanceProvider({ children }: { children: ReactNode }) {
    const [appearance, setAppearance] = useState<Appearance>('system');

    const updateAppearance = useCallback((mode: Appearance) => {
        setAppearance(mode);
        localStorage.setItem('appearance', mode);
        applyTheme(mode);
    }, []);

    useEffect(() => {
        const savedAppearance = (localStorage.getItem('appearance') as Appearance | null) || 'system';
        setAppearance(savedAppearance);
        applyTheme(savedAppearance);
    }, []);

    useEffect(() => {
        if (!mediaQuery) {
            return;
        }

        const onSystemThemeChange = () => {
            if (appearance === 'system') {
                applyTheme('system');
            }
        };

        mediaQuery.addEventListener('change', onSystemThemeChange);

        return () => mediaQuery.removeEventListener('change', onSystemThemeChange);
    }, [appearance]);

    const value = useMemo(
        () => ({
            appearance,
            updateAppearance,
        }),
        [appearance, updateAppearance],
    );

    return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearance(): AppearanceContextValue {
    const context = useContext(AppearanceContext);

    if (context === null) {
        throw new Error('useAppearance must be used within an AppearanceProvider');
    }

    return context;
}

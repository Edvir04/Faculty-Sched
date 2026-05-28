import { useAppearance, type Appearance } from '@/hooks/use-appearance';
import { useEffect, useMemo, useState } from 'react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

const prefersDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

function resolveSonnerTheme(appearance: Appearance, systemPrefersDark: boolean): ToasterProps['theme'] {
    if (appearance === 'dark') {
        return 'dark';
    }

    if (appearance === 'light') {
        return 'light';
    }

    return systemPrefersDark ? 'dark' : 'light';
}

function Toaster({ ...props }: ToasterProps) {
    const { appearance } = useAppearance();
    const [systemPrefersDark, setSystemPrefersDark] = useState(prefersDark);

    useEffect(() => {
        if (appearance !== 'system') {
            return;
        }

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = () => setSystemPrefersDark(mediaQuery.matches);

        setSystemPrefersDark(mediaQuery.matches);
        mediaQuery.addEventListener('change', handleChange);

        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [appearance]);

    const theme = useMemo(
        () => resolveSonnerTheme(appearance, systemPrefersDark),
        [appearance, systemPrefersDark],
    );

    return (
        <Sonner
            theme={theme}
            className="toaster group"
            toastOptions={{
                classNames: {
                    toast: 'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
                    description: 'group-[.toast]:text-muted-foreground',
                    actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
                    cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
                },
            }}
            {...props}
        />
    );
}

export { Toaster };

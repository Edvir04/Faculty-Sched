import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

export function useFlashToasts(): void {
    const page = usePage<SharedData>();
    const { flash } = page.props;
    const shownSignatureRef = useRef<string | null>(null);

    useEffect(() => {
        const success = flash?.success;
        const error = flash?.error;

        if (!success && !error) {
            shownSignatureRef.current = null;
            return;
        }

        const signature = `${page.version}|${success ?? ''}|${error ?? ''}`;
        if (shownSignatureRef.current === signature) {
            return;
        }

        shownSignatureRef.current = signature;

        if (success) {
            toast.success(success);
        }

        if (error) {
            toast.error(error);
        }
    }, [page.version, flash?.success, flash?.error]);
}

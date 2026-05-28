import { Toaster } from '@/components/ui/sonner';
import { useFlashToasts } from '@/hooks/use-flash-toasts';

export function FlashToasts() {
    useFlashToasts();

    return <Toaster richColors closeButton position="top-right" />;
}

import { cn } from '@/lib/utils';
import { type ImgHTMLAttributes } from 'react';

export default function AppLogoIcon({ className, alt = 'Leyte Normal University', ...props }: ImgHTMLAttributes<HTMLImageElement>) {
    return (
        <img
            src="/images/lnu-logo.png"
            alt={alt}
            decoding="async"
            className={cn('aspect-square shrink-0 rounded-full object-cover', className)}
            {...props}
        />
    );
}

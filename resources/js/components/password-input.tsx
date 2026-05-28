import { Eye, EyeOff } from 'lucide-react';
import * as React from 'react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const PasswordInput = React.forwardRef<HTMLInputElement, React.ComponentProps<typeof Input>>(
    ({ className, disabled, ...props }, ref) => {
        const [showPassword, setShowPassword] = React.useState(false);

        return (
            <div className="relative">
                <Input
                    type={showPassword ? 'text' : 'password'}
                    className={cn('pr-10', className)}
                    ref={ref}
                    disabled={disabled}
                    {...props}
                />
                <button
                    type="button"
                    tabIndex={-1}
                    data-password-toggle
                    className="absolute top-0 right-0 flex h-10 w-10 items-center justify-center rounded-md text-neutral-600 hover:text-neutral-900 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-yellow-400/70 disabled:pointer-events-none disabled:opacity-50 dark:text-neutral-600 dark:hover:text-neutral-900"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    disabled={disabled}
                >
                    {showPassword ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
                </button>
            </div>
        );
    },
);

PasswordInput.displayName = 'PasswordInput';

export { PasswordInput };

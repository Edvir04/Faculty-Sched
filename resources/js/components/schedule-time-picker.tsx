import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const MINUTE_OPTIONS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55] as const;
const HOUR_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

function snapMinuteToStep(minute: number, step = 5): number {
    const rounded = Math.round(minute / step) * step;
    return ((rounded % 60) + 60) % 60;
}

/** Parse `H:i` (24h) into 12h parts for the picker. */
export function parseHiToParts(value: string): { hour12: number; minute: number; period: 'AM' | 'PM' } {
    if (!value || !/^\d{1,2}:\d{2}$/.test(value.trim())) {
        return { hour12: 12, minute: 0, period: 'AM' };
    }
    const [hRaw, mRaw] = value.trim().split(':');
    const hour24 = Number.parseInt(hRaw ?? '0', 10);
    const minuteRaw = Number.parseInt(mRaw ?? '0', 10);
    const minute = snapMinuteToStep(Number.isFinite(minuteRaw) ? minuteRaw : 0);
    const period: 'AM' | 'PM' = hour24 >= 12 ? 'PM' : 'AM';
    let hour12 = hour24 % 12;
    if (hour12 === 0) {
        hour12 = 12;
    }
    return { hour12, minute, period };
}

/** Build `H:i` (24h) from 12h picker parts. */
export function partsToHi(hour12: number, minute: number, period: 'AM' | 'PM'): string {
    let hour24: number;
    if (period === 'AM') {
        hour24 = hour12 === 12 ? 0 : hour12;
    } else {
        hour24 = hour12 === 12 ? 12 : hour12 + 12;
    }
    return `${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export type ScheduleTimePickerProps = {
    label: string;
    labelId: string;
    value: string;
    onChange: (nextHi: string) => void;
    error?: string;
    disabled?: boolean;
    className?: string;
    /**
     * Optional function that returns true when a given `H:i` candidate would
     * cause a scheduling conflict. Conflicting options are shown in red and
     * disabled in the dropdowns.
     */
    conflictCheck?: (candidateHi: string) => boolean;
};

export function ScheduleTimePicker({ label, labelId, value, onChange, error, disabled, className, conflictCheck }: ScheduleTimePickerProps) {
    const { hour12, minute, period } = parseHiToParts(value);

    const pushChange = (nextHour12: number, nextMinute: number, nextPeriod: 'AM' | 'PM') => {
        onChange(partsToHi(nextHour12, nextMinute, nextPeriod));
    };

    const minuteConflicts = (h: number, m: number, p: 'AM' | 'PM') =>
        conflictCheck ? conflictCheck(partsToHi(h, m, p)) : false;

    // An hour is fully blocked only when every one of its 12 minute slots conflicts.
    const hourFullyConflicts = (h: number) => MINUTE_OPTIONS.every((m) => minuteConflicts(h, m, period));

    return (
        <div className={cn('space-y-2', className)}>
            <Label htmlFor={labelId} className="font-serif">
                {label}
            </Label>
            <div className="flex flex-nowrap items-center gap-2">
                {/* Hour */}
                <Select
                    disabled={disabled}
                    value={String(hour12)}
                    onValueChange={(v) => pushChange(Number.parseInt(v, 10), minute, period)}
                >
                    <SelectTrigger id={labelId} className="h-10 w-[4.25rem] shrink-0 font-serif" aria-label={`${label} hour`}>
                        <SelectValue placeholder="Hr" />
                    </SelectTrigger>
                    <SelectContent>
                        {HOUR_OPTIONS.map((h) => {
                            const blocked = hourFullyConflicts(h);
                            return (
                                <SelectItem
                                    key={h}
                                    value={String(h)}
                                    disabled={blocked}
                                    className={cn('font-serif', blocked && 'text-destructive opacity-100')}
                                >
                                    {h}
                                </SelectItem>
                            );
                        })}
                    </SelectContent>
                </Select>

                <span className="text-muted-foreground shrink-0 select-none font-medium" aria-hidden>
                    :
                </span>

                {/* Minute */}
                <Select
                    disabled={disabled}
                    value={String(minute).padStart(2, '0')}
                    onValueChange={(v) => pushChange(hour12, Number.parseInt(v, 10), period)}
                >
                    <SelectTrigger className="h-10 w-[4.25rem] shrink-0 font-serif" aria-label={`${label} minutes`}>
                        <SelectValue placeholder="Min" />
                    </SelectTrigger>
                    <SelectContent>
                        {MINUTE_OPTIONS.map((m) => {
                            const conflicts = minuteConflicts(hour12, m, period);
                            return (
                                <SelectItem
                                    key={m}
                                    value={String(m).padStart(2, '0')}
                                    disabled={conflicts}
                                    className={cn('font-serif', conflicts && 'text-destructive opacity-100')}
                                >
                                    {String(m).padStart(2, '0')}
                                </SelectItem>
                            );
                        })}
                    </SelectContent>
                </Select>

                {/* AM / PM single toggle */}
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={disabled}
                    className={cn(
                        'h-10 min-w-[3.25rem] shrink-0 px-3 font-serif text-sm font-semibold shadow-sm transition-colors',
                        period === 'AM' &&
                            'border-black bg-white text-black hover:bg-zinc-100 hover:text-black focus-visible:text-black active:text-black dark:border-zinc-200 dark:bg-zinc-50 dark:text-black dark:hover:bg-white dark:hover:text-black dark:focus-visible:text-black dark:active:text-black',
                        period === 'PM' &&
                            'border-black bg-black text-white hover:bg-zinc-900 hover:text-white focus-visible:text-white active:text-white dark:border-zinc-500 dark:bg-black dark:text-white dark:hover:bg-zinc-950 dark:hover:text-white dark:focus-visible:text-white dark:active:text-white',
                    )}
                    aria-label={`Toggle ${label} AM or PM`}
                    aria-pressed={period === 'PM'}
                    onClick={() => pushChange(hour12, minute, period === 'AM' ? 'PM' : 'AM')}
                >
                    {period}
                </Button>
            </div>
            <InputError message={error} />
        </div>
    );
}

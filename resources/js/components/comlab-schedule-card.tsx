import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { formatScheduleSectionLabel, formatScheduleTimeRange } from '@/lib/schedule-labels';
import {
    getComlabPreviewRows,
    getFirstUpcomingInOrder,
    getLocalTimeHi,
    getLocalWeekdayLong,
    isOngoingSchedule,
    sortSchedulesByWeekTime,
    type ScheduleTrackerRow,
} from '@/lib/schedule-tracker';
import { Clock, Menu, Monitor, User } from 'lucide-react';
import { useMemo, useState } from 'react';

export type ComlabCardOption = { id: number; name: string; campus?: string };

type ComlabScheduleCardProps<T extends ScheduleTrackerRow> = {
    comlab: ComlabCardOption;
    rows: T[];
    now: Date;
    /** When omitted, the card is read-only (no row actions menu). */
    onEdit?: (row: T) => void;
    onDelete?: (row: T) => void;
};

const scrollHide =
    'overflow-y-auto overscroll-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden';

export function ComlabScheduleCard<T extends ScheduleTrackerRow>({ comlab, rows, now, onEdit, onDelete }: ComlabScheduleCardProps<T>) {
    const [detailOpen, setDetailOpen] = useState(false);
    const showRowActions = onEdit !== undefined || onDelete !== undefined;

    const sorted = useMemo(() => sortSchedulesByWeekTime(rows), [rows]);
    const preview = useMemo(() => getComlabPreviewRows(rows, now, 3), [rows, now]);

    const ongoingInModal = useMemo(() => sorted.find((r) => isOngoingSchedule(r, now)) ?? null, [sorted, now]);
    const nextUpcomingInModal = useMemo(() => {
        if (ongoingInModal) {
            return null;
        }
        const direct = getFirstUpcomingInOrder(sorted, now);
        if (direct) {
            return direct;
        }
        const fallbackHead = getComlabPreviewRows(rows, now, 1);
        return fallbackHead[0] ?? null;
    }, [sorted, now, ongoingInModal, rows]);

    if (rows.length === 0) {
        return null;
    }

    const todayName = getLocalWeekdayLong(now);
    const timeHi = getLocalTimeHi(now);

    const openDetail = () => setDetailOpen(true);

    return (
        <>
            <section
                role="button"
                tabIndex={0}
                aria-label={`View all schedules for ${comlab.name}`}
                className="group/card overflow-hidden rounded-lg border bg-card shadow-sm outline-none ring-offset-background transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                onClick={openDetail}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openDetail();
                    }
                }}
            >
                <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-3 transition-colors group-hover/card:bg-muted/55">
                    <Monitor className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="font-serif text-sm font-semibold uppercase tracking-wide">{comlab.name}</span>
                    <span className="ml-auto rounded-full border px-2 py-0.5 font-serif text-xs text-muted-foreground">
                        {rows.length} {rows.length === 1 ? 'slot' : 'slots'}
                    </span>
                </div>

                <div className="flex flex-col divide-y divide-border">
                    {preview.map((row) => {
                        const ongoing = isOngoingSchedule(row, now);
                        const upcoming = !ongoing && row.day === todayName && row.start_time > timeHi;

                        return (
                            <div
                                key={row.id}
                                className={`relative flex flex-col gap-2 px-4 py-3 transition-colors ${
                                    ongoing ? 'bg-emerald-50/70 dark:bg-emerald-950/35' : 'bg-background group-hover/card:bg-muted/20'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex min-w-0 flex-col gap-0.5">
                                        {ongoing ? (
                                            <>
                                                <span className="inline-flex w-fit items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 font-serif text-[10px] font-bold uppercase tracking-wider text-white shadow-sm shadow-emerald-500/30">
                                                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                                                    Ongoing
                                                </span>
                                                <span className="font-serif text-[10px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
                                                    Current schedule
                                                </span>
                                            </>
                                        ) : upcoming ? (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/85 px-2 py-0.5 font-serif text-[10px] font-bold uppercase tracking-wider text-amber-950">
                                                Upcoming
                                            </span>
                                        ) : null}
                                    </div>

                                    {showRowActions ? (
                                        <div
                                            className="shrink-0"
                                            onClick={(e) => e.stopPropagation()}
                                            onPointerDown={(e) => e.stopPropagation()}
                                            onKeyDown={(e) => e.stopPropagation()}
                                        >
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        className="h-7 w-7 p-0"
                                                        aria-label="Open actions menu"
                                                    >
                                                        <Menu className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="min-w-[10rem]">
                                                    {onEdit ? (
                                                        <DropdownMenuItem
                                                            className="font-serif"
                                                            onClick={() => {
                                                                setDetailOpen(false);
                                                                onEdit(row);
                                                            }}
                                                        >
                                                            Edit
                                                        </DropdownMenuItem>
                                                    ) : null}
                                                    {onDelete ? (
                                                        <DropdownMenuItem
                                                            className="font-serif text-destructive focus:text-destructive"
                                                            onClick={() => {
                                                                setDetailOpen(false);
                                                                onDelete(row);
                                                            }}
                                                        >
                                                            Delete
                                                        </DropdownMenuItem>
                                                    ) : null}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    ) : null}
                                </div>

                                <p className="truncate font-serif text-sm font-semibold leading-snug">{row.subject_label ?? '—'}</p>

                                <div className="flex flex-col gap-1">
                                    <span className="flex items-center gap-1.5 font-serif text-xs text-muted-foreground">
                                        <User className="h-3 w-3 shrink-0" aria-hidden />
                                        <span className="min-w-0 truncate">
                                            {row.teacher_name ?? '—'} &mdash; {formatScheduleSectionLabel(row.section_name)}
                                        </span>
                                    </span>
                                    <span className="flex items-center gap-1.5 font-serif text-xs text-muted-foreground">
                                        <Clock className="h-3 w-3 shrink-0" aria-hidden />
                                        {row.day} &bull; {formatScheduleTimeRange(row.start_time, row.end_time)}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="border-t border-border/60 bg-muted/15 px-4 py-2 text-center">
                    <span className="font-serif text-[10px] font-medium uppercase tracking-wider text-muted-foreground transition group-hover/card:text-primary/80">
                        Tap to view full week
                    </span>
                </div>
            </section>

            <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
                <DialogContent className="flex max-h-[min(92vh,calc(100dvh-1rem))] w-[calc(100vw-2rem)] max-w-lg flex-col gap-0 overflow-hidden p-0 sm:w-full">
                    <DialogHeader className="shrink-0 border-b border-border/60 px-6 pb-4 pt-6 pr-12">
                        <DialogTitle className="font-serif">{comlab.name}</DialogTitle>
                        <DialogDescription>All schedule slots for this laboratory, in weekly order.</DialogDescription>
                    </DialogHeader>

                    <div className={`min-h-0 flex-1 ${scrollHide} px-6 py-4`}>
                        <ul className="flex flex-col gap-3">
                            {sorted.map((row) => {
                                const ongoing = isOngoingSchedule(row, now);
                                const subtleNext = !ongoingInModal && nextUpcomingInModal?.id === row.id;

                                return (
                                    <li
                                        key={row.id}
                                        className={`rounded-lg border p-4 transition-colors ${
                                            ongoing
                                                ? 'border-emerald-500/70 bg-emerald-50/90 shadow-[0_0_0_1px_rgba(16,185,129,0.25)] dark:border-emerald-400/50 dark:bg-emerald-950/40 dark:shadow-[0_0_18px_-4px_rgba(52,211,153,0.35)]'
                                                : subtleNext
                                                  ? 'border-primary/25 bg-primary/5 ring-1 ring-primary/15'
                                                  : 'border-border/80 bg-card hover:bg-muted/25'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex flex-wrap items-center gap-2">
                                                {ongoing ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 font-serif text-[10px] font-bold uppercase tracking-wider text-white">
                                                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                                                        Ongoing
                                                    </span>
                                                ) : subtleNext ? (
                                                    <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 font-serif text-[10px] font-semibold uppercase tracking-wide text-primary">
                                                        Next up
                                                    </span>
                                                ) : null}
                                            </div>
                                            {showRowActions ? (
                                                <div
                                                    className="shrink-0"
                                                    onClick={(e) => e.stopPropagation()}
                                                    onPointerDown={(e) => e.stopPropagation()}
                                                >
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="Row actions">
                                                                <Menu className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="min-w-[10rem]">
                                                            {onEdit ? (
                                                                <DropdownMenuItem
                                                                    className="font-serif"
                                                                    onClick={() => {
                                                                        setDetailOpen(false);
                                                                        onEdit(row);
                                                                    }}
                                                                >
                                                                    Edit
                                                                </DropdownMenuItem>
                                                            ) : null}
                                                            {onDelete ? (
                                                                <DropdownMenuItem
                                                                    className="font-serif text-destructive focus:text-destructive"
                                                                    onClick={() => {
                                                                        setDetailOpen(false);
                                                                        onDelete(row);
                                                                    }}
                                                                >
                                                                    Delete
                                                                </DropdownMenuItem>
                                                            ) : null}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            ) : null}
                                        </div>
                                        <p className="mt-2 font-serif text-sm font-semibold leading-snug">{row.subject_label ?? '—'}</p>
                                        <div className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1.5 font-serif">
                                                <User className="h-3 w-3 shrink-0" aria-hidden />
                                                {row.teacher_name ?? '—'} &mdash; {formatScheduleSectionLabel(row.section_name)}
                                            </span>
                                            <span className="flex items-center gap-1.5 font-serif">
                                                <Clock className="h-3 w-3 shrink-0" aria-hidden />
                                                {row.day} &bull; {formatScheduleTimeRange(row.start_time, row.end_time)}
                                            </span>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}

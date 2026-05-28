/**
 * Recurring-week schedule helpers for comlab cards (local timezone, no UTC conversion).
 * Times are "HH:MM" strings comparable lexicographically when lengths match.
 */

export const SCHEDULE_WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

export type ScheduleWeekday = (typeof SCHEDULE_WEEKDAYS)[number];

export type ScheduleTrackerRow = {
    id: number;
    day: string;
    start_time: string;
    end_time: string;
    section_name: string | null;
    subject_label: string | null;
    teacher_name: string | null;
};

function pad2(n: number): string {
    return String(n).padStart(2, '0');
}

/** Current local time as "HH:MM" for comparison with schedule strings. */
export function getLocalTimeHi(now: Date): string {
    return `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
}

/** English full weekday name, matching backend schedule `day` values. */
export function getLocalWeekdayLong(now: Date): string {
    return now.toLocaleDateString('en-US', { weekday: 'long' });
}

export function dayIndex(day: string): number {
    return SCHEDULE_WEEKDAYS.indexOf(day as ScheduleWeekday);
}

/** Sort Mon → Sun, then by start_time. Unknown days sort last. */
export function sortSchedulesByWeekTime<T extends ScheduleTrackerRow>(rows: T[]): T[] {
    return [...rows].sort((a, b) => {
        const da = dayIndex(a.day);
        const db = dayIndex(b.day);
        const safeA = da === -1 ? 99 : da;
        const safeB = db === -1 ? 99 : db;
        if (safeA !== safeB) {
            return safeA - safeB;
        }
        return a.start_time.localeCompare(b.start_time);
    });
}

export function isOngoingSchedule<T extends ScheduleTrackerRow>(row: T, now: Date): boolean {
    const today = getLocalWeekdayLong(now);
    const hi = getLocalTimeHi(now);
    return row.day === today && row.start_time <= hi && row.end_time > hi;
}

/**
 * True if slot `a` starts at or after slot `b` ends (same recurring week, Mon..Sun order).
 */
export function isSlotAfter<T extends ScheduleTrackerRow>(a: T, b: T): boolean {
    const ai = dayIndex(a.day);
    const bi = dayIndex(b.day);
    if (ai === -1 || bi === -1) {
        return a.start_time.localeCompare(b.end_time) > 0;
    }
    if (ai !== bi) {
        return ai > bi;
    }
    return a.start_time >= b.end_time;
}

/**
 * Rows that start later in the same Mon–Sun week than `now` (not ongoing).
 * Days before "today" in the week are treated as already past; after Sunday,
 * {@link getFallbackEarliestNextCycle} supplies Mon… slots.
 */
export function getFutureRowsThisWeek<T extends ScheduleTrackerRow>(rowsSorted: T[], now: Date): T[] {
    const today = getLocalWeekdayLong(now);
    const hi = getLocalTimeHi(now);
    const ti = dayIndex(today);
    if (ti === -1) {
        return rowsSorted;
    }
    return rowsSorted.filter((r) => {
        const ri = dayIndex(r.day);
        if (ri === -1) {
            return false;
        }
        if (ri > ti) {
            return true;
        }
        if (ri < ti) {
            return false;
        }
        return r.start_time > hi;
    });
}

/**
 * Walk forward from tomorrow (wrapping), collect up to `limit` rows in day/time order.
 */
export function getFallbackEarliestNextCycle<T extends ScheduleTrackerRow>(rowsSorted: T[], now: Date, limit: number): T[] {
    const ti = dayIndex(getLocalWeekdayLong(now));
    if (ti === -1) {
        return rowsSorted.slice(0, limit);
    }
    const out: T[] = [];
    for (let offset = 1; offset <= 7 && out.length < limit; offset++) {
        const dIdx = (ti + offset) % 7;
        const dayName = SCHEDULE_WEEKDAYS[dIdx];
        const forDay = rowsSorted.filter((r) => r.day === dayName);
        for (const r of forDay) {
            out.push(r);
            if (out.length >= limit) {
                break;
            }
        }
    }
    return out;
}

const DEFAULT_PREVIEW = 3;

/**
 * Smart preview: ongoing + next upcoming, or next upcoming only, or next-cycle fallback (never empty when rows exist).
 */
export function getComlabPreviewRows<T extends ScheduleTrackerRow>(rows: T[], now: Date, limit = DEFAULT_PREVIEW): T[] {
    if (rows.length === 0) {
        return [];
    }
    const sorted = sortSchedulesByWeekTime(rows);
    const ongoing = sorted.find((r) => isOngoingSchedule(r, now)) ?? null;

    if (ongoing) {
        const after = sorted.filter((r) => r.id !== ongoing.id && isSlotAfter(r, ongoing));
        return [ongoing, ...after.slice(0, limit - 1)];
    }

    const future = getFutureRowsThisWeek(sorted, now);
    if (future.length >= limit) {
        return future.slice(0, limit);
    }
    if (future.length > 0) {
        return future;
    }

    return getFallbackEarliestNextCycle(sorted, now, limit);
}

/** First upcoming row in chronological list, or null if none. */
export function getFirstUpcomingInOrder<T extends ScheduleTrackerRow>(rowsSorted: T[], now: Date): T | null {
    const future = getFutureRowsThisWeek(rowsSorted, now);
    return future[0] ?? null;
}

export const SCHEDULE_WEEKDAYS = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
] as const;

export type ScheduleWeekday = (typeof SCHEDULE_WEEKDAYS)[number];

export const SCHEDULE_DAY_GROUP_HINT = 'Creates the same slot on each day in this group.';

export const SCHEDULE_SINGLE_DAY_HINT = 'Creates one schedule for this day only.';

export const SCHEDULE_DAY_GROUPS = [
    {
        value: 'Monday-Thursday',
        label: 'Monday – Thursday',
        shortLabel: 'MTH',
        days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday'] as ScheduleWeekday[],
        hint: SCHEDULE_DAY_GROUP_HINT,
    },
    {
        value: 'Tuesday-Friday',
        label: 'Tuesday – Friday',
        shortLabel: 'TFRI',
        days: ['Tuesday', 'Wednesday', 'Thursday', 'Friday'] as ScheduleWeekday[],
        hint: SCHEDULE_DAY_GROUP_HINT,
    },
] as const;

export type ScheduleDayGroupValue = (typeof SCHEDULE_DAY_GROUPS)[number]['value'];

/** Single-day options for Add Schedule (all weekdays; order matches dropdown). */
export const SCHEDULE_SINGLE_DAY_OPTIONS: readonly ScheduleWeekday[] = [
    'Monday',
    'Tuesday',
    'Thursday',
    'Friday',
    'Wednesday',
    'Saturday',
    'Sunday',
];

export type ScheduleDayOptionValue = ScheduleDayGroupValue | ScheduleWeekday;

export const SCHEDULE_DAY_GROUP_VALUES: ScheduleDayGroupValue[] = SCHEDULE_DAY_GROUPS.map((g) => g.value);

export const SCHEDULE_ALLOWED_DAY_VALUES: ScheduleDayOptionValue[] = [
    ...SCHEDULE_DAY_GROUP_VALUES,
    ...SCHEDULE_WEEKDAYS,
];

export type ScheduleDaySelectOption = {
    value: string;
    label: string;
    hint?: string;
};

export type ScheduleDaySelectGroups = {
    groups: ScheduleDaySelectOption[];
    singles: ScheduleDaySelectOption[];
};

export function isScheduleDayGroup(value: string): value is ScheduleDayGroupValue {
    return (SCHEDULE_DAY_GROUP_VALUES as readonly string[]).includes(value);
}

export function getScheduleDayGroup(value: string) {
    return SCHEDULE_DAY_GROUPS.find((g) => g.value === value) ?? null;
}

/** Expand a form/API day value into concrete weekdays stored in the database. */
export function expandScheduleDays(day: string): ScheduleWeekday[] {
    const group = getScheduleDayGroup(day);
    if (group) {
        return [...group.days];
    }
    if ((SCHEDULE_WEEKDAYS as readonly string[]).includes(day)) {
        return [day as ScheduleWeekday];
    }
    return [];
}

export function getScheduleDaySelectGroups(): ScheduleDaySelectGroups {
    return {
        groups: SCHEDULE_DAY_GROUPS.map((g) => ({
            value: g.value,
            label: `${g.label} (${g.shortLabel})`,
            hint: g.hint,
        })),
        singles: SCHEDULE_SINGLE_DAY_OPTIONS.map((d) => ({
            value: d,
            label: d,
            hint: SCHEDULE_SINGLE_DAY_HINT,
        })),
    };
}

/** Flat list (groups then singles) for non-grouped consumers. */
export function getScheduleDaySelectOptions(): ScheduleDaySelectOption[] {
    const { groups, singles } = getScheduleDaySelectGroups();
    return [...groups, ...singles];
}

export function getScheduleDayHelperText(day: string): string | null {
    const group = getScheduleDayGroup(day);
    if (group) {
        return group.hint;
    }
    if ((SCHEDULE_SINGLE_DAY_OPTIONS as readonly string[]).includes(day)) {
        return SCHEDULE_SINGLE_DAY_HINT;
    }
    return null;
}

/** @deprecated Use {@link getScheduleDayHelperText} */
export function getScheduleDayGroupHelperText(day: string): string | null {
    return getScheduleDayHelperText(day);
}

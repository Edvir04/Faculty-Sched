/** Parse `H:i` (24h) into 12-hour display parts. */
function parseHiTo12Parts(value: string): { hour12: number; minute: number; period: 'AM' | 'PM' } {
    if (!value || !/^\d{1,2}:\d{2}$/.test(value.trim())) {
        return { hour12: 12, minute: 0, period: 'AM' };
    }
    const [hRaw, mRaw] = value.trim().split(':');
    const hour24 = Number.parseInt(hRaw ?? '0', 10);
    const minute = Number.parseInt(mRaw ?? '0', 10);
    const period: 'AM' | 'PM' = hour24 >= 12 ? 'PM' : 'AM';
    let hour12 = hour24 % 12;
    if (hour12 === 0) {
        hour12 = 12;
    }
    return { hour12, minute: Number.isFinite(minute) ? minute : 0, period };
}

/**
 * Format a single `H:i` (24h) time for display, e.g. `8:00 AM`, `1:00 PM`.
 * Data and comparisons remain 24h; use this for UI only.
 */
export function formatHiTo12Hour(hi: string): string {
    const { hour12, minute, period } = parseHiTo12Parts(hi);
    const minuteStr = String(minute).padStart(2, '0');
    return `${hour12}:${minuteStr} ${period}`;
}

/**
 * Format a schedule slot range for display, e.g. `8:00 AM – 10:00 AM`.
 */
export function formatScheduleTimeRange(startHi: string, endHi: string): string {
    return `${formatHiTo12Hour(startHi)} – ${formatHiTo12Hour(endHi)}`;
}

export const NO_SECTION_ASSIGNED_LABEL = 'No section assigned to this schedule';

export const NO_COMLAB_ASSIGNED_LABEL = 'No comlab assigned to this schedule';

export const UNASSIGNED_COMLAB_GROUP_ID = 0;

export function formatScheduleSectionLabel(sectionName: string | null | undefined): string {
    if (sectionName == null || sectionName.trim() === '') {
        return NO_SECTION_ASSIGNED_LABEL;
    }

    return sectionName;
}

export function formatScheduleComlabLabel(comlabName: string | null | undefined): string {
    if (comlabName == null || comlabName.trim() === '') {
        return NO_COMLAB_ASSIGNED_LABEL;
    }

    return comlabName;
}

export type ComlabGroupOption = {
    id: number;
    name: string;
    campus?: string;
};

export type ScheduleWithComlabRef = {
    comlab_id: number | null;
    comlab_name: string | null;
    comlab_campus?: string | null;
};

/**
 * Group schedule rows under comlab cards. Rows with no comlab appear in an "unassigned" group.
 */
export function groupSchedulesByComlab<T extends ScheduleWithComlabRef>(
    schedules: T[],
    comlabs: ComlabGroupOption[],
): { comlab: ComlabGroupOption; rows: T[] }[] {
    const map = new Map<number, { comlab: ComlabGroupOption; rows: T[] }>();

    for (const comlab of comlabs) {
        map.set(comlab.id, { comlab, rows: [] });
    }

    for (const row of schedules) {
        if (row.comlab_id === null) {
            const key = UNASSIGNED_COMLAB_GROUP_ID;
            let entry = map.get(key);
            if (!entry) {
                entry = {
                    comlab: {
                        id: key,
                        name: NO_COMLAB_ASSIGNED_LABEL,
                    },
                    rows: [],
                };
                map.set(key, entry);
            }
            entry.rows.push(row);
            continue;
        }

        let entry = map.get(row.comlab_id);
        if (!entry) {
            entry = {
                comlab: {
                    id: row.comlab_id,
                    name: formatScheduleComlabLabel(row.comlab_name),
                    campus: row.comlab_campus ?? undefined,
                },
                rows: [],
            };
            map.set(row.comlab_id, entry);
        }
        entry.rows.push(row);
    }

    const fromComlabs = comlabs
        .map((comlab) => map.get(comlab.id))
        .filter((entry): entry is { comlab: ComlabGroupOption; rows: T[] } => entry !== undefined);

    const unassigned = map.get(UNASSIGNED_COMLAB_GROUP_ID);
    if (unassigned && unassigned.rows.length > 0) {
        return [...fromComlabs, unassigned];
    }

    return fromComlabs;
}

import { expandScheduleDays } from '@/lib/schedule-day-groups';

export type ScheduleRecordForValidation = {
    id: number;
    section_id: number | null;
    subject_id: number;
    teacher_id: number;
    comlab_id: number | null;
    day: string;
    start_time: string;
    end_time: string;
};

export type ScheduleFormFields = {
    section_id: string;
    subject_id: string;
    teacher_id: string;
    comlab_id: string;
    day: string;
    start_time: string;
    end_time: string;
};

export type ScheduleFieldErrors = Partial<Record<keyof ScheduleFormFields, string>>;

export type SectionForValidation = {
    id: number;
    year_level_id: number;
};

export type SubjectForValidation = {
    id: number;
    year_level_id: number | null;
};

export const SCHEDULE_REQUIRED_MESSAGES: Record<keyof ScheduleFormFields, string> = {
    section_id: 'The section field is required.',
    subject_id: 'The subject field is required.',
    teacher_id: 'The teacher field is required.',
    comlab_id: 'The comlab field is required.',
    day: 'The day field is required.',
    start_time: 'The start time field is required.',
    end_time: 'The end time field is required.',
};

export const SCHEDULE_END_AFTER_START_MESSAGE = 'The end time must be after the start time.';

export const SCHEDULE_OVERLAP_COMLAB_MESSAGE =
    'This time slot overlaps with an existing schedule for this comlab and day.';

export const SCHEDULE_OVERLAP_TEACHER_MESSAGE =
    'This time slot overlaps with an existing schedule for this teacher and day.';

export const SCHEDULE_OVERLAP_SECTION_MESSAGE =
    'This time slot overlaps with an existing schedule for this section and day.';

export const SCHEDULE_SUBJECT_YEAR_LEVEL_MESSAGE =
    'The selected subject must belong to the same year level as the selected section.';

export const CLIENT_SCHEDULE_VALIDATION_MESSAGES = [
    ...Object.values(SCHEDULE_REQUIRED_MESSAGES),
    SCHEDULE_END_AFTER_START_MESSAGE,
    SCHEDULE_OVERLAP_COMLAB_MESSAGE,
    SCHEDULE_OVERLAP_TEACHER_MESSAGE,
    SCHEDULE_OVERLAP_SECTION_MESSAGE,
    SCHEDULE_SUBJECT_YEAR_LEVEL_MESSAGE,
] as const;

type OverlapColumn = 'comlab_id' | 'teacher_id' | 'section_id';

const OVERLAP_MESSAGES: Record<OverlapColumn, string> = {
    comlab_id: SCHEDULE_OVERLAP_COMLAB_MESSAGE,
    teacher_id: SCHEDULE_OVERLAP_TEACHER_MESSAGE,
    section_id: SCHEDULE_OVERLAP_SECTION_MESSAGE,
};

export type ScheduleValidationMode = 'live' | 'submit';

export type GetScheduleFormErrorsParams = {
    schedules: ScheduleRecordForValidation[];
    sections: SectionForValidation[];
    subjects: SubjectForValidation[];
    form: ScheduleFormFields;
    excludeId?: number | null;
    mode?: ScheduleValidationMode;
};

/**
 * True when another schedule overlaps the window on the same day and foreign key.
 * Overlap: newStart < existingEnd AND newEnd > existingStart.
 */
export function scheduleTimeOverlaps(
    schedules: ScheduleRecordForValidation[],
    params: {
        column: OverlapColumn;
        id: number;
        day: string;
        start: string;
        end: string;
    },
    excludeId?: number | null,
): boolean {
    if (params.id <= 0 || !params.day || !params.start || !params.end) {
        return false;
    }

    return schedules.some((row) => {
        if (row.id === excludeId || row.day !== params.day) {
            return false;
        }

        const rowValue = row[params.column];
        if (rowValue === null || rowValue !== params.id) {
            return false;
        }

        return params.start < row.end_time && params.end > row.start_time;
    });
}

/** Start falls inside an existing slot (picker start conflict semantics). */
export function scheduleStartInsideExistingSlot(
    schedules: ScheduleRecordForValidation[],
    params: {
        column: OverlapColumn;
        id: number;
        day: string;
        start: string;
    },
    excludeId?: number | null,
): boolean {
    if (params.id <= 0 || !params.day || !params.start) {
        return false;
    }

    return schedules.some((row) => {
        if (row.id === excludeId || row.day !== params.day) {
            return false;
        }

        const rowValue = row[params.column];
        if (rowValue === null || rowValue !== params.id) {
            return false;
        }

        return params.start >= row.start_time && params.start < row.end_time;
    });
}

function parsePositiveInt(value: string): number | null {
    const id = Number.parseInt(value, 10);
    return Number.isFinite(id) && id > 0 ? id : null;
}

function subjectMatchesSectionYearLevel(
    sections: SectionForValidation[],
    subjects: SubjectForValidation[],
    sectionIdStr: string,
    subjectIdStr: string,
): boolean {
    const sectionId = parsePositiveInt(sectionIdStr);
    const subjectId = parsePositiveInt(subjectIdStr);
    if (sectionId === null || subjectId === null) {
        return true;
    }

    const section = sections.find((s) => s.id === sectionId);
    const subject = subjects.find((s) => s.id === subjectId);
    if (!section || !subject || subject.year_level_id === null) {
        return true;
    }

    return subject.year_level_id === section.year_level_id;
}

function resolveOverlapError(
    schedules: ScheduleRecordForValidation[],
    form: ScheduleFormFields,
    excludeId?: number | null,
): string | null {
    const { day, start_time, end_time } = form;
    if (!day || !start_time) {
        return null;
    }

    const days = expandScheduleDays(day);
    if (days.length === 0) {
        return null;
    }

    const comlabId = parsePositiveInt(form.comlab_id);
    const teacherId = parsePositiveInt(form.teacher_id);
    const sectionId = parsePositiveInt(form.section_id);

    const columns: { column: OverlapColumn; id: number | null }[] = [
        { column: 'comlab_id', id: comlabId },
        { column: 'teacher_id', id: teacherId },
        { column: 'section_id', id: sectionId },
    ];

    for (const concreteDay of days) {
        if (end_time) {
            for (const { column, id } of columns) {
                if (id === null) {
                    continue;
                }
                if (
                    scheduleTimeOverlaps(
                        schedules,
                        { column, id, day: concreteDay, start: start_time, end: end_time },
                        excludeId,
                    )
                ) {
                    return OVERLAP_MESSAGES[column];
                }
            }
            continue;
        }

        for (const { column, id } of columns) {
            if (id === null) {
                continue;
            }
            if (
                scheduleStartInsideExistingSlot(
                    schedules,
                    { column, id, day: concreteDay, start: start_time },
                    excludeId,
                )
            ) {
                return OVERLAP_MESSAGES[column];
            }
        }
    }

    return null;
}

export function getScheduleFormErrors({
    schedules,
    sections,
    subjects,
    form,
    excludeId = null,
    mode = 'live',
}: GetScheduleFormErrorsParams): ScheduleFieldErrors {
    const errors: ScheduleFieldErrors = {};
    const isSubmit = mode === 'submit';

    const fields: (keyof ScheduleFormFields)[] = [
        'section_id',
        'subject_id',
        'teacher_id',
        'comlab_id',
        'day',
        'start_time',
        'end_time',
    ];

    for (const field of fields) {
        if (isSubmit && !form[field].trim()) {
            errors[field] = SCHEDULE_REQUIRED_MESSAGES[field];
        }
    }

    if (form.start_time && form.end_time && form.end_time <= form.start_time) {
        errors.end_time = SCHEDULE_END_AFTER_START_MESSAGE;
    }

    if (form.section_id && form.subject_id && !subjectMatchesSectionYearLevel(sections, subjects, form.section_id, form.subject_id)) {
        errors.subject_id = SCHEDULE_SUBJECT_YEAR_LEVEL_MESSAGE;
    }

    const overlapError = resolveOverlapError(schedules, form, excludeId);
    if (overlapError) {
        errors.start_time = overlapError;
    }

    return errors;
}

export function isKnownClientScheduleValidationMessage(message: string | undefined): boolean {
    if (!message) {
        return false;
    }
    return (CLIENT_SCHEDULE_VALIDATION_MESSAGES as readonly string[]).includes(message);
}

export function hasScheduleFormErrors(errors: ScheduleFieldErrors): boolean {
    return Object.keys(errors).length > 0;
}

export type TeacherScheduleAssignment = {
    schedule_id: number;
    teacher_id: number;
    teacher_name: string;
    subject_id: number;
    subject_label: string;
    day: string;
    start_time: string;
    end_time: string;
    section_name: string | null;
    comlab_name: string | null;
};

export type TeacherOption = {
    id: number;
    name: string;
};

export type ScheduleConflictRow = {
    schedule_id: number;
    teacher_id: number;
    day: string;
    start_time: string;
    end_time: string;
};

/**
 * Overlap rule (matches ScheduleController):
 * newStart < existingEnd && newEnd > existingStart
 */
export function hasScheduleConflict(
    candidateTeacherId: number,
    targetSchedule: Pick<ScheduleConflictRow, 'schedule_id' | 'day' | 'start_time' | 'end_time'>,
    allSchedules: ScheduleConflictRow[],
): boolean {
    return allSchedules.some((existing) => {
        if (existing.schedule_id === targetSchedule.schedule_id) {
            return false;
        }
        if (existing.teacher_id !== candidateTeacherId) {
            return false;
        }
        if (existing.day !== targetSchedule.day) {
            return false;
        }

        return targetSchedule.start_time < existing.end_time && targetSchedule.end_time > existing.start_time;
    });
}

export function getAvailableTeachersForSchedule(
    targetSchedule: TeacherScheduleAssignment,
    allSchedules: ScheduleConflictRow[],
    teacherOptions: TeacherOption[],
    selectedTeacherId?: number,
): TeacherOption[] {
    return teacherOptions.filter((teacher) => {
        if (teacher.id === targetSchedule.teacher_id) {
            return true;
        }

        if (selectedTeacherId !== undefined && teacher.id === selectedTeacherId) {
            return true;
        }

        return !hasScheduleConflict(teacher.id, targetSchedule, allSchedules);
    });
}

type ScheduleConflictTarget = Pick<ScheduleConflictRow, 'schedule_id' | 'day' | 'start_time' | 'end_time'>;

/** Replacement professors for delete flow (excludes the teacher being deleted). */
export function getAvailableReplacementTeachers(
    assignment: ScheduleConflictTarget,
    allSchedules: ScheduleConflictRow[],
    teacherOptions: TeacherOption[],
    excludeTeacherId: number,
    selectedReplacementId?: number,
): TeacherOption[] {
    return teacherOptions.filter((teacher) => {
        if (teacher.id === excludeTeacherId) {
            return false;
        }

        if (selectedReplacementId !== undefined && teacher.id === selectedReplacementId) {
            return true;
        }

        return !hasScheduleConflict(teacher.id, assignment, allSchedules);
    });
}

export function formatSubjectContext(assignment: Pick<TeacherSubjectAssignment, 'section_name' | 'comlab_name'>): string | null {
    const parts = [assignment.comlab_name, assignment.section_name].filter(Boolean);
    return parts.length > 0 ? parts.join(' · ') : null;
}

export function isDeleteReassignmentComplete(
    assignments: TeacherSubjectAssignment[],
    deleteAssignments: Record<number, string>,
    allSchedules: ScheduleConflictRow[],
    teacherOptions: TeacherOption[],
    excludeTeacherId: number,
): boolean {
    if (assignments.length === 0) {
        return true;
    }

    return assignments.every((assignment) => {
        const raw = deleteAssignments[assignment.schedule_id];
        if (!raw) {
            return false;
        }

        const replacementId = Number(raw);
        if (replacementId === excludeTeacherId || Number.isNaN(replacementId)) {
            return false;
        }

        const available = getAvailableReplacementTeachers(
            assignment,
            allSchedules,
            teacherOptions,
            excludeTeacherId,
            replacementId,
        );

        return available.some((teacher) => teacher.id === replacementId);
    });
}

export function formatScheduleLabel(assignment: TeacherScheduleAssignment): string {
    return `${assignment.day} ${assignment.start_time} – ${assignment.end_time}`;
}

export function formatScheduleContext(assignment: TeacherScheduleAssignment): string | null {
    const parts = [assignment.section_name, assignment.comlab_name].filter(Boolean);
    return parts.length > 0 ? parts.join(' · ') : null;
}

export type TeacherSubjectAssignment = {
    schedule_id: number;
    subject_name: string;
    subject_code: string | null;
    subject_label: string;
    day: string;
    start_time: string;
    end_time: string;
    comlab_name: string | null;
    section_name: string | null;
};

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

function daySortIndex(day: string): number {
    const index = DAY_ORDER.indexOf(day as (typeof DAY_ORDER)[number]);
    return index === -1 ? DAY_ORDER.length : index;
}

export function formatSchedule(day: string, start: string, end: string): string {
    return `${day} ${start} – ${end}`;
}

export function sortSubjectAssignments(assignments: TeacherSubjectAssignment[]): TeacherSubjectAssignment[] {
    return [...assignments].sort((a, b) => {
        const dayCompare = daySortIndex(a.day) - daySortIndex(b.day);
        if (dayCompare !== 0) {
            return dayCompare;
        }

        const startCompare = a.start_time.localeCompare(b.start_time);
        if (startCompare !== 0) {
            return startCompare;
        }

        return a.subject_label.localeCompare(b.subject_label);
    });
}

export function subjectSummaryLabel(count: number): string {
    if (count === 1) {
        return 'View 1 subject';
    }

    return `View ${count} subjects`;
}

export type DeleteTeacherReassignmentPayload = {
    assignments: {
        schedule_id: number;
        teacher_id: number;
    }[];
};

const INVALID_REPLACEMENT_VALUES = new Set(['', 'undefined', 'null']);

/**
 * Build and validate delete reassignment payload at submit time.
 * Returns null when validation fails (caller should show an error and not submit).
 */
export function buildDeleteAssignmentsPayload(
    deletingTeacher: { id: number; subject_assignments: TeacherSubjectAssignment[] },
    deleteAssignments: Record<number, string>,
    teacherOptions: TeacherOption[],
): DeleteTeacherReassignmentPayload | null {
    if (deletingTeacher.subject_assignments.length === 0) {
        return { assignments: [] };
    }

    const validTeacherIds = new Set(teacherOptions.map((teacher) => teacher.id));
    const assignments: DeleteTeacherReassignmentPayload['assignments'] = [];

    for (const assignment of deletingTeacher.subject_assignments) {
        const raw = deleteAssignments[assignment.schedule_id];

        if (raw === undefined || INVALID_REPLACEMENT_VALUES.has(raw)) {
            return null;
        }

        const teacherId = Number(raw);

        if (!Number.isFinite(teacherId) || !Number.isInteger(teacherId) || teacherId <= 0) {
            return null;
        }

        if (teacherId === deletingTeacher.id) {
            return null;
        }

        if (!validTeacherIds.has(teacherId)) {
            return null;
        }

        assignments.push({
            schedule_id: assignment.schedule_id,
            teacher_id: teacherId,
        });
    }

    return { assignments };
}

export type DeletePayloadResult =
    | { valid: true; data: DeleteTeacherReassignmentPayload }
    | { valid: false; error: string };

/** Build delete payload with explicit valid/error result for submit flow. */
export function buildDeletePayload(
    deletingTeacher: { id: number; subject_assignments: TeacherSubjectAssignment[] },
    deleteAssignments: Record<number, string>,
    teacherOptions: TeacherOption[],
): DeletePayloadResult {
    const data = buildDeleteAssignmentsPayload(deletingTeacher, deleteAssignments, teacherOptions);

    if (!data) {
        return {
            valid: false,
            error: 'Select a valid replacement professor for every handled subject.',
        };
    }

    return { valid: true, data };
}

/** Flatten Inertia/Laravel validation errors for the delete modal. */
export function resolveDeleteError(errors: Record<string, string | string[]>): string {
    if (errors.assignments) {
        return Array.isArray(errors.assignments) ? errors.assignments.join(' ') : errors.assignments;
    }

    const assignmentMessages = Object.entries(errors)
        .filter(([key]) => key.startsWith('assignments.'))
        .flatMap(([, message]) => (Array.isArray(message) ? message : [message]));

    if (assignmentMessages.length > 0) {
        return assignmentMessages.join(' ');
    }

    const first = Object.values(errors)[0];
    if (first) {
        return Array.isArray(first) ? first.join(' ') : first;
    }

    return 'Could not delete professor. Please try again.';
}

export function groupAssignmentsByTeacher(
    assignments: TeacherScheduleAssignment[],
): Map<number, TeacherScheduleAssignment[]> {
    const grouped = new Map<number, TeacherScheduleAssignment[]>();

    for (const assignment of assignments) {
        const list = grouped.get(assignment.teacher_id) ?? [];
        list.push(assignment);
        grouped.set(assignment.teacher_id, list);
    }

    return grouped;
}

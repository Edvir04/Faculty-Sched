export const DUPLICATE_TEACHER_NAME_MESSAGE = 'A teacher with this name already exists.';

export type TeacherRecordForValidation = {
    id: number;
    teacher_name: string;
};

type FormWithFieldErrors = {
    errors: Partial<Record<string, string>>;
    setError: (field: string, message: string) => void;
    clearErrors: (...fields: string[]) => void;
};

function clearClientDuplicateError(form: FormWithFieldErrors, field: string, message: string): void {
    if (form.errors[field] === message) {
        form.clearErrors(field);
    }
}

export function normalizeTeacherName(value: string): string {
    return value.trim().toLowerCase();
}

export function findDuplicateTeacher(
    teachers: TeacherRecordForValidation[],
    teacherName: string,
    excludeId?: number,
): boolean {
    const normalized = normalizeTeacherName(teacherName);
    if (!normalized) {
        return false;
    }

    return teachers.some(
        (teacher) =>
            teacher.id !== excludeId && normalizeTeacherName(teacher.teacher_name) === normalized,
    );
}

export function syncTeacherNameDuplicateError(
    form: FormWithFieldErrors,
    teachers: TeacherRecordForValidation[],
    teacherName: string,
    excludeId?: number,
): void {
    if (findDuplicateTeacher(teachers, teacherName, excludeId)) {
        form.setError('teacher_name', DUPLICATE_TEACHER_NAME_MESSAGE);
        return;
    }

    clearClientDuplicateError(form, 'teacher_name', DUPLICATE_TEACHER_NAME_MESSAGE);
}

export function hasTeacherDuplicate(
    teachers: TeacherRecordForValidation[],
    teacherName: string,
    excludeId?: number,
): boolean {
    return findDuplicateTeacher(teachers, teacherName, excludeId);
}

export function hasTeacherNameDuplicateError(form: FormWithFieldErrors): boolean {
    return form.errors.teacher_name === DUPLICATE_TEACHER_NAME_MESSAGE;
}

import { normalizeScopedName } from '@/lib/sections-comlabs-duplicate-validation';
import {
    normalizeSubjectCode,
    normalizeSubjectName,
    type SubjectFormFields,
} from '@/lib/subject-duplicate-validation';
import { normalizeTeacherName } from '@/lib/teacher-duplicate-validation';

export const DEFAULT_CURRICULUM_DUPLICATE_TEACHER_MESSAGE =
    'This professor is already included in the default curriculum.';
export const DEFAULT_CURRICULUM_DUPLICATE_COMLAB_MESSAGE =
    'This comlab is already included in the default curriculum.';
export const DEFAULT_CURRICULUM_DUPLICATE_SUBJECT_CODE_MESSAGE =
    'This subject code is already included in the default curriculum.';
export const DEFAULT_CURRICULUM_DUPLICATE_SUBJECT_NAME_MESSAGE =
    'This subject name is already included in the default curriculum for this semester and year level.';

const DEFAULT_CURRICULUM_MESSAGES = [
    DEFAULT_CURRICULUM_DUPLICATE_TEACHER_MESSAGE,
    DEFAULT_CURRICULUM_DUPLICATE_COMLAB_MESSAGE,
    DEFAULT_CURRICULUM_DUPLICATE_SUBJECT_CODE_MESSAGE,
    DEFAULT_CURRICULUM_DUPLICATE_SUBJECT_NAME_MESSAGE,
] as const;

export type DefaultTeacherRecordForValidation = {
    id: number;
    teacher_name: string;
};

export type DefaultComlabRecordForValidation = {
    id: number;
    comlab_name: string;
    campus: string;
};

export type DefaultSubjectRecordForValidation = {
    id: number;
    subject_code: string;
    subject_name: string;
    semester_id: number;
    year_level_id: number;
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

export function findDuplicateDefaultTeacher(
    teachers: DefaultTeacherRecordForValidation[],
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

export function findDuplicateDefaultComlab(
    comlabs: DefaultComlabRecordForValidation[],
    comlabName: string,
    campus: string,
    excludeId?: number,
): boolean {
    const normalized = normalizeScopedName(comlabName);
    const normalizedCampus = campus.trim();
    if (!normalized || normalizedCampus === '') {
        return false;
    }

    return comlabs.some(
        (comlab) =>
            comlab.id !== excludeId &&
            normalizeScopedName(comlab.comlab_name) === normalized &&
            comlab.campus.trim() === normalizedCampus,
    );
}

export function findDuplicateDefaultSubjectCode(
    subjects: DefaultSubjectRecordForValidation[],
    subjectCode: string,
    excludeId?: number,
): boolean {
    const normalized = normalizeSubjectCode(subjectCode);
    if (!normalized) {
        return false;
    }

    return subjects.some(
        (subject) =>
            subject.id !== excludeId && normalizeSubjectCode(subject.subject_code) === normalized,
    );
}

export function findDuplicateDefaultSubjectName(
    subjects: DefaultSubjectRecordForValidation[],
    subjectName: string,
    semesterId: string,
    yearLevelId: string,
    excludeId?: number,
): boolean {
    const normalized = normalizeSubjectName(subjectName);
    if (!normalized || !semesterId || !yearLevelId) {
        return false;
    }

    return subjects.some(
        (subject) =>
            subject.id !== excludeId &&
            String(subject.semester_id) === semesterId &&
            String(subject.year_level_id) === yearLevelId &&
            normalizeSubjectName(subject.subject_name) === normalized,
    );
}

export function syncDefaultTeacherNameDuplicateError(
    form: FormWithFieldErrors,
    defaultTeachers: DefaultTeacherRecordForValidation[],
    teacherName: string,
    isDefault: boolean,
    excludeId?: number,
): void {
    if (!isDefault) {
        clearClientDuplicateError(form, 'teacher_name', DEFAULT_CURRICULUM_DUPLICATE_TEACHER_MESSAGE);
        return;
    }

    if (findDuplicateDefaultTeacher(defaultTeachers, teacherName, excludeId)) {
        form.setError('teacher_name', DEFAULT_CURRICULUM_DUPLICATE_TEACHER_MESSAGE);
        return;
    }

    clearClientDuplicateError(form, 'teacher_name', DEFAULT_CURRICULUM_DUPLICATE_TEACHER_MESSAGE);
}

export function syncDefaultComlabNameDuplicateError(
    form: FormWithFieldErrors,
    defaultComlabs: DefaultComlabRecordForValidation[],
    comlabName: string,
    campus: string,
    isDefault: boolean,
    excludeId?: number,
): void {
    if (!isDefault) {
        clearClientDuplicateError(form, 'comlab_name', DEFAULT_CURRICULUM_DUPLICATE_COMLAB_MESSAGE);
        return;
    }

    if (findDuplicateDefaultComlab(defaultComlabs, comlabName, campus, excludeId)) {
        form.setError('comlab_name', DEFAULT_CURRICULUM_DUPLICATE_COMLAB_MESSAGE);
        return;
    }

    clearClientDuplicateError(form, 'comlab_name', DEFAULT_CURRICULUM_DUPLICATE_COMLAB_MESSAGE);
}

export function getDefaultSubjectDuplicateErrors(
    defaultSubjects: DefaultSubjectRecordForValidation[],
    fields: SubjectFormFields,
    isDefault: boolean,
    excludeId?: number,
): Partial<Record<'subject_code' | 'subject_name', string>> {
    if (!isDefault) {
        return {};
    }

    const errors: Partial<Record<'subject_code' | 'subject_name', string>> = {};

    if (findDuplicateDefaultSubjectCode(defaultSubjects, fields.subject_code, excludeId)) {
        errors.subject_code = DEFAULT_CURRICULUM_DUPLICATE_SUBJECT_CODE_MESSAGE;
    }

    if (
        findDuplicateDefaultSubjectName(
            defaultSubjects,
            fields.subject_name,
            fields.semester_id,
            fields.year_level_id,
            excludeId,
        )
    ) {
        errors.subject_name = DEFAULT_CURRICULUM_DUPLICATE_SUBJECT_NAME_MESSAGE;
    }

    return errors;
}

export function syncDefaultSubjectDuplicateErrors(
    form: FormWithFieldErrors,
    defaultSubjects: DefaultSubjectRecordForValidation[],
    fields: SubjectFormFields,
    isDefault: boolean,
    excludeId?: number,
): void {
    clearClientDuplicateError(form, 'subject_code', DEFAULT_CURRICULUM_DUPLICATE_SUBJECT_CODE_MESSAGE);
    clearClientDuplicateError(form, 'subject_name', DEFAULT_CURRICULUM_DUPLICATE_SUBJECT_NAME_MESSAGE);

    const errors = getDefaultSubjectDuplicateErrors(defaultSubjects, fields, isDefault, excludeId);

    if (errors.subject_code) {
        form.setError('subject_code', errors.subject_code);
    }

    if (errors.subject_name) {
        form.setError('subject_name', errors.subject_name);
    }
}

export function hasDefaultCurriculumDuplicateError(
    errors: Partial<Record<string, string>>,
): boolean {
    return Object.values(errors).some(
        (message) =>
            message != null &&
            DEFAULT_CURRICULUM_MESSAGES.includes(message as (typeof DEFAULT_CURRICULUM_MESSAGES)[number]),
    );
}

export function hasDefaultTeacherDuplicate(
    defaultTeachers: DefaultTeacherRecordForValidation[],
    teacherName: string,
    isDefault: boolean,
    excludeId?: number,
): boolean {
    return isDefault && findDuplicateDefaultTeacher(defaultTeachers, teacherName, excludeId);
}

export function hasDefaultComlabDuplicate(
    defaultComlabs: DefaultComlabRecordForValidation[],
    comlabName: string,
    campus: string,
    isDefault: boolean,
    excludeId?: number,
): boolean {
    return isDefault && findDuplicateDefaultComlab(defaultComlabs, comlabName, campus, excludeId);
}

export function hasDefaultSubjectDuplicates(
    defaultSubjects: DefaultSubjectRecordForValidation[],
    fields: SubjectFormFields,
    isDefault: boolean,
    excludeId?: number,
): boolean {
    return Object.keys(getDefaultSubjectDuplicateErrors(defaultSubjects, fields, isDefault, excludeId)).length > 0;
}

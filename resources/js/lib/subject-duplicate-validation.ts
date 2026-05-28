export const DUPLICATE_SUBJECT_CODE_MESSAGE = 'This subject code is already in use.';
export const DUPLICATE_SUBJECT_NAME_MESSAGE =
    'This subject name is already used for this semester and year level.';
export const DUPLICATE_SUBJECT_ROW_MESSAGE = 'This subject already exists for this semester and year level.';

export type SubjectRecordForValidation = {
    id: number;
    subject_code: string;
    subject_name: string;
    semester_id: number;
    year_level_id: number;
};

export type SubjectFormFields = {
    subject_code: string;
    subject_name: string;
    semester_id: string;
    year_level_id: string;
};

export type SubjectDuplicateFieldErrors = Partial<Record<'subject_code' | 'subject_name', string>>;

type FormWithFieldErrors = {
    errors: Partial<Record<string, string>>;
    setError: (field: string, message: string) => void;
    clearErrors: (...fields: string[]) => void;
};

const CLIENT_DUPLICATE_MESSAGES = [
    DUPLICATE_SUBJECT_CODE_MESSAGE,
    DUPLICATE_SUBJECT_NAME_MESSAGE,
    DUPLICATE_SUBJECT_ROW_MESSAGE,
] as const;

export function normalizeSubjectCode(value: string): string {
    return value.trim().replace(/\s+/g, '').toLowerCase();
}

export function normalizeSubjectName(value: string): string {
    return value.trim().toLowerCase();
}

function subjectsInCurriculum(
    subjects: SubjectRecordForValidation[],
    excludeId?: number,
): SubjectRecordForValidation[] {
    return subjects.filter((subject) => subject.id !== excludeId);
}

function scopedSubjects(
    subjects: SubjectRecordForValidation[],
    semesterId: string,
    yearLevelId: string,
    excludeId?: number,
): SubjectRecordForValidation[] {
    if (!semesterId || !yearLevelId) {
        return [];
    }

    return subjects.filter(
        (subject) =>
            subject.id !== excludeId &&
            String(subject.semester_id) === semesterId &&
            String(subject.year_level_id) === yearLevelId,
    );
}

function findDuplicateSubjectCode(
    subjects: SubjectRecordForValidation[],
    subjectCode: string,
    excludeId?: number,
): boolean {
    const normalized = normalizeSubjectCode(subjectCode);
    if (!normalized) {
        return false;
    }

    return subjectsInCurriculum(subjects, excludeId).some(
        (subject) => normalizeSubjectCode(subject.subject_code) === normalized,
    );
}

function findDuplicateSubjectName(
    subjects: SubjectRecordForValidation[],
    subjectName: string,
    semesterId: string,
    yearLevelId: string,
    excludeId?: number,
): boolean {
    const normalized = normalizeSubjectName(subjectName);
    if (!normalized) {
        return false;
    }

    return scopedSubjects(subjects, semesterId, yearLevelId, excludeId).some(
        (subject) => normalizeSubjectName(subject.subject_name) === normalized,
    );
}

function findDuplicateSubjectRow(
    subjects: SubjectRecordForValidation[],
    fields: SubjectFormFields,
    excludeId?: number,
): boolean {
    const normalizedCode = normalizeSubjectCode(fields.subject_code);
    const normalizedName = normalizeSubjectName(fields.subject_name);
    if (!normalizedCode || !normalizedName || !fields.semester_id || !fields.year_level_id) {
        return false;
    }

    return scopedSubjects(subjects, fields.semester_id, fields.year_level_id, excludeId).some(
        (subject) =>
            normalizeSubjectCode(subject.subject_code) === normalizedCode &&
            normalizeSubjectName(subject.subject_name) === normalizedName,
    );
}

function clearClientDuplicateError(form: FormWithFieldErrors, field: string, message: string): void {
    if (form.errors[field] === message) {
        form.clearErrors(field);
    }
}

export function getSubjectDuplicateErrors(
    subjects: SubjectRecordForValidation[],
    fields: SubjectFormFields,
    excludeId?: number,
): SubjectDuplicateFieldErrors {
    const { subject_code, subject_name, semester_id, year_level_id } = fields;
    const errors: SubjectDuplicateFieldErrors = {};

    if (findDuplicateSubjectCode(subjects, subject_code, excludeId)) {
        errors.subject_code = DUPLICATE_SUBJECT_CODE_MESSAGE;
    }

    if (!semester_id || !year_level_id) {
        return errors;
    }

    const rowDuplicate = findDuplicateSubjectRow(subjects, fields, excludeId);
    const nameDuplicate = findDuplicateSubjectName(subjects, subject_name, semester_id, year_level_id, excludeId);

    if (rowDuplicate) {
        errors.subject_name = DUPLICATE_SUBJECT_ROW_MESSAGE;
    } else if (nameDuplicate) {
        errors.subject_name = DUPLICATE_SUBJECT_NAME_MESSAGE;
    }

    return errors;
}

export function syncSubjectDuplicateErrors(
    form: FormWithFieldErrors,
    subjects: SubjectRecordForValidation[],
    fields: SubjectFormFields,
    excludeId?: number,
): void {
    const duplicateErrors = getSubjectDuplicateErrors(subjects, fields, excludeId);

    clearClientDuplicateError(form, 'subject_code', DUPLICATE_SUBJECT_CODE_MESSAGE);
    clearClientDuplicateError(form, 'subject_name', DUPLICATE_SUBJECT_NAME_MESSAGE);
    clearClientDuplicateError(form, 'subject_name', DUPLICATE_SUBJECT_ROW_MESSAGE);

    if (duplicateErrors.subject_code) {
        form.setError('subject_code', duplicateErrors.subject_code);
    }

    if (duplicateErrors.subject_name) {
        form.setError('subject_name', duplicateErrors.subject_name);
    }
}

export function hasClientSubjectDuplicateErrors(errors: Partial<Record<string, string>>): boolean {
    return Object.values(errors).some(
        (message) => message != null && CLIENT_DUPLICATE_MESSAGES.includes(message as (typeof CLIENT_DUPLICATE_MESSAGES)[number]),
    );
}

export function hasSubjectDuplicates(
    subjects: SubjectRecordForValidation[],
    fields: SubjectFormFields,
    excludeId?: number,
): boolean {
    return Object.keys(getSubjectDuplicateErrors(subjects, fields, excludeId)).length > 0;
}

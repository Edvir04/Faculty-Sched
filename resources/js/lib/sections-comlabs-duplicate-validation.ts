export const DUPLICATE_COMLAB_NAME_MESSAGE = 'A room with this name already exists.';
export const DUPLICATE_SECTION_NAME_MESSAGE = 'A section with this name already exists for this year level.';

export type ComlabRecordForValidation = {
    id: number;
    comlab_name: string;
    campus: string;
};

export type SectionRecordForValidation = {
    id: number;
    section_name: string;
    year_level_id: number;
};

type FormWithFieldErrors = {
    errors: Partial<Record<string, string>>;
    setError: (field: string, message: string) => void;
    clearErrors: (...fields: string[]) => void;
};

/** Trim, remove all whitespace, and lowercase — matches server-side ComlabNormalization / SectionNormalization. */
export function normalizeScopedName(value: string): string {
    return value.trim().replace(/\s+/g, '').toLowerCase();
}

function clearClientDuplicateError(form: FormWithFieldErrors, field: string, message: string): void {
    if (form.errors[field] === message) {
        form.clearErrors(field);
    }
}

export function findDuplicateComlab(
    comlabs: ComlabRecordForValidation[],
    comlabName: string,
    excludeId?: number,
): boolean {
    const normalized = normalizeScopedName(comlabName);
    if (!normalized) {
        return false;
    }

    return comlabs.some(
        (comlab) => comlab.id !== excludeId && normalizeScopedName(comlab.comlab_name) === normalized,
    );
}

export function findDuplicateSection(
    sections: SectionRecordForValidation[],
    sectionName: string,
    yearLevelId: string,
    excludeId?: number,
): boolean {
    const normalized = normalizeScopedName(sectionName);
    if (!normalized || !yearLevelId) {
        return false;
    }

    return sections.some(
        (section) =>
            section.id !== excludeId &&
            String(section.year_level_id) === yearLevelId &&
            normalizeScopedName(section.section_name) === normalized,
    );
}

export function syncComlabNameDuplicateError(
    form: FormWithFieldErrors,
    comlabs: ComlabRecordForValidation[],
    comlabName: string,
    excludeId?: number,
): void {
    if (findDuplicateComlab(comlabs, comlabName, excludeId)) {
        form.setError('comlab_name', DUPLICATE_COMLAB_NAME_MESSAGE);
        return;
    }

    clearClientDuplicateError(form, 'comlab_name', DUPLICATE_COMLAB_NAME_MESSAGE);
}

export function syncSectionNameDuplicateError(
    form: FormWithFieldErrors,
    sections: SectionRecordForValidation[],
    sectionName: string,
    yearLevelId: string,
    excludeId?: number,
): void {
    if (findDuplicateSection(sections, sectionName, yearLevelId, excludeId)) {
        form.setError('section_name', DUPLICATE_SECTION_NAME_MESSAGE);
        return;
    }

    clearClientDuplicateError(form, 'section_name', DUPLICATE_SECTION_NAME_MESSAGE);
}

export function hasComlabDuplicate(
    comlabs: ComlabRecordForValidation[],
    comlabName: string,
    excludeId?: number,
): boolean {
    return findDuplicateComlab(comlabs, comlabName, excludeId);
}

export function hasSectionDuplicate(
    sections: SectionRecordForValidation[],
    sectionName: string,
    yearLevelId: string,
    excludeId?: number,
): boolean {
    return findDuplicateSection(sections, sectionName, yearLevelId, excludeId);
}

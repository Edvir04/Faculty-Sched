import { ComlabScheduleCard } from '@/components/comlab-schedule-card';
import { formatScheduleTimeRange, groupSchedulesByComlab } from '@/lib/schedule-labels';
import ActiveCurriculumSemesterBanner from '@/components/active-curriculum-semester-banner';
import { SchedulePrintModal } from '@/components/schedule-print-modal';
import InputError from '@/components/input-error';
import { ScheduleTimePicker } from '@/components/schedule-time-picker';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectSeparator,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import {
    expandScheduleDays,
    getScheduleDayHelperText,
    getScheduleDaySelectGroups,
    SCHEDULE_WEEKDAYS,
} from '@/lib/schedule-day-groups';
import {
    getScheduleFormErrors,
    hasScheduleFormErrors,
    type ScheduleFieldErrors,
    type ScheduleFormFields,
} from '@/lib/schedule-form-validation';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { Monitor, Plus, AlertTriangle, Printer } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Schedules',
        href: '/schedules',
    },
];

type SectionOption = {
    id: number;
    name: string;
    year_level_id: number;
};

type SubjectOption = {
    id: number;
    name: string;
    year_level_id: number | null;
};

type TeacherOption = { id: number; name: string };
type ComlabOption = { id: number; name: string; campus?: string };

type ScheduleRow = {
    id: number;
    section_id: number | null;
    subject_id: number;
    teacher_id: number;
    comlab_id: number | null;
    day: string;
    start_time: string;
    end_time: string;
    section_name: string | null;
    subject_code: string | null;
    subject_label: string | null;
    teacher_name: string | null;
    comlab_name: string | null;
    comlab_campus?: string | null;
};

type SchedulesPageProps = {
    schedules: ScheduleRow[];
    sections: SectionOption[];
    subjects: SubjectOption[];
    teachers: TeacherOption[];
    comlabs: ComlabOption[];
};

type SubjectSelectState = {
    disabled: boolean;
    placeholder: string;
    helperText: string | null;
};

type ScheduleFormData = {
    section_id: string;
    subject_id: string;
    teacher_id: string;
    comlab_id: string;
    day: string;
    start_time: string;
    end_time: string;
};

const emptyScheduleForm: ScheduleFormData = {
    section_id: '',
    subject_id: '',
    teacher_id: '',
    comlab_id: '',
    day: '',
    start_time: '',
    end_time: '',
};

function subjectsForSectionYearLevel(sections: SectionOption[], subjects: SubjectOption[], sectionIdStr: string): SubjectOption[] {
    if (!sectionIdStr) {
        return [];
    }
    const id = Number.parseInt(sectionIdStr, 10);
    if (!Number.isFinite(id)) {
        return [];
    }
    const section = sections.find((s) => s.id === id);
    if (!section) {
        return [];
    }
    return subjects.filter((sub) => sub.year_level_id !== null && sub.year_level_id === section.year_level_id);
}

function getSubjectSelectState(
    sectionIdStr: string,
    subjectsInSemester: SubjectOption[],
    filteredSubjects: SubjectOption[],
): SubjectSelectState {
    if (!sectionIdStr) {
        return {
            disabled: true,
            placeholder: 'Select a section first',
            helperText: null,
        };
    }

    if (subjectsInSemester.length === 0) {
        return {
            disabled: true,
            placeholder: 'No subjects in active semester',
            helperText: 'No subjects are available for this semester. Add subjects under the active curriculum semester first.',
        };
    }

    if (filteredSubjects.length === 0) {
        return {
            disabled: true,
            placeholder: 'No matching subjects',
            helperText: 'No subjects available for this section year level in the active semester.',
        };
    }

    return {
        disabled: false,
        placeholder: 'Select subject',
        helperText: null,
    };
}

// ─── Conflict detection helpers ───────────────────────────────────────────────

type TimeSlot = { start: string; end: string };

/**
 * Occupied slots for the selected comlab, teacher, or section on the same day
 * (union). Excludes the schedule row being edited when excludeId is set.
 */
function getMergedOccupiedSlots(
    schedules: ScheduleRow[],
    params: {
        comlabIdStr: string;
        teacherIdStr: string;
        sectionIdStr: string;
        day: string;
    },
    excludeId?: number | null,
): TimeSlot[] {
    const days = expandScheduleDays(params.day);
    if (days.length === 0) {
        return [];
    }
    const comlabId = Number.parseInt(params.comlabIdStr, 10);
    const teacherId = Number.parseInt(params.teacherIdStr, 10);
    const sectionId = Number.parseInt(params.sectionIdStr, 10);
    return schedules
        .filter((s) => {
            if (!days.includes(s.day as (typeof days)[number]) || s.id === excludeId) {
                return false;
            }
            if (Number.isFinite(comlabId) && s.comlab_id === comlabId) {
                return true;
            }
            if (Number.isFinite(teacherId) && s.teacher_id === teacherId) {
                return true;
            }
            if (Number.isFinite(sectionId) && s.section_id === sectionId) {
                return true;
            }
            return false;
        })
        .map((s) => ({ start: s.start_time, end: s.end_time }));
}

function humanizeCampusSlug(campus: string): string {
    if (!campus) {
        return campus;
    }
    return campus
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ');
}

function getComlabCampusFromOptions(comlabs: ComlabOption[], comlabIdStr: string): string | null {
    const id = Number.parseInt(comlabIdStr, 10);
    if (!Number.isFinite(id)) {
        return null;
    }
    return comlabs.find((c) => c.id === id)?.campus ?? null;
}

function resolveScheduleRowCampus(row: ScheduleRow, comlabs: ComlabOption[]): string | null {
    if (row.comlab_campus) {
        return row.comlab_campus;
    }
    if (row.comlab_id === null) {
        return null;
    }
    return getComlabCampusFromOptions(comlabs, String(row.comlab_id));
}

/**
 * Soft warning: nearest earlier/later schedule for the teacher on the same day
 * is on a different campus than the selected comlab. Does not block save.
 */
function buildCampusTransferMessage(
    schedules: ScheduleRow[],
    comlabs: ComlabOption[],
    params: {
        teacherIdStr: string;
        day: string;
        startStr: string;
        endStr: string;
        selectedComlabIdStr: string;
        excludeId?: number | null;
    },
): string | null {
    const teacherId = Number.parseInt(params.teacherIdStr, 10);
    if (!Number.isFinite(teacherId) || !params.day || !params.startStr || !params.endStr || !params.selectedComlabIdStr) {
        return null;
    }

    const selectedCampus = getComlabCampusFromOptions(comlabs, params.selectedComlabIdStr);
    if (!selectedCampus) {
        return null;
    }

    const sameDay = schedules
        .filter((s) => s.teacher_id === teacherId && s.day === params.day && s.id !== params.excludeId)
        .sort((a, b) => a.start_time.localeCompare(b.start_time));

    if (sameDay.length === 0) {
        return null;
    }

    let prev: ScheduleRow | null = null;
    for (const s of sameDay) {
        if (s.end_time <= params.startStr) {
            if (!prev || s.end_time > prev.end_time) {
                prev = s;
            }
        }
    }

    let next: ScheduleRow | null = null;
    for (const s of sameDay) {
        if (s.start_time >= params.endStr) {
            if (!next || s.start_time < next.start_time) {
                next = s;
            }
        }
    }

    const day = params.day;
    const selectedCampusLabel = humanizeCampusSlug(selectedCampus);
    const newSlotTime = formatScheduleTimeRange(params.startStr, params.endStr);

    const segments: string[] = [];
    if (prev) {
        const prevCampus = resolveScheduleRowCampus(prev, comlabs);
        if (prevCampus && prevCampus !== selectedCampus) {
            const prevTime = formatScheduleTimeRange(prev.start_time, prev.end_time);
            const prevCampusLabel = humanizeCampusSlug(prevCampus);
            const prevComlab = prev.comlab_name ?? 'comlab';
            segments.push(
                `This teacher has an earlier schedule on ${day} from ${prevTime} at ${prevCampusLabel} (${prevComlab}). The selected schedule is at ${selectedCampusLabel}. Please confirm that travel time is acceptable.`,
            );
        }
    }
    if (next) {
        const nextCampus = resolveScheduleRowCampus(next, comlabs);
        if (nextCampus && nextCampus !== selectedCampus) {
            const nextTime = formatScheduleTimeRange(next.start_time, next.end_time);
            const nextCampusLabel = humanizeCampusSlug(nextCampus);
            const nextComlab = next.comlab_name ?? 'comlab';
            segments.push(
                `This teacher has a later schedule on ${day} from ${nextTime} at ${nextCampusLabel} (${nextComlab}). The selected schedule is at ${selectedCampusLabel}. Please confirm that travel time is acceptable.`,
            );
        }
    }

    if (segments.length === 0) {
        return null;
    }

    return [`Your new schedule is ${day} ${newSlotTime} at ${selectedCampusLabel}.`, ...segments].join('\n\n');
}

function buildCampusTransferMessagesForDays(
    schedules: ScheduleRow[],
    comlabs: ComlabOption[],
    params: {
        teacherIdStr: string;
        day: string;
        startStr: string;
        endStr: string;
        selectedComlabIdStr: string;
        excludeId?: number | null;
    },
): string | null {
    const days = expandScheduleDays(params.day);
    const messages: string[] = [];
    for (const day of days) {
        const msg = buildCampusTransferMessage(schedules, comlabs, { ...params, day });
        if (msg) {
            messages.push(msg);
        }
    }

    if (messages.length === 0) {
        return null;
    }

    return messages.join('\n\n');
}

/**
 * Returns a function that is true when a candidate start time `H:i` falls
 * inside any existing occupied slot (start <= candidate < end).
 */
function makeStartConflictCheck(slots: TimeSlot[]): (candidate: string) => boolean {
    return (candidate) => slots.some((s) => candidate >= s.start && candidate < s.end);
}

/**
 * Returns a function that is true when placing [selectedStart, candidate] would
 * overlap any existing slot. Requires selectedStart to be non-empty and
 * candidate > selectedStart (otherwise no conflict is flagged).
 */
function makeEndConflictCheck(slots: TimeSlot[], selectedStart: string): (candidate: string) => boolean {
    return (candidate) => {
        if (!selectedStart || candidate <= selectedStart) return false;
        return slots.some((s) => selectedStart < s.end && candidate > s.start);
    };
}

export default function Schedules({
    schedules,
    sections,
    subjects,
    teachers,
    comlabs,
}: SchedulesPageProps) {
    const { activeCurriculumSemester, name: appName } = usePage<SharedData>().props;

    const [printOpen, setPrintOpen] = useState(false);
    const [printGeneratedAt, setPrintGeneratedAt] = useState(() => new Date());
    const [addOpen, setAddOpen] = useState(false);
    const addForm = useForm<ScheduleFormData>(emptyScheduleForm);

    const [editOpen, setEditOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const editingIdRef = useRef<number | null>(null);
    const [saving, setSaving] = useState(false);

    const editForm = useForm<ScheduleFormData>(emptyScheduleForm);

    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deletingRow, setDeletingRow] = useState<ScheduleRow | null>(null);
    const [deleteSubmitting, setDeleteSubmitting] = useState(false);

    const [campusWarningOpen, setCampusWarningOpen] = useState(false);
    const [campusWarningMessage, setCampusWarningMessage] = useState('');
    const bypassCampusWarningRef = useRef(false);
    const campusSubmitIsEditRef = useRef(false);

    const [addClientErrors, setAddClientErrors] = useState<ScheduleFieldErrors>({});
    const [editClientErrors, setEditClientErrors] = useState<ScheduleFieldErrors>({});

    const syncAddValidation = useCallback(
        (mode: 'live' | 'submit' = 'live', formSnapshot?: ScheduleFormFields) => {
            setAddClientErrors(
                getScheduleFormErrors({
                    schedules,
                    sections,
                    subjects,
                    form: formSnapshot ?? addForm.data,
                    excludeId: null,
                    mode,
                }),
            );
        },
        [schedules, sections, subjects, addForm.data],
    );

    const syncEditValidation = useCallback(
        (mode: 'live' | 'submit' = 'live', formSnapshot?: ScheduleFormFields) => {
            setEditClientErrors(
                getScheduleFormErrors({
                    schedules,
                    sections,
                    subjects,
                    form: formSnapshot ?? editForm.data,
                    excludeId: editingIdRef.current ?? editingId,
                    mode,
                }),
            );
        },
        [schedules, sections, subjects, editForm.data, editingId],
    );

    const resolveAddError = (field: keyof ScheduleFormFields): string | undefined =>
        addClientErrors[field] ?? addForm.errors[field];

    const resolveEditError = (field: keyof ScheduleFormFields): string | undefined =>
        editClientErrors[field] ?? editForm.errors[field];

    const clearClientFields = (setter: Dispatch<SetStateAction<ScheduleFieldErrors>>, fields: (keyof ScheduleFormFields)[]) => {
        setter((prev) => {
            const next = { ...prev };
            for (const field of fields) {
                delete next[field];
            }
            return next;
        });
    };

    const patchAddField = (
        field: keyof ScheduleFormFields,
        value: string,
        options?: { nextForm?: ScheduleFormFields; clearFields?: (keyof ScheduleFormFields)[] },
    ) => {
        const nextForm = options?.nextForm ?? { ...addForm.data, [field]: value };
        const fieldsToClear = [field, ...(options?.clearFields ?? [])];
        addForm.setData(nextForm);
        for (const f of fieldsToClear) {
            addForm.clearErrors(f);
        }
        clearClientFields(setAddClientErrors, fieldsToClear);
        syncAddValidation('live', nextForm);
    };

    const patchEditField = (
        field: keyof ScheduleFormFields,
        value: string,
        options?: { nextForm?: ScheduleFormFields; clearFields?: (keyof ScheduleFormFields)[] },
    ) => {
        const nextForm = options?.nextForm ?? { ...editForm.data, [field]: value };
        const fieldsToClear = [field, ...(options?.clearFields ?? [])];
        editForm.setData(nextForm);
        for (const f of fieldsToClear) {
            editForm.clearErrors(f);
        }
        clearClientFields(setEditClientErrors, fieldsToClear);
        syncEditValidation('live', nextForm);
    };

    const addFilteredSubjects = useMemo(
        () => subjectsForSectionYearLevel(sections, subjects, addForm.data.section_id),
        [sections, subjects, addForm.data.section_id],
    );

    const editFilteredSubjects = useMemo(
        () => subjectsForSectionYearLevel(sections, subjects, editForm.data.section_id),
        [sections, subjects, editForm.data.section_id],
    );

    // ── Conflict detection memos ──────────────────────────────────────────────

    const addOccupied = useMemo(
        () =>
            getMergedOccupiedSlots(schedules, {
                comlabIdStr: addForm.data.comlab_id,
                teacherIdStr: addForm.data.teacher_id,
                sectionIdStr: addForm.data.section_id,
                day: addForm.data.day,
            }),
        [schedules, addForm.data.comlab_id, addForm.data.teacher_id, addForm.data.section_id, addForm.data.day],
    );
    const addStartConflict = useMemo(
        () => (addOccupied.length > 0 ? makeStartConflictCheck(addOccupied) : undefined),
        [addOccupied],
    );
    const addEndConflict = useMemo(
        () => (addOccupied.length > 0 && addForm.data.start_time ? makeEndConflictCheck(addOccupied, addForm.data.start_time) : undefined),
        [addOccupied, addForm.data.start_time],
    );

    const editOccupied = useMemo(
        () =>
            getMergedOccupiedSlots(
                schedules,
                {
                    comlabIdStr: editForm.data.comlab_id,
                    teacherIdStr: editForm.data.teacher_id,
                    sectionIdStr: editForm.data.section_id,
                    day: editForm.data.day,
                },
                editingId,
            ),
        [schedules, editForm.data.comlab_id, editForm.data.teacher_id, editForm.data.section_id, editForm.data.day, editingId],
    );
    const editStartConflict = useMemo(
        () => (editOccupied.length > 0 ? makeStartConflictCheck(editOccupied) : undefined),
        [editOccupied],
    );
    const editEndConflict = useMemo(
        () => (editOccupied.length > 0 && editForm.data.start_time ? makeEndConflictCheck(editOccupied, editForm.data.start_time) : undefined),
        [editOccupied, editForm.data.start_time],
    );

    const handleAddOpenChange = (open: boolean) => {
        setAddOpen(open);
        bypassCampusWarningRef.current = false;
        setCampusWarningOpen(false);
        setCampusWarningMessage('');
        if (!open) {
            addForm.reset();
            addForm.clearErrors();
            setAddClientErrors({});
        }
    };

    const handleAddSectionChange = (value: string) => {
        const nextSubjects = subjectsForSectionYearLevel(sections, subjects, value);
        const prevSubject = addForm.data.subject_id;
        const keepSubject = prevSubject !== '' && nextSubjects.some((s) => String(s.id) === prevSubject);
        patchAddField('section_id', value, {
            clearFields: ['subject_id', 'start_time', 'end_time'],
            nextForm: {
                ...addForm.data,
                section_id: value,
                subject_id: keepSubject ? prevSubject : '',
                start_time: '',
                end_time: '',
            },
        });
    };

    const handleAddComlabChange = (value: string) => {
        patchAddField('comlab_id', value, {
            clearFields: ['start_time', 'end_time'],
            nextForm: { ...addForm.data, comlab_id: value, start_time: '', end_time: '' },
        });
    };

    const handleAddDayChange = (value: string) => {
        patchAddField('day', value, {
            clearFields: ['start_time', 'end_time'],
            nextForm: { ...addForm.data, day: value, start_time: '', end_time: '' },
        });
    };

    const handleAddTeacherChange = (value: string) => {
        patchAddField('teacher_id', value, {
            clearFields: ['start_time', 'end_time'],
            nextForm: { ...addForm.data, teacher_id: value, start_time: '', end_time: '' },
        });
    };

    const handleAddSubjectChange = (value: string) => {
        patchAddField('subject_id', value);
    };

    const handleAddStartTimeChange = (value: string) => {
        patchAddField('start_time', value);
    };

    const handleAddEndTimeChange = (value: string) => {
        patchAddField('end_time', value);
    };

    const handleEditSectionChange = (value: string) => {
        const nextSubjects = subjectsForSectionYearLevel(sections, subjects, value);
        const prevSubject = editForm.data.subject_id;
        const keepSubject = prevSubject !== '' && nextSubjects.some((s) => String(s.id) === prevSubject);
        patchEditField('section_id', value, {
            clearFields: ['subject_id', 'start_time', 'end_time'],
            nextForm: {
                ...editForm.data,
                section_id: value,
                subject_id: keepSubject ? prevSubject : '',
                start_time: '',
                end_time: '',
            },
        });
    };

    const handleEditTeacherChange = (value: string) => {
        patchEditField('teacher_id', value, {
            clearFields: ['start_time', 'end_time'],
            nextForm: { ...editForm.data, teacher_id: value, start_time: '', end_time: '' },
        });
    };

    const handleEditComlabChange = (value: string) => {
        patchEditField('comlab_id', value, {
            clearFields: ['start_time', 'end_time'],
            nextForm: { ...editForm.data, comlab_id: value, start_time: '', end_time: '' },
        });
    };

    const handleEditDayChange = (value: string) => {
        patchEditField('day', value, {
            clearFields: ['start_time', 'end_time'],
            nextForm: { ...editForm.data, day: value, start_time: '', end_time: '' },
        });
    };

    const handleEditSubjectChange = (value: string) => {
        patchEditField('subject_id', value);
    };

    const handleEditStartTimeChange = (value: string) => {
        patchEditField('start_time', value);
    };

    const handleEditEndTimeChange = (value: string) => {
        patchEditField('end_time', value);
    };

    const performAddPost = () => {
        addForm.post(route('schedules.store'), {
            preserveScroll: true,
            onFinish: () => {
                bypassCampusWarningRef.current = false;
            },
            onSuccess: () => {
                handleAddOpenChange(false);
            },
            onError: () => {
                setAddClientErrors({});
            },
        });
    };

    const handleAddSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        addForm.clearErrors();

        const clientErrors = getScheduleFormErrors({
            schedules,
            sections,
            subjects,
            form: addForm.data,
            excludeId: null,
            mode: 'submit',
        });
        setAddClientErrors(clientErrors);
        if (hasScheduleFormErrors(clientErrors)) {
            return;
        }

        if (!bypassCampusWarningRef.current) {
            const msg = buildCampusTransferMessagesForDays(schedules, comlabs, {
                teacherIdStr: addForm.data.teacher_id,
                day: addForm.data.day,
                startStr: addForm.data.start_time,
                endStr: addForm.data.end_time,
                selectedComlabIdStr: addForm.data.comlab_id,
                excludeId: null,
            });
            if (msg) {
                setCampusWarningMessage(msg);
                campusSubmitIsEditRef.current = false;
                setCampusWarningOpen(true);
                return;
            }
        }
        performAddPost();
    };

    const openEdit = (row: ScheduleRow) => {
        editingIdRef.current = row.id;
        setEditingId(row.id);
        editForm.setData({
            section_id: row.section_id != null ? String(row.section_id) : '',
            subject_id: String(row.subject_id),
            teacher_id: String(row.teacher_id),
            comlab_id: row.comlab_id != null ? String(row.comlab_id) : '',
            day: row.day,
            start_time: row.start_time,
            end_time: row.end_time,
        });
        editForm.clearErrors();
        setEditClientErrors({});
        bypassCampusWarningRef.current = false;
        setEditOpen(true);
        syncEditValidation();
    };

    const handleEditOpenChange = (open: boolean) => {
        setEditOpen(open);
        bypassCampusWarningRef.current = false;
        setCampusWarningOpen(false);
        setCampusWarningMessage('');
        if (!open) {
            editingIdRef.current = null;
            setEditingId(null);
            editForm.reset();
            editForm.clearErrors();
            setEditClientErrors({});
        }
    };

    const applyServerErrors = (errors: Record<string, string | string[]>) => {
        editForm.clearErrors();
        Object.entries(errors).forEach(([key, messages]) => {
            const message = Array.isArray(messages) ? messages[0] : messages;
            if (message) {
                editForm.setError(key as keyof ScheduleFormData, message);
            }
        });
    };

    const performEditPut = () => {
        const id = editingIdRef.current ?? editingId;
        if (id === null) {
            return;
        }

        const payload = {
            section_id: Number.parseInt(editForm.data.section_id, 10),
            subject_id: Number.parseInt(editForm.data.subject_id, 10),
            teacher_id: Number.parseInt(editForm.data.teacher_id, 10),
            comlab_id: Number.parseInt(editForm.data.comlab_id, 10),
            day: editForm.data.day,
            start_time: editForm.data.start_time,
            end_time: editForm.data.end_time,
        };

        setSaving(true);
        editForm.clearErrors();

        router.put(route('schedules.update', id), payload, {
            preserveScroll: true,
            onFinish: () => {
                setSaving(false);
                bypassCampusWarningRef.current = false;
            },
            onSuccess: () => {
                handleEditOpenChange(false);
            },
            onError: (errors) => {
                applyServerErrors(errors);
                setEditClientErrors({});
            },
        });
    };

    const submitScheduleEdit = () => {
        editForm.clearErrors();
        const clientErrors = getScheduleFormErrors({
            schedules,
            sections,
            subjects,
            form: editForm.data,
            excludeId: editingIdRef.current ?? editingId,
            mode: 'submit',
        });
        setEditClientErrors(clientErrors);
        if (hasScheduleFormErrors(clientErrors)) {
            return;
        }

        if (!bypassCampusWarningRef.current) {
            const msg = buildCampusTransferMessage(schedules, comlabs, {
                teacherIdStr: editForm.data.teacher_id,
                day: editForm.data.day,
                startStr: editForm.data.start_time,
                endStr: editForm.data.end_time,
                selectedComlabIdStr: editForm.data.comlab_id,
                excludeId: editingIdRef.current ?? editingId,
            });
            if (msg) {
                setCampusWarningMessage(msg);
                campusSubmitIsEditRef.current = true;
                setCampusWarningOpen(true);
                return;
            }
        }
        performEditPut();
    };

    const handleCampusWarningCancel = () => {
        setCampusWarningOpen(false);
        setCampusWarningMessage('');
    };

    const handleCampusWarningContinue = () => {
        setCampusWarningOpen(false);
        setCampusWarningMessage('');
        bypassCampusWarningRef.current = true;
        if (campusSubmitIsEditRef.current) {
            performEditPut();
        } else {
            addForm.clearErrors();
            performAddPost();
        }
    };

    const handleEditSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        submitScheduleEdit();
    };

    const openDeleteConfirm = (row: ScheduleRow) => {
        setDeletingRow(row);
        setDeleteOpen(true);
    };

    const handleDeleteOpenChange = (open: boolean) => {
        setDeleteOpen(open);
        if (!open) {
            setDeletingRow(null);
        }
    };

    const confirmDelete = () => {
        if (!deletingRow) {
            return;
        }

        router.delete(route('schedules.destroy', deletingRow.id), {
            preserveScroll: true,
            onStart: () => setDeleteSubmitting(true),
            onFinish: () => setDeleteSubmitting(false),
            onSuccess: () => {
                handleDeleteOpenChange(false);
            },
        });
    };

    const addSubjectSelectState = useMemo(
        () => getSubjectSelectState(addForm.data.section_id, subjects, addFilteredSubjects),
        [addForm.data.section_id, subjects, addFilteredSubjects],
    );

    const editSubjectSelectState = useMemo(
        () => getSubjectSelectState(editForm.data.section_id, subjects, editFilteredSubjects),
        [editForm.data.section_id, subjects, editFilteredSubjects],
    );

    const canAddSchedule = teachers.length > 0 && comlabs.length > 0 && subjects.length > 0;

    const [scheduleClock, setScheduleClock] = useState(() => new Date());
    useEffect(() => {
        const id = window.setInterval(() => setScheduleClock(new Date()), 60_000);
        return () => window.clearInterval(id);
    }, []);

    const schedulesByComlab = useMemo(() => groupSchedulesByComlab(schedules, comlabs), [schedules, comlabs]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Schedules" />
            <div className="space-y-6 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <h1 className="font-serif text-3xl font-bold uppercase tracking-tight sm:text-4xl md:text-5xl">Schedules</h1>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            className="font-serif"
                            disabled={schedules.length === 0}
                            onClick={() => {
                                setPrintGeneratedAt(new Date());
                                setPrintOpen(true);
                            }}
                        >
                            <Printer className="mr-2 size-4" aria-hidden />
                            Print Schedule
                        </Button>
                        <Button
                            type="button"
                            className="font-serif"
                            disabled={!canAddSchedule}
                            onClick={() => {
                                bypassCampusWarningRef.current = false;
                                setCampusWarningOpen(false);
                                setCampusWarningMessage('');
                                setAddOpen(true);
                            }}
                        >
                            <Plus className="mr-2 size-4" aria-hidden />
                            Add Schedule
                        </Button>
                    </div>
                </div>

                <ActiveCurriculumSemesterBanner />

                {!canAddSchedule ? (
                    <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100">
                        {teachers.length === 0 && <p>No teachers are available for this semester.</p>}
                        {comlabs.length === 0 && <p>No comlabs are available for this semester.</p>}
                        {subjects.length === 0 && <p>No subjects are available for this semester.</p>}
                    </div>
                ) : null}

                {schedules.length === 0 ? (
                    <div className="rounded-lg border bg-card px-6 py-14 text-center">
                        <Monitor className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                        <p className="font-serif text-sm text-muted-foreground">
                            No schedules for {activeCurriculumSemester?.label ?? 'this curriculum semester'} yet.
                            {canAddSchedule ? ' Click Add Schedule to get started.' : ''}
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                        {schedulesByComlab.map(({ comlab, rows }) => (
                            <ComlabScheduleCard
                                key={comlab.id}
                                comlab={comlab}
                                rows={rows}
                                now={scheduleClock}
                                onEdit={openEdit}
                                onDelete={openDeleteConfirm}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Add schedule */}
            <Dialog open={addOpen} onOpenChange={handleAddOpenChange}>
                <DialogContent className="flex max-h-[min(96vh,calc(100dvh-0.75rem))] w-[calc(100vw-2rem)] max-w-lg translate-x-[-50%] translate-y-[-50%] flex-col gap-0 overflow-hidden p-0 sm:w-full">
                    <DialogHeader className="shrink-0 border-b border-border/60 px-6 pb-4 pt-6 pr-12">
                        <DialogTitle className="font-serif">Add Schedule</DialogTitle>
                        <DialogDescription>Create a new comlab schedule slot. Times use 5-minute steps.</DialogDescription>
                    </DialogHeader>

                    <form className="flex min-h-0 flex-1 flex-col overflow-hidden" onSubmit={handleAddSubmit}>
                        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="add_comlab_id">Comlab</Label>
                                    <Select value={addForm.data.comlab_id || undefined} onValueChange={handleAddComlabChange}>
                                        <SelectTrigger id="add_comlab_id">
                                            <SelectValue placeholder="Select comlab" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {comlabs.map((c) => (
                                                <SelectItem key={c.id} value={String(c.id)}>
                                                    {c.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError message={resolveAddError('comlab_id')} />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="add_day">Day</Label>
                                    <Select value={addForm.data.day || undefined} onValueChange={handleAddDayChange}>
                                        <SelectTrigger id="add_day">
                                            <SelectValue placeholder="Select day" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(() => {
                                                const { groups, singles } = getScheduleDaySelectGroups();
                                                return (
                                                    <>
                                                        <SelectGroup>
                                                            <SelectLabel>Day groups</SelectLabel>
                                                            {groups.map((opt) => (
                                                                <SelectItem key={opt.value} value={opt.value}>
                                                                    {opt.label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectGroup>
                                                        <SelectSeparator />
                                                        <SelectGroup>
                                                            <SelectLabel>Single days</SelectLabel>
                                                            {singles.map((opt) => (
                                                                <SelectItem key={opt.value} value={opt.value}>
                                                                    {opt.label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectGroup>
                                                    </>
                                                );
                                            })()}
                                        </SelectContent>
                                    </Select>
                                    {getScheduleDayHelperText(addForm.data.day) ? (
                                        <p className="text-sm text-muted-foreground">
                                            {getScheduleDayHelperText(addForm.data.day)}
                                        </p>
                                    ) : null}
                                    <InputError message={resolveAddError('day')} />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="add_teacher_id">Teacher</Label>
                                    <Select
                                        value={addForm.data.teacher_id || undefined}
                                        onValueChange={handleAddTeacherChange}
                                    >
                                        <SelectTrigger id="add_teacher_id">
                                            <SelectValue placeholder="Select teacher" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {teachers.map((t) => (
                                                <SelectItem key={t.id} value={String(t.id)}>
                                                    {t.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError message={resolveAddError('teacher_id')} />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="add_section_id">Section</Label>
                                    <Select value={addForm.data.section_id || undefined} onValueChange={handleAddSectionChange}>
                                        <SelectTrigger id="add_section_id">
                                            <SelectValue placeholder="Select section" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {sections.map((s) => (
                                                <SelectItem key={s.id} value={String(s.id)}>
                                                    {s.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError message={resolveAddError('section_id')} />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="add_subject_id">Subject</Label>
                                    <Select
                                        disabled={addSubjectSelectState.disabled}
                                        value={addForm.data.subject_id || undefined}
                                        onValueChange={handleAddSubjectChange}
                                    >
                                        <SelectTrigger
                                            id="add_subject_id"
                                            className={addSubjectSelectState.disabled ? 'opacity-60' : ''}
                                        >
                                            <SelectValue placeholder={addSubjectSelectState.placeholder} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {addFilteredSubjects.length === 0 ? (
                                                <div className="px-2 py-2 text-sm text-muted-foreground">
                                                    {addSubjectSelectState.helperText ?? 'No subjects available'}
                                                </div>
                                            ) : (
                                                addFilteredSubjects.map((s) => (
                                                    <SelectItem key={s.id} value={String(s.id)}>
                                                        {s.name}
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                    {addSubjectSelectState.helperText ? (
                                        <p className="text-sm text-muted-foreground">{addSubjectSelectState.helperText}</p>
                                    ) : null}
                                    <InputError message={resolveAddError('subject_id')} />
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <ScheduleTimePicker
                                        label="Start time"
                                        labelId="add_start_time"
                                        value={addForm.data.start_time}
                                        onChange={handleAddStartTimeChange}
                                        error={resolveAddError('start_time')}
                                        conflictCheck={addStartConflict}
                                    />
                                    <ScheduleTimePicker
                                        label="End time"
                                        labelId="add_end_time"
                                        value={addForm.data.end_time}
                                        onChange={handleAddEndTimeChange}
                                        error={resolveAddError('end_time')}
                                        conflictCheck={addEndConflict}
                                    />
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="shrink-0 flex flex-row flex-wrap justify-center gap-3 border-t border-border/60 bg-background px-6 pb-6 pt-4 sm:flex-row sm:justify-center">
                            <Button
                                type="button"
                                variant="outline"
                                className="rounded-full px-8 font-serif"
                                onClick={() => handleAddOpenChange(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" className="rounded-full px-8 font-serif" disabled={addForm.processing}>
                                {addForm.processing ? 'Saving…' : 'Save'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={editOpen} onOpenChange={handleEditOpenChange}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Edit Schedule</DialogTitle>
                        <DialogDescription>Update this schedule slot. Changes are saved to the database.</DialogDescription>
                    </DialogHeader>

                    <form className="space-y-4" onSubmit={handleEditSubmit}>
                        <div className="space-y-2">
                            <Label htmlFor="edit_section_id">Section</Label>
                            <Select value={editForm.data.section_id} onValueChange={handleEditSectionChange}>
                                <SelectTrigger id="edit_section_id">
                                    <SelectValue placeholder="Select section" />
                                </SelectTrigger>
                                <SelectContent>
                                    {sections.map((s) => (
                                        <SelectItem key={s.id} value={String(s.id)}>
                                            {s.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <InputError message={resolveEditError('section_id')} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit_subject_id">Subject</Label>
                            <Select
                                disabled={editSubjectSelectState.disabled}
                                value={editForm.data.subject_id || undefined}
                                onValueChange={handleEditSubjectChange}
                            >
                                <SelectTrigger
                                    id="edit_subject_id"
                                    className={editSubjectSelectState.disabled ? 'opacity-60' : ''}
                                >
                                    <SelectValue placeholder={editSubjectSelectState.placeholder} />
                                </SelectTrigger>
                                <SelectContent>
                                    {editFilteredSubjects.length === 0 ? (
                                        <div className="px-2 py-2 text-sm text-muted-foreground">
                                            {editSubjectSelectState.helperText ?? 'No subjects available'}
                                        </div>
                                    ) : (
                                        editFilteredSubjects.map((s) => (
                                            <SelectItem key={s.id} value={String(s.id)}>
                                                {s.name}
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                            {editSubjectSelectState.helperText ? (
                                <p className="text-sm text-muted-foreground">{editSubjectSelectState.helperText}</p>
                            ) : null}
                            <InputError message={resolveEditError('subject_id')} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit_teacher_id">Teacher</Label>
                            <Select value={editForm.data.teacher_id} onValueChange={handleEditTeacherChange}>
                                <SelectTrigger id="edit_teacher_id">
                                    <SelectValue placeholder="Select teacher" />
                                </SelectTrigger>
                                <SelectContent>
                                    {teachers.map((t) => (
                                        <SelectItem key={t.id} value={String(t.id)}>
                                            {t.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <InputError message={resolveEditError('teacher_id')} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit_comlab_id">Comlab</Label>
                            <Select value={editForm.data.comlab_id} onValueChange={handleEditComlabChange}>
                                <SelectTrigger id="edit_comlab_id">
                                    <SelectValue placeholder="Select comlab" />
                                </SelectTrigger>
                                <SelectContent>
                                    {comlabs.map((c) => (
                                        <SelectItem key={c.id} value={String(c.id)}>
                                            {c.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <InputError message={resolveEditError('comlab_id')} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit_day">Day</Label>
                            <Select value={editForm.data.day} onValueChange={handleEditDayChange}>
                                <SelectTrigger id="edit_day">
                                    <SelectValue placeholder="Select day" />
                                </SelectTrigger>
                                <SelectContent>
                                    {SCHEDULE_WEEKDAYS.map((d) => (
                                        <SelectItem key={d} value={d}>
                                            {d}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-sm text-muted-foreground">
                                This row is for one weekday only. To change a whole MTH or TFRI block, delete those rows
                                and add again using a day group.
                            </p>
                            <InputError message={resolveEditError('day')} />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <ScheduleTimePicker
                                label="Start time"
                                labelId="edit_start_time"
                                value={editForm.data.start_time}
                                onChange={handleEditStartTimeChange}
                                error={resolveEditError('start_time')}
                                conflictCheck={editStartConflict}
                            />
                            <ScheduleTimePicker
                                label="End time"
                                labelId="edit_end_time"
                                value={editForm.data.end_time}
                                onChange={handleEditEndTimeChange}
                                error={resolveEditError('end_time')}
                                conflictCheck={editEndConflict}
                            />
                        </div>

                        <DialogFooter className="gap-2">
                            <Button type="button" variant="outline" className="font-serif" onClick={() => handleEditOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="button" className="font-serif" disabled={saving} onClick={submitScheduleEdit}>
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={campusWarningOpen} onOpenChange={(open) => !open && handleCampusWarningCancel()}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" aria-hidden />
                            <DialogTitle className="font-serif">Campus travel warning</DialogTitle>
                        </div>
                        <DialogDescription asChild>
                            <div className="space-y-2 pt-1">
                                <p className="whitespace-pre-line text-sm text-foreground">{campusWarningMessage}</p>
                                <p className="text-sm text-muted-foreground">
                                    This is a reminder only. You can cancel to adjust the schedule, or continue to save.
                                </p>
                            </div>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button type="button" variant="outline" className="font-serif" onClick={handleCampusWarningCancel}>
                            Cancel
                        </Button>
                        <Button type="button" className="font-serif" onClick={handleCampusWarningContinue}>
                            Continue
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={deleteOpen} onOpenChange={handleDeleteOpenChange}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-serif">Delete schedule</DialogTitle>
                        <DialogDescription>
                            {deletingRow ? (
                                <>
                                    Remove this slot for{' '}
                                    <span className="text-foreground font-medium">
                                        {deletingRow.subject_label ?? 'subject'} — {deletingRow.day} {deletingRow.start_time}–
                                        {deletingRow.end_time}
                                    </span>
                                    ? This cannot be undone.
                                </>
                            ) : (
                                'Are you sure you want to delete this schedule?'
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button type="button" variant="outline" className="font-serif" onClick={() => handleDeleteOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            className="font-serif"
                            disabled={!deletingRow || deleteSubmitting}
                            onClick={confirmDelete}
                        >
                            {deleteSubmitting ? 'Deleting…' : 'Confirm Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <SchedulePrintModal
                open={printOpen}
                onOpenChange={setPrintOpen}
                schedules={schedules}
                comlabs={comlabs.map((c) => ({ id: c.id, name: c.name, campus: c.campus }))}
                organizationName={appName}
                meta={{
                    semesterLabel: activeCurriculumSemester?.label ?? 'Active curriculum semester',
                    generatedAt: printGeneratedAt,
                }}
            />
        </AppLayout>
    );
}




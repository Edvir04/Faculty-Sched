import ActiveCurriculumSemesterBanner from '@/components/active-curriculum-semester-banner';
import DefaultCurriculumBadge from '@/components/default-curriculum-badge';
import DefaultCurriculumField from '@/components/default-curriculum-field';
import InputError from '@/components/input-error';
import { TEACHER_STATUS_OPTIONS } from '@/components/teachers/employment-options';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import {
    DEFAULT_CURRICULUM_DUPLICATE_TEACHER_MESSAGE,
    hasDefaultTeacherDuplicate,
    syncDefaultTeacherNameDuplicateError,
    type DefaultTeacherRecordForValidation,
} from '@/lib/default-curriculum-duplicate-validation';
import {
    DUPLICATE_TEACHER_NAME_MESSAGE,
    hasTeacherDuplicate,
    hasTeacherNameDuplicateError,
    syncTeacherNameDuplicateError,
} from '@/lib/teacher-duplicate-validation';
import {
    buildDeletePayload,
    resolveDeleteError,
    formatSchedule,
    formatScheduleContext,
    formatScheduleLabel,
    formatSubjectContext,
    getAvailableReplacementTeachers,
    getAvailableTeachersForSchedule,
    groupAssignmentsByTeacher,
    isDeleteReassignmentComplete,
    sortSubjectAssignments,
    subjectSummaryLabel,
    type ScheduleConflictRow,
    type TeacherOption,
    type TeacherScheduleAssignment,
    type TeacherSubjectAssignment,
} from '@/lib/teacher-schedule-helpers';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { Menu, Plus, Users } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Teachers',
        href: '/teachers',
    },
];

type TeacherRow = {
    id: number;
    teacher_name: string;
    status: string;
    is_default: boolean;
    subjects?: string[];
    subject_assignments: TeacherSubjectAssignment[];
    created_at: string;
    updated_at: string;
};

type TeachersPageProps = {
    teachers: TeacherRow[];
    scheduleAssignments: TeacherScheduleAssignment[];
    teacherOptions: TeacherOption[];
    defaultTeachersForValidation: DefaultTeacherRecordForValidation[];
};

type TeacherFormData = {
    teacher_name: string;
    status: string;
    is_default: boolean;
};

type ReassignmentFormData = {
    assignments: {
        schedule_id: number;
        teacher_id: number;
    }[];
};

const emptyForm: TeacherFormData = {
    teacher_name: '',
    status: '',
    is_default: false,
};

function formatTeacherDate(iso: string): string {
    try {
        return new Date(iso).toLocaleString(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short',
        });
    } catch {
        return iso;
    }
}

function SubjectSummaryCell({ teacher, onView }: { teacher: TeacherRow; onView: (teacher: TeacherRow) => void }) {
    const count = teacher.subject_assignments.length;

    if (count === 0) {
        return <span className="text-muted-foreground">—</span>;
    }

    return (
        <Button
            type="button"
            variant="link"
            className="h-auto px-0 py-0 font-serif text-sm font-normal"
            aria-label={`View subjects handled by ${teacher.teacher_name}`}
            onClick={() => onView(teacher)}
        >
            {subjectSummaryLabel(count)}
        </Button>
    );
}

function SubjectAssignmentListItem({ assignment }: { assignment: TeacherSubjectAssignment }) {
    return (
        <li className="rounded-md border border-border/80 bg-card p-4">
            <p className="font-serif font-medium leading-snug">{assignment.subject_label || assignment.subject_name}</p>
            <dl className="mt-2 space-y-1 font-serif text-sm">
                <div className="grid grid-cols-[5.5rem_1fr] gap-x-2 sm:grid-cols-[6.5rem_1fr]">
                    <dt className="text-muted-foreground">Schedule</dt>
                    <dd>{formatSchedule(assignment.day, assignment.start_time, assignment.end_time)}</dd>
                </div>
                <div className="grid grid-cols-[5.5rem_1fr] gap-x-2 sm:grid-cols-[6.5rem_1fr]">
                    <dt className="text-muted-foreground">Comlab</dt>
                    <dd>{assignment.comlab_name ?? '—'}</dd>
                </div>
                <div className="grid grid-cols-[5.5rem_1fr] gap-x-2 sm:grid-cols-[6.5rem_1fr]">
                    <dt className="text-muted-foreground">Section</dt>
                    <dd>{assignment.section_name ?? '—'}</dd>
                </div>
            </dl>
        </li>
    );
}

export default function Teachers() {
    const page = usePage<SharedData & TeachersPageProps>();
    const {
        teachers,
        scheduleAssignments,
        teacherOptions,
        defaultTeachersForValidation = [],
        errors: pageErrors,
    } = page.props;

    const [addOpen, setAddOpen] = useState(false);
    const [addClientError, setAddClientError] = useState<string | null>(null);

    const [viewOpen, setViewOpen] = useState(false);
    const [viewTeacher, setViewTeacher] = useState<TeacherRow | null>(null);
    const [viewLoading, setViewLoading] = useState(false);
    const [viewError, setViewError] = useState<string | null>(null);

    const [editOpen, setEditOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editClientError, setEditClientError] = useState<string | null>(null);

    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deletingTeacher, setDeletingTeacher] = useState<TeacherRow | null>(null);
    const [deleteAssignments, setDeleteAssignments] = useState<Record<number, string>>({});
    const [deleteClientError, setDeleteClientError] = useState<string | null>(null);
    const [deleteSubmitting, setDeleteSubmitting] = useState(false);

    const [reassignOpen, setReassignOpen] = useState(false);
    const [confirmReassignOpen, setConfirmReassignOpen] = useState(false);
    const [selections, setSelections] = useState<Record<number, number>>({});
    const [reassignClientMessage, setReassignClientMessage] = useState<string | null>(null);

    const [subjectsOpen, setSubjectsOpen] = useState(false);
    const [subjectsTeacher, setSubjectsTeacher] = useState<TeacherRow | null>(null);

    const addForm = useForm<TeacherFormData>(emptyForm);
    addForm.transform((form) => ({
        ...form,
        teacher_name: form.teacher_name.trim(),
    }));

    const editForm = useForm<TeacherFormData>(emptyForm);
    editForm.transform((form) => ({
        ...form,
        teacher_name: form.teacher_name.trim(),
    }));

    const reassignmentForm = useForm<ReassignmentFormData>({ assignments: [] });

    const conflictSchedules = useMemo<ScheduleConflictRow[]>(
        () =>
            scheduleAssignments.map((assignment) => ({
                schedule_id: assignment.schedule_id,
                teacher_id: selections[assignment.schedule_id] ?? assignment.teacher_id,
                day: assignment.day,
                start_time: assignment.start_time,
                end_time: assignment.end_time,
            })),
        [scheduleAssignments, selections],
    );

    const teacherStatusById = useMemo(() => new Map(teachers.map((teacher) => [teacher.id, teacher.status])), [teachers]);

    /** Ensures newly added professors appear in delete replacement dropdowns immediately. */
    const replacementTeacherOptions = useMemo(() => {
        const byId = new Map<number, TeacherOption>(teacherOptions.map((teacher) => [teacher.id, teacher]));

        for (const teacher of teachers) {
            if (!byId.has(teacher.id)) {
                byId.set(teacher.id, { id: teacher.id, name: teacher.teacher_name });
            }
        }

        return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
    }, [teacherOptions, teachers]);

    const resolveTeacherFromProps = (teacher: TeacherRow): TeacherRow =>
        teachers.find((row) => row.id === teacher.id) ?? teacher;

    const sortedSubjectAssignments = useMemo(() => {
        if (!subjectsTeacher) {
            return [];
        }

        return sortSubjectAssignments(subjectsTeacher.subject_assignments);
    }, [subjectsTeacher]);

    const openSubjectsModal = (teacher: TeacherRow) => {
        setSubjectsTeacher(teacher);
        setSubjectsOpen(true);
    };

    const handleSubjectsOpenChange = (open: boolean) => {
        setSubjectsOpen(open);
        if (!open) {
            setSubjectsTeacher(null);
        }
    };

    const teacherCards = useMemo(() => {
        const grouped = groupAssignmentsByTeacher(scheduleAssignments);

        return [...grouped.entries()]
            .map(([teacherId, assignments]) => ({
                teacherId,
                teacherName: assignments[0]?.teacher_name ?? '',
                teacherStatus: teacherStatusById.get(teacherId) ?? '',
                assignments: [...assignments].sort((a, b) => {
                    const dayCompare = a.day.localeCompare(b.day);
                    if (dayCompare !== 0) {
                        return dayCompare;
                    }
                    return a.start_time.localeCompare(b.start_time);
                }),
            }))
            .sort((a, b) => a.teacherName.localeCompare(b.teacherName));
    }, [scheduleAssignments, teacherStatusById]);

    const changedAssignments = useMemo(() => {
        return scheduleAssignments
            .filter((assignment) => {
                const selected = selections[assignment.schedule_id];
                return selected !== undefined && selected !== assignment.teacher_id;
            })
            .map((assignment) => ({
                schedule_id: assignment.schedule_id,
                teacher_id: selections[assignment.schedule_id] as number,
            }));
    }, [scheduleAssignments, selections]);

    useEffect(() => {
        if (!addOpen) {
            return;
        }
        setAddClientError(null);
    }, [addOpen]);

    useEffect(() => {
        if (!editOpen) {
            return;
        }
        setEditClientError(null);
    }, [editOpen]);

    const initializeReassignSelections = () => {
        const initial: Record<number, number> = {};
        for (const assignment of scheduleAssignments) {
            initial[assignment.schedule_id] = assignment.teacher_id;
        }
        setSelections(initial);
        setReassignClientMessage(null);
        reassignmentForm.clearErrors();
    };

    const handleReassignOpenChange = (open: boolean) => {
        setReassignOpen(open);
        if (open) {
            initializeReassignSelections();
        } else {
            setConfirmReassignOpen(false);
            setReassignClientMessage(null);
            reassignmentForm.clearErrors();
        }
    };

    const handleSelectionChange = (scheduleId: number, teacherId: number) => {
        setSelections((previous) => ({
            ...previous,
            [scheduleId]: teacherId,
        }));
    };

    const handleReassignSaveClick = () => {
        setReassignClientMessage(null);
        reassignmentForm.clearErrors();

        if (changedAssignments.length === 0) {
            setReassignClientMessage('No professor changes to save.');
            return;
        }

        setConfirmReassignOpen(true);
    };

    const confirmReassignments = () => {
        reassignmentForm.setData({ assignments: changedAssignments });
        reassignmentForm.put(route('teachers.subject-professors.update'), {
            preserveScroll: true,
            onSuccess: () => {
                setConfirmReassignOpen(false);
                handleReassignOpenChange(false);
            },
            onError: () => {
                setConfirmReassignOpen(false);
            },
        });
    };

    const handleAddOpenChange = (open: boolean) => {
        setAddOpen(open);
        if (!open) {
            addForm.reset();
            addForm.clearErrors();
            setAddClientError(null);
        }
    };

    const syncAddTeacherDuplicateErrors = (teacherName: string) => {
        syncTeacherNameDuplicateError(addForm, teachers, teacherName);
        syncDefaultTeacherNameDuplicateError(
            addForm,
            defaultTeachersForValidation,
            teacherName,
            addForm.data.is_default,
        );
    };

    const syncEditTeacherDuplicateErrors = (teacherName: string) => {
        syncTeacherNameDuplicateError(editForm, teachers, teacherName, editingId ?? undefined);
        syncDefaultTeacherNameDuplicateError(
            editForm,
            defaultTeachersForValidation,
            teacherName,
            editForm.data.is_default,
            editingId ?? undefined,
        );
    };

    const handleAddTeacherNameChange = (value: string) => {
        addForm.setData('teacher_name', value);
        if (value.trim() !== '') {
            addForm.clearErrors('teacher_name');
        }
        syncAddTeacherDuplicateErrors(value);
    };

    const handleAddTeacherStatusChange = (value: string) => {
        const next = { ...addForm.data, status: value };
        addForm.setData('status', value);
        addForm.clearErrors('status');
        syncAddTeacherDuplicateErrors(next.teacher_name);
    };

    const handleAddTeacherDefaultChange = (checked: boolean) => {
        addForm.setData('is_default', checked);
        syncAddTeacherDuplicateErrors(addForm.data.teacher_name);
    };

    const handleEditTeacherNameChange = (value: string) => {
        editForm.setData('teacher_name', value);
        if (value.trim() !== '') {
            editForm.clearErrors('teacher_name');
        }
        syncEditTeacherDuplicateErrors(value);
    };

    const handleEditTeacherStatusChange = (value: string) => {
        const next = { ...editForm.data, status: value };
        editForm.setData('status', value);
        editForm.clearErrors('status');
        syncEditTeacherDuplicateErrors(next.teacher_name);
    };

    const handleEditTeacherDefaultChange = (checked: boolean) => {
        editForm.setData('is_default', checked);
        syncEditTeacherDuplicateErrors(editForm.data.teacher_name);
    };

    const handleAddSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setAddClientError(null);

        const name = addForm.data.teacher_name.trim();
        if (!name) {
            addForm.setError('teacher_name', 'Teacher name is required.');
            return;
        }
        if (!addForm.data.status) {
            addForm.setError('status', 'Status is required.');
            return;
        }

        if (hasTeacherDuplicate(teachers, name)) {
            addForm.setError('teacher_name', DUPLICATE_TEACHER_NAME_MESSAGE);
            return;
        }

        if (
            hasDefaultTeacherDuplicate(
                defaultTeachersForValidation,
                name,
                addForm.data.is_default,
            )
        ) {
            addForm.setError('teacher_name', DEFAULT_CURRICULUM_DUPLICATE_TEACHER_MESSAGE);
            return;
        }

        addForm.post(route('teachers.store'), {
            preserveScroll: true,
            onSuccess: () => {
                handleAddOpenChange(false);
            },
        });
    };

    const openView = async (teacher: TeacherRow) => {
        setViewOpen(true);
        setViewLoading(true);
        setViewError(null);
        setViewTeacher(null);

        try {
            const response = await fetch(route('teachers.show', teacher.id), {
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
            });

            if (!response.ok) {
                throw new Error('Request failed');
            }

            const payload = (await response.json()) as { teacher: TeacherRow };
            setViewTeacher(payload.teacher);
        } catch {
            setViewError('Could not load teacher details.');
        } finally {
            setViewLoading(false);
        }
    };

    const handleViewOpenChange = (open: boolean) => {
        setViewOpen(open);
        if (!open) {
            setViewTeacher(null);
            setViewError(null);
            setViewLoading(false);
        }
    };

    const openEdit = (teacher: TeacherRow) => {
        setEditingId(teacher.id);
        editForm.setData({
            teacher_name: teacher.teacher_name,
            status: teacher.status,
            is_default: teacher.is_default,
        });
        editForm.clearErrors();
        setEditClientError(null);
        syncEditTeacherDuplicateErrors(teacher.teacher_name);
        setEditOpen(true);
    };

    const handleEditOpenChange = (open: boolean) => {
        setEditOpen(open);
        if (!open) {
            setEditingId(null);
            editForm.reset();
            editForm.clearErrors();
            setEditClientError(null);
        }
    };

    const handleEditSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setEditClientError(null);

        if (editingId === null) {
            return;
        }

        const name = editForm.data.teacher_name.trim();
        if (!name) {
            editForm.setError('teacher_name', 'Teacher name is required.');
            return;
        }
        if (!editForm.data.status) {
            editForm.setError('status', 'Status is required.');
            return;
        }

        if (hasTeacherDuplicate(teachers, name, editingId)) {
            editForm.setError('teacher_name', DUPLICATE_TEACHER_NAME_MESSAGE);
            return;
        }

        if (
            hasDefaultTeacherDuplicate(
                defaultTeachersForValidation,
                name,
                editForm.data.is_default,
                editingId,
            )
        ) {
            editForm.setError('teacher_name', DEFAULT_CURRICULUM_DUPLICATE_TEACHER_MESSAGE);
            return;
        }

        editForm.put(route('teachers.update', editingId), {
            preserveScroll: true,
            onSuccess: () => {
                handleEditOpenChange(false);
            },
        });
    };

    const deletingSubjectAssignments = useMemo(() => {
        if (!deletingTeacher) {
            return [];
        }

        return sortSubjectAssignments(resolveTeacherFromProps(deletingTeacher).subject_assignments);
    }, [deletingTeacher, teachers]);

    const deleteConflictSchedules = useMemo<ScheduleConflictRow[]>(
        () =>
            scheduleAssignments.map((assignment) => {
                const replacementRaw = deleteAssignments[assignment.schedule_id];
                const replacementId = replacementRaw ? Number(replacementRaw) : null;

                return {
                    schedule_id: assignment.schedule_id,
                    teacher_id:
                        replacementId !== null && !Number.isNaN(replacementId) ? replacementId : assignment.teacher_id,
                    day: assignment.day,
                    start_time: assignment.start_time,
                    end_time: assignment.end_time,
                };
            }),
        [scheduleAssignments, deleteAssignments],
    );

    const canConfirmDelete = useMemo(() => {
        if (!deletingTeacher) {
            return false;
        }

        const freshTeacher = resolveTeacherFromProps(deletingTeacher);

        return isDeleteReassignmentComplete(
            freshTeacher.subject_assignments,
            deleteAssignments,
            deleteConflictSchedules,
            replacementTeacherOptions,
            freshTeacher.id,
        );
    }, [deletingTeacher, deleteAssignments, deleteConflictSchedules, replacementTeacherOptions, teachers]);

    const openDeleteConfirm = (teacher: TeacherRow) => {
        setDeletingTeacher(resolveTeacherFromProps(teacher));
        setDeleteAssignments({});
        setDeleteClientError(null);
        setDeleteSubmitting(false);
        setDeleteOpen(true);
    };

    const handleDeleteOpenChange = (open: boolean) => {
        setDeleteOpen(open);
        if (!open) {
            setDeletingTeacher(null);
            setDeleteAssignments({});
            setDeleteClientError(null);
            setDeleteSubmitting(false);
        }
    };

    const handleDeleteAssignmentChange = (scheduleId: number, teacherId: string) => {
        setDeleteClientError(null);
        setDeleteAssignments((previous) => ({
            ...previous,
            [scheduleId]: teacherId,
        }));
    };

    useEffect(() => {
        if (!deleteOpen || deleteSubmitting) {
            return;
        }

        const inertiaErrors = pageErrors as Record<string, string | string[]> | undefined;
        if (!inertiaErrors || Object.keys(inertiaErrors).length === 0) {
            return;
        }

        setDeleteClientError(resolveDeleteError(inertiaErrors));
    }, [deleteOpen, deleteSubmitting, pageErrors]);

    const confirmDelete = () => {
        if (!deletingTeacher || deleteSubmitting) {
            return;
        }

        const freshTeacher = resolveTeacherFromProps(deletingTeacher);
        const payloadResult = buildDeletePayload(freshTeacher, deleteAssignments, replacementTeacherOptions);

        if (!payloadResult.valid) {
            setDeleteClientError(payloadResult.error);
            return;
        }

        if (!canConfirmDelete) {
            setDeleteClientError('Select a valid replacement professor for every handled subject.');
            return;
        }

        let destination: string;
        try {
            destination = route('teachers.reassign-and-destroy', freshTeacher.id);
        } catch {
            setDeleteClientError('Delete action is unavailable. Refresh the page and try again.');
            return;
        }

        setDeleteClientError(null);

        router.post(destination, payloadResult.data, {
            preserveScroll: true,
            only: ['teachers', 'scheduleAssignments', 'teacherOptions', 'flash'],
            onStart: () => {
                setDeleteSubmitting(true);
            },
            onSuccess: () => {
                handleDeleteOpenChange(false);
            },
            onError: (errors) => {
                setDeleteClientError(resolveDeleteError(errors));
            },
            onCancel: () => {
                setDeleteSubmitting(false);
            },
            onFinish: () => {
                setDeleteSubmitting(false);
            },
        });
    };

    const reassignmentError =
        reassignmentForm.errors.assignments ??
        Object.entries(reassignmentForm.errors)
            .filter(([key]) => key.startsWith('assignments.'))
            .map(([, message]) => message)
            .join(' ');

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Teachers" />
            <div className="space-y-6 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <h1 className="font-serif text-3xl font-bold uppercase tracking-tight sm:text-4xl md:text-5xl">Teachers</h1>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Button
                            type="button"
                            variant="outline"
                            className="font-serif"
                            onClick={() => handleReassignOpenChange(true)}
                        >
                            <Users className="mr-2 size-4" aria-hidden />
                            Change Subject Professor
                        </Button>
                        <Button type="button" className="font-serif" onClick={() => setAddOpen(true)}>
                            <Plus className="mr-2 size-4" aria-hidden />
                            Add Teacher
                        </Button>
                    </div>
                </div>

                <ActiveCurriculumSemesterBanner />

                <div className="overflow-x-auto rounded-lg border border-border/80 bg-card shadow-sm">
                    <table className="w-full min-w-[720px] text-left text-sm">
                        <thead className="border-b border-border/80 bg-muted/40 font-serif">
                            <tr>
                                <th className="px-4 py-3 font-semibold">Name</th>
                                <th className="px-4 py-3 font-semibold">Employment Status</th>
                                <th className="px-4 py-3 font-semibold">Subjects</th>
                                <th className="w-px px-2 py-3 text-right font-semibold sm:px-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="font-serif">
                            {teachers.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="text-muted-foreground px-4 py-6">
                                        No teachers yet. Use Add Teacher to register faculty.
                                    </td>
                                </tr>
                            ) : (
                                teachers.map((teacher) => (
                                    <tr key={teacher.id} className="border-b border-border/60 last:border-0">
                                        <td className="px-4 py-3 font-medium">
                                            {teacher.teacher_name}
                                            {teacher.is_default ? <DefaultCurriculumBadge /> : null}
                                        </td>
                                        <td className="px-4 py-3">{teacher.status}</td>
                                        <td className="px-4 py-3">
                                            <SubjectSummaryCell teacher={teacher} onView={openSubjectsModal} />
                                        </td>
                                        <td className="px-2 py-2 text-right sm:px-4">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-9 w-9 shrink-0"
                                                        aria-label={`Actions for ${teacher.teacher_name}`}
                                                    >
                                                        <Menu className="size-4" aria-hidden />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="min-w-[10rem]">
                                                    <DropdownMenuItem className="font-serif" onClick={() => openView(teacher)}>
                                                        View
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="font-serif" onClick={() => openEdit(teacher)}>
                                                        Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="text-destructive focus:text-destructive font-serif"
                                                        onClick={() => openDeleteConfirm(teacher)}
                                                    >
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Subject assignments */}
                <Dialog open={subjectsOpen} onOpenChange={handleSubjectsOpenChange}>
                    <DialogContent className="flex max-h-[90vh] flex-col gap-0 p-0 sm:max-w-lg">
                        <DialogHeader className="shrink-0 border-b border-border/80 px-6 py-4">
                            <DialogTitle className="font-serif">
                                {subjectsTeacher ? `${subjectsTeacher.teacher_name} — Subjects` : 'Subjects'}
                            </DialogTitle>
                            <DialogDescription>Subjects currently handled by this professor.</DialogDescription>
                        </DialogHeader>

                        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
                            {sortedSubjectAssignments.length === 0 ? (
                                <p className="text-muted-foreground font-serif text-sm">No assigned subjects.</p>
                            ) : (
                                <ul className="space-y-3">
                                    {sortedSubjectAssignments.map((assignment) => (
                                        <SubjectAssignmentListItem
                                            key={assignment.schedule_id}
                                            assignment={assignment}
                                        />
                                    ))}
                                </ul>
                            )}
                        </div>

                        <DialogFooter className="shrink-0 border-t border-border/80 px-6 py-4">
                            <Button
                                type="button"
                                variant="outline"
                                className="font-serif"
                                onClick={() => handleSubjectsOpenChange(false)}
                            >
                                Close
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Change Subject Professor */}
                <Dialog open={reassignOpen} onOpenChange={handleReassignOpenChange}>
                    <DialogContent className="flex max-h-[90vh] flex-col gap-0 p-0 sm:max-w-4xl">
                        <DialogHeader className="shrink-0 border-b border-border/80 px-6 py-4">
                            <DialogTitle className="font-serif">Change Subject Professor</DialogTitle>
                            <DialogDescription>
                                Reassign professors for scheduled subjects. Only available professors are shown for each time slot.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
                            {reassignClientMessage ? (
                                <p className="text-muted-foreground mb-4 font-serif text-sm" role="status">
                                    {reassignClientMessage}
                                </p>
                            ) : null}
                            {reassignmentError ? (
                                <p className="text-destructive mb-4 font-serif text-sm" role="alert">
                                    {reassignmentError}
                                </p>
                            ) : null}

                            {teacherCards.length === 0 ? (
                                <p className="text-muted-foreground font-serif text-sm">No assigned subjects yet.</p>
                            ) : (
                                <div className="space-y-4">
                                    {teacherCards.map((card) => (
                                        <section
                                            key={card.teacherId}
                                            className="rounded-lg border border-border/80 bg-muted/20 p-4"
                                        >
                                            <div className="mb-3 border-b border-border/60 pb-2">
                                                <h3 className="font-serif text-base font-semibold">{card.teacherName}</h3>
                                                {card.teacherStatus ? (
                                                    <p className="text-muted-foreground text-xs">{card.teacherStatus}</p>
                                                ) : null}
                                            </div>

                                            <div className="hidden gap-3 border-b border-border/40 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:grid sm:grid-cols-[1fr_minmax(12rem,14rem)]">
                                                <span>Subject &amp; Schedule</span>
                                                <span>Assigned Professor</span>
                                            </div>

                                            <ul className="divide-y divide-border/50">
                                                {card.assignments.map((assignment) => {
                                                    const selectedTeacherId =
                                                        selections[assignment.schedule_id] ?? assignment.teacher_id;
                                                    const availableTeachers = getAvailableTeachersForSchedule(
                                                        assignment,
                                                        conflictSchedules,
                                                        teacherOptions,
                                                        selectedTeacherId,
                                                    );
                                                    const scheduleContext = formatScheduleContext(assignment);
                                                    const selectId = `reassign-teacher-${assignment.schedule_id}`;

                                                    return (
                                                        <li
                                                            key={assignment.schedule_id}
                                                            className="grid gap-3 py-3 sm:grid-cols-[1fr_minmax(12rem,14rem)] sm:items-center"
                                                        >
                                                            <div className="min-w-0 space-y-0.5">
                                                                <p className="truncate font-medium">{assignment.subject_label}</p>
                                                                <p className="text-muted-foreground text-xs">
                                                                    {formatScheduleLabel(assignment)}
                                                                </p>
                                                                {scheduleContext ? (
                                                                    <p className="text-muted-foreground truncate text-xs">
                                                                        {scheduleContext}
                                                                    </p>
                                                                ) : null}
                                                            </div>

                                                            <div className="min-w-0">
                                                                <Label htmlFor={selectId} className="sr-only sm:not-sr-only sm:mb-1 sm:block">
                                                                    Assigned professor
                                                                </Label>
                                                                {availableTeachers.length === 0 ? (
                                                                    <p className="text-destructive text-xs">
                                                                        No available professors for this schedule.
                                                                    </p>
                                                                ) : (
                                                                    <Select
                                                                        value={String(selectedTeacherId)}
                                                                        onValueChange={(value) =>
                                                                            handleSelectionChange(
                                                                                assignment.schedule_id,
                                                                                Number(value),
                                                                            )
                                                                        }
                                                                    >
                                                                        <SelectTrigger id={selectId} className="font-serif">
                                                                            <SelectValue placeholder="Select professor" />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            {availableTeachers.map((teacher) => (
                                                                                <SelectItem
                                                                                    key={teacher.id}
                                                                                    value={String(teacher.id)}
                                                                                >
                                                                                    {teacher.name}
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                )}
                                                            </div>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        </section>
                                    ))}
                                </div>
                            )}
                        </div>

                        <DialogFooter className="shrink-0 gap-2 border-t border-border/80 px-6 py-4 sm:gap-0">
                            <Button
                                type="button"
                                variant="outline"
                                className="font-serif"
                                disabled={reassignmentForm.processing}
                                onClick={() => handleReassignOpenChange(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                className="font-serif"
                                disabled={reassignmentForm.processing || teacherCards.length === 0}
                                onClick={handleReassignSaveClick}
                            >
                                Save
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={confirmReassignOpen} onOpenChange={setConfirmReassignOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="font-serif">Confirm reassignments</DialogTitle>
                            <DialogDescription>
                                Save {changedAssignments.length} professor reassignment
                                {changedAssignments.length === 1 ? '' : 's'}? This will update the assigned schedules.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button
                                type="button"
                                variant="outline"
                                className="font-serif"
                                disabled={reassignmentForm.processing}
                                onClick={() => setConfirmReassignOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                className="font-serif"
                                disabled={reassignmentForm.processing}
                                onClick={confirmReassignments}
                            >
                                {reassignmentForm.processing ? 'Saving…' : 'Confirm Save'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Add Teacher */}
                <Dialog open={addOpen} onOpenChange={handleAddOpenChange}>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle className="font-serif">Add Teacher</DialogTitle>
                            <DialogDescription>Enter the faculty member&apos;s name and employment status.</DialogDescription>
                        </DialogHeader>

                        <form className="space-y-4" onSubmit={handleAddSubmit}>
                            {addClientError ? (
                                <p className="text-destructive text-sm" role="alert">
                                    {addClientError}
                                </p>
                            ) : null}

                            <div className="space-y-2">
                                <Label htmlFor="add_teacher_name">Teacher Name</Label>
                                <Input
                                    id="add_teacher_name"
                                    name="teacher_name"
                                    value={addForm.data.teacher_name}
                                    onChange={(event) => handleAddTeacherNameChange(event.target.value)}
                                    placeholder="e.g. Maria Santos"
                                    autoComplete="name"
                                    className="font-serif"
                                />
                                <InputError message={addForm.errors.teacher_name} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="add_teacher_status">Status</Label>
                                <Select value={addForm.data.status} onValueChange={handleAddTeacherStatusChange}>
                                    <SelectTrigger id="add_teacher_status" className="font-serif">
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {TEACHER_STATUS_OPTIONS.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={addForm.errors.status} />
                            </div>

                            <DefaultCurriculumField
                                id="add_teacher_is_default"
                                checked={addForm.data.is_default}
                                onCheckedChange={handleAddTeacherDefaultChange}
                            />
                            <InputError message={addForm.errors.is_default} />

                            <DialogFooter className="gap-2 sm:gap-0">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="font-serif"
                                    onClick={() => handleAddOpenChange(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    className="font-serif"
                                    disabled={addForm.processing || hasTeacherNameDuplicateError(addForm)}
                                >
                                    Save
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* View Teacher */}
                <Dialog open={viewOpen} onOpenChange={handleViewOpenChange}>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle className="font-serif">Teacher details</DialogTitle>
                            <DialogDescription>Information returned from the server for this faculty member.</DialogDescription>
                        </DialogHeader>

                        {viewLoading ? (
                            <p className="text-muted-foreground font-serif text-sm">Loading…</p>
                        ) : viewError ? (
                            <p className="text-destructive font-serif text-sm" role="alert">
                                {viewError}
                            </p>
                        ) : viewTeacher ? (
                            <dl className="grid gap-3 font-serif text-sm sm:grid-cols-2">
                                <div className="sm:col-span-2">
                                    <dt className="text-muted-foreground">Teacher Name</dt>
                                    <dd className="mt-0.5 font-medium">{viewTeacher.teacher_name}</dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground">Status</dt>
                                    <dd className="mt-0.5 font-medium">{viewTeacher.status}</dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground">Default curriculum</dt>
                                    <dd className="mt-0.5 font-medium">{viewTeacher.is_default ? 'Included' : 'Not included'}</dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground">Added</dt>
                                    <dd className="mt-0.5 font-medium">{formatTeacherDate(viewTeacher.created_at)}</dd>
                                </div>
                                <div className="sm:col-span-2">
                                    <dt className="text-muted-foreground">Last updated</dt>
                                    <dd className="mt-0.5 font-medium">{formatTeacherDate(viewTeacher.updated_at)}</dd>
                                </div>
                            </dl>
                        ) : null}

                        <DialogFooter>
                            <Button type="button" variant="outline" className="font-serif" onClick={() => handleViewOpenChange(false)}>
                                Close
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Edit Teacher */}
                <Dialog open={editOpen} onOpenChange={handleEditOpenChange}>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle className="font-serif">Edit Teacher</DialogTitle>
                            <DialogDescription>Update the faculty member&apos;s name and status.</DialogDescription>
                        </DialogHeader>

                        <form className="space-y-4" onSubmit={handleEditSubmit}>
                            {editClientError ? (
                                <p className="text-destructive text-sm" role="alert">
                                    {editClientError}
                                </p>
                            ) : null}

                            <div className="space-y-2">
                                <Label htmlFor="edit_teacher_name">Teacher Name</Label>
                                <Input
                                    id="edit_teacher_name"
                                    name="teacher_name"
                                    value={editForm.data.teacher_name}
                                    onChange={(event) => handleEditTeacherNameChange(event.target.value)}
                                    autoComplete="name"
                                    className="font-serif"
                                />
                                <InputError message={editForm.errors.teacher_name} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit_teacher_status">Status</Label>
                                <Select value={editForm.data.status} onValueChange={handleEditTeacherStatusChange}>
                                    <SelectTrigger id="edit_teacher_status" className="font-serif">
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {TEACHER_STATUS_OPTIONS.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={editForm.errors.status} />
                            </div>

                            <DefaultCurriculumField
                                id="edit_teacher_is_default"
                                checked={editForm.data.is_default}
                                onCheckedChange={handleEditTeacherDefaultChange}
                            />
                            <InputError message={editForm.errors.is_default} />

                            <DialogFooter className="gap-2 sm:gap-0">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="font-serif"
                                    onClick={() => handleEditOpenChange(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    className="font-serif"
                                    disabled={editForm.processing || hasTeacherNameDuplicateError(editForm)}
                                >
                                    Save
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Delete teacher with reassignment */}
                <Dialog open={deleteOpen} onOpenChange={handleDeleteOpenChange}>
                    <DialogContent className="flex max-h-[90vh] flex-col gap-0 p-0 sm:max-w-4xl">
                        <DialogHeader className="shrink-0 border-b border-border/80 px-6 py-4">
                            <DialogTitle className="font-serif">Delete professor</DialogTitle>
                            <DialogDescription>
                                {deletingTeacher ? (
                                    <>
                                        You are deleting{' '}
                                        <span className="text-foreground font-medium">{deletingTeacher.teacher_name}</span>.
                                        {deletingSubjectAssignments.length > 0
                                            ? ' Reassign every handled subject to an available professor before confirming.'
                                            : ' This professor has no assigned subjects and can be deleted immediately.'}
                                    </>
                                ) : (
                                    'Confirm professor deletion.'
                                )}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
                            {deletingTeacher && deletingSubjectAssignments.length > 0 ? (
                                <p
                                    className="mb-4 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100"
                                    role="status"
                                >
                                    Deleting a professor with handled subjects requires reassignment first. Confirm Delete stays disabled
                                    until every subject has a valid replacement professor.
                                </p>
                            ) : null}

                            {deleteClientError ? (
                                <p className="text-destructive mb-4 font-serif text-sm" role="alert">
                                    {deleteClientError}
                                </p>
                            ) : null}

                            {deletingTeacher ? (
                                <section className="rounded-lg border border-border/80 bg-muted/20 p-4">
                                    <div className="mb-3 border-b border-border/60 pb-2">
                                        <h3 className="font-serif text-base font-semibold">{deletingTeacher.teacher_name}</h3>
                                        <p className="text-muted-foreground text-xs">{deletingTeacher.status}</p>
                                    </div>

                                    {deletingSubjectAssignments.length === 0 ? (
                                        <p className="text-muted-foreground font-serif text-sm">No assigned subjects.</p>
                                    ) : (
                                        <>
                                            <div className="hidden gap-3 border-b border-border/40 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:grid sm:grid-cols-[1fr_minmax(12rem,14rem)]">
                                                <span>Subject &amp; Schedule</span>
                                                <span>Replacement Professor</span>
                                            </div>

                                            <ul className="divide-y divide-border/50">
                                                {deletingSubjectAssignments.map((assignment) => {
                                                    const selectedReplacement = deleteAssignments[assignment.schedule_id] ?? '';
                                                    const selectedReplacementId = selectedReplacement
                                                        ? Number(selectedReplacement)
                                                        : undefined;
                                                    const availableReplacements = deletingTeacher
                                                        ? getAvailableReplacementTeachers(
                                                              assignment,
                                                              deleteConflictSchedules,
                                                              replacementTeacherOptions,
                                                              deletingTeacher.id,
                                                              selectedReplacementId,
                                                          )
                                                        : [];
                                                    const subjectContext = formatSubjectContext(assignment);
                                                    const selectId = `delete-replacement-${assignment.schedule_id}`;

                                                    return (
                                                        <li
                                                            key={assignment.schedule_id}
                                                            className="grid gap-3 py-3 sm:grid-cols-[1fr_minmax(12rem,14rem)] sm:items-center"
                                                        >
                                                            <div className="min-w-0 space-y-0.5">
                                                                <p className="font-medium leading-snug">
                                                                    {assignment.subject_label || assignment.subject_name}
                                                                </p>
                                                                <p className="text-muted-foreground text-xs">
                                                                    {formatSchedule(
                                                                        assignment.day,
                                                                        assignment.start_time,
                                                                        assignment.end_time,
                                                                    )}
                                                                </p>
                                                                <p className="text-muted-foreground text-xs">
                                                                    {subjectContext ?? '—'}
                                                                </p>
                                                            </div>

                                                            <div className="min-w-0">
                                                                <Label
                                                                    htmlFor={selectId}
                                                                    className="sr-only sm:not-sr-only sm:mb-1 sm:block"
                                                                >
                                                                    Replacement professor
                                                                </Label>
                                                                {availableReplacements.length === 0 ? (
                                                                    <p className="text-destructive text-xs">
                                                                        No available replacement professors for this schedule.
                                                                    </p>
                                                                ) : (
                                                                    <Select
                                                                        value={selectedReplacement}
                                                                        disabled={deleteSubmitting}
                                                                        onValueChange={(value) =>
                                                                            handleDeleteAssignmentChange(
                                                                                assignment.schedule_id,
                                                                                value,
                                                                            )
                                                                        }
                                                                    >
                                                                        <SelectTrigger id={selectId} className="font-serif">
                                                                            <SelectValue placeholder="Select replacement" />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            {availableReplacements.map((teacher) => (
                                                                                <SelectItem
                                                                                    key={teacher.id}
                                                                                    value={String(teacher.id)}
                                                                                >
                                                                                    {teacher.name}
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                )}
                                                            </div>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        </>
                                    )}
                                </section>
                            ) : null}
                        </div>

                        <DialogFooter className="shrink-0 gap-2 border-t border-border/80 px-6 py-4 sm:gap-0">
                            <Button
                                type="button"
                                variant="outline"
                                className="font-serif"
                                disabled={deleteSubmitting}
                                onClick={() => handleDeleteOpenChange(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                variant="destructive"
                                className="font-serif"
                                disabled={!deletingTeacher || !canConfirmDelete || deleteSubmitting}
                                onClick={confirmDelete}
                            >
                                {deleteSubmitting ? 'Saving and deleting…' : 'Confirm Delete'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}



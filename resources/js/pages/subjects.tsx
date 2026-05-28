import DefaultCurriculumBadge from '@/components/default-curriculum-badge';
import DefaultCurriculumField from '@/components/default-curriculum-field';
import InputError from '@/components/input-error';
import SubjectFormModal from '@/components/subjects/subject-form-modal';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ActiveCurriculumSemesterBanner from '@/components/active-curriculum-semester-banner';
import AppLayout from '@/layouts/app-layout';
import {
    getDefaultSubjectDuplicateErrors,
    hasDefaultSubjectDuplicates,
    type DefaultSubjectRecordForValidation,
} from '@/lib/default-curriculum-duplicate-validation';
import {
    getSubjectDuplicateErrors,
    hasSubjectDuplicates,
    type SubjectDuplicateFieldErrors,
    type SubjectFormFields,
} from '@/lib/subject-duplicate-validation';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { cn } from '@/lib/utils';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { Loader2, Menu } from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';

const scrollHide =
    'overflow-y-auto overscroll-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden';

const deleteDialogContentClass =
    'flex max-h-[min(90vh,100dvh-2rem)] flex-col overflow-hidden sm:max-w-2xl';

type DeletePreviewSchedule = {
    id: number;
    day: string;
    start_time: string;
    end_time: string;
    subject_label: string | null;
    teacher_name: string | null;
    section_name: string | null;
    comlab_name: string | null;
};

function deleteConfirmationPhrase(subject: SubjectRecord): string {
    return `DELETE ${subject.subject_code}`;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Subjects',
        href: '/subjects',
    },
];

type SelectOption = {
    id: number;
    name: string;
};

type SubjectRecordForValidation = {
    id: number;
    subject_code: string;
    subject_name: string;
    semester_id: number;
    year_level_id: number;
};

type SubjectsProps = {
    subjects: SubjectRecord[];
    subjectsForValidation: SubjectRecordForValidation[];
    defaultSubjectsForValidation?: DefaultSubjectRecordForValidation[];
    semesters: SelectOption[];
    yearLevels: SelectOption[];
    filters: SubjectFilters;
};

function getCombinedSubjectDuplicateErrors(
    subjectsForValidation: SubjectRecordForValidation[],
    defaultSubjectsForValidation: DefaultSubjectRecordForValidation[],
    fields: SubjectFormFields,
    isDefault: boolean,
    excludeId?: number,
): SubjectDuplicateFieldErrors {
    return {
        ...getSubjectDuplicateErrors(subjectsForValidation, fields, excludeId),
        ...getDefaultSubjectDuplicateErrors(defaultSubjectsForValidation, fields, isDefault, excludeId),
    };
}

type SubjectRecord = {
    id: number;
    subject_code: string;
    subject_name: string;
    semester_id: number;
    year_level_id: number;
    semester_name: string | null;
    year_level_name: string | null;
    is_default: boolean;
};

type SubjectEditFormData = {
    subject_code: string;
    subject_name: string;
    semester_id: string;
    year_level_id: string;
    is_default: boolean;
};

type SubjectFilters = {
    semester_id: string | null;
    year_level_id: string | null;
};

const initialEditFormData: SubjectEditFormData = {
    subject_code: '',
    subject_name: '',
    semester_id: '',
    year_level_id: '',
    is_default: false,
};

export default function Subjects({
    subjects,
    subjectsForValidation,
    defaultSubjectsForValidation = [],
    semesters,
    yearLevels,
    filters,
}: SubjectsProps) {
    const page = usePage<SharedData & { filters: SubjectFilters }>();
    const { activeCurriculumSemester } = page.props;
    const previousCurriculumId = useRef(activeCurriculumSemester?.id);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [subjectForView, setSubjectForView] = useState<SubjectRecord | null>(null);
    const [subjectForEdit, setSubjectForEdit] = useState<SubjectRecord | null>(null);
    const [subjectForDelete, setSubjectForDelete] = useState<SubjectRecord | null>(null);
    const [subjectDeletePreview, setSubjectDeletePreview] = useState<DeletePreviewSchedule[]>([]);
    const [subjectDeletePreviewLoading, setSubjectDeletePreviewLoading] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const editSubjectForm = useForm<SubjectEditFormData>(initialEditFormData);
    const [editClientErrors, setEditClientErrors] = useState<SubjectDuplicateFieldErrors>({});
    const [isDeleting, setIsDeleting] = useState(false);

    const requiredDeletePhrase = useMemo(
        () => (subjectForDelete ? deleteConfirmationPhrase(subjectForDelete) : ''),
        [subjectForDelete],
    );

    const canConfirmDelete =
        subjectForDelete !== null &&
        deleteConfirmText === requiredDeletePhrase &&
        subjectDeletePreview.length === 0 &&
        !subjectDeletePreviewLoading;
    const [filterYearLevelId, setFilterYearLevelId] = useState(filters.year_level_id ?? 'all');
    const [filterSemesterId, setFilterSemesterId] = useState(filters.semester_id ?? 'all');

    useEffect(() => {
        setFilterYearLevelId(filters.year_level_id ?? 'all');
        setFilterSemesterId(filters.semester_id ?? 'all');
    }, [filters.year_level_id, filters.semester_id]);

    useEffect(() => {
        const curriculumId = activeCurriculumSemester?.id;

        if (curriculumId == null) {
            return;
        }

        if (previousCurriculumId.current != null && previousCurriculumId.current !== curriculumId) {
            setFilterYearLevelId('all');
            setFilterSemesterId('all');

            if (page.url.startsWith('/subjects')) {
                router.get(route('subjects'), {}, { replace: true, preserveScroll: true });
            }
        }

        previousCurriculumId.current = curriculumId;
    }, [activeCurriculumSemester?.id, page.url]);

    const openEditModal = (subject: SubjectRecord) => {
        setSubjectForEdit(subject);
        editSubjectForm.setData({
            subject_code: subject.subject_code,
            subject_name: subject.subject_name,
            semester_id: String(subject.semester_id),
            year_level_id: String(subject.year_level_id),
            is_default: subject.is_default,
        });
        editSubjectForm.clearErrors();
        setEditClientErrors({});
    };

    const handleEditSubjectDialogChange = (open: boolean) => {
        if (!open) {
            setSubjectForEdit(null);
            editSubjectForm.reset();
            editSubjectForm.clearErrors();
            setEditClientErrors({});
        }
    };

    const applyEditDuplicateValidation = (fields: SubjectEditFormData) => {
        setEditClientErrors(
            getCombinedSubjectDuplicateErrors(
                subjectsForValidation,
                defaultSubjectsForValidation,
                fields,
                fields.is_default,
                subjectForEdit?.id,
            ),
        );
    };

    const resolveEditError = (field: 'subject_code' | 'subject_name'): string | undefined => {
        return editClientErrors[field] ?? editSubjectForm.errors[field];
    };

    const handleEditSubjectCodeChange = (value: string) => {
        const next = { ...editSubjectForm.data, subject_code: value };
        editSubjectForm.setData('subject_code', value);
        applyEditDuplicateValidation(next);
    };

    const handleEditSubjectNameChange = (value: string) => {
        const next = { ...editSubjectForm.data, subject_name: value };
        editSubjectForm.setData('subject_name', value);
        applyEditDuplicateValidation(next);
    };

    const handleEditSemesterChange = (value: string) => {
        const next = { ...editSubjectForm.data, semester_id: value };
        editSubjectForm.setData('semester_id', value);
        editSubjectForm.clearErrors('semester_id');
        applyEditDuplicateValidation(next);
    };

    const handleEditYearLevelChange = (value: string) => {
        const next = { ...editSubjectForm.data, year_level_id: value };
        editSubjectForm.setData('year_level_id', value);
        editSubjectForm.clearErrors('year_level_id');
        applyEditDuplicateValidation(next);
    };

    const handleEditDefaultChange = (checked: boolean) => {
        const next = { ...editSubjectForm.data, is_default: checked };
        editSubjectForm.setData('is_default', checked);
        applyEditDuplicateValidation(next);
    };

    const handleEditSubjectSave = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!subjectForEdit) {
            return;
        }

        const duplicateErrors = getCombinedSubjectDuplicateErrors(
            subjectsForValidation,
            defaultSubjectsForValidation,
            editSubjectForm.data,
            editSubjectForm.data.is_default,
            subjectForEdit.id,
        );
        if (Object.keys(duplicateErrors).length > 0) {
            setEditClientErrors(duplicateErrors);
            return;
        }

        if (
            hasSubjectDuplicates(subjectsForValidation, editSubjectForm.data, subjectForEdit.id) ||
            hasDefaultSubjectDuplicates(
                defaultSubjectsForValidation,
                editSubjectForm.data,
                editSubjectForm.data.is_default,
                subjectForEdit.id,
            )
        ) {
            return;
        }

        setEditClientErrors({});

        editSubjectForm.put(route('subjects.update', subjectForEdit.id), {
            preserveScroll: true,
            onSuccess: () => {
                setSubjectForEdit(null);
                editSubjectForm.reset();
            },
            onError: () => {
                setEditClientErrors({});
            },
        });
    };

    const resetSubjectDeleteModal = () => {
        setSubjectForDelete(null);
        setSubjectDeletePreview([]);
        setSubjectDeletePreviewLoading(false);
        setDeleteConfirmText('');
    };

    const loadSubjectDeletePreview = async (subject: SubjectRecord) => {
        setSubjectForDelete(subject);
        setSubjectDeletePreview([]);
        setSubjectDeletePreviewLoading(true);
        setDeleteConfirmText('');

        try {
            const response = await fetch(route('subjects.delete-preview', subject.id), {
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
            });

            if (!response.ok) {
                throw new Error('Failed to load delete preview');
            }

            const data = (await response.json()) as { schedules?: DeletePreviewSchedule[] };
            setSubjectDeletePreview(data.schedules ?? []);
        } catch {
            resetSubjectDeleteModal();
        } finally {
            setSubjectDeletePreviewLoading(false);
        }
    };

    const handleDeleteSubject = () => {
        if (!subjectForDelete || !canConfirmDelete) {
            return;
        }

        setIsDeleting(true);

        router.delete(route('subjects.destroy', subjectForDelete.id), {
            preserveScroll: true,
            onSuccess: () => {
                resetSubjectDeleteModal();
            },
            onFinish: () => {
                setIsDeleting(false);
            },
        });
    };

    const applyFilters = (yearLevelId: string, semesterId: string) => {
        router.get(
            route('subjects'),
            {
                year_level_id: yearLevelId === 'all' ? undefined : yearLevelId,
                semester_id: semesterId === 'all' ? undefined : semesterId,
            },
            {
                preserveScroll: true,
                replace: true,
            },
        );
    };

    const handleYearLevelFilterChange = (value: string) => {
        setFilterYearLevelId(value);
        applyFilters(value, filterSemesterId);
    };

    const handleSemesterFilterChange = (value: string) => {
        setFilterSemesterId(value);
        applyFilters(filterYearLevelId, value);
    };

    const visibleYearLevels =
        filterYearLevelId === 'all' ? yearLevels : yearLevels.filter((yearLevel) => String(yearLevel.id) === filterYearLevelId);

    const visibleSemesters =
        filterSemesterId === 'all' ? semesters : semesters.filter((semester) => String(semester.id) === filterSemesterId);

    const subjectGroups = visibleYearLevels.flatMap((yearLevel) =>
        visibleSemesters.map((semester) => ({
            key: `${yearLevel.id}-${semester.id}`,
            title: `${yearLevel.name} - ${semester.name}`,
            subjects: subjects.filter(
                (subject) => subject.year_level_id === yearLevel.id && subject.semester_id === semester.id,
            ),
        })),
    );

    const renderSubjectRow = (subject: SubjectRecord) => (
        <tr key={subject.id} className="bg-background">
            <td className="px-4 py-3 font-serif text-sm">
                {subject.subject_code}
                {subject.is_default ? <DefaultCurriculumBadge /> : null}
            </td>
            <td className="px-4 py-3 font-serif text-sm">{subject.subject_name}</td>
            <td className="px-4 py-3 text-right">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button type="button" variant="ghost" className="h-9 w-9 p-0 font-serif" aria-label="Open actions menu">
                            <Menu className="h-5 w-5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuItem onClick={() => setSubjectForView(subject)}>View</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEditModal(subject)}>Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => loadSubjectDeletePreview(subject)}>Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </td>
        </tr>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Subjects" />
            <div className="space-y-6 p-4">
                <div className="flex items-center justify-between gap-4">
                    <h1 className="font-serif text-3xl font-bold uppercase tracking-tight sm:text-4xl md:text-5xl">Subjects</h1>
                    <Button type="button" className="font-serif" onClick={() => setIsCreateModalOpen(true)}>
                        Add Subject
                    </Button>
                </div>

                <ActiveCurriculumSemesterBanner hint="First/Second semester and year level filters apply within this curriculum only" />

                <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                        <Label htmlFor="filter_year_level_id">Year Level</Label>
                        <Select value={filterYearLevelId} onValueChange={handleYearLevelFilterChange}>
                            <SelectTrigger id="filter_year_level_id" className="font-serif">
                                <SelectValue placeholder="Select year level" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Year Levels</SelectItem>
                                {yearLevels.map((yearLevel) => (
                                    <SelectItem key={yearLevel.id} value={String(yearLevel.id)}>
                                        {yearLevel.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="filter_semester_id">Semester</Label>
                        <Select value={filterSemesterId} onValueChange={handleSemesterFilterChange}>
                            <SelectTrigger id="filter_semester_id" className="font-serif">
                                <SelectValue placeholder="Select semester" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Semesters</SelectItem>
                                {semesters.map((semester) => (
                                    <SelectItem key={semester.id} value={String(semester.id)}>
                                        {semester.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                </div>

                <div className="space-y-8">
                    {subjectGroups.length > 0 ? (
                        subjectGroups.map(({ key, title, subjects: groupSubjects }) => (
                        <section key={key} className="space-y-3">
                            <h2 className="font-serif text-xl font-bold tracking-tight">{title}</h2>
                            <div className="overflow-x-auto rounded-lg border bg-card">
                                <table className="min-w-full divide-y divide-border">
                                    <thead className="bg-muted/40">
                                        <tr>
                                            <th className="px-4 py-3 text-left font-serif text-sm font-semibold">Subject Code</th>
                                            <th className="px-4 py-3 text-left font-serif text-sm font-semibold">Subject Name</th>
                                            <th className="px-4 py-3 text-right font-serif text-sm font-semibold">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {groupSubjects.length > 0 ? (
                                            groupSubjects.map(renderSubjectRow)
                                        ) : (
                                            <tr>
                                                <td colSpan={3} className="px-4 py-8 text-center font-serif text-sm text-muted-foreground">
                                                    No subjects for this year level and semester.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                        ))
                    ) : (
                        <p className="font-serif text-sm text-muted-foreground">No tables match the selected filters.</p>
                    )}
                </div>
            </div>

            <SubjectFormModal
                open={isCreateModalOpen}
                onOpenChange={setIsCreateModalOpen}
                semesters={semesters}
                yearLevels={yearLevels}
                subjectsForValidation={subjectsForValidation}
                defaultSubjectsForValidation={defaultSubjectsForValidation}
            />

            <Dialog open={subjectForView !== null} onOpenChange={(open) => !open && setSubjectForView(null)}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>View Subject</DialogTitle>
                        <DialogDescription>Read-only subject details prepared for future show() integration.</DialogDescription>
                    </DialogHeader>

                    {subjectForView && (
                        <div className="space-y-3">
                            <div>
                                <p className="font-serif text-sm font-semibold">Subject Code</p>
                                <p className="font-serif text-sm">{subjectForView.subject_code}</p>
                            </div>
                            <div>
                                <p className="font-serif text-sm font-semibold">Subject Name</p>
                                <p className="font-serif text-sm">{subjectForView.subject_name}</p>
                            </div>
                            <div>
                                <p className="font-serif text-sm font-semibold">Semester</p>
                                <p className="font-serif text-sm">{subjectForView.semester_name ?? '-'}</p>
                            </div>
                            <div>
                                <p className="font-serif text-sm font-semibold">Year Level</p>
                                <p className="font-serif text-sm">{subjectForView.year_level_name ?? '-'}</p>
                            </div>
                            <div>
                                <p className="font-serif text-sm font-semibold">Default curriculum</p>
                                <p className="font-serif text-sm">{subjectForView.is_default ? 'Included' : 'Not included'}</p>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={subjectForEdit !== null} onOpenChange={handleEditSubjectDialogChange}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Edit Subject</DialogTitle>
                        <DialogDescription>Update subject details. Changes are saved to the database.</DialogDescription>
                    </DialogHeader>

                    <form className="space-y-4" onSubmit={handleEditSubjectSave}>
                        <div className="space-y-2">
                            <Label htmlFor="edit_subject_code">Subject Code</Label>
                            <Input
                                id="edit_subject_code"
                                name="subject_code"
                                value={editSubjectForm.data.subject_code}
                                onChange={(event) => handleEditSubjectCodeChange(event.target.value)}
                                autoComplete="off"
                            />
                            <InputError message={resolveEditError('subject_code')} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit_subject_name">Subject Name</Label>
                            <Input
                                id="edit_subject_name"
                                name="subject_name"
                                value={editSubjectForm.data.subject_name}
                                onChange={(event) => handleEditSubjectNameChange(event.target.value)}
                                autoComplete="off"
                            />
                            <InputError message={resolveEditError('subject_name')} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit_semester_id">Semester</Label>
                            <Select
                                value={editSubjectForm.data.semester_id || undefined}
                                onValueChange={handleEditSemesterChange}
                            >
                                <SelectTrigger id="edit_semester_id">
                                    <SelectValue placeholder="Select semester" />
                                </SelectTrigger>
                                <SelectContent>
                                    {semesters.map((semester) => (
                                        <SelectItem key={semester.id} value={String(semester.id)}>
                                            {semester.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <InputError message={editSubjectForm.errors.semester_id} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit_year_level_id">Year Level</Label>
                            <Select
                                value={editSubjectForm.data.year_level_id || undefined}
                                onValueChange={handleEditYearLevelChange}
                            >
                                <SelectTrigger id="edit_year_level_id">
                                    <SelectValue placeholder="Select year level" />
                                </SelectTrigger>
                                <SelectContent>
                                    {yearLevels.map((yearLevel) => (
                                        <SelectItem key={yearLevel.id} value={String(yearLevel.id)}>
                                            {yearLevel.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <InputError message={editSubjectForm.errors.year_level_id} />
                        </div>

                        <DefaultCurriculumField
                            id="edit_subject_is_default"
                            checked={editSubjectForm.data.is_default}
                            onCheckedChange={handleEditDefaultChange}
                        />
                        <InputError message={editSubjectForm.errors.is_default} />

                        <DialogFooter className="gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                className="font-serif"
                                onClick={() => handleEditSubjectDialogChange(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" className="font-serif" disabled={editSubjectForm.processing}>
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog
                open={subjectForDelete !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        resetSubjectDeleteModal();
                    }
                }}
            >
                <DialogContent className={deleteDialogContentClass}>
                    <DialogHeader className="shrink-0">
                        <DialogTitle>Delete Subject</DialogTitle>
                        <DialogDescription>
                            {subjectDeletePreview.length > 0
                                ? 'This subject cannot be deleted while it has active schedule(s) in the current curriculum semester.'
                                : 'This action cannot be undone.'}
                        </DialogDescription>
                    </DialogHeader>

                    {subjectForDelete && (
                        <div className={cn('min-h-0 flex-1 space-y-4', scrollHide)}>
                            {subjectDeletePreviewLoading ? (
                                <div
                                    className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground"
                                    role="status"
                                    aria-live="polite"
                                >
                                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                                    Loading affected schedules…
                                </div>
                            ) : subjectDeletePreview.length > 0 ? (
                                <section className="overflow-x-auto rounded-lg border bg-card">
                                    <table className="min-w-full divide-y divide-border text-sm">
                                        <thead className="bg-muted/40">
                                            <tr>
                                                <th className="px-3 py-2 text-left font-serif font-semibold">Day</th>
                                                <th className="px-3 py-2 text-left font-serif font-semibold">Time</th>
                                                <th className="px-3 py-2 text-left font-serif font-semibold">Section</th>
                                                <th className="px-3 py-2 text-left font-serif font-semibold">Teacher</th>
                                                <th className="px-3 py-2 text-left font-serif font-semibold">Comlab</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {subjectDeletePreview.map((schedule) => (
                                                <tr key={schedule.id} className="bg-background">
                                                    <td className="px-3 py-2 font-serif">{schedule.day}</td>
                                                    <td className="px-3 py-2 font-serif">
                                                        {schedule.start_time} – {schedule.end_time}
                                                    </td>
                                                    <td className="px-3 py-2 font-serif">{schedule.section_name ?? '—'}</td>
                                                    <td className="px-3 py-2 font-serif">{schedule.teacher_name ?? '—'}</td>
                                                    <td className="px-3 py-2 font-serif">{schedule.comlab_name ?? '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </section>
                            ) : (
                                <div className="space-y-4">
                                    <p className="font-serif text-sm">
                                        Delete{' '}
                                        <span className="font-semibold">
                                            {subjectForDelete.subject_code} — {subjectForDelete.subject_name}
                                        </span>
                                        ?
                                    </p>
                                    <p className="font-serif text-sm text-muted-foreground">
                                        Type <span className="font-mono text-foreground">{requiredDeletePhrase}</span> to confirm
                                        deletion.
                                    </p>
                                    <div className="space-y-2">
                                        <Label htmlFor="delete_subject_confirm">Confirmation</Label>
                                        <Input
                                            id="delete_subject_confirm"
                                            value={deleteConfirmText}
                                            onChange={(event) => setDeleteConfirmText(event.target.value)}
                                            placeholder={requiredDeletePhrase}
                                            className="font-mono font-serif text-sm"
                                            autoComplete="off"
                                            disabled={isDeleting}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter className="shrink-0 gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            className="font-serif"
                            onClick={resetSubjectDeleteModal}
                            disabled={isDeleting}
                        >
                            Cancel
                        </Button>
                        {subjectDeletePreview.length === 0 && !subjectDeletePreviewLoading ? (
                            <Button
                                type="button"
                                variant="destructive"
                                className="font-serif"
                                onClick={handleDeleteSubject}
                                disabled={!canConfirmDelete || isDeleting}
                            >
                                {isDeleting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                                        Deleting…
                                    </>
                                ) : (
                                    'Delete'
                                )}
                            </Button>
                        ) : null}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}



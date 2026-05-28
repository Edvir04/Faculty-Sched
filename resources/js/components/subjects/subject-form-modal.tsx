import DefaultCurriculumField from '@/components/default-curriculum-field';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    getDefaultSubjectDuplicateErrors,
    hasDefaultSubjectDuplicates,
    type DefaultSubjectRecordForValidation,
} from '@/lib/default-curriculum-duplicate-validation';
import {
    getSubjectDuplicateErrors,
    hasSubjectDuplicates,
    type SubjectDuplicateFieldErrors,
    type SubjectRecordForValidation,
} from '@/lib/subject-duplicate-validation';
import { useForm } from '@inertiajs/react';
import { type FormEvent, useState } from 'react';

type SelectOption = {
    id: number;
    name: string;
};

type SubjectFormModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    semesters: SelectOption[];
    yearLevels: SelectOption[];
    subjectsForValidation: SubjectRecordForValidation[];
    defaultSubjectsForValidation?: DefaultSubjectRecordForValidation[];
};

type SubjectFormData = {
    subject_code: string;
    subject_name: string;
    semester_id: string;
    year_level_id: string;
    is_default: boolean;
};

const initialData: SubjectFormData = {
    subject_code: '',
    subject_name: '',
    semester_id: '',
    year_level_id: '',
    is_default: false,
};

function getCombinedSubjectDuplicateErrors(
    subjectsForValidation: SubjectRecordForValidation[],
    defaultSubjectsForValidation: DefaultSubjectRecordForValidation[],
    fields: SubjectFormData,
    excludeId?: number,
): SubjectDuplicateFieldErrors {
    return {
        ...getSubjectDuplicateErrors(subjectsForValidation, fields, excludeId),
        ...getDefaultSubjectDuplicateErrors(defaultSubjectsForValidation, fields, fields.is_default, excludeId),
    };
}

export default function SubjectFormModal({
    open,
    onOpenChange,
    semesters,
    yearLevels,
    subjectsForValidation = [],
    defaultSubjectsForValidation = [],
}: SubjectFormModalProps) {
    const form = useForm<SubjectFormData>(initialData);
    const [clientErrors, setClientErrors] = useState<SubjectDuplicateFieldErrors>({});

    const handleModalOpenChange = (nextOpen: boolean) => {
        if (!nextOpen) {
            form.reset();
            form.clearErrors();
            setClientErrors({});
        }
        onOpenChange(nextOpen);
    };

    const applyDuplicateValidation = (fields: SubjectFormData) => {
        setClientErrors(
            getCombinedSubjectDuplicateErrors(
                subjectsForValidation,
                defaultSubjectsForValidation,
                fields,
            ),
        );
    };

    const resolveError = (field: 'subject_code' | 'subject_name'): string | undefined => {
        return clientErrors[field] ?? form.errors[field];
    };

    const handleSubjectCodeChange = (value: string) => {
        const next = { ...form.data, subject_code: value };
        form.setData('subject_code', value);
        applyDuplicateValidation(next);
    };

    const handleSubjectNameChange = (value: string) => {
        const next = { ...form.data, subject_name: value };
        form.setData('subject_name', value);
        applyDuplicateValidation(next);
    };

    const handleSemesterChange = (value: string) => {
        const next = { ...form.data, semester_id: value };
        form.setData('semester_id', value);
        form.clearErrors('semester_id');
        applyDuplicateValidation(next);
    };

    const handleYearLevelChange = (value: string) => {
        const next = { ...form.data, year_level_id: value };
        form.setData('year_level_id', value);
        form.clearErrors('year_level_id');
        applyDuplicateValidation(next);
    };

    const handleDefaultChange = (checked: boolean) => {
        const next = { ...form.data, is_default: checked };
        form.setData('is_default', checked);
        applyDuplicateValidation(next);
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const duplicateErrors = getCombinedSubjectDuplicateErrors(
            subjectsForValidation,
            defaultSubjectsForValidation,
            form.data,
        );
        if (Object.keys(duplicateErrors).length > 0) {
            setClientErrors(duplicateErrors);
            return;
        }

        if (
            hasSubjectDuplicates(subjectsForValidation, form.data) ||
            hasDefaultSubjectDuplicates(defaultSubjectsForValidation, form.data, form.data.is_default)
        ) {
            return;
        }

        setClientErrors({});

        form.post(route('subjects.store'), {
            preserveScroll: true,
            onSuccess: () => {
                handleModalOpenChange(false);
            },
            onError: () => {
                setClientErrors({});
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={handleModalOpenChange}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Add Subject</DialogTitle>
                    <DialogDescription>Set the subject details and assign semester and year level from the database.</DialogDescription>
                </DialogHeader>

                <form className="space-y-4" onSubmit={handleSubmit}>
                    <div className="space-y-2">
                        <Label htmlFor="subject_code">Subject Code</Label>
                        <Input
                            id="subject_code"
                            name="subject_code"
                            value={form.data.subject_code}
                            onChange={(event) => handleSubjectCodeChange(event.target.value)}
                            placeholder="e.g. CS101"
                            autoComplete="off"
                        />
                        <InputError message={resolveError('subject_code')} />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="subject_name">Subject Name</Label>
                        <Input
                            id="subject_name"
                            name="subject_name"
                            value={form.data.subject_name}
                            onChange={(event) => handleSubjectNameChange(event.target.value)}
                            placeholder="e.g. Introduction to Computing"
                            autoComplete="off"
                        />
                        <InputError message={resolveError('subject_name')} />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="add_semester_id">Semester</Label>
                        <Select value={form.data.semester_id || undefined} onValueChange={handleSemesterChange}>
                            <SelectTrigger id="add_semester_id">
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
                        <InputError message={form.errors.semester_id} />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="add_year_level_id">Year Level</Label>
                        <Select value={form.data.year_level_id || undefined} onValueChange={handleYearLevelChange}>
                            <SelectTrigger id="add_year_level_id">
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
                        <InputError message={form.errors.year_level_id} />
                    </div>

                    <DefaultCurriculumField
                        id="subject_is_default"
                        checked={form.data.is_default}
                        onCheckedChange={handleDefaultChange}
                    />
                    <InputError message={form.errors.is_default} />

                    <DialogFooter className="gap-2">
                        <Button type="button" variant="outline" className="font-serif" onClick={() => handleModalOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" className="font-serif" disabled={form.processing}>
                            Save
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

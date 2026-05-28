import DefaultCurriculumField from '@/components/default-curriculum-field';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { refreshAfterCurriculumSemesterChange } from '@/lib/curriculum-semester-navigation';
import { cn } from '@/lib/utils';
import { type SharedData } from '@/types';
import { router, useForm, usePage } from '@inertiajs/react';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { toast } from 'sonner';

export type CurriculumSemesterOption = {
    id: number;
    label: string;
    name: string;
    school_year: string | null;
    is_active: boolean;
};

const SEMESTER_NAME_OPTIONS = ['1st Semester', '2nd Semester', 'Summer Semester'] as const;

type AddCurriculumSemesterForm = {
    name: string;
    school_year: string;
    use_default_curriculum: boolean;
    is_active: boolean;
};

const initialAddForm: AddCurriculumSemesterForm = {
    name: '',
    school_year: '',
    use_default_curriculum: true,
    is_active: true,
};

function deleteConfirmationPhrase(semester: CurriculumSemesterOption): string {
    return `DELETE ${semester.label}`;
}

export default function CurriculumSemesterHeroPicker() {
    const { curriculumSemesters = [], activeCurriculumSemester = null } = usePage<SharedData>().props;
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [activatingId, setActivatingId] = useState<number | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<CurriculumSemesterOption | null>(null);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const addForm = useForm<AddCurriculumSemesterForm>(initialAddForm);

    const triggerLabel = activeCurriculumSemester?.label ?? 'No Available Semester';

    const requiredDeletePhrase = useMemo(
        () => (deleteTarget ? deleteConfirmationPhrase(deleteTarget) : ''),
        [deleteTarget],
    );

    const canConfirmDelete = deleteTarget !== null && deleteConfirmText === requiredDeletePhrase;

    const handleActivate = (semester: CurriculumSemesterOption) => {
        if (semester.id === activeCurriculumSemester?.id) {
            return;
        }

        setActivatingId(semester.id);

        router.patch(
            route('curriculum-semesters.activate', semester.id),
            {},
            {
                onFinish: () => setActivatingId(null),
                onSuccess: () => {
                    toast.success(`${semester.label} is now the active semester.`);
                    refreshAfterCurriculumSemesterChange();
                },
            },
        );
    };

    const handleAddModalOpenChange = (open: boolean) => {
        setAddModalOpen(open);
        if (!open) {
            addForm.reset();
            addForm.clearErrors();
        }
    };

    const handleDeleteModalOpenChange = (open: boolean) => {
        if (!open && isDeleting) {
            return;
        }

        if (!open) {
            setDeleteTarget(null);
            setDeleteConfirmText('');
        }
    };

    const openDeleteModal = (semester: CurriculumSemesterOption) => {
        setDeleteTarget(semester);
        setDeleteConfirmText('');
    };

    const handleDeleteSubmit = () => {
        if (!deleteTarget || !canConfirmDelete) {
            return;
        }

        setIsDeleting(true);

        router.delete(route('curriculum-semesters.destroy', deleteTarget.id), {
            preserveScroll: true,
            onSuccess: () => {
                handleDeleteModalOpenChange(false);
                refreshAfterCurriculumSemesterChange();
            },
            onError: () => {
                toast.error('Could not delete this curriculum semester. Please try again.');
            },
            onFinish: () => {
                setIsDeleting(false);
            },
        });
    };

    const handleAddSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        addForm.post(route('curriculum-semesters.store'), {
            preserveScroll: true,
            onSuccess: () => {
                handleAddModalOpenChange(false);
                refreshAfterCurriculumSemesterChange();
            },
        });
    };

    return (
        <>
            <div className="absolute right-4 top-4 z-20 w-[calc(100%-2rem)] sm:w-auto md:right-14">
                <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                        <Button
                            type="button"
                            variant="secondary"
                            className={cn(
                                'h-10 w-full justify-between gap-2 border border-white/20 bg-white/95 px-3 font-serif text-sm shadow-md',
                                'text-neutral-900 hover:bg-white hover:text-neutral-900',
                                'dark:border-white/25 dark:bg-white/95 dark:text-neutral-900 dark:hover:bg-white dark:hover:text-neutral-900',
                                'sm:min-w-[220px] sm:max-w-[320px]',
                            )}
                            aria-label="Select curriculum semester"
                        >
                            <span className="truncate text-left text-inherit">{triggerLabel}</span>
                            <ChevronDown className="size-4 shrink-0 text-inherit opacity-70" aria-hidden />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        align="end"
                        className="max-h-[min(16rem,50vh)] w-[min(100vw-2rem,22rem)] overflow-y-auto font-serif"
                    >
                        {curriculumSemesters.length === 0 ? (
                            <div className="px-2 py-2 text-sm text-muted-foreground">No semesters created yet</div>
                        ) : (
                            curriculumSemesters.map((semester) => {
                                const isActive = semester.id === activeCurriculumSemester?.id;

                                return (
                                    <DropdownMenuItem
                                        key={semester.id}
                                        className="flex items-center gap-2 py-2 pr-1"
                                        disabled={activatingId === semester.id}
                                        onSelect={(event) => {
                                            event.preventDefault();
                                            handleActivate(semester);
                                        }}
                                    >
                                        <span className={cn('min-w-0 flex-1 truncate', isActive && 'font-semibold')}>
                                            {semester.label}
                                        </span>
                                        {isActive ? (
                                            <Badge variant="secondary" className="shrink-0 text-xs font-normal">
                                                Active
                                            </Badge>
                                        ) : null}
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
                                            aria-label={`Delete ${semester.label}`}
                                            disabled={isDeleting}
                                            onPointerDown={(event) => {
                                                event.preventDefault();
                                                event.stopPropagation();
                                            }}
                                            onClick={(event) => {
                                                event.preventDefault();
                                                event.stopPropagation();
                                                openDeleteModal(semester);
                                            }}
                                        >
                                            <Trash2 className="size-4" aria-hidden />
                                        </Button>
                                    </DropdownMenuItem>
                                );
                            })
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className="gap-2 font-medium"
                            onSelect={(event) => {
                                event.preventDefault();
                                handleAddModalOpenChange(true);
                            }}
                        >
                            <Plus className="size-4" aria-hidden />
                            Add Semester
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <Dialog open={addModalOpen} onOpenChange={handleAddModalOpenChange}>
                <DialogContent className="flex max-h-[min(92vh,calc(100dvh-1rem))] w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg sm:w-full">
                    <DialogHeader className="shrink-0 border-b border-border/60 px-6 pb-4 pt-6 pr-12">
                        <DialogTitle className="font-serif">Add Curriculum Semester</DialogTitle>
                        <DialogDescription className="font-serif">
                            Create a new curriculum semester. You can seed default teachers, comlabs, and subjects when enabled.
                        </DialogDescription>
                    </DialogHeader>

                    <form className="flex min-h-0 flex-1 flex-col overflow-hidden" onSubmit={handleAddSubmit}>
                        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-6 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="curriculum_semester_name">Semester</Label>
                            <Select value={addForm.data.name} onValueChange={(value) => addForm.setData('name', value)}>
                                <SelectTrigger id="curriculum_semester_name" className="font-serif">
                                    <SelectValue placeholder="Select semester" />
                                </SelectTrigger>
                                <SelectContent>
                                    {SEMESTER_NAME_OPTIONS.map((option) => (
                                        <SelectItem key={option} value={option}>
                                            {option}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <InputError message={addForm.errors.name} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="curriculum_semester_school_year">School Year</Label>
                            <Input
                                id="curriculum_semester_school_year"
                                name="school_year"
                                value={addForm.data.school_year}
                                onChange={(event) => addForm.setData('school_year', event.target.value)}
                                placeholder="e.g. 2025-2026"
                                className="font-serif"
                            />
                            <InputError message={addForm.errors.school_year} />
                        </div>

                        <DefaultCurriculumField
                            id="use_default_curriculum"
                            checked={addForm.data.use_default_curriculum}
                            onCheckedChange={(checked) => addForm.setData('use_default_curriculum', checked)}
                            label="Use Default Curriculum"
                            description="When enabled, default teachers, comlabs, and subjects are copied into this semester. Schedules are not created."
                        />
                        <InputError message={addForm.errors.use_default_curriculum} />

                        <div className="flex items-start gap-3 rounded-md border border-border/80 bg-muted/20 p-3">
                            <Checkbox
                                id="curriculum_semester_is_active"
                                checked={addForm.data.is_active}
                                onCheckedChange={(checked) => addForm.setData('is_active', checked === true)}
                            />
                            <div className="grid gap-1 leading-none">
                                <Label htmlFor="curriculum_semester_is_active" className="cursor-pointer font-serif text-sm font-medium">
                                    Set as active semester
                                </Label>
                                <p className="font-serif text-xs text-muted-foreground">
                                    When enabled, this semester becomes the active curriculum semester after creation.
                                </p>
                            </div>
                        </div>
                        </div>

                        <DialogFooter className="shrink-0 gap-2 border-t border-border/60 bg-background px-6 pb-6 pt-4 sm:gap-0">
                            <Button
                                type="button"
                                variant="outline"
                                className="font-serif"
                                onClick={() => handleAddModalOpenChange(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" className="font-serif" disabled={addForm.processing}>
                                {addForm.processing ? 'Creating…' : 'Create Semester'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={deleteTarget !== null} onOpenChange={handleDeleteModalOpenChange}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="font-serif">Delete curriculum semester</DialogTitle>
                        <DialogDescription className="font-serif">
                            {deleteTarget ? (
                                <>
                                    This will delete &quot;{deleteTarget.label}&quot; and its related teachers, comlabs, subjects, and
                                    schedules. This action cannot be undone.
                                </>
                            ) : null}
                        </DialogDescription>
                    </DialogHeader>

                    {deleteTarget ? (
                        <div className="space-y-4">
                            <p className="font-serif text-sm text-muted-foreground">
                                Type{' '}
                                <span className="font-mono text-foreground">{requiredDeletePhrase}</span> to confirm deletion.
                            </p>
                            <div className="space-y-2">
                                <Label htmlFor="delete_curriculum_semester_confirm">Confirmation</Label>
                                <Input
                                    id="delete_curriculum_semester_confirm"
                                    value={deleteConfirmText}
                                    onChange={(event) => setDeleteConfirmText(event.target.value)}
                                    placeholder={requiredDeletePhrase}
                                    className="font-mono font-serif text-sm"
                                    autoComplete="off"
                                    disabled={isDeleting}
                                />
                            </div>
                        </div>
                    ) : null}

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            type="button"
                            variant="outline"
                            className="font-serif"
                            onClick={() => handleDeleteModalOpenChange(false)}
                            disabled={isDeleting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            className="font-serif"
                            disabled={!canConfirmDelete || isDeleting}
                            onClick={handleDeleteSubmit}
                        >
                            {isDeleting ? 'Deleting…' : 'Delete Semester'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}


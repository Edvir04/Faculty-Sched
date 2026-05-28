import DefaultCurriculumBadge from '@/components/default-curriculum-badge';
import DefaultCurriculumField from '@/components/default-curriculum-field';
import ActiveCurriculumSemesterBanner from '@/components/active-curriculum-semester-banner';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { NO_COMLAB_ASSIGNED_LABEL, NO_SECTION_ASSIGNED_LABEL } from '@/lib/schedule-labels';
import {
    DEFAULT_CURRICULUM_DUPLICATE_COMLAB_MESSAGE,
    hasDefaultComlabDuplicate,
    syncDefaultComlabNameDuplicateError,
    type DefaultComlabRecordForValidation,
} from '@/lib/default-curriculum-duplicate-validation';
import {
    hasComlabDuplicate,
    hasSectionDuplicate,
    syncComlabNameDuplicateError,
    syncSectionNameDuplicateError,
} from '@/lib/sections-comlabs-duplicate-validation';
import { pillToggleActiveClass, pillToggleBaseClass, pillToggleInactiveClass } from '@/lib/pill-toggle-classes';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Loader2, Menu } from 'lucide-react';
import { type FormEvent, useState } from 'react';

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

type SectionsView = 'comlabs' | 'subjects';

/** Same shape as `yearLevels` from `SubjectController@index` / Add Subject modal in `subject-form-modal.tsx`. */
type SelectOption = {
    id: number;
    name: string;
};

type ComlabRecord = {
    id: number;
    comlab_name: string;
    campus: string;
    is_default: boolean;
};

type ComlabFormData = {
    comlab_name: string;
    campus: string;
    is_default: boolean;
};

type SectionRecord = {
    id: number;
    section_name: string;
    year_level_id: number;
    year_level_name: string | null;
    comlab_id: number | null;
    comlab_name: string | null;
    comlab_campus: string | null;
};

type CreateSectionFormData = {
    section_name: string;
    year_level_id: string;
};

type SectionsComlabsProps = {
    yearLevels?: SelectOption[];
    comlabs?: ComlabRecord[];
    sections?: SectionRecord[];
    defaultComlabsForValidation?: DefaultComlabRecordForValidation[];
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Sections & Comlabs',
        href: '/sections-comlabs',
    },
];

const CAMPUS_MAIN = 'main-campus';
const CAMPUS_YOUNG_FIELD = 'young-field-campus';

const CAMPUS_LABELS: Record<string, string> = {
    [CAMPUS_MAIN]: 'Main Campus',
    [CAMPUS_YOUNG_FIELD]: 'Young Field Campus',
};

function formatCampus(campus: string): string {
    return CAMPUS_LABELS[campus] ?? campus;
}

const initialComlabForm: ComlabFormData = {
    comlab_name: '',
    campus: '',
    is_default: false,
};

const initialCreateSectionForm: CreateSectionFormData = {
    section_name: '',
    year_level_id: '',
};

export default function SectionsComlabs({
    yearLevels = [],
    comlabs = [],
    sections = [],
    defaultComlabsForValidation = [],
}: SectionsComlabsProps) {
    const [activeView, setActiveView] = useState<SectionsView>('comlabs');
    const [comlabModalOpen, setComlabModalOpen] = useState(false);

    const createComlabForm = useForm<ComlabFormData>(initialComlabForm);
    const editComlabForm = useForm<ComlabFormData>(initialComlabForm);

    const [comlabForView, setComlabForView] = useState<ComlabRecord | null>(null);
    const [comlabForEdit, setComlabForEdit] = useState<ComlabRecord | null>(null);
    const [comlabForDelete, setComlabForDelete] = useState<ComlabRecord | null>(null);
    const [comlabDeletePreview, setComlabDeletePreview] = useState<DeletePreviewSchedule[]>([]);
    const [comlabDeletePreviewLoading, setComlabDeletePreviewLoading] = useState(false);
    const [isDeletingComlab, setIsDeletingComlab] = useState(false);

    const [sectionModalOpen, setSectionModalOpen] = useState(false);
    const createSectionForm = useForm<CreateSectionFormData>(initialCreateSectionForm);
    const editSectionForm = useForm<CreateSectionFormData>(initialCreateSectionForm);

    const [sectionForView, setSectionForView] = useState<SectionRecord | null>(null);
    const [sectionForEdit, setSectionForEdit] = useState<SectionRecord | null>(null);
    const [sectionForDelete, setSectionForDelete] = useState<SectionRecord | null>(null);
    const [sectionDeletePreview, setSectionDeletePreview] = useState<DeletePreviewSchedule[]>([]);
    const [sectionDeletePreviewLoading, setSectionDeletePreviewLoading] = useState(false);
    const [isDeletingSection, setIsDeletingSection] = useState(false);

    const closeComlabDialogs = () => {
        setComlabForView(null);
        setComlabForEdit(null);
        editComlabForm.reset();
        editComlabForm.clearErrors();
        setComlabForDelete(null);
        setComlabDeletePreview([]);
        setComlabDeletePreviewLoading(false);
        setComlabModalOpen(false);
        createComlabForm.reset();
        createComlabForm.clearErrors();
    };

    const closeSectionDialogs = () => {
        setSectionForView(null);
        setSectionForEdit(null);
        editSectionForm.reset();
        editSectionForm.clearErrors();
        setSectionForDelete(null);
        setSectionDeletePreview([]);
        setSectionDeletePreviewLoading(false);
        setSectionModalOpen(false);
        createSectionForm.reset();
        createSectionForm.clearErrors();
    };

    const handleComlabModalOpenChange = (open: boolean) => {
        setComlabModalOpen(open);
        if (!open) {
            createComlabForm.reset();
            createComlabForm.clearErrors();
        }
    };

    const openCreateComlabModal = () => {
        createComlabForm.reset();
        createComlabForm.clearErrors();
        setComlabModalOpen(true);
    };

    const syncCreateComlabDuplicateErrors = () => {
        const { comlab_name, campus, is_default } = createComlabForm.data;
        syncComlabNameDuplicateError(createComlabForm, comlabs, comlab_name);
        syncDefaultComlabNameDuplicateError(
            createComlabForm,
            defaultComlabsForValidation,
            comlab_name,
            campus,
            is_default,
        );
    };

    const syncEditComlabDuplicateErrors = (excludeId?: number) => {
        const { comlab_name, campus, is_default } = editComlabForm.data;
        syncComlabNameDuplicateError(editComlabForm, comlabs, comlab_name, excludeId);
        syncDefaultComlabNameDuplicateError(
            editComlabForm,
            defaultComlabsForValidation,
            comlab_name,
            campus,
            is_default,
            excludeId,
        );
    };

    const handleComlabSave = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        syncCreateComlabDuplicateErrors();
        if (hasComlabDuplicate(comlabs, createComlabForm.data.comlab_name)) {
            return;
        }

        if (
            hasDefaultComlabDuplicate(
                defaultComlabsForValidation,
                createComlabForm.data.comlab_name,
                createComlabForm.data.campus,
                createComlabForm.data.is_default,
            )
        ) {
            createComlabForm.setError('comlab_name', DEFAULT_CURRICULUM_DUPLICATE_COMLAB_MESSAGE);
            return;
        }

        createComlabForm.post(route('comlabs.store'), {
            preserveScroll: true,
            onSuccess: () => {
                handleComlabModalOpenChange(false);
            },
        });
    };

    const handleCreateComlabNameChange = (value: string) => {
        createComlabForm.setData('comlab_name', value);
        if (value.trim() !== '') {
            createComlabForm.clearErrors('comlab_name');
        }
        syncCreateComlabDuplicateErrors();
    };

    const handleCreateComlabCampusChange = (value: string) => {
        createComlabForm.setData('campus', value);
        createComlabForm.clearErrors('campus');
        syncCreateComlabDuplicateErrors();
    };

    const handleCreateComlabDefaultChange = (checked: boolean) => {
        createComlabForm.setData('is_default', checked);
        syncCreateComlabDuplicateErrors();
    };

    const handleEditComlabNameChange = (value: string) => {
        editComlabForm.setData('comlab_name', value);
        if (value.trim() !== '') {
            editComlabForm.clearErrors('comlab_name');
        }
        syncEditComlabDuplicateErrors(comlabForEdit?.id);
    };

    const handleEditComlabCampusChange = (value: string) => {
        editComlabForm.setData('campus', value);
        editComlabForm.clearErrors('campus');
        syncEditComlabDuplicateErrors(comlabForEdit?.id);
    };

    const handleEditComlabDefaultChange = (checked: boolean) => {
        editComlabForm.setData('is_default', checked);
        syncEditComlabDuplicateErrors(comlabForEdit?.id);
    };

    const openEditComlab = (comlab: ComlabRecord) => {
        setComlabForEdit(comlab);
        editComlabForm.setData({
            comlab_name: comlab.comlab_name,
            campus: comlab.campus,
            is_default: comlab.is_default,
        });
        editComlabForm.clearErrors();
        syncEditComlabDuplicateErrors(comlab.id);
    };

    const handleEditComlabDialogChange = (open: boolean) => {
        if (!open) {
            setComlabForEdit(null);
            editComlabForm.reset();
            editComlabForm.clearErrors();
        }
    };

    const handleEditComlabSave = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!comlabForEdit) {
            return;
        }

        syncEditComlabDuplicateErrors(comlabForEdit.id);
        if (hasComlabDuplicate(comlabs, editComlabForm.data.comlab_name, comlabForEdit.id)) {
            return;
        }

        if (
            hasDefaultComlabDuplicate(
                defaultComlabsForValidation,
                editComlabForm.data.comlab_name,
                editComlabForm.data.campus,
                editComlabForm.data.is_default,
                comlabForEdit.id,
            )
        ) {
            editComlabForm.setError('comlab_name', DEFAULT_CURRICULUM_DUPLICATE_COMLAB_MESSAGE);
            return;
        }

        editComlabForm.put(route('comlabs.update', comlabForEdit.id), {
            preserveScroll: true,
            onSuccess: () => {
                setComlabForEdit(null);
                editComlabForm.reset();
            },
        });
    };

    const loadComlabDeletePreview = async (comlab: ComlabRecord) => {
        setComlabForDelete(comlab);
        setComlabDeletePreview([]);
        setComlabDeletePreviewLoading(true);

        try {
            const response = await fetch(route('comlabs.delete-preview', comlab.id), {
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
            setComlabDeletePreview(data.schedules ?? []);
        } catch {
            setComlabForDelete(null);
            setComlabDeletePreview([]);
        } finally {
            setComlabDeletePreviewLoading(false);
        }
    };

    const handleDeleteComlab = () => {
        if (!comlabForDelete) {
            return;
        }

        setIsDeletingComlab(true);

        router.delete(route('comlabs.destroy', comlabForDelete.id), {
            preserveScroll: true,
            onSuccess: () => {
                setComlabForDelete(null);
                setComlabDeletePreview([]);
            },
            onFinish: () => {
                setIsDeletingComlab(false);
            },
        });
    };

    const handleSectionModalOpenChange = (open: boolean) => {
        setSectionModalOpen(open);
        if (!open) {
            createSectionForm.reset();
            createSectionForm.clearErrors();
        }
    };

    const openCreateSectionModal = () => {
        createSectionForm.reset();
        createSectionForm.clearErrors();
        setSectionModalOpen(true);
    };

    const handleSectionSave = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        syncSectionNameDuplicateError(
            createSectionForm,
            sections,
            createSectionForm.data.section_name,
            createSectionForm.data.year_level_id,
        );
        if (hasSectionDuplicate(sections, createSectionForm.data.section_name, createSectionForm.data.year_level_id)) {
            return;
        }

        createSectionForm.post(route('sections.store'), {
            preserveScroll: true,
            onSuccess: () => {
                handleSectionModalOpenChange(false);
            },
        });
    };

    const handleCreateSectionNameChange = (value: string) => {
        const next = { ...createSectionForm.data, section_name: value };
        createSectionForm.setData('section_name', value);
        if (value.trim() !== '') {
            createSectionForm.clearErrors('section_name');
        }
        syncSectionNameDuplicateError(createSectionForm, sections, next.section_name, next.year_level_id);
    };

    const handleCreateYearLevelChange = (value: string) => {
        const next = { ...createSectionForm.data, year_level_id: value };
        createSectionForm.setData('year_level_id', value);
        createSectionForm.clearErrors('year_level_id');
        syncSectionNameDuplicateError(createSectionForm, sections, next.section_name, next.year_level_id);
    };

    const handleEditSectionNameChange = (value: string) => {
        const next = { ...editSectionForm.data, section_name: value };
        editSectionForm.setData('section_name', value);
        if (value.trim() !== '') {
            editSectionForm.clearErrors('section_name');
        }
        syncSectionNameDuplicateError(editSectionForm, sections, next.section_name, next.year_level_id, sectionForEdit?.id);
    };

    const handleEditYearLevelChange = (value: string) => {
        const next = { ...editSectionForm.data, year_level_id: value };
        editSectionForm.setData('year_level_id', value);
        editSectionForm.clearErrors('year_level_id');
        syncSectionNameDuplicateError(editSectionForm, sections, next.section_name, next.year_level_id, sectionForEdit?.id);
    };

    const openEditSection = (section: SectionRecord) => {
        setSectionForEdit(section);
        editSectionForm.setData({
            section_name: section.section_name,
            year_level_id: String(section.year_level_id),
        });
        editSectionForm.clearErrors();
        syncSectionNameDuplicateError(
            editSectionForm,
            sections,
            section.section_name,
            String(section.year_level_id),
            section.id,
        );
    };

    const handleEditSectionDialogChange = (open: boolean) => {
        if (!open) {
            setSectionForEdit(null);
            editSectionForm.reset();
            editSectionForm.clearErrors();
        }
    };

    const handleEditSectionSave = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!sectionForEdit) {
            return;
        }

        syncSectionNameDuplicateError(
            editSectionForm,
            sections,
            editSectionForm.data.section_name,
            editSectionForm.data.year_level_id,
            sectionForEdit.id,
        );
        if (hasSectionDuplicate(sections, editSectionForm.data.section_name, editSectionForm.data.year_level_id, sectionForEdit.id)) {
            return;
        }

        editSectionForm.put(route('sections.update', sectionForEdit.id), {
            preserveScroll: true,
            onSuccess: () => {
                setSectionForEdit(null);
                editSectionForm.reset();
            },
        });
    };

    const loadSectionDeletePreview = async (section: SectionRecord) => {
        setSectionForDelete(section);
        setSectionDeletePreview([]);
        setSectionDeletePreviewLoading(true);

        try {
            const response = await fetch(route('sections.delete-preview', section.id), {
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
            setSectionDeletePreview(data.schedules ?? []);
        } catch {
            setSectionForDelete(null);
            setSectionDeletePreview([]);
        } finally {
            setSectionDeletePreviewLoading(false);
        }
    };

    const handleDeleteSection = () => {
        if (!sectionForDelete) {
            return;
        }

        setIsDeletingSection(true);

        router.delete(route('sections.destroy', sectionForDelete.id), {
            preserveScroll: true,
            onSuccess: () => {
                setSectionForDelete(null);
                setSectionDeletePreview([]);
            },
            onFinish: () => {
                setIsDeletingSection(false);
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Sections & Comlabs" />
            <div className="p-4">
                <section className="w-full space-y-6 text-left" aria-label="Sections and computer labs">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <h1 className="font-serif text-3xl font-bold uppercase tracking-tight sm:text-4xl md:text-5xl">
                            Sections & Comlabs
                        </h1>
                        {activeView === 'comlabs' && (
                            <Button type="button" className="shrink-0 font-serif" onClick={openCreateComlabModal}>
                                New Comlab
                            </Button>
                        )}
                        {activeView === 'subjects' && (
                            <Button type="button" className="shrink-0 font-serif" onClick={openCreateSectionModal}>
                                New Section
                            </Button>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-4">
                        <Button
                            type="button"
                            variant="ghost"
                            className={cn(
                                pillToggleBaseClass,
                                activeView === 'comlabs' ? pillToggleActiveClass : pillToggleInactiveClass,
                            )}
                            onClick={() => {
                                setActiveView('comlabs');
                                closeSectionDialogs();
                            }}
                            aria-pressed={activeView === 'comlabs'}
                        >
                            ComLabs
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            className={cn(
                                pillToggleBaseClass,
                                activeView === 'subjects' ? pillToggleActiveClass : pillToggleInactiveClass,
                            )}
                            onClick={() => {
                                setActiveView('subjects');
                                closeComlabDialogs();
                            }}
                            aria-pressed={activeView === 'subjects'}
                        >
                            Sections
                        </Button>
                    </div>

                    {activeView === 'comlabs' && (
                        <section className="overflow-x-auto rounded-lg border bg-card">
                            <table className="min-w-full divide-y divide-border">
                                <thead className="bg-muted/40">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-serif text-sm font-semibold">Room Name</th>
                                        <th className="px-4 py-3 text-left font-serif text-sm font-semibold">Campus</th>
                                        <th className="px-4 py-3 text-right font-serif text-sm font-semibold">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {comlabs.length > 0 ? (
                                        comlabs.map((comlab) => (
                                            <tr key={comlab.id} className="bg-background">
                                                <td className="px-4 py-3 font-serif text-sm">
                                                    {comlab.comlab_name}
                                                    {comlab.is_default ? <DefaultCurriculumBadge /> : null}
                                                </td>
                                                <td className="px-4 py-3 font-serif text-sm">{formatCampus(comlab.campus)}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                className="h-9 w-9 p-0 font-serif"
                                                                aria-label="Open comlab actions menu"
                                                            >
                                                                <Menu className="h-5 w-5" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-36">
                                                            <DropdownMenuItem onClick={() => setComlabForView(comlab)}>View</DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => openEditComlab(comlab)}>Edit</DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => loadComlabDeletePreview(comlab)}>Delete</DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={3} className="px-4 py-8 text-center font-serif text-sm text-muted-foreground">
                                                No comlabs found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </section>
                    )}

                    {activeView === 'subjects' && (
                        <>
                        <ActiveCurriculumSemesterBanner />
                        <section className="overflow-x-auto rounded-lg border bg-card">
                            <table className="min-w-full divide-y divide-border">
                                <thead className="bg-muted/40">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-serif text-sm font-semibold">Section Name</th>
                                        <th className="px-4 py-3 text-left font-serif text-sm font-semibold">Year Level</th>
                                        <th className="px-4 py-3 text-right font-serif text-sm font-semibold">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {sections.length > 0 ? (
                                        sections.map((section) => (
                                            <tr key={section.id} className="bg-background">
                                                <td className="px-4 py-3 font-serif text-sm">{section.section_name}</td>
                                                <td className="px-4 py-3 font-serif text-sm">{section.year_level_name ?? '-'}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                className="h-9 w-9 p-0 font-serif"
                                                                aria-label="Open section actions menu"
                                                            >
                                                                <Menu className="h-5 w-5" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-36">
                                                            <DropdownMenuItem onClick={() => setSectionForView(section)}>View</DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => openEditSection(section)}>Edit</DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => loadSectionDeletePreview(section)}>Delete</DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={3} className="px-4 py-8 text-center font-serif text-sm text-muted-foreground">
                                                No sections found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </section>
                        </>
                    )}
                </section>
            </div>

            <Dialog open={comlabModalOpen} onOpenChange={handleComlabModalOpenChange}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>New Comlab</DialogTitle>
                        <DialogDescription>Add a computer lab room and assign it to a campus.</DialogDescription>
                    </DialogHeader>

                    <form className="space-y-4" onSubmit={handleComlabSave}>
                        <div className="space-y-2">
                            <Label htmlFor="comlab_room_name">Room Name</Label>
                            <Input
                                id="comlab_room_name"
                                name="comlab_name"
                                value={createComlabForm.data.comlab_name}
                                onChange={(event) => handleCreateComlabNameChange(event.target.value)}
                                placeholder="Enter room name"
                                autoComplete="off"
                            />
                            <InputError message={createComlabForm.errors.comlab_name} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="comlab_campus">Campus</Label>
                            <Select
                                value={createComlabForm.data.campus || undefined}
                                onValueChange={handleCreateComlabCampusChange}
                            >
                                <SelectTrigger id="comlab_campus" className="font-serif">
                                    <SelectValue placeholder="Select campus" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={CAMPUS_MAIN}>Main Campus</SelectItem>
                                    <SelectItem value={CAMPUS_YOUNG_FIELD}>Young Field Campus</SelectItem>
                                </SelectContent>
                            </Select>
                            <InputError message={createComlabForm.errors.campus} />
                        </div>

                        <DefaultCurriculumField
                            id="create_comlab_is_default"
                            checked={createComlabForm.data.is_default}
                            onCheckedChange={handleCreateComlabDefaultChange}
                        />
                        <InputError message={createComlabForm.errors.is_default} />

                        <DialogFooter className="gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                className="font-serif"
                                onClick={() => handleComlabModalOpenChange(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" className="font-serif" disabled={createComlabForm.processing}>
                                Save
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={comlabForView !== null} onOpenChange={(open) => !open && setComlabForView(null)}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>View Comlab</DialogTitle>
                        <DialogDescription>Computer lab details.</DialogDescription>
                    </DialogHeader>

                    {comlabForView && (
                        <div className="space-y-3">
                            <div>
                                <p className="font-serif text-sm font-semibold">Room Name</p>
                                <p className="font-serif text-sm">{comlabForView.comlab_name}</p>
                            </div>
                            <div>
                                <p className="font-serif text-sm font-semibold">Campus</p>
                                <p className="font-serif text-sm">{formatCampus(comlabForView.campus)}</p>
                            </div>
                            <div>
                                <p className="font-serif text-sm font-semibold">Default curriculum</p>
                                <p className="font-serif text-sm">{comlabForView.is_default ? 'Included' : 'Not included'}</p>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={comlabForEdit !== null} onOpenChange={handleEditComlabDialogChange}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Edit Comlab</DialogTitle>
                        <DialogDescription>Update the room name and campus.</DialogDescription>
                    </DialogHeader>

                    <form className="space-y-4" onSubmit={handleEditComlabSave}>
                        <div className="space-y-2">
                            <Label htmlFor="edit_comlab_room_name">Room Name</Label>
                            <Input
                                id="edit_comlab_room_name"
                                name="comlab_name"
                                value={editComlabForm.data.comlab_name}
                                onChange={(event) => handleEditComlabNameChange(event.target.value)}
                                placeholder="Enter room name"
                                autoComplete="off"
                            />
                            <InputError message={editComlabForm.errors.comlab_name} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit_comlab_campus">Campus</Label>
                            <Select
                                value={editComlabForm.data.campus || undefined}
                                onValueChange={handleEditComlabCampusChange}
                            >
                                <SelectTrigger id="edit_comlab_campus" className="font-serif">
                                    <SelectValue placeholder="Select campus" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={CAMPUS_MAIN}>Main Campus</SelectItem>
                                    <SelectItem value={CAMPUS_YOUNG_FIELD}>Young Field Campus</SelectItem>
                                </SelectContent>
                            </Select>
                            <InputError message={editComlabForm.errors.campus} />
                        </div>

                        <DefaultCurriculumField
                            id="edit_comlab_is_default"
                            checked={editComlabForm.data.is_default}
                            onCheckedChange={handleEditComlabDefaultChange}
                        />
                        <InputError message={editComlabForm.errors.is_default} />

                        <DialogFooter className="gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                className="font-serif"
                                onClick={() => handleEditComlabDialogChange(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" className="font-serif" disabled={editComlabForm.processing}>
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog
                open={comlabForDelete !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setComlabForDelete(null);
                        setComlabDeletePreview([]);
                        setComlabDeletePreviewLoading(false);
                    }
                }}
            >
                <DialogContent className={deleteDialogContentClass}>
                    <DialogHeader className="shrink-0">
                        <DialogTitle>Delete Comlab</DialogTitle>
                        <DialogDescription>
                            {comlabDeletePreview.length > 0
                                ? 'Linked schedules will remain. They will show as having no comlab assigned until you edit them.'
                                : 'This action cannot be undone.'}
                        </DialogDescription>
                    </DialogHeader>

                    {comlabForDelete && (
                        <div className={cn('min-h-0 flex-1 space-y-4', scrollHide)}>
                            <p className="font-serif text-sm">
                                Delete <span className="font-semibold">{comlabForDelete.comlab_name}</span> (
                                {formatCampus(comlabForDelete.campus)})?
                            </p>

                            {comlabDeletePreviewLoading ? (
                                <div
                                    className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground"
                                    role="status"
                                    aria-live="polite"
                                >
                                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                                    Loading affected schedules…
                                </div>
                            ) : comlabDeletePreview.length > 0 ? (
                                <section className="overflow-x-auto rounded-lg border bg-card">
                                    <table className="min-w-full divide-y divide-border text-sm">
                                        <thead className="bg-muted/40">
                                            <tr>
                                                <th className="px-3 py-2 text-left font-serif font-semibold">Day</th>
                                                <th className="px-3 py-2 text-left font-serif font-semibold">Time</th>
                                                <th className="px-3 py-2 text-left font-serif font-semibold">Subject</th>
                                                <th className="px-3 py-2 text-left font-serif font-semibold">Teacher</th>
                                                <th className="px-3 py-2 text-left font-serif font-semibold">Section</th>
                                                <th className="px-3 py-2 text-left font-serif font-semibold">After delete</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {comlabDeletePreview.map((schedule) => (
                                                <tr key={schedule.id} className="bg-background">
                                                    <td className="px-3 py-2 font-serif">{schedule.day}</td>
                                                    <td className="px-3 py-2 font-serif">
                                                        {schedule.start_time} – {schedule.end_time}
                                                    </td>
                                                    <td className="px-3 py-2 font-serif">{schedule.subject_label ?? '—'}</td>
                                                    <td className="px-3 py-2 font-serif">{schedule.teacher_name ?? '—'}</td>
                                                    <td className="px-3 py-2 font-serif">{schedule.section_name ?? '—'}</td>
                                                    <td className="px-3 py-2 font-serif text-muted-foreground">{NO_COMLAB_ASSIGNED_LABEL}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </section>
                            ) : null}
                        </div>
                    )}

                    <DialogFooter className="shrink-0 gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            className="font-serif"
                            onClick={() => {
                                setComlabForDelete(null);
                                setComlabDeletePreview([]);
                            }}
                            disabled={isDeletingComlab}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            className="font-serif"
                            onClick={handleDeleteComlab}
                            disabled={isDeletingComlab || comlabDeletePreviewLoading}
                        >
                            {isDeletingComlab ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                                    Deleting…
                                </>
                            ) : comlabDeletePreview.length > 0 ? (
                                'Continue delete'
                            ) : (
                                'Delete'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={sectionModalOpen} onOpenChange={handleSectionModalOpenChange}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>New Section</DialogTitle>
                        <DialogDescription>Set the section name and year level.</DialogDescription>
                    </DialogHeader>

                    <form className="space-y-4" onSubmit={handleSectionSave}>
                        <div className="space-y-2">
                            <Label htmlFor="section_section_name">Section Name</Label>
                            <Input
                                id="section_section_name"
                                name="section_name"
                                value={createSectionForm.data.section_name}
                                onChange={(event) => handleCreateSectionNameChange(event.target.value)}
                                placeholder="Enter section name"
                                autoComplete="off"
                            />
                            <InputError message={createSectionForm.errors.section_name} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="section_year_level_id">Year Level</Label>
                            <Select
                                value={createSectionForm.data.year_level_id || undefined}
                                onValueChange={handleCreateYearLevelChange}
                            >
                                <SelectTrigger id="section_year_level_id">
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
                            <InputError message={createSectionForm.errors.year_level_id} />
                        </div>

                        <DialogFooter className="gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                className="font-serif"
                                onClick={() => handleSectionModalOpenChange(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" className="font-serif" disabled={createSectionForm.processing}>
                                Save
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={sectionForView !== null} onOpenChange={(open) => !open && setSectionForView(null)}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>View Section</DialogTitle>
                        <DialogDescription>Section details.</DialogDescription>
                    </DialogHeader>

                    {sectionForView && (
                        <div className="space-y-3">
                            <div>
                                <p className="font-serif text-sm font-semibold">Section Name</p>
                                <p className="font-serif text-sm">{sectionForView.section_name}</p>
                            </div>
                            <div>
                                <p className="font-serif text-sm font-semibold">Year Level</p>
                                <p className="font-serif text-sm">{sectionForView.year_level_name ?? '-'}</p>
                            </div>
                            <div>
                                <p className="font-serif text-sm font-semibold">Computer Lab</p>
                                <p className="font-serif text-sm">
                                    {sectionForView.comlab_name
                                        ? `${sectionForView.comlab_name}${
                                              sectionForView.comlab_campus ? ` (${formatCampus(sectionForView.comlab_campus)})` : ''
                                          }`
                                        : '-'}
                                </p>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={sectionForEdit !== null} onOpenChange={handleEditSectionDialogChange}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Edit Section</DialogTitle>
                        <DialogDescription>Update the section name and year level.</DialogDescription>
                    </DialogHeader>

                    <form className="space-y-4" onSubmit={handleEditSectionSave}>
                        <div className="space-y-2">
                            <Label htmlFor="edit_section_name">Section Name</Label>
                            <Input
                                id="edit_section_name"
                                name="section_name"
                                value={editSectionForm.data.section_name}
                                onChange={(event) => handleEditSectionNameChange(event.target.value)}
                                placeholder="Enter section name"
                                autoComplete="off"
                            />
                            <InputError message={editSectionForm.errors.section_name} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit_section_year_level_id">Year Level</Label>
                            <Select
                                value={editSectionForm.data.year_level_id || undefined}
                                onValueChange={handleEditYearLevelChange}
                            >
                                <SelectTrigger id="edit_section_year_level_id">
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
                            <InputError message={editSectionForm.errors.year_level_id} />
                        </div>

                        <DialogFooter className="gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                className="font-serif"
                                onClick={() => handleEditSectionDialogChange(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" className="font-serif" disabled={editSectionForm.processing}>
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog
                open={sectionForDelete !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setSectionForDelete(null);
                        setSectionDeletePreview([]);
                        setSectionDeletePreviewLoading(false);
                    }
                }}
            >
                <DialogContent className={deleteDialogContentClass}>
                    <DialogHeader className="shrink-0">
                        <DialogTitle>Delete Section</DialogTitle>
                        <DialogDescription>
                            {sectionDeletePreview.length > 0
                                ? 'Linked schedules will remain. They will show as having no section assigned until you edit them.'
                                : 'This action cannot be undone.'}
                        </DialogDescription>
                    </DialogHeader>

                    {sectionForDelete && (
                        <div className={cn('min-h-0 flex-1 space-y-4', scrollHide)}>
                            <p className="font-serif text-sm">
                                Delete <span className="font-semibold">{sectionForDelete.section_name}</span> (
                                {sectionForDelete.year_level_name ?? 'Year level'})?
                            </p>

                            {sectionDeletePreviewLoading ? (
                                <div
                                    className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground"
                                    role="status"
                                    aria-live="polite"
                                >
                                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                                    Loading affected schedules…
                                </div>
                            ) : sectionDeletePreview.length > 0 ? (
                                <section className="overflow-x-auto rounded-lg border bg-card">
                                    <table className="min-w-full divide-y divide-border text-sm">
                                        <thead className="bg-muted/40">
                                            <tr>
                                                <th className="px-3 py-2 text-left font-serif font-semibold">Day</th>
                                                <th className="px-3 py-2 text-left font-serif font-semibold">Time</th>
                                                <th className="px-3 py-2 text-left font-serif font-semibold">Subject</th>
                                                <th className="px-3 py-2 text-left font-serif font-semibold">Teacher</th>
                                                <th className="px-3 py-2 text-left font-serif font-semibold">Comlab</th>
                                                <th className="px-3 py-2 text-left font-serif font-semibold">After delete</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {sectionDeletePreview.map((schedule) => (
                                                <tr key={schedule.id} className="bg-background">
                                                    <td className="px-3 py-2 font-serif">{schedule.day}</td>
                                                    <td className="px-3 py-2 font-serif">
                                                        {schedule.start_time} – {schedule.end_time}
                                                    </td>
                                                    <td className="px-3 py-2 font-serif">{schedule.subject_label ?? '—'}</td>
                                                    <td className="px-3 py-2 font-serif">{schedule.teacher_name ?? '—'}</td>
                                                    <td className="px-3 py-2 font-serif">{schedule.comlab_name ?? '—'}</td>
                                                    <td className="px-3 py-2 font-serif text-muted-foreground">{NO_SECTION_ASSIGNED_LABEL}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </section>
                            ) : null}
                        </div>
                    )}

                    <DialogFooter className="shrink-0 gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            className="font-serif"
                            onClick={() => {
                                setSectionForDelete(null);
                                setSectionDeletePreview([]);
                            }}
                            disabled={isDeletingSection}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            className="font-serif"
                            onClick={handleDeleteSection}
                            disabled={isDeletingSection || sectionDeletePreviewLoading}
                        >
                            {isDeletingSection ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                                    Deleting…
                                </>
                            ) : sectionDeletePreview.length > 0 ? (
                                'Continue delete'
                            ) : (
                                'Delete'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

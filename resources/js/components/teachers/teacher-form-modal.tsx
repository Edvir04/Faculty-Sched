import DefaultCurriculumField from '@/components/default-curriculum-field';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from '@inertiajs/react';
import { type FormEvent } from 'react';
import { TEACHER_STATUS_OPTIONS } from './employment-options';

type TeacherFormData = {
    teacher_name: string;
    status: string;
    is_default: boolean;
};

const initialData: TeacherFormData = {
    teacher_name: '',
    status: '',
    is_default: false,
};

type TeacherFormModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

export default function TeacherFormModal({ open, onOpenChange }: TeacherFormModalProps) {
    const { data, setData, post, processing, errors, reset, clearErrors } = useForm<TeacherFormData>(initialData);

    const handleOpenChange = (nextOpen: boolean) => {
        onOpenChange(nextOpen);
        if (!nextOpen) {
            reset();
            clearErrors();
        }
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        post(route('teachers.store'), {
            preserveScroll: true,
            onSuccess: () => {
                onOpenChange(false);
                reset();
                clearErrors();
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Add Teacher</DialogTitle>
                    <DialogDescription>Register a faculty member and their employment type.</DialogDescription>
                </DialogHeader>

                <form className="space-y-4" onSubmit={handleSubmit}>
                    <div className="space-y-2">
                        <Label htmlFor="teacher_name">Name</Label>
                        <Input
                            id="teacher_name"
                            name="teacher_name"
                            value={data.teacher_name}
                            onChange={(event) => setData('teacher_name', event.target.value)}
                            placeholder="e.g. Maria Santos"
                            autoComplete="name"
                        />
                        <InputError message={errors.teacher_name} />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <Select value={data.status} onValueChange={(value) => setData('status', value)}>
                            <SelectTrigger id="status" className="font-serif">
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
                        <InputError message={errors.status} />
                    </div>

                    <DefaultCurriculumField
                        id="teacher_form_is_default"
                        checked={data.is_default}
                        onCheckedChange={(checked) => setData('is_default', checked)}
                    />
                    <InputError message={errors.is_default} />

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button type="button" variant="outline" className="font-serif" onClick={() => handleOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" className="font-serif" disabled={processing}>
                            Save Teacher
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

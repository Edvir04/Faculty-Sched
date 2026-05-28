import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

type DefaultCurriculumFieldProps = {
    id: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    label?: string;
    description?: string;
};

export default function DefaultCurriculumField({
    id,
    checked,
    onCheckedChange,
    label = 'Include in Default Curriculum',
    description = 'When enabled, this item can be copied into new semesters that use the default curriculum setup.',
}: DefaultCurriculumFieldProps) {
    return (
        <div className="flex items-start gap-3 rounded-md border border-border/80 bg-muted/20 p-3">
            <Checkbox id={id} checked={checked} onCheckedChange={(value) => onCheckedChange(value === true)} />
            <div className="grid gap-1 leading-none">
                <Label htmlFor={id} className="cursor-pointer font-serif text-sm font-medium">
                    {label}
                </Label>
                <p className="font-serif text-xs text-muted-foreground">{description}</p>
            </div>
        </div>
    );
}

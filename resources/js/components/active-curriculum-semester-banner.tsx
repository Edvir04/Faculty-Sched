import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';

type ActiveCurriculumSemesterBannerProps = {
    /** Extra context shown after the active semester label. */
    hint?: string;
};

export default function ActiveCurriculumSemesterBanner({ hint }: ActiveCurriculumSemesterBannerProps) {
    const { activeCurriculumSemester } = usePage<SharedData>().props;

    if (!activeCurriculumSemester) {
        return null;
    }

    return (
        <p className="font-serif text-sm text-muted-foreground">
            Active curriculum semester:{' '}
            <span className="font-medium text-foreground">{activeCurriculumSemester.label}</span>
            {hint ? `. ${hint}` : null}
        </p>
    );
}

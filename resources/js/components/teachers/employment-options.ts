export const TEACHER_STATUS_OPTIONS = [
    { value: 'Regular', label: 'Regular' },
    { value: 'Part-Time', label: 'Part-Time' },
] as const;

export type TeacherStatusValue = (typeof TEACHER_STATUS_OPTIONS)[number]['value'];

export function formatTeacherStatusLabel(value: string): string {
    const match = TEACHER_STATUS_OPTIONS.find((option) => option.value === value);
    return match?.label ?? value;
}

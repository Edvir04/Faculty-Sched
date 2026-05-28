import { ComlabScheduleCard } from '@/components/comlab-schedule-card';
import CurriculumSemesterHeroPicker from '@/components/dashboard/curriculum-semester-hero-picker';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { groupSchedulesByComlab } from '@/lib/schedule-labels';
import { pillToggleActiveClass, pillToggleBaseClass, pillToggleInactiveClass } from '@/lib/pill-toggle-classes';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import { CalendarDays, LayoutGrid, Monitor, Users, type LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';

type DashboardView = 'schedules' | 'teachers';

type DashboardTeacher = {
    name: string;
    employment_status: string;
};

type DashboardComlab = {
    id: number;
    name: string;
    campus?: string;
};

type DashboardSchedule = {
    id: number;
    comlab_id: number | null;
    day: string;
    start_time: string;
    end_time: string;
    section_name: string | null;
    subject_label: string | null;
    teacher_name: string | null;
    comlab_name: string | null;
};

type DashboardStats = {
    teachers: number;
    schedules: number;
    sections: number;
};

type DashboardProps = {
    comlabs?: DashboardComlab[];
    schedules?: DashboardSchedule[];
    teachers?: DashboardTeacher[];
    stats?: DashboardStats;
};

/** Dashboard hero overlay — #1e1b7a at 80% opacity */
const HERO_OVERLAY_R = 30;
const HERO_OVERLAY_G = 27;
const HERO_OVERLAY_B = 122;
const HERO_OVERLAY_A = 0.8;

const heroOverlayStyle: CSSProperties = {
    backgroundColor: `rgba(${HERO_OVERLAY_R}, ${HERO_OVERLAY_G}, ${HERO_OVERLAY_B}, ${HERO_OVERLAY_A})`,
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
];

export default function Dashboard({
    comlabs = [],
    schedules = [],
    teachers = [],
    stats = { teachers: 0, schedules: 0, sections: 0 },
}: DashboardProps) {
    const { activeCurriculumSemester = null } = usePage<SharedData>().props;
    const [activeView, setActiveView] = useState<DashboardView>('schedules');
    const sectionTitle = activeView === 'schedules' ? 'COMLAB SCHEDULE' : 'IT - FACULTY';

    const [scheduleClock, setScheduleClock] = useState(() => new Date());
    useEffect(() => {
        const id = window.setInterval(() => setScheduleClock(new Date()), 60_000);
        return () => window.clearInterval(id);
    }, []);

    const statCards: { label: string; value: string; icon: LucideIcon }[] = [
        { label: 'Teachers', value: String(stats.teachers), icon: Users },
        { label: 'Assigned Schedules', value: String(stats.schedules), icon: CalendarDays },
        { label: 'Sections', value: String(stats.sections), icon: LayoutGrid },
    ];

    const schedulesByComlab = useMemo(() => groupSchedulesByComlab(schedules, comlabs), [schedules, comlabs]);

    const hasActiveSemester = activeCurriculumSemester !== null;

    return (
        <AppLayout
            breadcrumbs={breadcrumbs}
            beforeContent={
                <div className="relative block w-full min-h-44 min-w-0 shrink-0 md:min-h-64 lg:min-h-72">
                    <div
                        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
                        style={{ backgroundImage: "url('/images/LNU.jfif')" }}
                        aria-hidden
                    />
                    <div className="absolute inset-0 z-[1]" style={heroOverlayStyle} aria-hidden />
                    <CurriculumSemesterHeroPicker />
                    <div
                        className={cn(
                            'absolute bottom-0 left-1/2 z-[2] w-full max-w-7xl -translate-x-1/2 translate-y-1/2',
                            'px-4',
                        )}
                    >
                        <div
                            className={cn(
                                'mx-auto flex max-w-6xl flex-col gap-5 sm:flex-row sm:justify-center sm:gap-5 md:gap-8',
                            )}
                        >
                            {statCards.map((stat) => {
                                const Icon = stat.icon;
                                return (
                                    <Card
                                        key={stat.label}
                                        className={cn(
                                            'w-full border-border/80 bg-card shadow-md sm:min-w-0 sm:flex-1',
                                            'sm:max-w-[360px] md:max-w-[380px]',
                                            'transform-gpu transition-all duration-300 ease-out will-change-transform',
                                            'hover:scale-[1.05] hover:-translate-y-[5px]',
                                            'hover:shadow-[0_12px_40px_-8px_rgba(250,204,21,0.45),0_4px_16px_-4px_rgba(250,204,21,0.2)]',
                                            'motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:hover:translate-y-0 motion-reduce:hover:shadow-md',
                                        )}
                                    >
                                        <div className="flex items-start gap-5 p-6 sm:gap-6 sm:p-8">
                                            <div
                                                className={cn(
                                                    'flex size-14 shrink-0 items-center justify-center rounded-full',
                                                    'bg-yellow-400 text-neutral-900 dark:bg-yellow-400 dark:text-neutral-900 sm:size-16',
                                                )}
                                                aria-hidden
                                            >
                                                <Icon className="size-7 sm:size-8" strokeWidth={1.75} />
                                            </div>
                                            <div className="flex min-w-0 flex-1 flex-col gap-2">
                                                <p className="text-muted-foreground text-base font-medium leading-tight">
                                                    {stat.label}
                                                </p>
                                                <p className="text-4xl font-semibold tracking-tight text-card-foreground tabular-nums sm:text-[2.75rem]">
                                                    {stat.value}
                                                </p>
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>
                </div>
            }
        >
            <Head title="Dashboard" />
            <div className="p-4 pt-44 sm:pt-28 md:pt-24">
                <section className="w-full space-y-6 text-left" aria-label="Dashboard section">
                    <h2
                        className="text-foreground font-serif text-3xl font-bold uppercase tracking-tight sm:text-4xl md:text-5xl"
                        aria-live="polite"
                    >
                        {sectionTitle}
                    </h2>
                    <div className="flex flex-wrap items-center justify-center gap-4">
                        <Button
                            type="button"
                            variant="ghost"
                            className={cn(
                                pillToggleBaseClass,
                                activeView === 'schedules' ? pillToggleActiveClass : pillToggleInactiveClass,
                            )}
                            onClick={() => setActiveView('schedules')}
                            aria-pressed={activeView === 'schedules'}
                        >
                            Schedules
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            className={cn(
                                pillToggleBaseClass,
                                activeView === 'teachers' ? pillToggleActiveClass : pillToggleInactiveClass,
                            )}
                            onClick={() => setActiveView('teachers')}
                            aria-pressed={activeView === 'teachers'}
                        >
                            Teachers
                        </Button>
                    </div>
                    {!hasActiveSemester ? (
                        <div className="rounded-lg border bg-card px-6 py-14 text-center">
                            <Monitor className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                            <p className="font-serif text-sm text-muted-foreground">
                                No curriculum semester selected. Use the dropdown above to add a semester.
                            </p>
                        </div>
                    ) : null}
                    {hasActiveSemester && activeView === 'schedules' ? (
                        schedules.length === 0 ? (
                            <div className="rounded-lg border bg-card px-6 py-14 text-center">
                                <Monitor className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                                <p className="font-serif text-sm text-muted-foreground">No schedules for this semester yet.</p>
                            </div>
                        ) : (
                            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                                {schedulesByComlab.map(({ comlab, rows }) => (
                                    <ComlabScheduleCard key={comlab.id} comlab={comlab} rows={rows} now={scheduleClock} />
                                ))}
                            </div>
                        )
                    ) : null}
                    {hasActiveSemester && activeView === 'teachers' ? (
                        <div className="overflow-x-auto rounded-lg border border-border/80 bg-card shadow-sm">
                            <table className="w-full min-w-[420px] text-left text-sm">
                                <thead className="border-b border-border/80 bg-muted/40 font-serif">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold">Name</th>
                                        <th className="px-4 py-3 font-semibold">Employment Status</th>
                                    </tr>
                                </thead>
                                <tbody className="font-serif">
                                    {teachers.length === 0 ? (
                                        <tr>
                                            <td colSpan={2} className="text-muted-foreground px-4 py-6 text-center">
                                                No teachers for this semester yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        teachers.map((teacher, index) => (
                                            <tr
                                                key={`${teacher.name}-${teacher.employment_status}-${index}`}
                                                className="border-b border-border/60 last:border-0"
                                            >
                                                <td className="px-4 py-3 font-medium">{teacher.name}</td>
                                                <td className="px-4 py-3">{teacher.employment_status}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    ) : null}
                </section>
            </div>
        </AppLayout>
    );
}



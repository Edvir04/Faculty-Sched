<?php

namespace App\Support;

use App\Models\Comlab;
use App\Models\Schedule;
use App\Models\Section;
use App\Models\Subject;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

class ScheduleDeletePreview
{
    /**
     * @return list<array{
     *     id: int,
     *     day: string,
     *     start_time: string,
     *     end_time: string,
     *     subject_label: string|null,
     *     teacher_name: string|null,
     *     section_name: string|null,
     *     comlab_name: string|null
     * }>
     */
    public static function forSection(Section $section, int $curriculumSemesterId): array
    {
        if ((int) $section->curriculum_semester_id !== $curriculumSemesterId) {
            abort(404);
        }

        return self::mapSchedules(
            self::baseQuery($curriculumSemesterId)
                ->where('section_id', $section->id)
                ->orderBy('day')
                ->orderBy('start_time')
                ->get(),
        );
    }

    /**
     * @return list<array{
     *     id: int,
     *     day: string,
     *     start_time: string,
     *     end_time: string,
     *     subject_label: string|null,
     *     teacher_name: string|null,
     *     section_name: string|null,
     *     comlab_name: string|null
     * }>
     */
    public static function forComlab(Comlab $comlab, int $curriculumSemesterId): array
    {
        if ((int) $comlab->curriculum_semester_id !== $curriculumSemesterId) {
            abort(404);
        }

        return self::mapSchedules(
            self::baseQuery($curriculumSemesterId)
                ->where('comlab_id', $comlab->id)
                ->orderBy('day')
                ->orderBy('start_time')
                ->get(),
        );
    }

    /**
     * @return list<array{
     *     id: int,
     *     day: string,
     *     start_time: string,
     *     end_time: string,
     *     subject_label: string|null,
     *     teacher_name: string|null,
     *     section_name: string|null,
     *     comlab_name: string|null
     * }>
     */
    public static function forSubject(Subject $subject, int $curriculumSemesterId): array
    {
        if ((int) $subject->curriculum_semester_id !== $curriculumSemesterId) {
            abort(404);
        }

        return self::mapSchedules(
            self::baseQuery($curriculumSemesterId)
                ->where('subject_id', $subject->id)
                ->orderBy('day')
                ->orderBy('start_time')
                ->get(),
        );
    }

    /**
     * @return Builder<Schedule>
     */
    private static function baseQuery(int $curriculumSemesterId): Builder
    {
        return Schedule::query()
            ->with([
                'section:id,section_name',
                'subject:id,subject_code,subject_name',
                'teacher:id,teacher_name',
                'comlab:id,comlab_name,campus',
            ])
            ->whereHas(
                'subject',
                fn (Builder $query) => $query->where('curriculum_semester_id', $curriculumSemesterId),
            )
            ->whereHas(
                'teacher',
                fn (Builder $query) => $query->where('curriculum_semester_id', $curriculumSemesterId),
            );
    }

    /**
     * @param  Collection<int, Schedule>  $schedules
     * @return list<array{
     *     id: int,
     *     day: string,
     *     start_time: string,
     *     end_time: string,
     *     subject_label: string|null,
     *     teacher_name: string|null,
     *     section_name: string|null,
     *     comlab_name: string|null
     * }>
     */
    private static function mapSchedules(Collection $schedules): array
    {
        $formatTime = static function ($value): string {
            if ($value === null || $value === '') {
                return '';
            }

            return Carbon::parse($value)->format('H:i');
        };

        return $schedules
            ->map(static function (Schedule $schedule) use ($formatTime) {
                return [
                    'id' => $schedule->id,
                    'day' => $schedule->day,
                    'start_time' => $formatTime($schedule->start_time),
                    'end_time' => $formatTime($schedule->end_time),
                    'subject_label' => $schedule->subject
                        ? "{$schedule->subject->subject_code} — {$schedule->subject->subject_name}"
                        : null,
                    'teacher_name' => $schedule->teacher?->teacher_name,
                    'section_name' => $schedule->section?->section_name,
                    'comlab_name' => $schedule->comlab?->comlab_name,
                ];
            })
            ->values()
            ->all();
    }
}

<?php

namespace App\Support;

use App\Models\Schedule;
use Illuminate\Database\Eloquent\Builder;

class CurriculumSemesterScheduleScope
{
    /**
     * @param  Builder<Schedule>  $query
     * @return Builder<Schedule>
     */
    public static function apply(Builder $query, int $curriculumSemesterId): Builder
    {
        return $query
            ->whereHas(
                'subject',
                fn (Builder $subjectQuery) => $subjectQuery->where('curriculum_semester_id', $curriculumSemesterId),
            )
            ->whereHas(
                'teacher',
                fn (Builder $teacherQuery) => $teacherQuery->where('curriculum_semester_id', $curriculumSemesterId),
            )
            ->where(function (Builder $scheduleQuery) use ($curriculumSemesterId) {
                $scheduleQuery
                    ->whereNull('comlab_id')
                    ->orWhereHas(
                        'comlab',
                        fn (Builder $comlabQuery) => $comlabQuery->where('curriculum_semester_id', $curriculumSemesterId),
                    );
            });
    }
}

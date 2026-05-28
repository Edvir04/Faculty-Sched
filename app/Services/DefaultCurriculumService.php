<?php

namespace App\Services;

use App\Models\Comlab;
use App\Models\CurriculumSemester;
use App\Models\Subject;
use App\Models\Teacher;
use Illuminate\Support\Facades\DB;

class DefaultCurriculumService
{
    public function seedFromDefaults(CurriculumSemester $targetSemester): void
    {
        DB::transaction(function () use ($targetSemester): void {
            Teacher::query()
                ->where('is_default', true)
                ->orderBy('id')
                ->each(function (Teacher $teacher) use ($targetSemester): void {
                    Teacher::query()->updateOrCreate(
                        [
                            'curriculum_semester_id' => $targetSemester->id,
                            'teacher_name' => $teacher->teacher_name,
                        ],
                        [
                            'status' => $teacher->status,
                            'is_default' => true,
                        ],
                    );
                });

            Comlab::query()
                ->where('is_default', true)
                ->orderBy('id')
                ->each(function (Comlab $comlab) use ($targetSemester): void {
                    Comlab::query()->updateOrCreate(
                        [
                            'curriculum_semester_id' => $targetSemester->id,
                            'campus' => $comlab->campus,
                            'comlab_name' => $comlab->comlab_name,
                        ],
                        [
                            'is_default' => true,
                        ],
                    );
                });

            Subject::query()
                ->where('is_default', true)
                ->orderBy('id')
                ->each(function (Subject $subject) use ($targetSemester): void {
                    Subject::query()->updateOrCreate(
                        [
                            'curriculum_semester_id' => $targetSemester->id,
                            'subject_code' => $subject->subject_code,
                            'semester_id' => $subject->semester_id,
                            'year_level_id' => $subject->year_level_id,
                        ],
                        [
                            'subject_name' => $subject->subject_name,
                            'is_default' => true,
                        ],
                    );
                });
        });
    }
}

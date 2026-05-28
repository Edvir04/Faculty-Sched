<?php

namespace App\Services;

use App\Models\Comlab;
use App\Models\CurriculumSemester;
use App\Models\Schedule;
use App\Models\Subject;
use App\Models\Teacher;
use App\Support\ActiveCurriculumSemester;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DeleteCurriculumSemesterService
{
    public function delete(CurriculumSemester $curriculumSemester, Request $request): void
    {
        DB::transaction(function () use ($curriculumSemester, $request): void {
            $semesterId = $curriculumSemester->id;

            $teacherIds = Teacher::query()
                ->where('curriculum_semester_id', $semesterId)
                ->pluck('id');
            $comlabIds = Comlab::query()
                ->where('curriculum_semester_id', $semesterId)
                ->pluck('id');
            $subjectIds = Subject::query()
                ->where('curriculum_semester_id', $semesterId)
                ->pluck('id');

            if ($teacherIds->isNotEmpty()) {
                Schedule::query()->whereIn('teacher_id', $teacherIds)->delete();
            }

            if ($comlabIds->isNotEmpty()) {
                Schedule::query()->whereIn('comlab_id', $comlabIds)->delete();
            }

            if ($subjectIds->isNotEmpty()) {
                Schedule::query()->whereIn('subject_id', $subjectIds)->delete();
            }

            Teacher::query()->where('curriculum_semester_id', $semesterId)->delete();
            Comlab::query()->where('curriculum_semester_id', $semesterId)->delete();
            Subject::query()->where('curriculum_semester_id', $semesterId)->delete();

            $wasActive = (bool) $curriculumSemester->is_active;
            $wasSessionActive = (int) $request->session()->get(ActiveCurriculumSemester::SESSION_KEY) === $semesterId;

            $curriculumSemester->delete();

            if ($wasActive || $wasSessionActive) {
                $this->activateReplacementSemester($request);
            }
        });
    }

    protected function activateReplacementSemester(Request $request): void
    {
        $next = CurriculumSemester::query()->orderByDesc('id')->first();

        if ($next === null) {
            $request->session()->forget(ActiveCurriculumSemester::SESSION_KEY);

            return;
        }

        CurriculumSemester::query()->update(['is_active' => false]);
        $next->update(['is_active' => true]);
        $request->session()->put(ActiveCurriculumSemester::SESSION_KEY, $next->id);
    }
}

<?php

namespace App\Http\Controllers;

use App\Models\Comlab;
use App\Models\Schedule;
use App\Models\Section;
use App\Models\Teacher;
use App\Support\ActiveCurriculumSemester;
use App\Support\CurriculumSemesterScheduleScope;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $curriculumSemesterId = ActiveCurriculumSemester::optionalId($request);

        $formatTime = static function ($value): string {
            if ($value === null || $value === '') {
                return '';
            }

            return Carbon::parse($value)->format('H:i');
        };

        $comlabs = collect();
        $schedules = collect();
        $teachers = collect();
        $stats = [
            'teachers' => 0,
            'schedules' => 0,
            'sections' => 0,
        ];

        if ($curriculumSemesterId !== null) {
            $comlabs = Comlab::query()
                ->where('curriculum_semester_id', $curriculumSemesterId)
                ->select('id', 'comlab_name', 'campus')
                ->orderBy('comlab_name')
                ->get()
                ->map(static fn (Comlab $comlab) => [
                    'id' => $comlab->id,
                    'name' => $comlab->comlab_name,
                    'campus' => $comlab->campus,
                ]);

            $schedules = CurriculumSemesterScheduleScope::apply(Schedule::query(), $curriculumSemesterId)
                ->with([
                    'section:id,section_name',
                    'subject:id,subject_code,subject_name',
                    'teacher:id,teacher_name',
                    'comlab:id,comlab_name',
                ])
                ->orderBy('day')
                ->orderBy('start_time')
                ->get()
                ->map(static function (Schedule $schedule) use ($formatTime) {
                    return [
                        'id' => $schedule->id,
                        'comlab_id' => $schedule->comlab_id,
                        'day' => $schedule->day,
                        'start_time' => $formatTime($schedule->start_time),
                        'end_time' => $formatTime($schedule->end_time),
                        'section_name' => $schedule->section?->section_name,
                        'subject_label' => $schedule->subject
                            ? "{$schedule->subject->subject_code} — {$schedule->subject->subject_name}"
                            : null,
                        'teacher_name' => $schedule->teacher?->teacher_name,
                        'comlab_name' => $schedule->comlab?->comlab_name,
                    ];
                });

            $teachers = Teacher::query()
                ->where('curriculum_semester_id', $curriculumSemesterId)
                ->orderBy('teacher_name')
                ->get(['teacher_name as name', 'status as employment_status']);

            $stats = [
                'teachers' => $teachers->count(),
                'schedules' => $schedules->count(),
                'sections' => Section::query()
                    ->where('curriculum_semester_id', $curriculumSemesterId)
                    ->count(),
            ];
        }

        return Inertia::render('dashboard', [
            'comlabs' => $comlabs->values()->all(),
            'schedules' => $schedules->values()->all(),
            'teachers' => $teachers->values()->all(),
            'stats' => $stats,
        ]);
    }
}

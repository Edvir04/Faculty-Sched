<?php

namespace App\Http\Controllers;

use App\Models\Schedule;
use App\Models\Subject;
use App\Models\Teacher;
use App\Rules\UniqueDefaultCurriculumTeacherName;
use App\Rules\UniqueNormalizedTeacherName;
use App\Support\ActiveCurriculumSemester;
use App\Support\CurriculumSemesterScheduleScope;
use Carbon\Carbon;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class TeacherController extends Controller
{
    /** @var list<string> */
    private const TEACHER_STATUSES = ['Regular', 'Part-Time'];

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): Response
    {
        $curriculumSemesterId = ActiveCurriculumSemester::id($request);
        $formatTime = static function ($value): string {
            if ($value === null || $value === '') {
                return '';
            }

            return Carbon::parse($value)->format('H:i');
        };

        $formatSubjectLabel = static function (?Subject $subject): string {
            if ($subject === null) {
                return '';
            }

            $code = $subject->subject_code;
            $name = $subject->subject_name ?? '';

            if ($code !== null && $code !== '') {
                return "{$code} — {$name}";
            }

            return $name;
        };

        $schedules = CurriculumSemesterScheduleScope::apply(Schedule::query(), $curriculumSemesterId)
            ->with([
                'subject:id,subject_code,subject_name',
                'section:id,section_name',
                'comlab:id,comlab_name',
                'teacher:id,teacher_name,status',
            ])
            ->orderBy('day')
            ->orderBy('start_time')
            ->get();

        $scheduleAssignments = $schedules
            ->map(static function (Schedule $schedule) use ($formatTime, $formatSubjectLabel) {
                return [
                    'schedule_id' => $schedule->id,
                    'teacher_id' => $schedule->teacher_id,
                    'teacher_name' => $schedule->teacher?->teacher_name ?? '',
                    'teacher_status' => $schedule->teacher?->status,
                    'subject_id' => $schedule->subject_id,
                    'subject_label' => $formatSubjectLabel($schedule->subject),
                    'day' => $schedule->day,
                    'start_time' => $formatTime($schedule->start_time),
                    'end_time' => $formatTime($schedule->end_time),
                    'section_name' => $schedule->section?->section_name,
                    'comlab_name' => $schedule->comlab?->comlab_name,
                ];
            })
            ->values()
            ->all();

        $subjectAssignmentsByTeacher = $schedules
            ->groupBy('teacher_id')
            ->map(static function ($teacherSchedules) use ($formatTime, $formatSubjectLabel) {
                return $teacherSchedules
                    ->map(static function (Schedule $schedule) use ($formatTime, $formatSubjectLabel) {
                        $subject = $schedule->subject;

                        return [
                            'schedule_id' => $schedule->id,
                            'subject_name' => $subject?->subject_name ?? '',
                            'subject_code' => $subject?->subject_code,
                            'subject_label' => $formatSubjectLabel($subject),
                            'day' => $schedule->day,
                            'start_time' => $formatTime($schedule->start_time),
                            'end_time' => $formatTime($schedule->end_time),
                            'comlab_name' => $schedule->comlab?->comlab_name,
                            'section_name' => $schedule->section?->section_name,
                        ];
                    })
                    ->values()
                    ->all();
            });

        $teachers = Teacher::query()
            ->where('curriculum_semester_id', $curriculumSemesterId)
            ->orderBy('teacher_name')
            ->get(['id', 'teacher_name', 'status', 'is_default', 'created_at', 'updated_at'])
            ->map(static function (Teacher $teacher) use ($subjectAssignmentsByTeacher) {
                $assignments = $subjectAssignmentsByTeacher->get($teacher->id, []);

                return [
                    'id' => $teacher->id,
                    'teacher_name' => $teacher->teacher_name,
                    'status' => $teacher->status,
                    'is_default' => (bool) $teacher->is_default,
                    'subjects' => collect($assignments)
                        ->pluck('subject_label')
                        ->filter()
                        ->unique()
                        ->values()
                        ->all(),
                    'subject_assignments' => $assignments,
                    'created_at' => $teacher->created_at,
                    'updated_at' => $teacher->updated_at,
                ];
            });

        $teacherOptions = Teacher::query()
            ->where('curriculum_semester_id', $curriculumSemesterId)
            ->orderBy('teacher_name')
            ->get(['id', 'teacher_name'])
            ->map(static fn (Teacher $teacher) => [
                'id' => $teacher->id,
                'name' => $teacher->teacher_name,
            ])
            ->values()
            ->all();

        return Inertia::render('teachers', [
            'teachers' => $teachers,
            'scheduleAssignments' => $scheduleAssignments,
            'teacherOptions' => $teacherOptions,
            'defaultTeachersForValidation' => Teacher::query()
                ->where('is_default', true)
                ->select('id', 'teacher_name')
                ->orderBy('teacher_name')
                ->get()
                ->map(static fn (Teacher $teacher) => [
                    'id' => $teacher->id,
                    'teacher_name' => $teacher->teacher_name,
                ]),
        ]);
    }

    /**
     * Bulk reassign professors for scheduled subjects.
     */
    public function updateSubjectProfessors(Request $request): RedirectResponse
    {
        $curriculumSemesterId = ActiveCurriculumSemester::id($request);

        $validated = $request->validate([
            'assignments' => ['required', 'array', 'min:1'],
            'assignments.*.schedule_id' => [
                'required',
                'integer',
                Rule::exists('schedules', 'id')->where(
                    fn ($query) => CurriculumSemesterScheduleScope::apply($query, $curriculumSemesterId),
                ),
            ],
            'assignments.*.teacher_id' => [
                'required',
                'integer',
                Rule::exists('teachers', 'id')->where(
                    fn ($query) => $query->where('curriculum_semester_id', $curriculumSemesterId),
                ),
            ],
        ]);

        try {
            DB::transaction(function () use ($validated, $curriculumSemesterId): void {
                foreach ($validated['assignments'] as $index => $assignment) {
                    $schedule = Schedule::query()->findOrFail($assignment['schedule_id']);
                    $newTeacherId = (int) $assignment['teacher_id'];

                    if ((int) $schedule->teacher_id === $newTeacherId) {
                        continue;
                    }

                    if ($this->teacherScheduleOverlaps(
                        $newTeacherId,
                        $schedule->day,
                        $schedule->start_time,
                        $schedule->end_time,
                        $curriculumSemesterId,
                        $schedule->id,
                    )) {
                        $teacherName = Teacher::query()->whereKey($newTeacherId)->value('teacher_name');

                        throw ValidationException::withMessages([
                            "assignments.{$index}.teacher_id" => sprintf(
                                'The selected professor (%s) is no longer available for this schedule due to a time conflict.',
                                $teacherName ?? 'selected teacher',
                            ),
                        ]);
                    }

                    $schedule->update(['teacher_id' => $newTeacherId]);
                }
            });
        } catch (ValidationException $exception) {
            return back()
                ->withErrors($exception->errors())
                ->with('error', 'Could not save professor reassignments. Please review the highlighted conflicts.');
        }

        return back()->with('success', 'Professor reassignments saved successfully.');
    }

    /**
     * True when another schedule overlaps the requested window for the same teacher and day.
     * Overlap: newStart < existingEnd AND newEnd > existingStart.
     */
    protected function teacherScheduleOverlaps(
        int $teacherId,
        string $day,
        mixed $startTime,
        mixed $endTime,
        int $curriculumSemesterId,
        ?int $excludeScheduleId = null,
    ): bool {
        if ($day === '' || $startTime === null || $endTime === null) {
            return false;
        }

        return CurriculumSemesterScheduleScope::apply(Schedule::query(), $curriculumSemesterId)
            ->where('teacher_id', $teacherId)
            ->where('day', $day)
            ->where('start_time', '<', $endTime)
            ->where('end_time', '>', $startTime)
            ->when($excludeScheduleId !== null, fn ($query) => $query->where('id', '!=', $excludeScheduleId))
            ->exists();
    }

    /**
     * @return list<ValidationRule|string>
     */
    private function teacherNameRules(Request $request, int $curriculumSemesterId, ?int $ignoreId = null): array
    {
        $rules = [
            'required',
            'string',
            'max:255',
            new UniqueNormalizedTeacherName($curriculumSemesterId, $ignoreId),
        ];

        if ($request->boolean('is_default')) {
            $rules[] = new UniqueDefaultCurriculumTeacherName($ignoreId);
        }

        return $rules;
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        $curriculumSemesterId = ActiveCurriculumSemester::id($request);

        $validated = $request->validate([
            'teacher_name' => $this->teacherNameRules($request, $curriculumSemesterId),
            'status' => ['required', 'string', Rule::in(self::TEACHER_STATUSES)],
            'is_default' => ['sometimes', 'boolean'],
        ]);

        $validated['is_default'] = $request->boolean('is_default');
        $validated['curriculum_semester_id'] = $curriculumSemesterId;

        Teacher::create($validated);

        return back()->with('success', 'Teacher created successfully.');
    }

    /**
     * Display the specified resource (JSON for Inertia modals / API consumers).
     */
    public function show(Teacher $teacher): JsonResponse
    {
        return response()->json([
            'teacher' => [
                'id' => $teacher->id,
                'teacher_name' => $teacher->teacher_name,
                'status' => $teacher->status,
                'is_default' => (bool) $teacher->is_default,
                'created_at' => $teacher->created_at,
                'updated_at' => $teacher->updated_at,
            ],
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Teacher $teacher)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Teacher $teacher): RedirectResponse
    {
        if ((int) $teacher->curriculum_semester_id !== ActiveCurriculumSemester::id($request)) {
            abort(404);
        }

        $validated = $request->validate([
            'teacher_name' => $this->teacherNameRules(
                $request,
                (int) $teacher->curriculum_semester_id,
                $teacher->id,
            ),
            'status' => ['required', 'string', Rule::in(self::TEACHER_STATUSES)],
            'is_default' => ['sometimes', 'boolean'],
        ]);

        $validated['is_default'] = $request->boolean('is_default');

        $teacher->update($validated);

        return back()->with('success', 'Teacher updated successfully.');
    }

    /**
     * Reassign handled schedules to replacement professors, then delete the teacher.
     */
    public function reassignAndDestroy(Request $request, Teacher $teacher): RedirectResponse
    {
        $curriculumSemesterId = ActiveCurriculumSemester::id($request);

        if ((int) $teacher->curriculum_semester_id !== $curriculumSemesterId) {
            abort(404);
        }

        $schedules = $teacher->schedules()->orderBy('id')->get();

        if ($schedules->isEmpty()) {
            $teacher->delete();

            return back()->with('success', 'Teacher deleted successfully.');
        }

        $validated = $request->validate([
            'assignments' => ['required', 'array', 'min:1'],
            'assignments.*.schedule_id' => ['required', 'integer'],
            'assignments.*.teacher_id' => ['required', 'integer'],
        ]);

        /** @var array<int, int> $assignmentMap schedule_id => replacement teacher_id */
        $assignmentMap = collect($validated['assignments'])
            ->mapWithKeys(static fn (array $row): array => [
                (int) $row['schedule_id'] => (int) $row['teacher_id'],
            ])
            ->all();

        $expectedScheduleIds = $schedules->pluck('id')->sort()->values();
        $submittedScheduleIds = collect(array_keys($assignmentMap))->sort()->values();

        if ($expectedScheduleIds->toArray() !== $submittedScheduleIds->toArray()) {
            throw ValidationException::withMessages([
                'assignments' => 'Every schedule handled by this professor must be reassigned before deletion.',
            ]);
        }

        DB::transaction(function () use ($assignmentMap, $teacher, $curriculumSemesterId): void {
            foreach ($assignmentMap as $scheduleId => $newTeacherId) {
                if ($newTeacherId === (int) $teacher->id) {
                    throw ValidationException::withMessages([
                        'assignments' => 'A replacement professor cannot be the same as the professor being deleted.',
                    ]);
                }

                if (! Teacher::query()
                    ->whereKey($newTeacherId)
                    ->where('curriculum_semester_id', $curriculumSemesterId)
                    ->exists()) {
                    throw ValidationException::withMessages([
                        'assignments' => 'One or more selected replacement professors are invalid.',
                    ]);
                }

                $schedule = Schedule::query()->findOrFail($scheduleId);

                if ((int) $schedule->teacher_id !== (int) $teacher->id) {
                    throw ValidationException::withMessages([
                        'assignments' => 'One or more schedules are not assigned to the professor being deleted.',
                    ]);
                }

                if ($this->teacherScheduleOverlaps(
                    $newTeacherId,
                    $schedule->day,
                    $schedule->start_time,
                    $schedule->end_time,
                    $curriculumSemesterId,
                    $schedule->id,
                )) {
                    $teacherName = Teacher::query()->whereKey($newTeacherId)->value('teacher_name');

                    throw ValidationException::withMessages([
                        'assignments' => sprintf(
                            'The selected replacement professor (%s) is not available for a schedule due to a time conflict.',
                            $teacherName ?? 'selected professor',
                        ),
                    ]);
                }

                $schedule->update(['teacher_id' => $newTeacherId]);
            }

            $teacher->delete();
        });

        return back()->with('success', 'Teacher deleted successfully.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, Teacher $teacher): RedirectResponse
    {
        if ((int) $teacher->curriculum_semester_id !== ActiveCurriculumSemester::id($request)) {
            abort(404);
        }

        if ($teacher->schedules()->exists()) {
            return back()->with('error', 'This teacher has schedule entries. Reassign or remove those schedules before deleting.');
        }

        $teacher->delete();

        return back()->with('success', 'Teacher deleted successfully.');
    }
}

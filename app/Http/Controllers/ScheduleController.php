<?php

namespace App\Http\Controllers;

use App\Models\Comlab;
use App\Models\Schedule;
use App\Models\Section;
use App\Models\Subject;
use App\Models\Teacher;
use App\Support\ActiveCurriculumSemester;
use App\Support\CurriculumSemesterScheduleScope;
use App\Support\ScheduleDayGroups;
use Carbon\Carbon;
use Closure;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ScheduleController extends Controller
{
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

        return Inertia::render('schedules', [
            'schedules' => CurriculumSemesterScheduleScope::apply(Schedule::query(), $curriculumSemesterId)
                ->with([
                    'section:id,section_name',
                    'subject:id,subject_code,subject_name',
                    'teacher:id,teacher_name',
                    'comlab:id,comlab_name,campus',
                ])
                ->orderBy('day')
                ->orderBy('start_time')
                ->get()
                ->map(static function (Schedule $schedule) use ($formatTime) {
                    return [
                        'id' => $schedule->id,
                        'section_id' => $schedule->section_id,
                        'subject_id' => $schedule->subject_id,
                        'teacher_id' => $schedule->teacher_id,
                        'comlab_id' => $schedule->comlab_id,
                        'has_section' => $schedule->section_id !== null,
                        'has_comlab' => $schedule->comlab_id !== null,
                        'day' => $schedule->day,
                        'start_time' => $formatTime($schedule->start_time),
                        'end_time' => $formatTime($schedule->end_time),
                        'section_name' => $schedule->section?->section_name,
                        'subject_code' => $schedule->subject?->subject_code,
                        'subject_label' => $schedule->subject
                            ? "{$schedule->subject->subject_code} — {$schedule->subject->subject_name}"
                            : null,
                        'teacher_name' => $schedule->teacher?->teacher_name,
                        'comlab_name' => $schedule->comlab?->comlab_name,
                        'comlab_campus' => $schedule->comlab?->campus,
                    ];
                }),
            'sections' => Section::query()
                ->where('curriculum_semester_id', $curriculumSemesterId)
                ->select('id', 'section_name', 'year_level_id')
                ->orderBy('section_name')
                ->get()
                ->map(static fn (Section $section) => [
                    'id' => $section->id,
                    'name' => $section->section_name,
                    'year_level_id' => (int) $section->year_level_id,
                ]),
            'subjects' => Subject::query()
                ->where('curriculum_semester_id', $curriculumSemesterId)
                ->select('id', 'subject_code', 'subject_name', 'year_level_id')
                ->orderBy('subject_code')
                ->get()
                ->map(static fn (Subject $subject) => [
                    'id' => $subject->id,
                    'name' => "{$subject->subject_code} — {$subject->subject_name}",
                    'year_level_id' => $subject->year_level_id !== null ? (int) $subject->year_level_id : null,
                ]),
            'teachers' => Teacher::query()
                ->where('curriculum_semester_id', $curriculumSemesterId)
                ->select('id', 'teacher_name')
                ->orderBy('teacher_name')
                ->get()
                ->map(static fn (Teacher $teacher) => [
                    'id' => $teacher->id,
                    'name' => $teacher->teacher_name,
                ]),
            'comlabs' => Comlab::query()
                ->where('curriculum_semester_id', $curriculumSemesterId)
                ->select('id', 'comlab_name', 'campus')
                ->orderBy('comlab_name')
                ->get()
                ->map(static fn (Comlab $comlab) => [
                    'id' => $comlab->id,
                    'name' => $comlab->comlab_name,
                    'campus' => $comlab->campus,
                ]),
        ]);
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
            'subject_id' => [
                'required',
                'integer',
                Rule::exists('subjects', 'id')->where(fn ($query) => $query->where('curriculum_semester_id', $curriculumSemesterId)),
                $this->subjectMatchesSelectedSectionYearLevel($request),
            ],
            'teacher_id' => [
                'required',
                'integer',
                Rule::exists('teachers', 'id')->where(fn ($query) => $query->where('curriculum_semester_id', $curriculumSemesterId)),
            ],
            'comlab_id' => [
                'required',
                'integer',
                Rule::exists('comlabs', 'id')->where(fn ($query) => $query->where('curriculum_semester_id', $curriculumSemesterId)),
            ],
            'day' => ['required', 'string', Rule::in(ScheduleDayGroups::allowedDayValues())],
            'start_time' => [
                'required',
                'date_format:H:i',
                'regex:/^([01]\d|2[0-3]):(00|05|10|15|20|25|30|35|40|45|50|55)$/',
            ],
            'end_time' => [
                'required',
                'date_format:H:i',
                'regex:/^([01]\d|2[0-3]):(00|05|10|15|20|25|30|35|40|45|50|55)$/',
                'after:start_time',
            ],
            'section_id' => [
                'required',
                'integer',
                Rule::exists('sections', 'id')->where(
                    fn ($query) => $query->where('curriculum_semester_id', $curriculumSemesterId),
                ),
            ],
        ]);

        $days = ScheduleDayGroups::expand($validated['day']);
        $overlapErrors = $this->validateExpandedDayConstraints($request, $days);

        if ($overlapErrors !== []) {
            throw ValidationException::withMessages($overlapErrors);
        }

        $payload = [
            'section_id' => $validated['section_id'],
            'subject_id' => $validated['subject_id'],
            'teacher_id' => $validated['teacher_id'],
            'comlab_id' => $validated['comlab_id'],
            'start_time' => $validated['start_time'],
            'end_time' => $validated['end_time'],
            'semester' => null,
            'school_year' => null,
        ];

        DB::transaction(function () use ($days, $payload): void {
            foreach ($days as $concreteDay) {
                Schedule::create(array_merge($payload, ['day' => $concreteDay]));
            }
        });

        $count = count($days);
        $message = $count > 1
            ? "{$count} schedule slots created successfully."
            : 'Schedule created successfully.';

        return redirect()->route('schedules')->with('success', $message);
    }

    /**
     * Display the specified resource.
     */
    public function show(Schedule $schedule)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Schedule $schedule)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Schedule $schedule): RedirectResponse
    {
        $curriculumSemesterId = ActiveCurriculumSemester::id($request);

        $belongsToActiveCurriculum = CurriculumSemesterScheduleScope::apply(
            Schedule::query()->whereKey($schedule->id),
            $curriculumSemesterId,
        )->exists();

        if (! $belongsToActiveCurriculum) {
            abort(404);
        }

        $validated = $request->validate([
            'subject_id' => [
                'required',
                'integer',
                Rule::exists('subjects', 'id')->where(fn ($query) => $query->where('curriculum_semester_id', $curriculumSemesterId)),
                $this->subjectMatchesSelectedSectionYearLevel($request),
            ],
            'teacher_id' => [
                'required',
                'integer',
                Rule::exists('teachers', 'id')->where(fn ($query) => $query->where('curriculum_semester_id', $curriculumSemesterId)),
            ],
            'comlab_id' => [
                'required',
                'integer',
                Rule::exists('comlabs', 'id')->where(fn ($query) => $query->where('curriculum_semester_id', $curriculumSemesterId)),
            ],
            'day' => ['required', 'string', 'in:Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday'],
            'start_time' => [
                'required',
                'date_format:H:i',
                'regex:/^([01]\d|2[0-3]):(00|05|10|15|20|25|30|35|40|45|50|55)$/',
                $this->noComlabTimeOverlap($request, $schedule->id),
                $this->noTeacherTimeOverlap($request, $schedule->id),
                $this->noSectionTimeOverlap($request, $schedule->id),
            ],
            'end_time' => [
                'required',
                'date_format:H:i',
                'regex:/^([01]\d|2[0-3]):(00|05|10|15|20|25|30|35|40|45|50|55)$/',
                'after:start_time',
            ],
            'section_id' => [
                'required',
                'integer',
                Rule::exists('sections', 'id')->where(
                    fn ($query) => $query->where('curriculum_semester_id', $curriculumSemesterId),
                ),
                Rule::unique('schedules')
                    ->where(function ($query) use ($request) {
                        return $query
                            ->where('subject_id', $request->integer('subject_id'))
                            ->where('teacher_id', $request->integer('teacher_id'))
                            ->where('comlab_id', $request->integer('comlab_id'))
                            ->where('day', $request->string('day'))
                            ->where('start_time', $request->input('start_time'))
                            ->where('end_time', $request->input('end_time'));
                    })
                    ->ignore($schedule->id),
            ],
        ]);

        $schedule->update($validated);

        return redirect()->route('schedules')->with('success', 'Schedule updated successfully.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, Schedule $schedule): RedirectResponse
    {
        $curriculumSemesterId = ActiveCurriculumSemester::id($request);

        $belongsToActiveCurriculum = CurriculumSemesterScheduleScope::apply(
            Schedule::query()->whereKey($schedule->id),
            $curriculumSemesterId,
        )->exists();

        if (! $belongsToActiveCurriculum) {
            abort(404);
        }

        $schedule->delete();

        return redirect()->route('schedules')->with('success', 'Schedule deleted successfully.');
    }

    /**
     * True when another schedule overlaps the requested window for the same day
     * and foreign key. Overlap: newStart < existingEnd AND newEnd > existingStart.
     */
    /**
     * @param  list<string>  $days
     * @return array<string, string>
     */
    protected function validateExpandedDayConstraints(Request $request, array $days): array
    {
        foreach ($days as $concreteDay) {
            if ($this->scheduleTimeOverlaps($request, 'comlab_id', null, $concreteDay)) {
                return [
                    'start_time' => 'This time slot overlaps with an existing schedule for this comlab and day.',
                ];
            }

            if ($this->scheduleTimeOverlaps($request, 'teacher_id', null, $concreteDay)) {
                return [
                    'start_time' => 'This time slot overlaps with an existing schedule for this teacher and day.',
                ];
            }

            if ($this->scheduleTimeOverlaps($request, 'section_id', null, $concreteDay)) {
                return [
                    'start_time' => 'This time slot overlaps with an existing schedule for this section and day.',
                ];
            }

            if ($this->scheduleDuplicateExists($request, $concreteDay)) {
                return [
                    'section_id' => 'The section has already been taken for this subject, teacher, comlab, day, and time.',
                ];
            }
        }

        return [];
    }

    protected function scheduleDuplicateExists(Request $request, string $day): bool
    {
        $curriculumSemesterId = ActiveCurriculumSemester::id($request);

        return CurriculumSemesterScheduleScope::apply(Schedule::query(), $curriculumSemesterId)
            ->where('section_id', $request->integer('section_id'))
            ->where('subject_id', $request->integer('subject_id'))
            ->where('teacher_id', $request->integer('teacher_id'))
            ->where('comlab_id', $request->integer('comlab_id'))
            ->where('day', $day)
            ->where('start_time', $request->input('start_time'))
            ->where('end_time', $request->input('end_time'))
            ->exists();
    }

    protected function scheduleTimeOverlaps(
        Request $request,
        string $column,
        ?int $excludeId = null,
        ?string $dayOverride = null,
    ): bool {
        $id = $request->integer($column);
        $day = $dayOverride ?? (string) $request->string('day');
        $startTime = $request->input('start_time');
        $endTime = $request->input('end_time');

        if ($id <= 0 || $day === '' || ! is_string($startTime) || $startTime === '' || ! is_string($endTime) || $endTime === '') {
            return false;
        }

        $curriculumSemesterId = ActiveCurriculumSemester::id($request);

        return CurriculumSemesterScheduleScope::apply(Schedule::query(), $curriculumSemesterId)
            ->where($column, $id)
            ->where('day', $day)
            ->where('start_time', '<', $endTime)
            ->where('end_time', '>', $startTime)
            ->when($excludeId !== null, fn ($q) => $q->where('id', '!=', $excludeId))
            ->exists();
    }

    /** @param  mixed  $value  validated start_time */
    protected function noComlabTimeOverlap(Request $request, ?int $excludeId = null, ?string $dayOverride = null): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail) use ($request, $excludeId, $dayOverride): void {
            if ($this->scheduleTimeOverlaps($request, 'comlab_id', $excludeId, $dayOverride)) {
                $fail('This time slot overlaps with an existing schedule for this comlab and day.');
            }
        };
    }

    /** @param  mixed  $value  validated start_time */
    protected function noTeacherTimeOverlap(Request $request, ?int $excludeId = null, ?string $dayOverride = null): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail) use ($request, $excludeId, $dayOverride): void {
            if ($this->scheduleTimeOverlaps($request, 'teacher_id', $excludeId, $dayOverride)) {
                $fail('This time slot overlaps with an existing schedule for this teacher and day.');
            }
        };
    }

    /** @param  mixed  $value  validated start_time */
    protected function noSectionTimeOverlap(Request $request, ?int $excludeId = null, ?string $dayOverride = null): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail) use ($request, $excludeId, $dayOverride): void {
            if ($this->scheduleTimeOverlaps($request, 'section_id', $excludeId, $dayOverride)) {
                $fail('This time slot overlaps with an existing schedule for this section and day.');
            }
        };
    }

    /**
     * Ensure the subject belongs to the same year level as the selected section (matches UI filtering).
     */
    protected function subjectMatchesSelectedSectionYearLevel(Request $request): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail) use ($request): void {
            $sectionId = $request->integer('section_id');
            if ($sectionId <= 0) {
                return;
            }

            $section = Section::query()->find($sectionId);
            $subject = Subject::query()->find((int) $value);
            $curriculumSemesterId = ActiveCurriculumSemester::id($request);

            if (! $section || ! $subject) {
                return;
            }

            if ((int) $subject->curriculum_semester_id !== $curriculumSemesterId) {
                $fail('The selected subject must belong to the active curriculum semester.');

                return;
            }

            if ((int) $section->curriculum_semester_id !== $curriculumSemesterId) {
                $fail('The selected section must belong to the active curriculum semester.');

                return;
            }

            if ((int) $subject->year_level_id !== (int) $section->year_level_id) {
                $fail('The selected subject must belong to the same year level as the selected section.');
            }
        };
    }
}

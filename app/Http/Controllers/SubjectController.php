<?php

namespace App\Http\Controllers;

use App\Models\Semester;
use App\Models\Subject;
use App\Models\YearLevel;
use App\Rules\UniqueDefaultCurriculumSubjectCode;
use App\Rules\UniqueDefaultCurriculumSubjectName;
use App\Rules\UniqueNormalizedSubjectCode;
use App\Rules\UniqueNormalizedSubjectName;
use App\Support\ActiveCurriculumSemester;
use App\Support\ScheduleDeletePreview;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SubjectController extends Controller
{
    public function index(Request $request): Response
    {
        $validatedFilters = $request->validate([
            'semester_id' => ['nullable', 'integer', 'exists:semesters,id'],
            'year_level_id' => ['nullable', 'integer', 'exists:year_levels,id'],
        ]);

        $curriculumSemesterId = ActiveCurriculumSemester::id($request);

        $mapSubject = fn (Subject $subject) => [
            'id' => $subject->id,
            'subject_code' => $subject->subject_code,
            'subject_name' => $subject->subject_name,
            'semester_id' => $subject->semester_id,
            'year_level_id' => $subject->year_level_id,
            'semester_name' => $subject->semester?->semester_name,
            'year_level_name' => $subject->yearLevel?->year_level_name,
            'is_default' => (bool) $subject->is_default,
        ];

        $subjectsForValidation = Subject::query()
            ->where('curriculum_semester_id', $curriculumSemesterId)
            ->select('id', 'subject_code', 'subject_name', 'semester_id', 'year_level_id')
            ->orderBy('subject_code')
            ->get()
            ->map(fn (Subject $subject) => [
                'id' => $subject->id,
                'subject_code' => $subject->subject_code,
                'subject_name' => $subject->subject_name,
                'semester_id' => $subject->semester_id,
                'year_level_id' => $subject->year_level_id,
            ]);

        $subjectsQuery = Subject::query()
            ->where('curriculum_semester_id', $curriculumSemesterId)
            ->with(['semester:id,semester_name', 'yearLevel:id,year_level_name'])
            ->select('id', 'subject_code', 'subject_name', 'semester_id', 'year_level_id', 'is_default');

        if (! empty($validatedFilters['semester_id'])) {
            $subjectsQuery->where('semester_id', $validatedFilters['semester_id']);
        }

        if (! empty($validatedFilters['year_level_id'])) {
            $subjectsQuery->where('year_level_id', $validatedFilters['year_level_id']);
        }

        return Inertia::render('subjects', [
            'subjects' => $subjectsQuery
                ->orderBy('subject_code')
                ->get()
                ->map($mapSubject),
            'subjectsForValidation' => $subjectsForValidation,
            'defaultSubjectsForValidation' => Subject::query()
                ->where('is_default', true)
                ->select('id', 'subject_code', 'subject_name', 'semester_id', 'year_level_id')
                ->orderBy('subject_code')
                ->get()
                ->map(fn (Subject $subject) => [
                    'id' => $subject->id,
                    'subject_code' => $subject->subject_code,
                    'subject_name' => $subject->subject_name,
                    'semester_id' => $subject->semester_id,
                    'year_level_id' => $subject->year_level_id,
                ]),
            'semesters' => Semester::query()
                ->select('id', 'semester_name')
                ->orderBy('id')
                ->get()
                ->map(fn (Semester $semester) => [
                    'id' => $semester->id,
                    'name' => $semester->semester_name,
                ]),
            'yearLevels' => YearLevel::query()
                ->select('id', 'year_level_name')
                ->orderBy('id')
                ->get()
                ->map(fn (YearLevel $yearLevel) => [
                    'id' => $yearLevel->id,
                    'name' => $yearLevel->year_level_name,
                ]),
            'filters' => [
                'semester_id' => isset($validatedFilters['semester_id']) ? (string) $validatedFilters['semester_id'] : null,
                'year_level_id' => isset($validatedFilters['year_level_id']) ? (string) $validatedFilters['year_level_id'] : null,
            ],
        ]);
    }

    /**
     * @return list<ValidationRule|string>
     */
    private function subjectCodeRules(Request $request, int $curriculumSemesterId, ?int $ignoreId = null): array
    {
        $rules = [
            'required',
            'string',
            'max:255',
            new UniqueNormalizedSubjectCode($curriculumSemesterId, $ignoreId),
        ];

        if ($request->boolean('is_default')) {
            $rules[] = new UniqueDefaultCurriculumSubjectCode($ignoreId);
        }

        return $rules;
    }

    /**
     * @return list<ValidationRule|string>
     */
    private function subjectNameRules(
        Request $request,
        int $curriculumSemesterId,
        int $semesterId,
        int $yearLevelId,
        ?int $ignoreId = null,
    ): array {
        $rules = [
            'required',
            'string',
            'max:255',
            new UniqueNormalizedSubjectName($curriculumSemesterId, $semesterId, $yearLevelId, $ignoreId),
        ];

        if ($request->boolean('is_default')) {
            $rules[] = new UniqueDefaultCurriculumSubjectName($semesterId, $yearLevelId, $ignoreId);
        }

        return $rules;
    }

    public function store(Request $request): RedirectResponse
    {
        $curriculumSemesterId = ActiveCurriculumSemester::id($request);

        $semesterId = $request->integer('semester_id');
        $yearLevelId = $request->integer('year_level_id');

        $validated = $request->validate([
            'subject_code' => $this->subjectCodeRules($request, $curriculumSemesterId),
            'subject_name' => $this->subjectNameRules($request, $curriculumSemesterId, $semesterId, $yearLevelId),
            'semester_id' => ['required', 'integer', 'exists:semesters,id'],
            'year_level_id' => ['required', 'integer', 'exists:year_levels,id'],
            'is_default' => ['sometimes', 'boolean'],
        ]);

        $validated['is_default'] = $request->boolean('is_default');
        $validated['curriculum_semester_id'] = $curriculumSemesterId;

        Subject::create($validated);

        return redirect()->route('subjects')->with('success', 'Subject created successfully.');
    }

    public function update(Request $request, Subject $subject): RedirectResponse
    {
        if ((int) $subject->curriculum_semester_id !== ActiveCurriculumSemester::id($request)) {
            abort(404);
        }

        $semesterId = $request->integer('semester_id');
        $yearLevelId = $request->integer('year_level_id');

        $validated = $request->validate([
            'subject_code' => $this->subjectCodeRules(
                $request,
                (int) $subject->curriculum_semester_id,
                $subject->id,
            ),
            'subject_name' => $this->subjectNameRules(
                $request,
                (int) $subject->curriculum_semester_id,
                $semesterId,
                $yearLevelId,
                $subject->id,
            ),
            'semester_id' => ['required', 'integer', 'exists:semesters,id'],
            'year_level_id' => ['required', 'integer', 'exists:year_levels,id'],
            'is_default' => ['sometimes', 'boolean'],
        ]);

        $validated['is_default'] = $request->boolean('is_default');

        $subject->update($validated);

        return redirect()->route('subjects')->with('success', 'Subject updated successfully.');
    }

    public function deletePreview(Request $request, Subject $subject): JsonResponse
    {
        $curriculumSemesterId = ActiveCurriculumSemester::id($request);

        return response()->json([
            'schedules' => ScheduleDeletePreview::forSubject($subject, $curriculumSemesterId),
        ]);
    }

    public function destroy(Request $request, Subject $subject): RedirectResponse
    {
        $curriculumSemesterId = ActiveCurriculumSemester::id($request);

        if ((int) $subject->curriculum_semester_id !== $curriculumSemesterId) {
            abort(404);
        }

        if (ScheduleDeletePreview::forSubject($subject, $curriculumSemesterId) !== []) {
            abort(
                422,
                'This subject cannot be deleted because it has active schedule(s) in the current curriculum semester. Remove those schedules first.',
            );
        }

        $subject->delete();

        return redirect()->route('subjects')->with('success', 'Subject deleted successfully.');
    }
}

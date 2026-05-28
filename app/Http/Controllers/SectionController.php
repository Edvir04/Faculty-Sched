<?php

namespace App\Http\Controllers;

use App\Models\Section;
use App\Rules\UniqueNormalizedSectionName;
use App\Support\ActiveCurriculumSemester;
use App\Support\ScheduleDeletePreview;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class SectionController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        //
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
        $yearLevelId = $request->integer('year_level_id');

        $validated = $request->validate([
            'year_level_id' => ['required', 'integer', 'exists:year_levels,id'],
            'comlab_id' => [
                'nullable',
                'integer',
                Rule::exists('comlabs', 'id')->where('curriculum_semester_id', $curriculumSemesterId),
            ],
            'section_name' => [
                'required',
                'string',
                'max:255',
                new UniqueNormalizedSectionName($curriculumSemesterId, $yearLevelId),
            ],
        ]);

        $validated['curriculum_semester_id'] = $curriculumSemesterId;

        Section::create($validated);

        return back()->with('success', 'Section created successfully.');
    }

    /**
     * Display the specified resource.
     */
    public function show(Section $section)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Section $section)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Section $section): RedirectResponse
    {
        $yearLevelId = $request->integer('year_level_id');

        $validated = $request->validate([
            'year_level_id' => ['required', 'integer', 'exists:year_levels,id'],
            'comlab_id' => [
                'sometimes',
                'nullable',
                'integer',
                Rule::exists('comlabs', 'id')->where(
                    'curriculum_semester_id',
                    $section->curriculum_semester_id,
                ),
            ],
            'section_name' => [
                'required',
                'string',
                'max:255',
                new UniqueNormalizedSectionName(
                    (int) $section->curriculum_semester_id,
                    $yearLevelId,
                    $section->id,
                ),
            ],
        ]);

        $section->update($validated);

        return back()->with('success', 'Section updated successfully.');
    }

    public function deletePreview(Request $request, Section $section): JsonResponse
    {
        $curriculumSemesterId = ActiveCurriculumSemester::id($request);

        return response()->json([
            'schedules' => ScheduleDeletePreview::forSection($section, $curriculumSemesterId),
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, Section $section): RedirectResponse
    {
        $curriculumSemesterId = ActiveCurriculumSemester::id($request);

        if ((int) $section->curriculum_semester_id !== $curriculumSemesterId) {
            abort(404);
        }

        DB::transaction(function () use ($section): void {
            $section->delete();
        });

        return back()->with('success', 'Section deleted successfully.');
    }
}

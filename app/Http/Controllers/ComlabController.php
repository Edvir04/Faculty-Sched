<?php

namespace App\Http\Controllers;

use App\Models\Comlab;
use App\Models\Section;
use App\Rules\UniqueDefaultCurriculumComlabName;
use App\Rules\UniqueNormalizedComlabName;
use App\Support\ActiveCurriculumSemester;
use App\Support\ScheduleDeletePreview;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ComlabController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        //
    }

    /**
     * @return list<ValidationRule|string>
     */
    private function comlabNameRules(Request $request, int $curriculumSemesterId, ?int $ignoreId = null): array
    {
        $rules = [
            'required',
            'string',
            'max:255',
            new UniqueNormalizedComlabName($curriculumSemesterId, $ignoreId),
        ];

        if ($request->boolean('is_default')) {
            $rules[] = new UniqueDefaultCurriculumComlabName((string) $request->input('campus', ''), $ignoreId);
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
            'campus' => ['required', 'string', 'max:255'],
            'comlab_name' => $this->comlabNameRules($request, $curriculumSemesterId),
            'is_default' => ['sometimes', 'boolean'],
        ]);

        $validated['is_default'] = $request->boolean('is_default');
        $validated['curriculum_semester_id'] = $curriculumSemesterId;

        Comlab::create($validated);

        return back()->with('success', 'Comlab created successfully.');
    }

    /**
     * Display the specified resource.
     */
    public function show(Comlab $comlab)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Comlab $comlab)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Comlab $comlab): RedirectResponse
    {
        $validated = $request->validate([
            'campus' => ['required', 'string', 'max:255'],
            'comlab_name' => $this->comlabNameRules(
                $request,
                (int) $comlab->curriculum_semester_id,
                $comlab->id,
            ),
            'is_default' => ['sometimes', 'boolean'],
        ]);

        $validated['is_default'] = $request->boolean('is_default');

        $comlab->update($validated);

        return back()->with('success', 'Comlab updated successfully.');
    }

    public function deletePreview(Request $request, Comlab $comlab): JsonResponse
    {
        $curriculumSemesterId = ActiveCurriculumSemester::id($request);

        return response()->json([
            'schedules' => ScheduleDeletePreview::forComlab($comlab, $curriculumSemesterId),
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, Comlab $comlab): RedirectResponse
    {
        $curriculumSemesterId = ActiveCurriculumSemester::id($request);

        if ((int) $comlab->curriculum_semester_id !== $curriculumSemesterId) {
            abort(404);
        }

        DB::transaction(function () use ($comlab): void {
            Section::query()
                ->where('comlab_id', $comlab->id)
                ->update(['comlab_id' => null]);

            $comlab->delete();
        });

        return back()->with('success', 'Comlab deleted successfully.');
    }
}

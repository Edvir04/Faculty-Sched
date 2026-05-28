<?php

namespace App\Http\Controllers;

use App\Models\CurriculumSemester;
use App\Services\DefaultCurriculumService;
use App\Services\DeleteCurriculumSemesterService;
use App\Support\ActiveCurriculumSemester;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CurriculumSemesterController extends Controller
{
    public function __construct(
        private readonly DefaultCurriculumService $defaultCurriculumService,
        private readonly DeleteCurriculumSemesterService $deleteCurriculumSemesterService,
    ) {}

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'school_year' => ['nullable', 'string', 'max:20'],
            'use_default_curriculum' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $useDefaultCurriculum = $request->boolean('use_default_curriculum');
        $shouldActivate = $request->boolean('is_active', true);

        $semester = DB::transaction(function () use ($validated, $useDefaultCurriculum, $shouldActivate): CurriculumSemester {
            if ($shouldActivate) {
                CurriculumSemester::query()->update(['is_active' => false]);
            }

            $semester = CurriculumSemester::query()->create([
                'name' => $validated['name'],
                'school_year' => $validated['school_year'] ?? null,
                'is_active' => $shouldActivate,
            ]);

            if ($useDefaultCurriculum) {
                $this->defaultCurriculumService->seedFromDefaults($semester);
            }

            return $semester;
        });

        $request->session()->put(ActiveCurriculumSemester::SESSION_KEY, $semester->id);

        return back()->with('success', 'Curriculum semester created successfully.');
    }

    public function activate(Request $request, CurriculumSemester $curriculumSemester): RedirectResponse
    {
        DB::transaction(function () use ($curriculumSemester): void {
            CurriculumSemester::query()->update(['is_active' => false]);
            $curriculumSemester->update(['is_active' => true]);
        });

        $request->session()->put(ActiveCurriculumSemester::SESSION_KEY, $curriculumSemester->id);

        return back();
    }

    public function destroy(Request $request, CurriculumSemester $curriculumSemester): RedirectResponse
    {
        $this->deleteCurriculumSemesterService->delete($curriculumSemester, $request);

        return back()->with('success', 'Curriculum semester deleted successfully.');
    }
}

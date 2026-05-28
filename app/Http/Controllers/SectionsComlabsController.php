<?php

namespace App\Http\Controllers;

use App\Models\Comlab;
use App\Models\Section;
use App\Models\YearLevel;
use App\Support\ActiveCurriculumSemester;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SectionsComlabsController extends Controller
{
    public function index(Request $request): Response
    {
        $curriculumSemesterId = ActiveCurriculumSemester::id($request);

        return Inertia::render('sections-comlabs', [
            'sections' => Section::query()
                ->where('curriculum_semester_id', $curriculumSemesterId)
                ->with(['yearLevel:id,year_level_name', 'comlab:id,comlab_name,campus'])
                ->select('id', 'section_name', 'year_level_id', 'comlab_id', 'curriculum_semester_id')
                ->orderBy('section_name')
                ->get()
                ->map(fn (Section $section) => [
                    'id' => $section->id,
                    'section_name' => $section->section_name,
                    'year_level_id' => $section->year_level_id,
                    'year_level_name' => $section->yearLevel?->year_level_name,
                    'comlab_id' => $section->comlab_id,
                    'comlab_name' => $section->comlab?->comlab_name,
                    'comlab_campus' => $section->comlab?->campus,
                ]),
            'comlabs' => Comlab::query()
                ->where('curriculum_semester_id', $curriculumSemesterId)
                ->select('id', 'comlab_name', 'campus', 'is_default')
                ->orderBy('comlab_name')
                ->get()
                ->map(fn (Comlab $comlab) => [
                    'id' => $comlab->id,
                    'comlab_name' => $comlab->comlab_name,
                    'campus' => $comlab->campus,
                    'is_default' => (bool) $comlab->is_default,
                ]),
            'yearLevels' => YearLevel::query()
                ->select('id', 'year_level_name')
                ->orderBy('id')
                ->get()
                ->map(fn (YearLevel $yearLevel) => [
                    'id' => $yearLevel->id,
                    'name' => $yearLevel->year_level_name,
                ]),
            'defaultComlabsForValidation' => Comlab::query()
                ->where('is_default', true)
                ->select('id', 'comlab_name', 'campus')
                ->orderBy('comlab_name')
                ->get()
                ->map(fn (Comlab $comlab) => [
                    'id' => $comlab->id,
                    'comlab_name' => $comlab->comlab_name,
                    'campus' => $comlab->campus,
                ]),
        ]);
    }
}

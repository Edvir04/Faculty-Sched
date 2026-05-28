<?php

namespace Tests\Feature;

use App\Models\Comlab;
use App\Models\CurriculumSemester;
use App\Models\Section;
use App\Models\User;
use App\Models\YearLevel;
use App\Support\ActiveCurriculumSemester;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SectionsComlabsCurriculumSemesterTest extends TestCase
{
    use RefreshDatabase;

    private YearLevel $yearLevel;

    protected function setUp(): void
    {
        parent::setUp();

        $this->actingAs(User::factory()->create());
        $this->yearLevel = YearLevel::query()->create(['year_level_name' => 'First Year']);
    }

    public function test_sections_comlabs_index_only_returns_sections_for_active_curriculum_semester(): void
    {
        $semesterA = CurriculumSemester::query()->create([
            'name' => 'Semester A',
            'is_active' => true,
        ]);

        $semesterB = CurriculumSemester::query()->create([
            'name' => 'Semester B',
            'is_active' => false,
        ]);

        Section::query()->create([
            'section_name' => 'Section A',
            'year_level_id' => $this->yearLevel->id,
            'curriculum_semester_id' => $semesterA->id,
        ]);

        Section::query()->create([
            'section_name' => 'Section B',
            'year_level_id' => $this->yearLevel->id,
            'curriculum_semester_id' => $semesterB->id,
        ]);

        $this->withSession([ActiveCurriculumSemester::SESSION_KEY => $semesterA->id])
            ->get(route('sections-comlabs'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('sections-comlabs')
                ->has('sections', 1)
                ->where('sections.0.section_name', 'Section A')
                ->where('activeCurriculumSemester.id', $semesterA->id));

        $this->patch(route('curriculum-semesters.activate', $semesterB))
            ->assertRedirect();

        $this->get(route('sections-comlabs'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('sections-comlabs')
                ->has('sections', 1)
                ->where('sections.0.section_name', 'Section B')
                ->where('activeCurriculumSemester.id', $semesterB->id));
    }

    public function test_section_store_assigns_active_curriculum_semester(): void
    {
        $semester = CurriculumSemester::query()->create([
            'name' => 'Active Semester',
            'is_active' => true,
        ]);

        $this->withSession([ActiveCurriculumSemester::SESSION_KEY => $semester->id])
            ->post(route('sections.store'), [
                'section_name' => 'BSIT 1-A',
                'year_level_id' => $this->yearLevel->id,
            ])
            ->assertRedirect();

        $section = Section::query()->where('section_name', 'BSIT 1-A')->first();

        $this->assertNotNull($section);
        $this->assertSame($semester->id, $section->curriculum_semester_id);
    }

    public function test_comlab_store_rejects_duplicate_name_regardless_of_campus(): void
    {
        $semester = CurriculumSemester::query()->create([
            'name' => 'Active Semester',
            'is_active' => true,
        ]);

        Comlab::query()->create([
            'comlab_name' => 'Lab 101',
            'campus' => 'main-campus',
            'curriculum_semester_id' => $semester->id,
        ]);

        $this->withSession([ActiveCurriculumSemester::SESSION_KEY => $semester->id])
            ->post(route('comlabs.store'), [
                'comlab_name' => 'Lab 101',
                'campus' => 'young-field-campus',
            ])
            ->assertSessionHasErrors('comlab_name');
    }

    public function test_comlab_store_rejects_normalized_duplicate_with_different_spacing_and_case(): void
    {
        $semester = CurriculumSemester::query()->create([
            'name' => 'Active Semester',
            'is_active' => true,
        ]);

        Comlab::query()->create([
            'comlab_name' => 'Computer Laboratory 3',
            'campus' => 'main-campus',
            'curriculum_semester_id' => $semester->id,
        ]);

        $this->withSession([ActiveCurriculumSemester::SESSION_KEY => $semester->id])
            ->post(route('comlabs.store'), [
                'comlab_name' => 'computerlaboratory3',
                'campus' => 'young-field-campus',
            ])
            ->assertSessionHasErrors('comlab_name');
    }

    public function test_section_store_rejects_duplicate_name_for_same_year_level(): void
    {
        $semester = CurriculumSemester::query()->create([
            'name' => 'Active Semester',
            'is_active' => true,
        ]);

        Section::query()->create([
            'section_name' => 'BSIT 1-A',
            'year_level_id' => $this->yearLevel->id,
            'curriculum_semester_id' => $semester->id,
        ]);

        $this->withSession([ActiveCurriculumSemester::SESSION_KEY => $semester->id])
            ->post(route('sections.store'), [
                'section_name' => 'BSIT 1-A',
                'year_level_id' => $this->yearLevel->id,
            ])
            ->assertSessionHasErrors('section_name');
    }

    public function test_section_store_rejects_normalized_duplicate_with_different_spacing_and_case(): void
    {
        $semester = CurriculumSemester::query()->create([
            'name' => 'Active Semester',
            'is_active' => true,
        ]);

        Section::query()->create([
            'section_name' => 'AI 41',
            'year_level_id' => $this->yearLevel->id,
            'curriculum_semester_id' => $semester->id,
        ]);

        $this->withSession([ActiveCurriculumSemester::SESSION_KEY => $semester->id])
            ->post(route('sections.store'), [
                'section_name' => 'ai41',
                'year_level_id' => $this->yearLevel->id,
            ])
            ->assertSessionHasErrors('section_name');
    }
}

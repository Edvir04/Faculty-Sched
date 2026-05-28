<?php

namespace Tests\Feature;

use App\Models\CurriculumSemester;
use App\Models\Semester;
use App\Models\Subject;
use App\Models\User;
use App\Models\YearLevel;
use App\Support\ActiveCurriculumSemester;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SubjectDuplicateValidationTest extends TestCase
{
    use RefreshDatabase;

    private CurriculumSemester $curriculumSemester;

    private Semester $firstTermSemester;

    private Semester $secondTermSemester;

    private YearLevel $firstYear;

    private YearLevel $secondYear;

    protected function setUp(): void
    {
        parent::setUp();

        $this->actingAs(User::factory()->create());

        $this->curriculumSemester = CurriculumSemester::query()->create([
            'name' => 'Test Curriculum',
            'is_active' => true,
        ]);

        $this->firstTermSemester = Semester::query()->create(['semester_name' => 'First Semester']);
        $this->secondTermSemester = Semester::query()->create(['semester_name' => 'Second Semester']);
        $this->firstYear = YearLevel::query()->create(['year_level_name' => 'First Year']);
        $this->secondYear = YearLevel::query()->create(['year_level_name' => 'Second Year']);
    }

    public function test_store_rejects_duplicate_subject_code_with_different_spacing_and_case(): void
    {
        Subject::query()->create([
            'subject_code' => 'IT 132L',
            'subject_name' => 'Programming 1',
            'semester_id' => $this->firstTermSemester->id,
            'year_level_id' => $this->firstYear->id,
            'curriculum_semester_id' => $this->curriculumSemester->id,
            'is_default' => false,
        ]);

        $this->withSession([ActiveCurriculumSemester::SESSION_KEY => $this->curriculumSemester->id])
            ->post(route('subjects.store'), [
                'subject_code' => 'it132l',
                'subject_name' => 'Another Course',
                'semester_id' => $this->firstTermSemester->id,
                'year_level_id' => $this->firstYear->id,
                'is_default' => false,
            ])
            ->assertSessionHasErrors(['subject_code']);
    }

    public function test_store_rejects_duplicate_subject_name_case_insensitive(): void
    {
        Subject::query()->create([
            'subject_code' => 'CS101',
            'subject_name' => 'Intro to Computing',
            'semester_id' => $this->firstTermSemester->id,
            'year_level_id' => $this->firstYear->id,
            'curriculum_semester_id' => $this->curriculumSemester->id,
            'is_default' => false,
        ]);

        $this->withSession([ActiveCurriculumSemester::SESSION_KEY => $this->curriculumSemester->id])
            ->post(route('subjects.store'), [
                'subject_code' => 'CS102',
                'subject_name' => 'intro to computing',
                'semester_id' => $this->firstTermSemester->id,
                'year_level_id' => $this->firstYear->id,
                'is_default' => false,
            ])
            ->assertSessionHasErrors(['subject_name']);
    }

    public function test_store_rejects_same_code_in_different_year_level_within_curriculum(): void
    {
        Subject::query()->create([
            'subject_code' => 'IT101',
            'subject_name' => 'Programming',
            'semester_id' => $this->firstTermSemester->id,
            'year_level_id' => $this->firstYear->id,
            'curriculum_semester_id' => $this->curriculumSemester->id,
            'is_default' => false,
        ]);

        $this->withSession([ActiveCurriculumSemester::SESSION_KEY => $this->curriculumSemester->id])
            ->post(route('subjects.store'), [
                'subject_code' => 'it101',
                'subject_name' => 'Programming Advanced',
                'semester_id' => $this->firstTermSemester->id,
                'year_level_id' => $this->secondYear->id,
                'is_default' => false,
            ])
            ->assertSessionHasErrors(['subject_code']);
    }

    public function test_store_rejects_same_code_in_different_semester_within_curriculum(): void
    {
        Subject::query()->create([
            'subject_code' => 'GE-101',
            'subject_name' => 'General Education',
            'semester_id' => $this->firstTermSemester->id,
            'year_level_id' => $this->firstYear->id,
            'curriculum_semester_id' => $this->curriculumSemester->id,
            'is_default' => false,
        ]);

        $this->withSession([ActiveCurriculumSemester::SESSION_KEY => $this->curriculumSemester->id])
            ->post(route('subjects.store'), [
                'subject_code' => 'ge-101',
                'subject_name' => 'Another GE Course',
                'semester_id' => $this->secondTermSemester->id,
                'year_level_id' => $this->firstYear->id,
                'is_default' => false,
            ])
            ->assertSessionHasErrors(['subject_code']);
    }

    public function test_update_allows_same_subject_to_keep_its_own_code(): void
    {
        $subject = Subject::query()->create([
            'subject_code' => 'IT 132L',
            'subject_name' => 'Programming 1',
            'semester_id' => $this->firstTermSemester->id,
            'year_level_id' => $this->firstYear->id,
            'curriculum_semester_id' => $this->curriculumSemester->id,
            'is_default' => false,
        ]);

        $this->withSession([ActiveCurriculumSemester::SESSION_KEY => $this->curriculumSemester->id])
            ->put(route('subjects.update', $subject), [
                'subject_code' => 'it 132l',
                'subject_name' => 'Programming 1',
                'semester_id' => $this->firstTermSemester->id,
                'year_level_id' => $this->firstYear->id,
                'is_default' => false,
            ])
            ->assertRedirect(route('subjects'));
    }
}

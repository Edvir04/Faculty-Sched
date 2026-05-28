<?php

namespace Tests\Feature;

use App\Models\Comlab;
use App\Models\CurriculumSemester;
use App\Models\Semester;
use App\Models\Subject;
use App\Models\Teacher;
use App\Models\User;
use App\Models\YearLevel;
use App\Support\ActiveCurriculumSemester;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DefaultCurriculumDuplicateValidationTest extends TestCase
{
    use RefreshDatabase;

    private CurriculumSemester $semesterA;

    private CurriculumSemester $semesterB;

    private Semester $termSemester;

    private YearLevel $yearLevel;

    protected function setUp(): void
    {
        parent::setUp();

        $this->actingAs(User::factory()->create());

        $this->semesterA = CurriculumSemester::query()->create([
            'name' => 'Semester A',
            'is_active' => true,
        ]);

        $this->semesterB = CurriculumSemester::query()->create([
            'name' => 'Semester B',
            'is_active' => false,
        ]);

        $this->termSemester = Semester::query()->create(['semester_name' => 'First Semester']);
        $this->yearLevel = YearLevel::query()->create(['year_level_name' => 'First Year']);
    }

    public function test_default_teacher_name_is_unique_across_curriculum_semesters(): void
    {
        $this->withSession([ActiveCurriculumSemester::SESSION_KEY => $this->semesterA->id])
            ->post(route('teachers.store'), [
                'teacher_name' => 'Galban',
                'status' => 'Regular',
                'is_default' => true,
            ])
            ->assertRedirect();

        $this->withSession([ActiveCurriculumSemester::SESSION_KEY => $this->semesterB->id])
            ->post(route('teachers.store'), [
                'teacher_name' => 'galban',
                'status' => 'Regular',
                'is_default' => true,
            ])
            ->assertSessionHasErrors('teacher_name');
    }

    public function test_same_teacher_name_allowed_in_second_semester_when_not_default(): void
    {
        Teacher::query()->create([
            'teacher_name' => 'Galban',
            'status' => 'Regular',
            'curriculum_semester_id' => $this->semesterA->id,
            'is_default' => true,
        ]);

        $this->withSession([ActiveCurriculumSemester::SESSION_KEY => $this->semesterB->id])
            ->post(route('teachers.store'), [
                'teacher_name' => 'galban',
                'status' => 'Regular',
                'is_default' => false,
            ])
            ->assertRedirect();

        $this->assertTrue(
            Teacher::query()
                ->where('curriculum_semester_id', $this->semesterB->id)
                ->where('teacher_name', 'galban')
                ->where('is_default', false)
                ->exists(),
        );
    }

    public function test_default_comlab_duplicate_blocked_across_semesters_for_same_campus(): void
    {
        $this->withSession([ActiveCurriculumSemester::SESSION_KEY => $this->semesterA->id])
            ->post(route('comlabs.store'), [
                'comlab_name' => 'Lab One',
                'campus' => 'main-campus',
                'is_default' => true,
            ])
            ->assertRedirect();

        $this->withSession([ActiveCurriculumSemester::SESSION_KEY => $this->semesterB->id])
            ->post(route('comlabs.store'), [
                'comlab_name' => 'Lab  One',
                'campus' => 'main-campus',
                'is_default' => true,
            ])
            ->assertSessionHasErrors('comlab_name');
    }

    public function test_default_subject_code_duplicate_blocked_across_semesters(): void
    {
        $this->withSession([ActiveCurriculumSemester::SESSION_KEY => $this->semesterA->id])
            ->post(route('subjects.store'), [
                'subject_code' => 'CS101',
                'subject_name' => 'Intro A',
                'semester_id' => $this->termSemester->id,
                'year_level_id' => $this->yearLevel->id,
                'is_default' => true,
            ])
            ->assertRedirect(route('subjects'));

        $this->withSession([ActiveCurriculumSemester::SESSION_KEY => $this->semesterB->id])
            ->post(route('subjects.store'), [
                'subject_code' => 'cs 101',
                'subject_name' => 'Intro B',
                'semester_id' => $this->termSemester->id,
                'year_level_id' => $this->yearLevel->id,
                'is_default' => true,
            ])
            ->assertSessionHasErrors('subject_code');
    }

    public function test_default_subject_name_duplicate_blocked_for_same_term_and_year_level(): void
    {
        $this->withSession([ActiveCurriculumSemester::SESSION_KEY => $this->semesterA->id])
            ->post(route('subjects.store'), [
                'subject_code' => 'CS101',
                'subject_name' => 'Intro to Computing',
                'semester_id' => $this->termSemester->id,
                'year_level_id' => $this->yearLevel->id,
                'is_default' => true,
            ])
            ->assertRedirect(route('subjects'));

        $this->withSession([ActiveCurriculumSemester::SESSION_KEY => $this->semesterB->id])
            ->post(route('subjects.store'), [
                'subject_code' => 'CS102',
                'subject_name' => 'intro to computing',
                'semester_id' => $this->termSemester->id,
                'year_level_id' => $this->yearLevel->id,
                'is_default' => true,
            ])
            ->assertSessionHasErrors('subject_name');
    }

    public function test_updating_default_teacher_without_changing_identity_is_allowed(): void
    {
        $teacher = Teacher::query()->create([
            'teacher_name' => 'Galban',
            'status' => 'Regular',
            'curriculum_semester_id' => $this->semesterA->id,
            'is_default' => true,
        ]);

        $this->withSession([ActiveCurriculumSemester::SESSION_KEY => $this->semesterA->id])
            ->put(route('teachers.update', $teacher), [
                'teacher_name' => 'Galban',
                'status' => 'Part-Time',
                'is_default' => true,
            ])
            ->assertRedirect();

        $this->assertSame('Part-Time', $teacher->fresh()->status);
    }

    public function test_enabling_default_on_existing_teacher_fails_when_global_duplicate_exists(): void
    {
        Teacher::query()->create([
            'teacher_name' => 'Galban',
            'status' => 'Regular',
            'curriculum_semester_id' => $this->semesterA->id,
            'is_default' => true,
        ]);

        $teacherB = Teacher::query()->create([
            'teacher_name' => 'Unique Name',
            'status' => 'Regular',
            'curriculum_semester_id' => $this->semesterB->id,
            'is_default' => false,
        ]);

        $this->withSession([ActiveCurriculumSemester::SESSION_KEY => $this->semesterB->id])
            ->put(route('teachers.update', $teacherB), [
                'teacher_name' => 'galban',
                'status' => 'Regular',
                'is_default' => true,
            ])
            ->assertSessionHasErrors('teacher_name');
    }

    public function test_default_comlab_update_without_changing_identity_is_allowed(): void
    {
        $comlab = Comlab::query()->create([
            'comlab_name' => 'Lab One',
            'campus' => 'main-campus',
            'curriculum_semester_id' => $this->semesterA->id,
            'is_default' => true,
        ]);

        $this->withSession([ActiveCurriculumSemester::SESSION_KEY => $this->semesterA->id])
            ->put(route('comlabs.update', $comlab), [
                'comlab_name' => 'Lab One',
                'campus' => 'main-campus',
                'is_default' => true,
            ])
            ->assertRedirect();
    }

    public function test_enabling_default_on_subject_fails_when_code_exists_in_default_pool(): void
    {
        Subject::query()->create([
            'subject_code' => 'CS101',
            'subject_name' => 'Intro A',
            'semester_id' => $this->termSemester->id,
            'year_level_id' => $this->yearLevel->id,
            'curriculum_semester_id' => $this->semesterA->id,
            'is_default' => true,
        ]);

        $subjectB = Subject::query()->create([
            'subject_code' => 'MATH101',
            'subject_name' => 'Algebra',
            'semester_id' => $this->termSemester->id,
            'year_level_id' => $this->yearLevel->id,
            'curriculum_semester_id' => $this->semesterB->id,
            'is_default' => false,
        ]);

        $this->withSession([ActiveCurriculumSemester::SESSION_KEY => $this->semesterB->id])
            ->put(route('subjects.update', $subjectB), [
                'subject_code' => 'cs101',
                'subject_name' => 'Algebra',
                'semester_id' => $this->termSemester->id,
                'year_level_id' => $this->yearLevel->id,
                'is_default' => true,
            ])
            ->assertSessionHasErrors('subject_code');
    }
}

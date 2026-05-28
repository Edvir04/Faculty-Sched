<?php

namespace Tests\Feature;

use App\Models\CurriculumSemester;
use App\Models\Teacher;
use App\Models\User;
use App\Support\ActiveCurriculumSemester;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TeacherDuplicateValidationTest extends TestCase
{
    use RefreshDatabase;

    private CurriculumSemester $curriculumSemester;

    protected function setUp(): void
    {
        parent::setUp();

        $this->actingAs(User::factory()->create());

        $this->curriculumSemester = CurriculumSemester::query()->create([
            'name' => 'Test Curriculum',
            'is_active' => true,
        ]);
    }

    public function test_store_rejects_duplicate_teacher_name_case_insensitive(): void
    {
        Teacher::query()->create([
            'teacher_name' => 'Juan Dela Cruz',
            'status' => 'Regular',
            'curriculum_semester_id' => $this->curriculumSemester->id,
            'is_default' => false,
        ]);

        $this->withSession([ActiveCurriculumSemester::SESSION_KEY => $this->curriculumSemester->id])
            ->post(route('teachers.store'), [
                'teacher_name' => 'juan dela cruz',
                'status' => 'Part-Time',
                'is_default' => false,
            ])
            ->assertSessionHasErrors(['teacher_name']);
    }

    public function test_store_rejects_same_name_with_different_status(): void
    {
        Teacher::query()->create([
            'teacher_name' => 'General Bato',
            'status' => 'Regular',
            'curriculum_semester_id' => $this->curriculumSemester->id,
            'is_default' => false,
        ]);

        $this->withSession([ActiveCurriculumSemester::SESSION_KEY => $this->curriculumSemester->id])
            ->post(route('teachers.store'), [
                'teacher_name' => 'General Bato',
                'status' => 'Part-Time',
                'is_default' => false,
            ])
            ->assertSessionHasErrors(['teacher_name']);
    }

    public function test_update_allows_teacher_to_keep_own_name_with_different_case(): void
    {
        $teacher = Teacher::query()->create([
            'teacher_name' => 'Juan Dela Cruz',
            'status' => 'Regular',
            'curriculum_semester_id' => $this->curriculumSemester->id,
            'is_default' => false,
        ]);

        $this->withSession([ActiveCurriculumSemester::SESSION_KEY => $this->curriculumSemester->id])
            ->put(route('teachers.update', $teacher), [
                'teacher_name' => 'juan dela cruz',
                'status' => 'Regular',
                'is_default' => false,
            ])
            ->assertRedirect();
    }

    public function test_update_rejects_name_matching_another_teacher_case_insensitive(): void
    {
        Teacher::query()->create([
            'teacher_name' => 'Maria Santos',
            'status' => 'Regular',
            'curriculum_semester_id' => $this->curriculumSemester->id,
            'is_default' => false,
        ]);

        $teacher = Teacher::query()->create([
            'teacher_name' => 'Pedro Reyes',
            'status' => 'Part-Time',
            'curriculum_semester_id' => $this->curriculumSemester->id,
            'is_default' => false,
        ]);

        $this->withSession([ActiveCurriculumSemester::SESSION_KEY => $this->curriculumSemester->id])
            ->put(route('teachers.update', $teacher), [
                'teacher_name' => 'maria santos',
                'status' => 'Part-Time',
                'is_default' => false,
            ])
            ->assertSessionHasErrors(['teacher_name']);
    }
}

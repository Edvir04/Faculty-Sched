<?php

namespace Tests\Feature;

use App\Models\Comlab;
use App\Models\CurriculumSemester;
use App\Models\Semester;
use App\Models\Subject;
use App\Models\Teacher;
use App\Models\User;
use App\Models\YearLevel;
use App\Services\DefaultCurriculumService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DefaultCurriculumTest extends TestCase
{
    use RefreshDatabase;

    private CurriculumSemester $defaultCurriculumSemester;

    private Semester $termSemester;

    private YearLevel $yearLevel;

    protected function setUp(): void
    {
        parent::setUp();

        $this->actingAs(User::factory()->create());

        $this->defaultCurriculumSemester = CurriculumSemester::query()->create([
            'name' => 'Default Curriculum',
            'is_active' => true,
        ]);

        $this->termSemester = Semester::query()->create(['semester_name' => 'First Semester']);
        $this->yearLevel = YearLevel::query()->create(['year_level_name' => 'First Year']);
    }

    public function test_teacher_create_and_update_persist_is_default(): void
    {
        $this->post(route('teachers.store'), [
            'teacher_name' => 'Ada Lovelace',
            'status' => 'Regular',
            'is_default' => true,
        ])->assertRedirect();

        $teacher = Teacher::query()->where('teacher_name', 'Ada Lovelace')->first();
        $this->assertNotNull($teacher);
        $this->assertTrue($teacher->is_default);

        $this->put(route('teachers.update', $teacher), [
            'teacher_name' => 'Ada Lovelace',
            'status' => 'Regular',
            'is_default' => false,
        ])->assertRedirect();

        $this->assertFalse($teacher->fresh()->is_default);
    }

    public function test_comlab_create_and_update_persist_is_default(): void
    {
        $this->post(route('comlabs.store'), [
            'comlab_name' => 'Lab A',
            'campus' => 'main-campus',
            'is_default' => true,
        ])->assertRedirect();

        $comlab = Comlab::query()->where('comlab_name', 'Lab A')->first();
        $this->assertNotNull($comlab);
        $this->assertTrue($comlab->is_default);

        $this->put(route('comlabs.update', $comlab), [
            'comlab_name' => 'Lab A',
            'campus' => 'main-campus',
            'is_default' => false,
        ])->assertRedirect();

        $this->assertFalse($comlab->fresh()->is_default);
    }

    public function test_subject_create_and_update_persist_is_default(): void
    {
        $this->post(route('subjects.store'), [
            'subject_code' => 'CS101',
            'subject_name' => 'Intro to Computing',
            'semester_id' => $this->termSemester->id,
            'year_level_id' => $this->yearLevel->id,
            'is_default' => true,
        ])->assertRedirect(route('subjects'));

        $subject = Subject::query()->where('subject_code', 'CS101')->first();
        $this->assertNotNull($subject);
        $this->assertTrue($subject->is_default);

        $this->put(route('subjects.update', $subject), [
            'subject_code' => 'CS101',
            'subject_name' => 'Intro to Computing',
            'semester_id' => $this->termSemester->id,
            'year_level_id' => $this->yearLevel->id,
            'is_default' => false,
        ])->assertRedirect(route('subjects'));

        $this->assertFalse($subject->fresh()->is_default);
    }

    public function test_curriculum_semester_with_default_curriculum_seeds_records(): void
    {
        Teacher::query()->create([
            'teacher_name' => 'Default Teacher',
            'status' => 'Regular',
            'curriculum_semester_id' => $this->defaultCurriculumSemester->id,
            'is_default' => true,
        ]);

        Comlab::query()->create([
            'comlab_name' => 'Default Lab',
            'campus' => 'main-campus',
            'curriculum_semester_id' => $this->defaultCurriculumSemester->id,
            'is_default' => true,
        ]);

        Subject::query()->create([
            'subject_code' => 'DEF101',
            'subject_name' => 'Default Subject',
            'semester_id' => $this->termSemester->id,
            'year_level_id' => $this->yearLevel->id,
            'curriculum_semester_id' => $this->defaultCurriculumSemester->id,
            'is_default' => true,
        ]);

        $this->post(route('curriculum-semesters.store'), [
            'name' => '2026-2027 First Semester',
            'school_year' => '2026-2027',
            'use_default_curriculum' => true,
        ])->assertRedirect();

        $newSemester = CurriculumSemester::query()->where('name', '2026-2027 First Semester')->first();
        $this->assertNotNull($newSemester);

        $this->assertTrue(
            Teacher::query()->where('curriculum_semester_id', $newSemester->id)->where('teacher_name', 'Default Teacher')->exists(),
        );
        $this->assertTrue(
            Comlab::query()->where('curriculum_semester_id', $newSemester->id)->where('comlab_name', 'Default Lab')->exists(),
        );
        $this->assertTrue(
            Subject::query()->where('curriculum_semester_id', $newSemester->id)->where('subject_code', 'DEF101')->exists(),
        );
    }

    public function test_curriculum_semester_without_default_curriculum_does_not_seed(): void
    {
        Teacher::query()->create([
            'teacher_name' => 'Default Teacher',
            'status' => 'Regular',
            'curriculum_semester_id' => $this->defaultCurriculumSemester->id,
            'is_default' => true,
        ]);

        $this->post(route('curriculum-semesters.store'), [
            'name' => 'Empty Semester',
            'use_default_curriculum' => false,
        ])->assertRedirect();

        $newSemester = CurriculumSemester::query()->where('name', 'Empty Semester')->first();
        $this->assertSame(0, Teacher::query()->where('curriculum_semester_id', $newSemester->id)->count());
    }

    public function test_default_curriculum_seeding_is_idempotent(): void
    {
        Teacher::query()->create([
            'teacher_name' => 'Default Teacher',
            'status' => 'Regular',
            'curriculum_semester_id' => $this->defaultCurriculumSemester->id,
            'is_default' => true,
        ]);

        $target = CurriculumSemester::query()->create([
            'name' => 'Target Semester',
            'is_active' => false,
        ]);

        $service = app(DefaultCurriculumService::class);
        $service->seedFromDefaults($target);
        $service->seedFromDefaults($target);

        $this->assertSame(
            1,
            Teacher::query()->where('curriculum_semester_id', $target->id)->where('teacher_name', 'Default Teacher')->count(),
        );
    }
}

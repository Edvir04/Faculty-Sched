<?php

namespace Tests\Feature;

use App\Models\Comlab;
use App\Models\CurriculumSemester;
use App\Models\Schedule;
use App\Models\Section;
use App\Models\Semester;
use App\Models\Subject;
use App\Models\Teacher;
use App\Models\User;
use App\Models\YearLevel;
use App\Support\ActiveCurriculumSemester;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SubjectDeletePreviewTest extends TestCase
{
    use RefreshDatabase;

    private YearLevel $yearLevel;

    private Semester $termSemester;

    protected function setUp(): void
    {
        parent::setUp();

        $this->actingAs(User::factory()->create());
        $this->yearLevel = YearLevel::query()->create(['year_level_name' => 'First Year']);
        $this->termSemester = Semester::query()->create(['semester_name' => 'First Semester']);
    }

    public function test_subject_delete_preview_returns_linked_schedules(): void
    {
        $semester = CurriculumSemester::query()->create(['name' => 'Semester A', 'is_active' => true]);
        $fixtures = $this->createScheduleFixtures($semester);

        $this->createSchedule($fixtures);
        $this->createSchedule($fixtures, '10:00', '11:00');

        $this->withSession([ActiveCurriculumSemester::SESSION_KEY => $semester->id])
            ->getJson(route('subjects.delete-preview', $fixtures['subject']))
            ->assertOk()
            ->assertJsonCount(2, 'schedules');
    }

    public function test_subject_delete_preview_returns_empty_when_no_schedules(): void
    {
        $semester = CurriculumSemester::query()->create(['name' => 'Semester A', 'is_active' => true]);
        $fixtures = $this->createScheduleFixtures($semester);

        $this->withSession([ActiveCurriculumSemester::SESSION_KEY => $semester->id])
            ->getJson(route('subjects.delete-preview', $fixtures['subject']))
            ->assertOk()
            ->assertJsonCount(0, 'schedules');
    }

    public function test_destroy_with_schedules_returns_422_and_keeps_subject(): void
    {
        $semester = CurriculumSemester::query()->create(['name' => 'Semester A', 'is_active' => true]);
        $fixtures = $this->createScheduleFixtures($semester);
        $subjectId = $fixtures['subject']->id;

        $this->createSchedule($fixtures);

        $this->withSession([ActiveCurriculumSemester::SESSION_KEY => $semester->id])
            ->delete(route('subjects.destroy', $fixtures['subject']))
            ->assertStatus(422);

        $this->assertDatabaseHas('subjects', ['id' => $subjectId]);
    }

    public function test_destroy_with_no_schedules_deletes_subject(): void
    {
        $semester = CurriculumSemester::query()->create(['name' => 'Semester A', 'is_active' => true]);
        $fixtures = $this->createScheduleFixtures($semester);
        $subjectId = $fixtures['subject']->id;

        $this->withSession([ActiveCurriculumSemester::SESSION_KEY => $semester->id])
            ->delete(route('subjects.destroy', $fixtures['subject']))
            ->assertRedirect(route('subjects'));

        $this->assertDatabaseMissing('subjects', ['id' => $subjectId]);
    }

    public function test_preview_and_destroy_return_404_for_wrong_curriculum_semester(): void
    {
        $activeSemester = CurriculumSemester::query()->create(['name' => 'Active', 'is_active' => true]);
        $otherSemester = CurriculumSemester::query()->create(['name' => 'Other', 'is_active' => false]);

        $subject = Subject::query()->create([
            'subject_code' => 'OTHER101',
            'subject_name' => 'Other Subject',
            'semester_id' => $this->termSemester->id,
            'year_level_id' => $this->yearLevel->id,
            'curriculum_semester_id' => $otherSemester->id,
        ]);

        $this->withSession([ActiveCurriculumSemester::SESSION_KEY => $activeSemester->id])
            ->getJson(route('subjects.delete-preview', $subject))
            ->assertNotFound();

        $this->withSession([ActiveCurriculumSemester::SESSION_KEY => $activeSemester->id])
            ->delete(route('subjects.destroy', $subject))
            ->assertNotFound();

        $this->assertDatabaseHas('subjects', ['id' => $subject->id]);
    }

    /**
     * @return array{section: Section, subject: Subject, teacher: Teacher, comlab: Comlab}
     */
    private function createScheduleFixtures(CurriculumSemester $semester): array
    {
        $teacher = Teacher::query()->create([
            'teacher_name' => "Teacher {$semester->id}",
            'status' => 'Regular',
            'curriculum_semester_id' => $semester->id,
        ]);

        $comlab = Comlab::query()->create([
            'comlab_name' => "Lab {$semester->id}",
            'campus' => 'main-campus',
            'curriculum_semester_id' => $semester->id,
        ]);

        $subject = Subject::query()->create([
            'subject_code' => "SUB{$semester->id}",
            'subject_name' => "Subject {$semester->id}",
            'semester_id' => $this->termSemester->id,
            'year_level_id' => $this->yearLevel->id,
            'curriculum_semester_id' => $semester->id,
        ]);

        $section = Section::query()->create([
            'section_name' => "Section {$semester->id}",
            'year_level_id' => $this->yearLevel->id,
            'curriculum_semester_id' => $semester->id,
        ]);

        return compact('section', 'subject', 'teacher', 'comlab');
    }

    /**
     * @param  array{section: Section, subject: Subject, teacher: Teacher, comlab: Comlab}  $fixtures
     */
    private function createSchedule(
        array $fixtures,
        string $startTime = '09:00',
        string $endTime = '10:00',
    ): Schedule {
        return Schedule::query()->create([
            'section_id' => $fixtures['section']->id,
            'subject_id' => $fixtures['subject']->id,
            'teacher_id' => $fixtures['teacher']->id,
            'comlab_id' => $fixtures['comlab']->id,
            'day' => 'Monday',
            'start_time' => $startTime,
            'end_time' => $endTime,
            'semester' => null,
            'school_year' => null,
        ]);
    }
}

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
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SectionComlabDeletePreviewTest extends TestCase
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

    public function test_section_delete_preview_returns_linked_schedules(): void
    {
        $semester = CurriculumSemester::query()->create(['name' => 'Semester A', 'is_active' => true]);
        $fixtures = $this->createScheduleFixtures($semester);

        $this->createSchedule($fixtures);
        $this->createSchedule($fixtures, '10:00', '11:00');

        $this->withSession([ActiveCurriculumSemester::SESSION_KEY => $semester->id])
            ->getJson(route('sections.delete-preview', $fixtures['section']))
            ->assertOk()
            ->assertJsonCount(2, 'schedules');
    }

    public function test_section_destroy_nulls_schedule_section_id_and_removes_section(): void
    {
        $semester = CurriculumSemester::query()->create(['name' => 'Semester A', 'is_active' => true]);
        $fixtures = $this->createScheduleFixtures($semester);
        $schedule = $this->createSchedule($fixtures);
        $sectionId = $fixtures['section']->id;

        $this->withSession([ActiveCurriculumSemester::SESSION_KEY => $semester->id])
            ->delete(route('sections.destroy', $fixtures['section']))
            ->assertRedirect();

        $this->assertDatabaseMissing('sections', ['id' => $sectionId]);
        $this->assertNull($schedule->fresh()->section_id);
    }

    public function test_comlab_delete_preview_returns_linked_schedules(): void
    {
        $semester = CurriculumSemester::query()->create(['name' => 'Semester A', 'is_active' => true]);
        $fixtures = $this->createScheduleFixtures($semester);

        $this->createSchedule($fixtures);

        $this->withSession([ActiveCurriculumSemester::SESSION_KEY => $semester->id])
            ->getJson(route('comlabs.delete-preview', $fixtures['comlab']))
            ->assertOk()
            ->assertJsonCount(1, 'schedules');
    }

    public function test_comlab_destroy_nulls_schedule_comlab_id_and_removes_comlab(): void
    {
        $semester = CurriculumSemester::query()->create(['name' => 'Semester A', 'is_active' => true]);
        $fixtures = $this->createScheduleFixtures($semester);
        $schedule = $this->createSchedule($fixtures);
        $comlabId = $fixtures['comlab']->id;

        $this->withSession([ActiveCurriculumSemester::SESSION_KEY => $semester->id])
            ->delete(route('comlabs.destroy', $fixtures['comlab']))
            ->assertRedirect();

        $this->assertDatabaseMissing('comlabs', ['id' => $comlabId]);
        $this->assertNull($schedule->fresh()->comlab_id);
    }

    public function test_orphan_schedule_still_appears_on_schedules_index_after_comlab_delete(): void
    {
        $semester = CurriculumSemester::query()->create(['name' => 'Semester A', 'is_active' => true]);
        $fixtures = $this->createScheduleFixtures($semester);
        $schedule = $this->createSchedule($fixtures);

        $this->withSession([ActiveCurriculumSemester::SESSION_KEY => $semester->id])
            ->delete(route('comlabs.destroy', $fixtures['comlab']))
            ->assertRedirect();

        $this->withSession([ActiveCurriculumSemester::SESSION_KEY => $semester->id])
            ->get(route('schedules'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('schedules')
                ->has('schedules', 1)
                ->where('schedules.0.id', $schedule->id)
                ->where('schedules.0.comlab_id', null)
                ->where('schedules.0.comlab_name', null));
    }

    public function test_orphan_schedule_can_be_updated_with_new_comlab_and_section(): void
    {
        $semester = CurriculumSemester::query()->create(['name' => 'Semester A', 'is_active' => true]);
        $fixtures = $this->createScheduleFixtures($semester);
        $schedule = $this->createSchedule($fixtures);

        $this->withSession([ActiveCurriculumSemester::SESSION_KEY => $semester->id])
            ->delete(route('comlabs.destroy', $fixtures['comlab']))
            ->assertRedirect();

        $replacementComlab = Comlab::query()->create([
            'comlab_name' => 'Replacement Lab',
            'campus' => 'main-campus',
            'curriculum_semester_id' => $semester->id,
        ]);

        $this->withSession([ActiveCurriculumSemester::SESSION_KEY => $semester->id])
            ->put(route('schedules.update', $schedule), [
                'section_id' => $fixtures['section']->id,
                'subject_id' => $fixtures['subject']->id,
                'teacher_id' => $fixtures['teacher']->id,
                'comlab_id' => $replacementComlab->id,
                'day' => 'Monday',
                'start_time' => '09:00',
                'end_time' => '10:00',
            ])
            ->assertRedirect(route('schedules'));

        $schedule->refresh();
        $this->assertSame($replacementComlab->id, $schedule->comlab_id);
        $this->assertSame($fixtures['section']->id, $schedule->section_id);
    }

    public function test_destroy_with_no_schedules_succeeds(): void
    {
        $semester = CurriculumSemester::query()->create(['name' => 'Semester A', 'is_active' => true]);

        $section = Section::query()->create([
            'section_name' => 'Empty Section',
            'year_level_id' => $this->yearLevel->id,
            'curriculum_semester_id' => $semester->id,
        ]);

        $comlab = Comlab::query()->create([
            'comlab_name' => 'Empty Lab',
            'campus' => 'main-campus',
            'curriculum_semester_id' => $semester->id,
        ]);

        $this->withSession([ActiveCurriculumSemester::SESSION_KEY => $semester->id])
            ->getJson(route('sections.delete-preview', $section))
            ->assertOk()
            ->assertJsonCount(0, 'schedules');

        $this->withSession([ActiveCurriculumSemester::SESSION_KEY => $semester->id])
            ->delete(route('sections.destroy', $section))
            ->assertRedirect();

        $this->withSession([ActiveCurriculumSemester::SESSION_KEY => $semester->id])
            ->getJson(route('comlabs.delete-preview', $comlab))
            ->assertOk()
            ->assertJsonCount(0, 'schedules');

        $this->withSession([ActiveCurriculumSemester::SESSION_KEY => $semester->id])
            ->delete(route('comlabs.destroy', $comlab))
            ->assertRedirect();
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

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

class ScheduleDayGroupTest extends TestCase
{
    use RefreshDatabase;

    private YearLevel $yearLevel;

    private Semester $termSemester;

    private CurriculumSemester $curriculumSemester;

    protected function setUp(): void
    {
        parent::setUp();

        $this->actingAs(User::factory()->create());
        $this->yearLevel = YearLevel::query()->create(['year_level_name' => 'First Year']);
        $this->termSemester = Semester::query()->create(['semester_name' => 'First Semester']);
        $this->curriculumSemester = CurriculumSemester::query()->create([
            'name' => 'Active Semester',
            'is_active' => true,
        ]);
    }

    public function test_store_with_monday_thursday_creates_four_rows(): void
    {
        $fixtures = $this->createScheduleFixtures();

        $this->withSession([ActiveCurriculumSemester::SESSION_KEY => $this->curriculumSemester->id])
            ->post(route('schedules.store'), [
                'section_id' => $fixtures['section']->id,
                'subject_id' => $fixtures['subject']->id,
                'teacher_id' => $fixtures['teacher']->id,
                'comlab_id' => $fixtures['comlab']->id,
                'day' => 'Monday-Thursday',
                'start_time' => '08:00',
                'end_time' => '09:00',
            ])
            ->assertRedirect(route('schedules'))
            ->assertSessionHas('success');

        $this->assertSame(4, Schedule::query()->count());
        $this->assertEqualsCanonicalizing(
            ['Monday', 'Tuesday', 'Wednesday', 'Thursday'],
            Schedule::query()->pluck('day')->all(),
        );
    }

    public function test_store_with_tuesday_friday_creates_four_rows(): void
    {
        $fixtures = $this->createScheduleFixtures();

        $this->withSession([ActiveCurriculumSemester::SESSION_KEY => $this->curriculumSemester->id])
            ->post(route('schedules.store'), [
                'section_id' => $fixtures['section']->id,
                'subject_id' => $fixtures['subject']->id,
                'teacher_id' => $fixtures['teacher']->id,
                'comlab_id' => $fixtures['comlab']->id,
                'day' => 'Tuesday-Friday',
                'start_time' => '10:00',
                'end_time' => '11:00',
            ])
            ->assertRedirect(route('schedules'));

        $this->assertSame(4, Schedule::query()->count());
        $this->assertEqualsCanonicalizing(
            ['Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            Schedule::query()->pluck('day')->all(),
        );
    }

    public function test_store_with_monday_only_creates_one_row(): void
    {
        $fixtures = $this->createScheduleFixtures();

        $this->withSession([ActiveCurriculumSemester::SESSION_KEY => $this->curriculumSemester->id])
            ->post(route('schedules.store'), [
                'section_id' => $fixtures['section']->id,
                'subject_id' => $fixtures['subject']->id,
                'teacher_id' => $fixtures['teacher']->id,
                'comlab_id' => $fixtures['comlab']->id,
                'day' => 'Monday',
                'start_time' => '07:30',
                'end_time' => '09:00',
            ])
            ->assertRedirect(route('schedules'));

        $this->assertSame(1, Schedule::query()->count());
        $this->assertSame('Monday', Schedule::query()->value('day'));
    }

    public function test_store_with_friday_only_creates_one_row(): void
    {
        $fixtures = $this->createScheduleFixtures();

        $this->withSession([ActiveCurriculumSemester::SESSION_KEY => $this->curriculumSemester->id])
            ->post(route('schedules.store'), [
                'section_id' => $fixtures['section']->id,
                'subject_id' => $fixtures['subject']->id,
                'teacher_id' => $fixtures['teacher']->id,
                'comlab_id' => $fixtures['comlab']->id,
                'day' => 'Friday',
                'start_time' => '14:00',
                'end_time' => '15:00',
            ])
            ->assertRedirect(route('schedules'));

        $this->assertSame(1, Schedule::query()->count());
        $this->assertSame('Friday', Schedule::query()->value('day'));
    }

    public function test_store_with_wednesday_creates_one_row(): void
    {
        $fixtures = $this->createScheduleFixtures();

        $this->withSession([ActiveCurriculumSemester::SESSION_KEY => $this->curriculumSemester->id])
            ->post(route('schedules.store'), [
                'section_id' => $fixtures['section']->id,
                'subject_id' => $fixtures['subject']->id,
                'teacher_id' => $fixtures['teacher']->id,
                'comlab_id' => $fixtures['comlab']->id,
                'day' => 'Wednesday',
                'start_time' => '13:00',
                'end_time' => '14:00',
            ])
            ->assertRedirect(route('schedules'));

        $this->assertSame(1, Schedule::query()->count());
        $this->assertSame('Wednesday', Schedule::query()->value('day'));
    }

    public function test_overlap_on_one_day_in_group_blocks_entire_create(): void
    {
        $fixtures = $this->createScheduleFixtures();

        Schedule::query()->create([
            'section_id' => $fixtures['section']->id,
            'subject_id' => $fixtures['subject']->id,
            'teacher_id' => $fixtures['teacher']->id,
            'comlab_id' => $fixtures['comlab']->id,
            'day' => 'Wednesday',
            'start_time' => '09:00',
            'end_time' => '10:00',
            'semester' => null,
            'school_year' => null,
        ]);

        $this->withSession([ActiveCurriculumSemester::SESSION_KEY => $this->curriculumSemester->id])
            ->post(route('schedules.store'), [
                'section_id' => $fixtures['section']->id,
                'subject_id' => $fixtures['subject']->id,
                'teacher_id' => $fixtures['teacher']->id,
                'comlab_id' => $fixtures['comlab']->id,
                'day' => 'Monday-Thursday',
                'start_time' => '09:30',
                'end_time' => '10:30',
            ])
            ->assertSessionHasErrors(['start_time']);

        $this->assertSame(1, Schedule::query()->count());
    }

    /**
     * @return array{section: Section, subject: Subject, teacher: Teacher, comlab: Comlab}
     */
    private function createScheduleFixtures(): array
    {
        $teacher = Teacher::query()->create([
            'teacher_name' => 'Teacher One',
            'status' => 'Regular',
            'curriculum_semester_id' => $this->curriculumSemester->id,
        ]);

        $comlab = Comlab::query()->create([
            'comlab_name' => 'Lab One',
            'campus' => 'main-campus',
            'curriculum_semester_id' => $this->curriculumSemester->id,
        ]);

        $subject = Subject::query()->create([
            'subject_code' => 'SUB1',
            'subject_name' => 'Subject One',
            'semester_id' => $this->termSemester->id,
            'year_level_id' => $this->yearLevel->id,
            'curriculum_semester_id' => $this->curriculumSemester->id,
        ]);

        $section = Section::query()->create([
            'section_name' => 'Section One',
            'year_level_id' => $this->yearLevel->id,
            'curriculum_semester_id' => $this->curriculumSemester->id,
        ]);

        return compact('section', 'subject', 'teacher', 'comlab');
    }
}

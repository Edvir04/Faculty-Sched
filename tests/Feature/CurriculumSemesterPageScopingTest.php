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

class CurriculumSemesterPageScopingTest extends TestCase
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

    public function test_teachers_index_only_shows_schedule_assignments_for_active_curriculum_semester(): void
    {
        [$semesterA, $semesterB] = $this->createCurriculumPair();
        $scheduleA = $this->createScheduleForSemester($semesterA, '09:00', '10:00');
        $this->createScheduleForSemester($semesterB, '11:00', '12:00');

        $this->withSession([ActiveCurriculumSemester::SESSION_KEY => $semesterA->id])
            ->get(route('teachers'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('teachers')
                ->has('scheduleAssignments', 1)
                ->where('scheduleAssignments.0.schedule_id', $scheduleA->id)
                ->where('activeCurriculumSemester.id', $semesterA->id));

        $this->patch(route('curriculum-semesters.activate', $semesterB))
            ->assertRedirect();

        $this->get(route('teachers'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('teachers')
                ->has('scheduleAssignments', 1)
                ->where('activeCurriculumSemester.id', $semesterB->id));
    }

    public function test_schedules_index_sections_dropdown_only_lists_active_curriculum_sections(): void
    {
        [$semesterA, $semesterB] = $this->createCurriculumPair();

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
            ->get(route('schedules'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('schedules')
                ->has('sections', 1)
                ->where('sections.0.name', 'Section A')
                ->where('activeCurriculumSemester.id', $semesterA->id));

        $this->patch(route('curriculum-semesters.activate', $semesterB))
            ->assertRedirect();

        $this->get(route('schedules'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('schedules')
                ->has('sections', 1)
                ->where('sections.0.name', 'Section B')
                ->where('activeCurriculumSemester.id', $semesterB->id));
    }

    public function test_subjects_index_only_lists_subjects_for_active_curriculum_semester(): void
    {
        [$semesterA, $semesterB] = $this->createCurriculumPair();

        Subject::query()->create([
            'subject_code' => 'CS-A',
            'subject_name' => 'Subject A',
            'semester_id' => $this->termSemester->id,
            'year_level_id' => $this->yearLevel->id,
            'curriculum_semester_id' => $semesterA->id,
        ]);

        Subject::query()->create([
            'subject_code' => 'CS-B',
            'subject_name' => 'Subject B',
            'semester_id' => $this->termSemester->id,
            'year_level_id' => $this->yearLevel->id,
            'curriculum_semester_id' => $semesterB->id,
        ]);

        $this->withSession([ActiveCurriculumSemester::SESSION_KEY => $semesterA->id])
            ->get(route('subjects'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('subjects')
                ->has('subjects', 1)
                ->where('subjects.0.subject_code', 'CS-A')
                ->where('activeCurriculumSemester.id', $semesterA->id));

        $this->patch(route('curriculum-semesters.activate', $semesterB))
            ->assertRedirect();

        $this->get(route('subjects'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('subjects')
                ->has('subjects', 1)
                ->where('subjects.0.subject_code', 'CS-B')
                ->where('activeCurriculumSemester.id', $semesterB->id));
    }

    public function test_dashboard_sections_stat_counts_all_sections_in_active_curriculum(): void
    {
        [$semesterA, $semesterB] = $this->createCurriculumPair();

        Section::query()->create([
            'section_name' => 'Section A1',
            'year_level_id' => $this->yearLevel->id,
            'curriculum_semester_id' => $semesterA->id,
        ]);

        Section::query()->create([
            'section_name' => 'Section A2',
            'year_level_id' => $this->yearLevel->id,
            'curriculum_semester_id' => $semesterA->id,
        ]);

        Section::query()->create([
            'section_name' => 'Section B1',
            'year_level_id' => $this->yearLevel->id,
            'curriculum_semester_id' => $semesterB->id,
        ]);

        $this->withSession([ActiveCurriculumSemester::SESSION_KEY => $semesterA->id])
            ->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('dashboard')
                ->where('stats.sections', 2)
                ->where('activeCurriculumSemester.id', $semesterA->id));
    }

    public function test_activate_from_dashboard_persists_session_for_following_page_visits(): void
    {
        [$semesterA, $semesterB] = $this->createCurriculumPair();

        $teacherB = Teacher::query()->create([
            'teacher_name' => 'Teacher B',
            'status' => 'Regular',
            'curriculum_semester_id' => $semesterB->id,
        ]);

        Teacher::query()->create([
            'teacher_name' => 'Teacher A',
            'status' => 'Regular',
            'curriculum_semester_id' => $semesterA->id,
        ]);

        $this->withSession([ActiveCurriculumSemester::SESSION_KEY => $semesterA->id])
            ->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('dashboard')
                ->where('activeCurriculumSemester.id', $semesterA->id));

        $this->from(route('dashboard'))
            ->patch(route('curriculum-semesters.activate', $semesterB))
            ->assertRedirect(route('dashboard'));

        $this->get(route('teachers'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('teachers')
                ->has('teachers', 1)
                ->where('teachers.0.teacher_name', 'Teacher B')
                ->where('activeCurriculumSemester.id', $semesterB->id));

        $this->get(route('schedules'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('activeCurriculumSemester.id', $semesterB->id));

        $this->get(route('subjects'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('activeCurriculumSemester.id', $semesterB->id));
    }

    public function test_schedule_store_rejects_section_from_other_curriculum_semester(): void
    {
        [$semesterA, $semesterB] = $this->createCurriculumPair();
        $fixturesB = $this->createScheduleFixtures($semesterB);

        $this->withSession([ActiveCurriculumSemester::SESSION_KEY => $semesterA->id])
            ->post(route('schedules.store'), [
                'section_id' => $fixturesB['section']->id,
                'subject_id' => $fixturesB['subject']->id,
                'teacher_id' => $fixturesB['teacher']->id,
                'comlab_id' => $fixturesB['comlab']->id,
                'day' => 'Monday',
                'start_time' => '09:00',
                'end_time' => '10:00',
            ])
            ->assertSessionHasErrors('section_id');
    }

    /**
     * @return array{0: CurriculumSemester, 1: CurriculumSemester}
     */
    private function createCurriculumPair(): array
    {
        $semesterA = CurriculumSemester::query()->create([
            'name' => 'Semester A',
            'is_active' => true,
        ]);

        $semesterB = CurriculumSemester::query()->create([
            'name' => 'Semester B',
            'is_active' => false,
        ]);

        return [$semesterA, $semesterB];
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

    private function createScheduleForSemester(
        CurriculumSemester $semester,
        string $startTime,
        string $endTime,
    ): Schedule {
        $fixtures = $this->createScheduleFixtures($semester);

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

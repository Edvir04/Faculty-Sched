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

class ScheduleFormValidationTest extends TestCase
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

    public function test_store_rejects_overlapping_comlab_time_on_start_time(): void
    {
        $fixtures = $this->createScheduleFixtures();
        $otherSection = Section::query()->create([
            'section_name' => 'Section B',
            'year_level_id' => $this->yearLevel->id,
            'curriculum_semester_id' => $this->curriculumSemester->id,
        ]);
        $otherSubject = Subject::query()->create([
            'subject_code' => 'SUBB',
            'subject_name' => 'Subject B',
            'semester_id' => $this->termSemester->id,
            'year_level_id' => $this->yearLevel->id,
            'curriculum_semester_id' => $this->curriculumSemester->id,
        ]);

        Schedule::query()->create([
            'section_id' => $fixtures['section']->id,
            'subject_id' => $fixtures['subject']->id,
            'teacher_id' => $fixtures['teacher']->id,
            'comlab_id' => $fixtures['comlab']->id,
            'day' => 'Monday',
            'start_time' => '09:00',
            'end_time' => '10:00',
            'semester' => null,
            'school_year' => null,
        ]);

        $this->withSession([ActiveCurriculumSemester::SESSION_KEY => $this->curriculumSemester->id])
            ->post(route('schedules.store'), [
                'section_id' => $otherSection->id,
                'subject_id' => $otherSubject->id,
                'teacher_id' => $fixtures['teacher']->id,
                'comlab_id' => $fixtures['comlab']->id,
                'day' => 'Monday',
                'start_time' => '09:30',
                'end_time' => '10:30',
            ])
            ->assertSessionHasErrors([
                'start_time' => 'This time slot overlaps with an existing schedule for this comlab and day.',
            ]);
    }

    public function test_store_rejects_subject_with_wrong_year_level_for_section(): void
    {
        $fixtures = $this->createScheduleFixtures();
        $otherYear = YearLevel::query()->create(['year_level_name' => 'Second Year']);
        $wrongSubject = Subject::query()->create([
            'subject_code' => 'SUB2',
            'subject_name' => 'Second Year Subject',
            'semester_id' => $this->termSemester->id,
            'year_level_id' => $otherYear->id,
            'curriculum_semester_id' => $this->curriculumSemester->id,
        ]);

        $this->withSession([ActiveCurriculumSemester::SESSION_KEY => $this->curriculumSemester->id])
            ->post(route('schedules.store'), [
                'section_id' => $fixtures['section']->id,
                'subject_id' => $wrongSubject->id,
                'teacher_id' => $fixtures['teacher']->id,
                'comlab_id' => $fixtures['comlab']->id,
                'day' => 'Tuesday',
                'start_time' => '11:00',
                'end_time' => '12:00',
            ])
            ->assertSessionHasErrors([
                'subject_id' => 'The selected subject must belong to the same year level as the selected section.',
            ]);
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

<?php

namespace Database\Seeders;

use App\Models\Semester;
use Illuminate\Database\Seeder;

class SemesterSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $semesters = [
            ['semester_name' => 'First Semester'],
            ['semester_name' => 'Second Semester'],
        ];

        Semester::query()->upsert($semesters, ['semester_name'], ['semester_name']);
    }
}

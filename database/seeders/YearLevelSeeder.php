<?php

namespace Database\Seeders;

use App\Models\YearLevel;
use Illuminate\Database\Seeder;

class YearLevelSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $yearLevels = [
            ['year_level_name' => 'First Year'],
            ['year_level_name' => 'Second Year'],
            ['year_level_name' => 'Third Year'],
            ['year_level_name' => 'Fourth Year'],
        ];

        YearLevel::query()->upsert($yearLevels, ['year_level_name'], ['year_level_name']);
    }
}

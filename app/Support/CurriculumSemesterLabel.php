<?php

namespace App\Support;

use App\Models\CurriculumSemester;

class CurriculumSemesterLabel
{
    public static function for(CurriculumSemester $semester): string
    {
        $name = trim($semester->name);
        $schoolYear = $semester->school_year;

        if ($schoolYear !== null && $schoolYear !== '') {
            return trim("{$name} ({$schoolYear})");
        }

        return $name;
    }

    /**
     * @return array{
     *     id: int,
     *     label: string,
     *     name: string,
     *     school_year: string|null,
     *     is_active: bool
     * }
     */
    public static function toOption(CurriculumSemester $semester): array
    {
        return [
            'id' => $semester->id,
            'label' => self::for($semester),
            'name' => $semester->name,
            'school_year' => $semester->school_year,
            'is_active' => (bool) $semester->is_active,
        ];
    }
}

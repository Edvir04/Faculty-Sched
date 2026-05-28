<?php

namespace App\Support;

class TeacherNormalization
{
    public static function name(string $value): string
    {
        $trimmed = trim($value);

        if ($trimmed === '') {
            return '';
        }

        return strtolower($trimmed);
    }
}

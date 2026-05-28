<?php

namespace App\Support;

class SubjectNormalization
{
    public static function code(string $value): string
    {
        $trimmed = trim($value);

        if ($trimmed === '') {
            return '';
        }

        return strtolower(preg_replace('/\s+/', '', $trimmed) ?? '');
    }

    public static function name(string $value): string
    {
        $trimmed = trim($value);

        if ($trimmed === '') {
            return '';
        }

        return strtolower($trimmed);
    }
}

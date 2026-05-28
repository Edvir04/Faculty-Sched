<?php

namespace App\Support;

class ComlabNormalization
{
    /**
     * Trim, remove all whitespace, and lowercase for duplicate comparison.
     */
    public static function name(string $value): string
    {
        $trimmed = trim($value);

        if ($trimmed === '') {
            return '';
        }

        return strtolower(preg_replace('/\s+/', '', $trimmed) ?? '');
    }
}

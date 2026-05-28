<?php

namespace App\Rules;

use App\Models\Teacher;
use App\Support\TeacherNormalization;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Translation\PotentiallyTranslatedString;

class UniqueNormalizedTeacherName implements ValidationRule
{
    public function __construct(
        private int $curriculumSemesterId,
        private ?int $ignoreId = null,
    ) {}

    /**
     * @param  Closure(string, ?string=): PotentiallyTranslatedString  $fail
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $normalized = TeacherNormalization::name((string) $value);

        if ($normalized === '') {
            return;
        }

        $duplicateExists = Teacher::query()
            ->where('curriculum_semester_id', $this->curriculumSemesterId)
            ->when($this->ignoreId !== null, fn ($query) => $query->where('id', '!=', $this->ignoreId))
            ->pluck('teacher_name')
            ->contains(fn (string $existingName) => TeacherNormalization::name($existingName) === $normalized);

        if ($duplicateExists) {
            $fail('A teacher with this name already exists.');
        }
    }
}

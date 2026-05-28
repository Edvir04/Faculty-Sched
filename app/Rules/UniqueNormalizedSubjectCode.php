<?php

namespace App\Rules;

use App\Models\Subject;
use App\Support\SubjectNormalization;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Translation\PotentiallyTranslatedString;

class UniqueNormalizedSubjectCode implements ValidationRule
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
        $normalized = SubjectNormalization::code((string) $value);

        if ($normalized === '') {
            return;
        }

        $duplicateExists = Subject::query()
            ->where('curriculum_semester_id', $this->curriculumSemesterId)
            ->when($this->ignoreId !== null, fn ($query) => $query->where('id', '!=', $this->ignoreId))
            ->pluck('subject_code')
            ->contains(fn (string $existingCode) => SubjectNormalization::code($existingCode) === $normalized);

        if ($duplicateExists) {
            $fail('This subject code is already in use.');
        }
    }
}

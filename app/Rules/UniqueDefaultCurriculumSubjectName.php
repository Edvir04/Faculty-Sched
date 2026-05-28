<?php

namespace App\Rules;

use App\Models\Subject;
use App\Support\SubjectNormalization;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Translation\PotentiallyTranslatedString;

class UniqueDefaultCurriculumSubjectName implements ValidationRule
{
    public function __construct(
        private int $semesterId,
        private int $yearLevelId,
        private ?int $ignoreId = null,
    ) {}

    /**
     * @param  Closure(string, ?string=): PotentiallyTranslatedString  $fail
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $normalized = SubjectNormalization::name((string) $value);

        if ($normalized === '') {
            return;
        }

        $duplicateExists = Subject::query()
            ->where('is_default', true)
            ->where('semester_id', $this->semesterId)
            ->where('year_level_id', $this->yearLevelId)
            ->when($this->ignoreId !== null, fn ($query) => $query->where('id', '!=', $this->ignoreId))
            ->pluck('subject_name')
            ->contains(fn (string $existingName) => SubjectNormalization::name($existingName) === $normalized);

        if ($duplicateExists) {
            $fail('This subject name is already included in the default curriculum for this semester and year level.');
        }
    }
}

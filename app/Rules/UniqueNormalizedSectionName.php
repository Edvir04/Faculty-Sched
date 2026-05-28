<?php

namespace App\Rules;

use App\Models\Section;
use App\Support\SectionNormalization;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Translation\PotentiallyTranslatedString;

class UniqueNormalizedSectionName implements ValidationRule
{
    public function __construct(
        private int $curriculumSemesterId,
        private int $yearLevelId,
        private ?int $ignoreId = null,
    ) {}

    /**
     * @param  Closure(string, ?string=): PotentiallyTranslatedString  $fail
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $normalized = SectionNormalization::name((string) $value);

        if ($normalized === '') {
            return;
        }

        $duplicateExists = Section::query()
            ->where('curriculum_semester_id', $this->curriculumSemesterId)
            ->where('year_level_id', $this->yearLevelId)
            ->when($this->ignoreId !== null, fn ($query) => $query->where('id', '!=', $this->ignoreId))
            ->pluck('section_name')
            ->contains(fn (string $existingName) => SectionNormalization::name($existingName) === $normalized);

        if ($duplicateExists) {
            $fail('A section with this name already exists for this year level.');
        }
    }
}

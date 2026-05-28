<?php

namespace App\Rules;

use App\Models\Comlab;
use App\Support\ComlabNormalization;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Translation\PotentiallyTranslatedString;

class UniqueNormalizedComlabName implements ValidationRule
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
        $normalized = ComlabNormalization::name((string) $value);

        if ($normalized === '') {
            return;
        }

        $duplicateExists = Comlab::query()
            ->where('curriculum_semester_id', $this->curriculumSemesterId)
            ->when($this->ignoreId !== null, fn ($query) => $query->where('id', '!=', $this->ignoreId))
            ->pluck('comlab_name')
            ->contains(fn (string $existingName) => ComlabNormalization::name($existingName) === $normalized);

        if ($duplicateExists) {
            $fail('A room with this name already exists.');
        }
    }
}

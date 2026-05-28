<?php

namespace App\Rules;

use App\Models\Comlab;
use App\Support\ComlabNormalization;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Translation\PotentiallyTranslatedString;

class UniqueDefaultCurriculumComlabName implements ValidationRule
{
    public function __construct(
        private string $campus,
        private ?int $ignoreId = null,
    ) {}

    /**
     * @param  Closure(string, ?string=): PotentiallyTranslatedString  $fail
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $normalized = ComlabNormalization::name((string) $value);
        $campus = trim($this->campus);

        if ($normalized === '' || $campus === '') {
            return;
        }

        $duplicateExists = Comlab::query()
            ->where('is_default', true)
            ->when($this->ignoreId !== null, fn ($query) => $query->where('id', '!=', $this->ignoreId))
            ->get(['comlab_name', 'campus'])
            ->contains(
                fn (Comlab $comlab) => ComlabNormalization::name($comlab->comlab_name) === $normalized
                    && trim($comlab->campus) === $campus,
            );

        if ($duplicateExists) {
            $fail('This comlab is already included in the default curriculum.');
        }
    }
}

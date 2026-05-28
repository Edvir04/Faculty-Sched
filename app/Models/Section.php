<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Section extends Model
{
    protected $fillable = [
        'section_name',
        'year_level_id',
        'comlab_id',
        'curriculum_semester_id',
    ];

    public function curriculumSemester(): BelongsTo
    {
        return $this->belongsTo(CurriculumSemester::class);
    }

    public function yearLevel(): BelongsTo
    {
        return $this->belongsTo(YearLevel::class);
    }

    public function comlab(): BelongsTo
    {
        return $this->belongsTo(Comlab::class);
    }

    public function schedules(): HasMany
    {
        return $this->hasMany(Schedule::class);
    }
}

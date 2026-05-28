<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Schedule extends Model
{
    protected $fillable = [
        'section_id',
        'subject_id',
        'teacher_id',
        'comlab_id',
        'day',
        'start_time',
        'end_time',
        'semester',
        'school_year',
    ];

    public function section(): BelongsTo
    {
        return $this->belongsTo(Section::class);
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(Teacher::class);
    }

    public function comlab(): BelongsTo
    {
        return $this->belongsTo(Comlab::class);
    }
}

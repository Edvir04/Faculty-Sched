<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Semester extends Model
{
    protected $fillable = [
        'semester_name',
    ];

    public function subjects(): HasMany
    {
        return $this->hasMany(Subject::class);
    }
}

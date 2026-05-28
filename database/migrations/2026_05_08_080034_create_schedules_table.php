<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('section_id')
                ->constrained()
                ->cascadeOnUpdate()
                ->restrictOnDelete();
            $table->foreignId('subject_id')
                ->constrained()
                ->cascadeOnUpdate()
                ->restrictOnDelete();
            $table->foreignId('teacher_id')
                ->constrained()
                ->cascadeOnUpdate()
                ->restrictOnDelete();
            $table->foreignId('comlab_id')
                ->constrained()
                ->cascadeOnUpdate()
                ->restrictOnDelete();
            $table->string('day', 16);
            $table->time('start_time');
            $table->time('end_time');
            $table->string('semester', 20);
            $table->string('school_year', 20);
            $table->timestamps();

            $table->index(['teacher_id', 'day', 'start_time', 'end_time'], 'schedules_teacher_time_idx');
            $table->index(['comlab_id', 'day', 'start_time', 'end_time'], 'schedules_comlab_time_idx');
            $table->index(['section_id', 'day', 'start_time', 'end_time'], 'schedules_section_time_idx');
            $table->unique(
                ['section_id', 'subject_id', 'teacher_id', 'comlab_id', 'day', 'start_time', 'end_time', 'semester', 'school_year'],
                'schedules_unique_slot'
            );
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('schedules');
    }
};

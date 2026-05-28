<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('schedules', function (Blueprint $table) {
            $table->dropUnique('schedules_unique_slot');
        });

        Schema::table('schedules', function (Blueprint $table) {
            $table->string('semester', 20)->nullable()->change();
            $table->string('school_year', 20)->nullable()->change();
        });

        Schema::table('schedules', function (Blueprint $table) {
            $table->unique(
                ['section_id', 'subject_id', 'teacher_id', 'comlab_id', 'day', 'start_time', 'end_time'],
                'schedules_unique_slot'
            );
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('schedules', function (Blueprint $table) {
            $table->dropUnique('schedules_unique_slot');
        });

        DB::table('schedules')->whereNull('semester')->update(['semester' => '']);
        DB::table('schedules')->whereNull('school_year')->update(['school_year' => '']);

        Schema::table('schedules', function (Blueprint $table) {
            $table->string('semester', 20)->nullable(false)->change();
            $table->string('school_year', 20)->nullable(false)->change();
        });

        Schema::table('schedules', function (Blueprint $table) {
            $table->unique(
                ['section_id', 'subject_id', 'teacher_id', 'comlab_id', 'day', 'start_time', 'end_time', 'semester', 'school_year'],
                'schedules_unique_slot'
            );
        });
    }
};

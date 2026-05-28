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
        $defaultSemesterId = DB::table('curriculum_semesters')->value('id');

        if ($defaultSemesterId === null) {
            $defaultSemesterId = DB::table('curriculum_semesters')->insertGetId([
                'name' => 'Default Curriculum',
                'school_year' => null,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        if (Schema::hasColumn('sections', 'curriculum_semester_id')) {
            return;
        }

        if (Schema::hasIndex('sections', 'sections_section_name_year_level_id_unique')) {
            Schema::table('sections', function (Blueprint $table) {
                $table->dropUnique(['section_name', 'year_level_id']);
            });
        }

        Schema::table('sections', function (Blueprint $table) use ($defaultSemesterId) {
            $table->foreignId('curriculum_semester_id')
                ->default($defaultSemesterId)
                ->after('id')
                ->constrained('curriculum_semesters')
                ->cascadeOnDelete();
        });

        DB::table('sections')
            ->whereNull('curriculum_semester_id')
            ->update(['curriculum_semester_id' => $defaultSemesterId]);

        if (! Schema::hasIndex('sections', 'sections_curriculum_semester_section_year_unique')) {
            Schema::table('sections', function (Blueprint $table) {
                $table->unique(
                    ['curriculum_semester_id', 'section_name', 'year_level_id'],
                    'sections_curriculum_semester_section_year_unique',
                );
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasIndex('sections', 'sections_curriculum_semester_section_year_unique')) {
            Schema::table('sections', function (Blueprint $table) {
                $table->dropUnique('sections_curriculum_semester_section_year_unique');
            });
        }

        if (Schema::hasColumn('sections', 'curriculum_semester_id')) {
            Schema::table('sections', function (Blueprint $table) {
                $table->dropConstrainedForeignId('curriculum_semester_id');
            });
        }

        if (! Schema::hasIndex('sections', 'sections_section_name_year_level_id_unique')) {
            Schema::table('sections', function (Blueprint $table) {
                $table->unique(['section_name', 'year_level_id']);
            });
        }
    }
};

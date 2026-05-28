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

        if (! Schema::hasColumn('teachers', 'curriculum_semester_id')) {
            Schema::table('teachers', function (Blueprint $table) use ($defaultSemesterId) {
                $table->foreignId('curriculum_semester_id')
                    ->default($defaultSemesterId)
                    ->after('id')
                    ->constrained('curriculum_semesters')
                    ->cascadeOnDelete();
            });
        }

        if (! Schema::hasColumn('teachers', 'is_default')) {
            Schema::table('teachers', function (Blueprint $table) {
                $table->boolean('is_default')->default(false)->after('status');
            });
        }

        if (! Schema::hasIndex('teachers', 'teachers_curriculum_semester_id_teacher_name_unique')) {
            Schema::table('teachers', function (Blueprint $table) {
                $table->unique(['curriculum_semester_id', 'teacher_name']);
            });
        }

        if (! Schema::hasColumn('comlabs', 'curriculum_semester_id')) {
            if (Schema::hasIndex('comlabs', 'comlabs_comlab_name_campus_unique')) {
                Schema::table('comlabs', function (Blueprint $table) {
                    $table->dropUnique(['comlab_name', 'campus']);
                });
            }

            Schema::table('comlabs', function (Blueprint $table) use ($defaultSemesterId) {
                $table->foreignId('curriculum_semester_id')
                    ->default($defaultSemesterId)
                    ->after('id')
                    ->constrained('curriculum_semesters')
                    ->cascadeOnDelete();
            });
        }

        if (! Schema::hasColumn('comlabs', 'is_default')) {
            Schema::table('comlabs', function (Blueprint $table) {
                $table->boolean('is_default')->default(false)->after('campus');
            });
        }

        if (! Schema::hasIndex('comlabs', 'comlabs_curriculum_semester_id_comlab_name_campus_unique')) {
            Schema::table('comlabs', function (Blueprint $table) {
                $table->unique(['curriculum_semester_id', 'comlab_name', 'campus']);
            });
        }

        if (! Schema::hasColumn('subjects', 'curriculum_semester_id')) {
            if (Schema::hasIndex('subjects', 'subjects_subject_code_semester_id_year_level_id_unique')) {
                Schema::table('subjects', function (Blueprint $table) {
                    $table->dropUnique(['subject_code', 'semester_id', 'year_level_id']);
                });
            } elseif (Schema::hasIndex('subjects', 'subjects_subject_code_year_level_id_unique')) {
                Schema::table('subjects', function (Blueprint $table) {
                    $table->dropUnique(['subject_code', 'year_level_id']);
                });
            }

            Schema::table('subjects', function (Blueprint $table) use ($defaultSemesterId) {
                $table->foreignId('curriculum_semester_id')
                    ->default($defaultSemesterId)
                    ->after('id')
                    ->constrained('curriculum_semesters')
                    ->cascadeOnDelete();
            });
        }

        if (! Schema::hasColumn('subjects', 'is_default')) {
            Schema::table('subjects', function (Blueprint $table) {
                $table->boolean('is_default')->default(false)->after('year_level_id');
            });
        }

        if (! Schema::hasIndex('subjects', 'subjects_curriculum_unique')) {
            Schema::table('subjects', function (Blueprint $table) {
                $table->unique(
                    ['curriculum_semester_id', 'subject_code', 'semester_id', 'year_level_id'],
                    'subjects_curriculum_unique',
                );
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasIndex('subjects', 'subjects_curriculum_unique')) {
            Schema::table('subjects', function (Blueprint $table) {
                $table->dropUnique('subjects_curriculum_unique');
            });
        }

        if (Schema::hasColumn('subjects', 'curriculum_semester_id')) {
            Schema::table('subjects', function (Blueprint $table) {
                $table->dropConstrainedForeignId('curriculum_semester_id');
            });
        }

        if (Schema::hasColumn('subjects', 'is_default')) {
            Schema::table('subjects', function (Blueprint $table) {
                $table->dropColumn('is_default');
            });
        }

        Schema::table('subjects', function (Blueprint $table) {
            $table->unique(['subject_code', 'semester_id', 'year_level_id']);
        });

        if (Schema::hasIndex('comlabs', 'comlabs_curriculum_semester_id_comlab_name_campus_unique')) {
            Schema::table('comlabs', function (Blueprint $table) {
                $table->dropUnique(['curriculum_semester_id', 'comlab_name', 'campus']);
            });
        }

        if (Schema::hasColumn('comlabs', 'curriculum_semester_id')) {
            Schema::table('comlabs', function (Blueprint $table) {
                $table->dropConstrainedForeignId('curriculum_semester_id');
            });
        }

        if (Schema::hasColumn('comlabs', 'is_default')) {
            Schema::table('comlabs', function (Blueprint $table) {
                $table->dropColumn('is_default');
            });
        }

        Schema::table('comlabs', function (Blueprint $table) {
            $table->unique(['comlab_name', 'campus']);
        });

        if (Schema::hasIndex('teachers', 'teachers_curriculum_semester_id_teacher_name_unique')) {
            Schema::table('teachers', function (Blueprint $table) {
                $table->dropUnique(['curriculum_semester_id', 'teacher_name']);
            });
        }

        if (Schema::hasColumn('teachers', 'curriculum_semester_id')) {
            Schema::table('teachers', function (Blueprint $table) {
                $table->dropConstrainedForeignId('curriculum_semester_id');
            });
        }

        if (Schema::hasColumn('teachers', 'is_default')) {
            Schema::table('teachers', function (Blueprint $table) {
                $table->dropColumn('is_default');
            });
        }
    }
};

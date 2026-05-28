<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('comlabs', 'curriculum_semester_id')) {
            return;
        }

        Schema::table('comlabs', function (Blueprint $table) {
            $table->dropForeign(['curriculum_semester_id']);
        });

        if (Schema::hasIndex('comlabs', 'comlabs_curriculum_semester_id_comlab_name_campus_unique')) {
            Schema::table('comlabs', function (Blueprint $table) {
                $table->dropUnique('comlabs_curriculum_semester_id_comlab_name_campus_unique');
            });
        }

        if (! Schema::hasIndex('comlabs', 'comlabs_curriculum_semester_id_comlab_name_unique')) {
            Schema::table('comlabs', function (Blueprint $table) {
                $table->unique(['curriculum_semester_id', 'comlab_name'], 'comlabs_curriculum_semester_id_comlab_name_unique');
            });
        }

        Schema::table('comlabs', function (Blueprint $table) {
            $table->foreign('curriculum_semester_id')
                ->references('id')
                ->on('curriculum_semesters')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('comlabs', 'curriculum_semester_id')) {
            return;
        }

        Schema::table('comlabs', function (Blueprint $table) {
            $table->dropForeign(['curriculum_semester_id']);
        });

        if (Schema::hasIndex('comlabs', 'comlabs_curriculum_semester_id_comlab_name_unique')) {
            Schema::table('comlabs', function (Blueprint $table) {
                $table->dropUnique('comlabs_curriculum_semester_id_comlab_name_unique');
            });
        }

        if (! Schema::hasIndex('comlabs', 'comlabs_curriculum_semester_id_comlab_name_campus_unique')) {
            Schema::table('comlabs', function (Blueprint $table) {
                $table->unique(
                    ['curriculum_semester_id', 'comlab_name', 'campus'],
                    'comlabs_curriculum_semester_id_comlab_name_campus_unique',
                );
            });
        }

        Schema::table('comlabs', function (Blueprint $table) {
            $table->foreign('curriculum_semester_id')
                ->references('id')
                ->on('curriculum_semesters')
                ->cascadeOnDelete();
        });
    }
};

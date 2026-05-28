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
        if (! Schema::hasColumn('subjects', 'semester_id')) {
            Schema::table('subjects', function (Blueprint $table) {
                $table->foreignId('semester_id')
                    ->nullable()
                    ->after('subject_name')
                    ->constrained()
                    ->cascadeOnUpdate()
                    ->restrictOnDelete();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('subjects', 'semester_id')) {
            Schema::table('subjects', function (Blueprint $table) {
                $table->dropConstrainedForeignId('semester_id');
            });
        }
    }
};

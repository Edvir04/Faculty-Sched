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
        Schema::table('schedules', function (Blueprint $table) {
            $table->dropForeign(['section_id']);
            $table->dropForeign(['comlab_id']);
        });

        Schema::table('schedules', function (Blueprint $table) {
            $table->unsignedBigInteger('section_id')->nullable()->change();
            $table->unsignedBigInteger('comlab_id')->nullable()->change();
        });

        Schema::table('schedules', function (Blueprint $table) {
            $table->foreign('section_id')
                ->references('id')
                ->on('sections')
                ->cascadeOnUpdate()
                ->nullOnDelete();
            $table->foreign('comlab_id')
                ->references('id')
                ->on('comlabs')
                ->cascadeOnUpdate()
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('schedules', function (Blueprint $table) {
            $table->dropForeign(['section_id']);
            $table->dropForeign(['comlab_id']);
        });

        Schema::table('schedules', function (Blueprint $table) {
            $table->unsignedBigInteger('section_id')->nullable(false)->change();
            $table->unsignedBigInteger('comlab_id')->nullable(false)->change();
        });

        Schema::table('schedules', function (Blueprint $table) {
            $table->foreign('section_id')
                ->references('id')
                ->on('sections')
                ->cascadeOnUpdate()
                ->restrictOnDelete();
            $table->foreign('comlab_id')
                ->references('id')
                ->on('comlabs')
                ->cascadeOnUpdate()
                ->restrictOnDelete();
        });
    }
};

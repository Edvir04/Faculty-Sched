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
        Schema::table('sections', function (Blueprint $table) {
            $table->dropForeign(['comlab_id']);
        });

        Schema::table('sections', function (Blueprint $table) {
            $table->unsignedBigInteger('comlab_id')->nullable()->change();
        });

        Schema::table('sections', function (Blueprint $table) {
            $table->foreign('comlab_id')
                ->references('id')
                ->on('comlabs')
                ->cascadeOnUpdate()
                ->restrictOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sections', function (Blueprint $table) {
            $table->dropForeign(['comlab_id']);
        });

        Schema::table('sections', function (Blueprint $table) {
            $table->unsignedBigInteger('comlab_id')->nullable(false)->change();
        });

        Schema::table('sections', function (Blueprint $table) {
            $table->foreign('comlab_id')
                ->references('id')
                ->on('comlabs')
                ->cascadeOnUpdate()
                ->restrictOnDelete();
        });
    }
};

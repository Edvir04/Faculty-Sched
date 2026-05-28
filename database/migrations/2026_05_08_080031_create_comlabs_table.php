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
        Schema::create('comlabs', function (Blueprint $table) {
            $table->id();
            $table->string('comlab_name');
            $table->string('campus');
            $table->timestamps();

            $table->unique(['comlab_name', 'campus']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('comlabs');
    }
};

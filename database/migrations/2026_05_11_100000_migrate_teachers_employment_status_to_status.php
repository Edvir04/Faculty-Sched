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
        if (! Schema::hasTable('teachers')) {
            return;
        }

        if (Schema::hasColumn('teachers', 'status')) {
            return;
        }

        if (! Schema::hasColumn('teachers', 'employment_status')) {
            Schema::table('teachers', function (Blueprint $table) {
                $table->string('status');
            });

            return;
        }

        Schema::table('teachers', function (Blueprint $table) {
            $table->string('status')->default('Regular');
        });

        $rows = DB::table('teachers')->select('id', 'employment_status')->get();
        foreach ($rows as $row) {
            $status = strtolower((string) $row->employment_status) === 'part-time' ? 'Part-Time' : 'Regular';
            DB::table('teachers')->where('id', $row->id)->update(['status' => $status]);
        }

        Schema::table('teachers', function (Blueprint $table) {
            $table->dropColumn('employment_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (! Schema::hasTable('teachers')) {
            return;
        }

        if (! Schema::hasColumn('teachers', 'status') || Schema::hasColumn('teachers', 'employment_status')) {
            return;
        }

        Schema::table('teachers', function (Blueprint $table) {
            $table->string('employment_status')->default('full-time');
        });

        $rows = DB::table('teachers')->select('id', 'status')->get();
        foreach ($rows as $row) {
            $employment = $row->status === 'Part-Time' ? 'part-time' : 'full-time';
            DB::table('teachers')->where('id', $row->id)->update(['employment_status' => $employment]);
        }

        Schema::table('teachers', function (Blueprint $table) {
            $table->dropColumn('status');
        });
    }
};

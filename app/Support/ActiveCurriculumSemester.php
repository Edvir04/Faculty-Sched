<?php

namespace App\Support;

use App\Models\CurriculumSemester;
use Illuminate\Http\Request;

class ActiveCurriculumSemester
{
    public const SESSION_KEY = 'active_curriculum_semester_id';

    /**
     * Resolve the active curriculum semester id without auto-creating a semester.
     */
    public static function optionalId(Request $request): ?int
    {
        $sessionId = $request->session()->get(self::SESSION_KEY);

        if (is_numeric($sessionId)) {
            $semester = CurriculumSemester::query()->find((int) $sessionId);
            if ($semester !== null) {
                return $semester->id;
            }
        }

        $active = CurriculumSemester::query()
            ->where('is_active', true)
            ->orderBy('id')
            ->first();

        if ($active !== null) {
            $request->session()->put(self::SESSION_KEY, $active->id);

            return $active->id;
        }

        $first = CurriculumSemester::query()->orderBy('id')->first();

        if ($first !== null) {
            $request->session()->put(self::SESSION_KEY, $first->id);

            return $first->id;
        }

        return null;
    }

    /**
     * Resolve the active curriculum semester id for CRUD pages.
     * Falls back to creating a default semester when none exist.
     */
    public static function id(Request $request): int
    {
        $resolved = self::optionalId($request);

        if ($resolved !== null) {
            return $resolved;
        }

        $active = CurriculumSemester::query()->create([
            'name' => 'Default Curriculum',
            'is_active' => true,
        ]);

        $request->session()->put(self::SESSION_KEY, $active->id);

        return $active->id;
    }

    public static function resolve(Request $request): CurriculumSemester
    {
        return CurriculumSemester::query()->findOrFail(self::id($request));
    }

    public static function resolveOptional(Request $request): ?CurriculumSemester
    {
        $id = self::optionalId($request);

        if ($id === null) {
            return null;
        }

        return CurriculumSemester::query()->find($id);
    }
}

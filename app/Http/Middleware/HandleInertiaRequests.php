<?php

namespace App\Http\Middleware;

use App\Models\CurriculumSemester;
use App\Support\ActiveCurriculumSemester;
use App\Support\CurriculumSemesterLabel;
use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        [$message, $author] = str(Inspiring::quotes()->random())->explode('-');

        $shared = [
            'name' => config('app.name'),
            'quote' => ['message' => trim($message), 'author' => trim($author)],
            'auth' => [
                'user' => $request->user(),
            ],
            'flash' => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
            ],
        ];

        if ($request->user() !== null) {
            $curriculumSemesters = CurriculumSemester::query()
                ->orderByDesc('is_active')
                ->orderByDesc('id')
                ->get();

            $curriculumSemesterId = ActiveCurriculumSemester::optionalId($request);
            $activeCurriculumSemester = $curriculumSemesterId !== null
                ? $curriculumSemesters->firstWhere('id', $curriculumSemesterId)
                : null;

            $shared['curriculumSemesters'] = $curriculumSemesters
                ->map(fn (CurriculumSemester $semester) => CurriculumSemesterLabel::toOption($semester))
                ->values()
                ->all();
            $shared['activeCurriculumSemester'] = $activeCurriculumSemester !== null
                ? CurriculumSemesterLabel::toOption($activeCurriculumSemester)
                : null;
        }

        return array_merge(parent::share($request), $shared);
    }
}

<?php

use App\Http\Controllers\ComlabController;
use App\Http\Controllers\CurriculumSemesterController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ScheduleController;
use App\Http\Controllers\SectionController;
use App\Http\Controllers\SectionsComlabsController;
use App\Http\Controllers\SubjectController;
use App\Http\Controllers\TeacherController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

Route::middleware(['auth', 'nocache'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');

    Route::get('schedules', [ScheduleController::class, 'index'])->name('schedules');
    Route::post('schedules', [ScheduleController::class, 'store'])->name('schedules.store');
    Route::put('schedules/{schedule}', [ScheduleController::class, 'update'])->name('schedules.update');
    Route::delete('schedules/{schedule}', [ScheduleController::class, 'destroy'])->name('schedules.destroy');

    Route::get('teachers', [TeacherController::class, 'index'])->name('teachers');
    Route::post('teachers', [TeacherController::class, 'store'])->name('teachers.store');
    Route::put('teachers/subject-professors', [TeacherController::class, 'updateSubjectProfessors'])
        ->name('teachers.subject-professors.update');
    Route::get('teachers/{teacher}', [TeacherController::class, 'show'])->name('teachers.show');
    Route::put('teachers/{teacher}', [TeacherController::class, 'update'])->name('teachers.update');
    Route::patch('teachers/{teacher}', [TeacherController::class, 'update']);
    Route::post('teachers/{teacher}/reassign-and-delete', [TeacherController::class, 'reassignAndDestroy'])
        ->name('teachers.reassign-and-destroy');
    Route::delete('teachers/{teacher}', [TeacherController::class, 'destroy'])->name('teachers.destroy');

    Route::get('sections-comlabs', [SectionsComlabsController::class, 'index'])->name('sections-comlabs');

    Route::post('curriculum-semesters', [CurriculumSemesterController::class, 'store'])->name('curriculum-semesters.store');
    Route::patch('curriculum-semesters/{curriculumSemester}/activate', [CurriculumSemesterController::class, 'activate'])
        ->name('curriculum-semesters.activate');
    Route::delete('curriculum-semesters/{curriculumSemester}', [CurriculumSemesterController::class, 'destroy'])
        ->name('curriculum-semesters.destroy');

    Route::post('comlabs', [ComlabController::class, 'store'])->name('comlabs.store');
    Route::get('comlabs/{comlab}/delete-preview', [ComlabController::class, 'deletePreview'])->name('comlabs.delete-preview');
    Route::put('comlabs/{comlab}', [ComlabController::class, 'update'])->name('comlabs.update');
    Route::delete('comlabs/{comlab}', [ComlabController::class, 'destroy'])->name('comlabs.destroy');

    Route::post('sections', [SectionController::class, 'store'])->name('sections.store');
    Route::get('sections/{section}/delete-preview', [SectionController::class, 'deletePreview'])->name('sections.delete-preview');
    Route::put('sections/{section}', [SectionController::class, 'update'])->name('sections.update');
    Route::delete('sections/{section}', [SectionController::class, 'destroy'])->name('sections.destroy');

    Route::get('subjects', [SubjectController::class, 'index'])->name('subjects');
    Route::post('subjects', [SubjectController::class, 'store'])->name('subjects.store');
    Route::get('subjects/{subject}/delete-preview', [SubjectController::class, 'deletePreview'])->name('subjects.delete-preview');
    Route::put('subjects/{subject}', [SubjectController::class, 'update'])->name('subjects.update');
    Route::patch('subjects/{subject}', [SubjectController::class, 'update']);
    Route::delete('subjects/{subject}', [SubjectController::class, 'destroy'])->name('subjects.destroy');
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';

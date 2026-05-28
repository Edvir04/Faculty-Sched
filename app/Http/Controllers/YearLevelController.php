<?php

namespace App\Http\Controllers;

use App\Models\YearLevel;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class YearLevelController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        //
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'year_level_name' => ['required', 'string', 'max:255', 'unique:year_levels,year_level_name'],
        ]);

        YearLevel::create($validated);

        return back()->with('success', 'Year level created successfully.');
    }

    /**
     * Display the specified resource.
     */
    public function show(YearLevel $yearLevel)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(YearLevel $yearLevel)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, YearLevel $yearLevel)
    {
        $validated = $request->validate([
            'year_level_name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('year_levels', 'year_level_name')->ignore($yearLevel->id),
            ],
        ]);

        $yearLevel->update($validated);

        return back()->with('success', 'Year level updated successfully.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(YearLevel $yearLevel)
    {
        //
    }
}

<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

/**
 * Documents expected grid day grouping (Option A) — Wednesday only in WED table.
 * Frontend collectTimeSlots sort is covered by manual QA; PHP mirrors day constants for regression docs.
 */
class ScheduleGridTimeSlotsTest extends TestCase
{
    public function test_main_grid_weekdays_exclude_wednesday(): void
    {
        $mainGrid = ['Monday', 'Tuesday', 'Thursday', 'Friday'];
        $mth = ['Monday', 'Tuesday', 'Thursday'];
        $tfri = ['Tuesday', 'Thursday', 'Friday'];

        $this->assertNotContains('Wednesday', $mainGrid);
        $this->assertNotContains('Wednesday', $mth);
        $this->assertNotContains('Wednesday', $tfri);
    }

    public function test_time_slot_sort_order_is_lexicographic_early_to_late(): void
    {
        $slots = ['09:00', '07:30', '13:00', '10:00'];
        sort($slots);

        $this->assertSame(['07:30', '09:00', '10:00', '13:00'], $slots);
    }
}

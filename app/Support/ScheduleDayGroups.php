<?php

namespace App\Support;

class ScheduleDayGroups
{
    public const MONDAY_THURSDAY = 'Monday-Thursday';

    public const TUESDAY_FRIDAY = 'Tuesday-Friday';

    /**
     * @return list<string>
     */
    public static function allowedDayValues(): array
    {
        return [
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday',
            'Sunday',
            self::MONDAY_THURSDAY,
            self::TUESDAY_FRIDAY,
        ];
    }

    /**
     * @return list<string>
     */
    public static function expand(string $day): array
    {
        return match ($day) {
            self::MONDAY_THURSDAY => ['Monday', 'Thursday'],
            self::TUESDAY_FRIDAY => ['Tuesday', 'Friday'],
            default => [$day],
        };
    }

    public static function isGroup(string $day): bool
    {
        return in_array($day, [self::MONDAY_THURSDAY, self::TUESDAY_FRIDAY], true);
    }
}

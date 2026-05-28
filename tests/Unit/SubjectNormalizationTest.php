<?php

namespace Tests\Unit;

use App\Support\SubjectNormalization;
use PHPUnit\Framework\TestCase;

class SubjectNormalizationTest extends TestCase
{
    public function test_subject_code_normalization_strips_spaces_and_lowercases(): void
    {
        $this->assertSame('it132l', SubjectNormalization::code('IT 132L'));
        $this->assertSame('it132l', SubjectNormalization::code('it 132 l'));
        $this->assertSame('it101', SubjectNormalization::code('IT101'));
    }

    public function test_subject_name_normalization_trims_and_lowercases(): void
    {
        $this->assertSame('intro to cs', SubjectNormalization::name('INTRO TO CS'));
        $this->assertSame('intro to cs', SubjectNormalization::name('  intro to cs  '));
    }
}

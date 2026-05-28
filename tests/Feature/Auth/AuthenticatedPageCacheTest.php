<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthenticatedPageCacheTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_routes_send_no_store_cache_headers(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get(route('dashboard'));

        $response->assertOk();

        $cacheControl = (string) $response->headers->get('Cache-Control');
        $this->assertStringContainsString('no-store', $cacheControl);
        $this->assertStringContainsString('no-cache', $cacheControl);
        $this->assertStringContainsString('must-revalidate', $cacheControl);
        $response->assertHeader('Pragma', 'no-cache');
    }

    public function test_public_home_does_not_send_authenticated_no_store_headers(): void
    {
        $response = $this->get(route('home'));

        $response->assertOk();
        $this->assertStringNotContainsString(
            'no-store',
            (string) $response->headers->get('Cache-Control', ''),
        );
    }

    public function test_guest_is_redirected_from_dashboard_to_home(): void
    {
        $response = $this->get(route('dashboard'));

        $response->assertRedirect(route('home'));
    }
}

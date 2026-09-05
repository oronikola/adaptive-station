<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LandingPageTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_can_view_the_landing_page(): void
    {
        $response = $this->get(route('home'));

        $response->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Landing/LandingPage')
                ->where('auth.user', null));
    }

    public function test_guest_can_view_the_landing_page_from_the_landing_url(): void
    {
        $response = $this->get(route('landing'));

        $response->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Landing/LandingPage')
                ->where('auth.user', null));
    }

    public function test_authenticated_user_can_view_the_landing_page_with_their_identity(): void
    {
        $user = User::factory()->platformSuperAdmin()->create();

        $response = $this->actingAs($user)->get(route('home'));

        $response->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Landing/LandingPage')
                ->where('auth.user.id', $user->id));
    }
}

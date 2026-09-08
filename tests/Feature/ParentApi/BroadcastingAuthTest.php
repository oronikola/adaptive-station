<?php

namespace Tests\Feature\ParentApi;

use App\Models\ParentAccessToken;
use App\Models\ParentAccount;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BroadcastingAuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // phpunit.xml forces the no-op 'null' broadcaster for the rest of
        // the suite; these tests specifically exercise the real Reverb/Pusher
        // channel-authorization handshake (private-channel auth signature +
        // routes/channels.php's authorization callback), which the null
        // driver doesn't implement. Broadcast::channel() registers against
        // whichever driver instance is default when routes/channels.php
        // first runs (at boot) — switching the config afterward doesn't
        // move that registration, so it's re-required here to land on the
        // freshly-selected reverb driver instance.
        config(['broadcasting.default' => 'reverb']);
        require base_path('routes/channels.php');
    }

    public function test_a_parent_can_authorize_their_own_private_channel(): void
    {
        $tenant = Tenant::factory()->create();
        $parent = ParentAccount::factory()->create(['tenant_id' => $tenant->id]);
        ['token' => $token] = ParentAccessToken::issueFor($parent);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/parent/broadcasting/auth', [
                'channel_name' => "private-parent.{$parent->id}",
                'socket_id' => '123.456',
            ])
            ->assertOk()
            ->assertJsonStructure(['auth']);
    }

    public function test_a_parent_cannot_authorize_another_parents_channel(): void
    {
        $tenant = Tenant::factory()->create();
        $parent = ParentAccount::factory()->create(['tenant_id' => $tenant->id]);
        $otherParent = ParentAccount::factory()->create(['tenant_id' => $tenant->id]);
        ['token' => $token] = ParentAccessToken::issueFor($parent);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/parent/broadcasting/auth', [
                'channel_name' => "private-parent.{$otherParent->id}",
                'socket_id' => '123.456',
            ])
            ->assertForbidden();
    }

    public function test_no_token_is_rejected(): void
    {
        $tenant = Tenant::factory()->create();
        $parent = ParentAccount::factory()->create(['tenant_id' => $tenant->id]);

        $this->postJson('/api/v1/parent/broadcasting/auth', [
            'channel_name' => "private-parent.{$parent->id}",
            'socket_id' => '123.456',
        ])->assertUnauthorized();
    }
}

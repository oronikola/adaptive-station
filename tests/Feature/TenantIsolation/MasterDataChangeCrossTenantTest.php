<?php

namespace Tests\Feature\TenantIsolation;

use App\Enums\MasterDataEntityType;
use App\Enums\MasterDataOperation;
use App\Models\MasterDataChange;
use App\Models\Tenant;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class MasterDataChangeCrossTenantTest extends TestCase
{
    use RefreshDatabase;

    public function test_versions_are_assigned_sequentially_per_tenant_independently(): void
    {
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();

        $changeA1 = MasterDataChange::record($tenantA->id, MasterDataEntityType::Person, (string) Str::uuid(), MasterDataOperation::Upsert);
        $changeB1 = MasterDataChange::record($tenantB->id, MasterDataEntityType::Person, (string) Str::uuid(), MasterDataOperation::Upsert);
        $changeA2 = MasterDataChange::record($tenantA->id, MasterDataEntityType::Person, (string) Str::uuid(), MasterDataOperation::Upsert);

        $this->assertSame(1, $changeA1->version);
        // Independent per-tenant sequence, not a global counter.
        $this->assertSame(1, $changeB1->version);
        $this->assertSame(2, $changeA2->version);
    }

    public function test_a_stations_master_data_pull_never_returns_another_tenants_changes(): void
    {
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();

        MasterDataChange::record($tenantA->id, MasterDataEntityType::Person, (string) Str::uuid(), MasterDataOperation::Upsert);
        MasterDataChange::record($tenantB->id, MasterDataEntityType::Person, (string) Str::uuid(), MasterDataOperation::Upsert);

        app(TenantContext::class)->set($tenantA->id);

        $changes = MasterDataChange::where('version', '>', 0)->get();

        $this->assertCount(1, $changes);
        $this->assertSame($tenantA->id, $changes->first()->tenant_id);
    }
}

<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\AuditLog;
use App\Models\SmsGatewayDevice;
use App\Models\SmsGatewayDeviceSimStat;
use App\Models\SmsOutboxMessage;
use App\Models\Station;
use App\Models\Tenant;
use App\Models\User;
use Database\Seeders\DemoDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DemoDataSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_populates_every_superadmin_data_view_and_remains_repeatable(): void
    {
        $this->seed(DemoDataSeeder::class);
        $this->seed(DemoDataSeeder::class);

        $this->assertSame(12, Tenant::query()->where('code', 'like', 'demo-%')->count());
        $this->assertSame(36, Station::allTenants()->where('station_code', 'like', 'DEMO-%')->count());
        $this->assertSame(5, User::query()->where('role', UserRole::AdaptivestationAdmin)
            ->where('email', 'like', '%@adaptivestation.test')->count());
        $this->assertSame(10, SmsGatewayDevice::query()->where('username', 'like', 'demo-gateway-%')->count());
        $this->assertSame(20, SmsGatewayDeviceSimStat::query()
            ->whereHas('device', fn ($query) => $query->where('username', 'like', 'demo-gateway-%'))->count());
        $this->assertSame(240, SmsOutboxMessage::query()->where('message', 'like', '[Demo]%')->count());
        $this->assertSame(140, AuditLog::allTenants()->where('action', 'like', 'demo.%')->count());
    }
}

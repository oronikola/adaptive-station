<?php

namespace App\Support;

class TenantContext
{
    protected ?string $tenantId = null;

    protected bool $set = false;

    public function set(?string $tenantId): void
    {
        $this->tenantId = $tenantId;
        $this->set = true;
    }

    public function get(): ?string
    {
        return $this->tenantId;
    }

    public function isSet(): bool
    {
        return $this->set;
    }

    public function clear(): void
    {
        $this->tenantId = null;
        $this->set = false;
    }
}

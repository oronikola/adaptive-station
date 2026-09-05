<?php

namespace App\Http\Controllers\Platform;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class AuditLogController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', AuditLog::class);

        $logs = AuditLog::allTenants()
            ->with('tenant:id,name')
            ->latest('created_at')
            ->paginate(50)
            ->withQueryString();

        return Inertia::render('Platform/audit-log/audit-log-list-screen', [
            'logs' => $logs,
        ]);
    }
}

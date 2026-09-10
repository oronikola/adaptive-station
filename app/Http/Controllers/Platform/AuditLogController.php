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
            ->when($request->filled('search'), fn ($q) => $q->where('action', 'like', '%'.$request->search.'%'))
            ->when($request->filled('actor_type'), fn ($q) => $q->where('actor_type', $request->actor_type))
            ->when($request->filled('date_from'), fn ($q) => $q->whereDate('created_at', '>=', $request->date_from))
            ->when($request->filled('date_to'), fn ($q) => $q->whereDate('created_at', '<=', $request->date_to))
            ->latest('created_at')
            ->paginate(50)
            ->withQueryString();

        return Inertia::render('Platform/audit-log/audit-log-list-screen', [
            'logs' => $logs,
            'filters' => $request->only(['search', 'actor_type', 'date_from', 'date_to']),
        ]);
    }
}

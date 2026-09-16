<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Http\Requests\Portal\ReplaceRfidCardRequest;
use App\Http\Requests\Portal\StoreRfidCardRequest;
use App\Models\RfidCard;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class RfidCardController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', RfidCard::class);

        $rfidCards = RfidCard::query()
            ->with('person')
            ->when($request->string('search')->toString(), function ($query, $search) {
                $query->where(function ($query) use ($search) {
                    $query->where('card_uid', 'like', "%{$search}%")
                        ->orWhereHas('person', fn ($q) => $q->where('display_name', 'like', "%{$search}%"));
                });
            })
            ->when($request->filled('status'), fn ($query) => $query->where(
                'is_active', $request->string('status')->toString() === 'active',
            ))
            ->orderByDesc('assigned_at')
            ->paginate(25)
            ->withQueryString();

        $stats = [
            'total_cards' => RfidCard::query()->count(),
            'active_cards' => RfidCard::query()->where('is_active', true)->count(),
            'inactive_cards' => RfidCard::query()->where('is_active', false)->count(),
            'assigned_cards' => RfidCard::query()->whereNotNull('person_id')->where('is_active', true)->count(),
        ];

        return Inertia::render('Admin/rfid-cards/rfid-cards-list-screen', [
            'rfidCards' => $rfidCards,
            'stats' => $stats,
            'filters' => $request->only(['search', 'status']),
        ]);
    }

    public function store(StoreRfidCardRequest $request): JsonResponse|RedirectResponse
    {
        $data = $request->validated();

        $card = RfidCard::assign($request->user()->actingTenantId(), $data['person_id'], $data['card_uid'], $request->user());

        if ($request->expectsJson()) {
            return response()->json([
                'message' => 'Card assigned successfully.',
                'card' => $card->load('person'),
            ]);
        }

        return redirect()->route('portal.people.edit', $card->person_id)->with('success', 'Card assigned.');
    }

    public function replace(ReplaceRfidCardRequest $request, RfidCard $rfidCard): JsonResponse|RedirectResponse
    {
        $newCard = RfidCard::replace($rfidCard, $request->validated('card_uid'), $request->user());

        if ($request->expectsJson()) {
            return response()->json([
                'message' => 'Card replaced successfully.',
                'card' => $newCard->load('person'),
            ]);
        }

        return redirect()->route('portal.people.edit', $newCard->person_id)->with('success', 'Card replaced.');
    }

    public function deactivate(Request $request, RfidCard $rfidCard): JsonResponse|RedirectResponse
    {
        Gate::authorize('update', $rfidCard);

        RfidCard::deactivate($rfidCard, $request->user());

        if ($request->expectsJson()) {
            return response()->json([
                'message' => 'Card deactivated.',
                'card' => $rfidCard->fresh()->load('person'),
            ]);
        }

        return redirect()->route('portal.people.edit', $rfidCard->person_id)->with('success', 'Card deactivated.');
    }
}

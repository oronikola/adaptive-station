<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Http\Requests\Portal\ReplaceRfidCardRequest;
use App\Http\Requests\Portal\StoreRfidCardRequest;
use App\Models\RfidCard;
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
            ->when($request->string('search')->toString(), fn ($query, $search) => $query->where('card_uid', 'like', "%{$search}%"))
            ->when($request->filled('status'), fn ($query) => $query->where(
                'is_active', $request->string('status')->toString() === 'active',
            ))
            ->orderByDesc('assigned_at')
            ->paginate(25)
            ->withQueryString();

        return Inertia::render('Admin/rfid-cards/rfid-cards-list-screen', [
            'rfidCards' => $rfidCards,
            'filters' => $request->only(['search', 'status']),
        ]);
    }

    public function store(StoreRfidCardRequest $request): RedirectResponse
    {
        $data = $request->validated();

        $card = RfidCard::assign($request->user()->tenant_id, $data['person_id'], $data['card_uid'], $request->user());

        return redirect()->route('portal.people.edit', $card->person_id)->with('success', 'Card assigned.');
    }

    public function replace(ReplaceRfidCardRequest $request, RfidCard $rfidCard): RedirectResponse
    {
        $newCard = RfidCard::replace($rfidCard, $request->validated('card_uid'), $request->user());

        return redirect()->route('portal.people.edit', $newCard->person_id)->with('success', 'Card replaced.');
    }

    public function deactivate(Request $request, RfidCard $rfidCard): RedirectResponse
    {
        Gate::authorize('update', $rfidCard);

        RfidCard::deactivate($rfidCard, $request->user());

        return redirect()->route('portal.people.edit', $rfidCard->person_id)->with('success', 'Card deactivated.');
    }
}

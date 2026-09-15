<?php

namespace App\Http\Controllers;

use App\Support\WebNotificationData;
use App\Support\WebNotificationPreferences;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class WebNotificationController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'category' => ['nullable', Rule::in(array_keys(WebNotificationPreferences::CATEGORY_ALERTS))],
            'severity' => ['nullable', Rule::in(['info', 'success', 'warning', 'error'])],
        ]);
        $category = $filters['category'] ?? null;
        $severity = $filters['severity'] ?? null;
        $notifications = $request->user()
            ->notifications()
            ->when($category !== null, fn ($query) => $query->whereIn('data->category', WebNotificationPreferences::CATEGORY_ALERTS[$category]))
            ->when($severity !== null, fn ($query) => $query->where('data->severity', $severity))
            ->latest()
            ->paginate(20)
            ->withQueryString()
            ->through(fn (DatabaseNotification $notification): array => WebNotificationData::from($notification));

        return Inertia::render('Notifications/index-screen', [
            'notifications' => $notifications,
            'filters' => [
                'category' => $category ?? '',
                'severity' => $severity ?? '',
            ],
            'categoryOptions' => WebNotificationPreferences::CATEGORY_LABELS,
            'preferences' => WebNotificationPreferences::for($request->user()),
        ]);
    }

    public function updatePreferences(Request $request): RedirectResponse
    {
        $categoryRules = [];
        foreach (array_keys(WebNotificationPreferences::CATEGORY_ALERTS) as $category) {
            $categoryRules["categories.{$category}"] = ['required', 'boolean'];
        }

        $preferences = $request->validate([
            'categories' => ['required', 'array'],
            ...$categoryRules,
        ]);

        $request->user()->forceFill(['web_notification_preferences' => $preferences])->save();

        return back()->with('success', 'Notification preferences updated.');
    }

    public function update(Request $request, string $notification): RedirectResponse
    {
        /** @var DatabaseNotification $webNotification */
        $webNotification = $request->user()->notifications()->findOrFail($notification);
        $webNotification->markAsRead();
        $actionUrl = (string) ($webNotification->data['action_url'] ?? '');

        return str_starts_with($actionUrl, '/')
            ? redirect()->to($actionUrl)
            : redirect()->route('notifications.index');
    }

    public function markAllRead(Request $request): RedirectResponse
    {
        $request->user()->unreadNotifications()->update(['read_at' => now()]);

        return back();
    }
}

<?php

namespace App\Models;

use App\Enums\KioskMediaType;
use App\Models\Concerns\HasTenantScope;
use App\Models\Concerns\HasUuidV4;
use App\Models\Contracts\TenantScoped;
use App\Models\Scopes\TenantScope;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\ScopedBy;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * One idle-screen slide (image or video) assigned to a specific kiosk
 * station — never tenant-wide, so a superadmin can give different schools',
 * or different stations at the same school, their own slideshow. Lives in
 * the per-tenant physical database like Station/TapEvent, not the central
 * one, since it is always scoped to one station.
 */
#[Fillable(['tenant_id', 'station_id', 'type', 'disk_path', 'position', 'duration_seconds', 'is_active', 'uploaded_by'])]
#[ScopedBy(TenantScope::class)]
class KioskMedia extends Model implements TenantScoped
{
    use HasTenantScope, HasUuidV4;

    protected $table = 'kiosk_media';

    protected $connection = 'tenant';

    protected function casts(): array
    {
        return [
            'type' => KioskMediaType::class,
            'position' => 'integer',
            'duration_seconds' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function station(): BelongsTo
    {
        return $this->belongsTo(Station::class);
    }

    /**
     * Never the R2 object key itself — always derived from the configured
     * public base URL, so re-pointing the bucket/CDN domain never needs a
     * data migration across every existing row.
     */
    public function getUrlAttribute(): string
    {
        return Storage::disk('r2')->url($this->disk_path);
    }

    /**
     * Every slide a kiosk should currently show, in display order — shared
     * by the device API (Api\Device\KioskMediaController) and nothing else,
     * so the ordering rule lives in exactly one place.
     */
    public function scopeActiveForStation(Builder $query, string $stationId): Builder
    {
        return $query->where('station_id', $stationId)
            ->where('is_active', true)
            ->orderBy('position')
            ->orderBy('created_at');
    }

    /**
     * Shared by Portal\StationMediaController and Platform\
     * StationMediaController, so a size/type limit is defined and enforced
     * in exactly one place regardless of which screen the upload came from.
     * The request-layer 'mimes'/'max' rule already narrows the file to a
     * plausible extension under 100MB; this re-checks the *per-type* limit
     * (images capped far below that) with a message naming the actual
     * offending type.
     */
    public static function uploadFor(Station $station, UploadedFile $file, ?int $durationSeconds, ?string $uploadedById): self
    {
        $extension = strtolower((string) $file->getClientOriginalExtension());
        $type = KioskMediaType::fromExtension($extension);

        if ($type === null) {
            throw ValidationException::withMessages(['file' => "Unsupported file type: .{$extension}"]);
        }

        if ($file->getSize() > $type->maxSizeKb() * 1024) {
            throw ValidationException::withMessages([
                'file' => "This {$type->value} exceeds the ".number_format($type->maxSizeKb() / 1024, 1).'MB limit.',
            ]);
        }

        $path = "kiosk-media/{$station->tenant_id}/{$station->id}/".Str::uuid()->toString().".{$extension}";
        Storage::disk('r2')->put($path, file_get_contents($file->getRealPath()), 'public');

        $nextPosition = 1 + (int) static::query()->where('station_id', $station->id)->max('position');

        return static::create([
            'tenant_id' => $station->tenant_id,
            'station_id' => $station->id,
            'type' => $type,
            'disk_path' => $path,
            'position' => $nextPosition,
            'duration_seconds' => $durationSeconds,
            'is_active' => true,
            'uploaded_by' => $uploadedById,
        ]);
    }

    /**
     * Applies an admin update to a slide. An occupied requested position
     * swaps the two slides in one tenant-database transaction, avoiding an
     * intermediate duplicate position in the kiosk's ordered feed.
     *
     * @param  array{position?: int, swap_with?: string, duration_seconds?: ?int, is_active?: bool}  $attributes
     */
    public static function updateForStation(self $media, array $attributes): self
    {
        return $media->getConnection()->transaction(function () use ($media, $attributes): self {
            $lockedMedia = static::allTenants()
                ->whereKey($media->id)
                ->lockForUpdate()
                ->firstOrFail();

            if (array_key_exists('swap_with', $attributes)) {
                $swapWithId = $attributes['swap_with'];
                unset($attributes['swap_with']);

                $orderedMedia = static::allTenants()
                    ->where('station_id', $lockedMedia->station_id)
                    ->orderBy('position')
                    ->orderBy('created_at')
                    ->lockForUpdate()
                    ->get();
                $currentIndex = $orderedMedia->search(fn (self $item) => $item->id === $lockedMedia->id);
                $neighborIndex = $orderedMedia->search(fn (self $item) => $item->id === $swapWithId);

                if ($currentIndex === false || $neighborIndex === false) {
                    throw (new ModelNotFoundException)->setModel(static::class, [$swapWithId]);
                }

                $swappedMedia = $orderedMedia->all();
                [$swappedMedia[$currentIndex], $swappedMedia[$neighborIndex]] = [$swappedMedia[$neighborIndex], $swappedMedia[$currentIndex]];
                $temporaryPosition = 1 + (int) $orderedMedia->max('position');

                foreach ($orderedMedia as $index => $item) {
                    $item->update(['position' => $temporaryPosition + $index]);
                }

                foreach ($swappedMedia as $index => $item) {
                    $item->update(['position' => $index + 1]);
                }

                $lockedMedia->refresh();
            } elseif (array_key_exists('position', $attributes)) {
                $requestedPosition = $attributes['position'];
                unset($attributes['position']);

                if ($requestedPosition !== $lockedMedia->position) {
                    $displacedMedia = static::allTenants()
                        ->where('station_id', $lockedMedia->station_id)
                        ->where('position', $requestedPosition)
                        ->whereKeyNot($lockedMedia->id)
                        ->lockForUpdate()
                        ->first();

                    if ($displacedMedia !== null) {
                        $currentPosition = $lockedMedia->position;
                        $temporaryPosition = 1 + (int) static::allTenants()
                            ->where('station_id', $lockedMedia->station_id)
                            ->max('position');

                        $lockedMedia->update(['position' => $temporaryPosition]);
                        $displacedMedia->update(['position' => $currentPosition]);
                    }

                    $lockedMedia->update(['position' => $requestedPosition]);
                }
            }

            if ($attributes !== []) {
                $lockedMedia->update($attributes);
            }

            return $lockedMedia;
        });
    }

    /** Deletes the R2 object before the row — an orphaned object with no row is a harmless, invisible cost; an orphaned row pointing at a deleted object is a broken kiosk slide. */
    public function purge(): void
    {
        Storage::disk('r2')->delete($this->disk_path);
        $this->delete();
    }
}

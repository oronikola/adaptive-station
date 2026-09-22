<?php

namespace App\Enums;

enum KioskMediaType: string
{
    case Image = 'image';
    case Video = 'video';

    /** @return array<int, string> */
    public function allowedExtensions(): array
    {
        return match ($this) {
            self::Image => ['jpg', 'jpeg', 'png', 'webp'],
            self::Video => ['mp4', 'webm'],
        };
    }

    public function maxSizeKb(): int
    {
        return match ($this) {
            self::Image => 10 * 1024,
            self::Video => 100 * 1024,
        };
    }

    public static function fromExtension(string $extension): ?self
    {
        $extension = strtolower($extension);

        foreach (self::cases() as $case) {
            if (in_array($extension, $case->allowedExtensions(), true)) {
                return $case;
            }
        }

        return null;
    }
}

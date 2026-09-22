import { useEffect, useState } from 'react';
import type { KioskMediaRecord } from '@/kiosk/db';

/** Every slide gets at least this long, video or image, if it has no admin-set duration_seconds — long enough to actually register with someone walking past. */
const DEFAULT_SLIDE_MS = 8_000;

/**
 * The kiosk's idle-screen slideshow — takes over the whole screen once
 * KioskScreen has been idle for IDLE_AFTER_MS. Images and videos share one
 * ordered playlist and the same fixed-duration advance, rather than videos
 * getting special "play through once" handling: `loop` is set on every
 * video regardless, purely so a video whose natural length is shorter than
 * its slide duration keeps replaying instead of freezing on its last frame,
 * not so it can hold the screen forever — advancing is still driven by the
 * same timer an image slide uses. See KioskMedia's migration for why
 * duration_seconds applies uniformly to both types.
 */
export default function IdleMediaCarousel({ media }: { media: KioskMediaRecord[] }) {
    const [index, setIndex] = useState(0);
    const current = media[index % media.length];

    // Resets to the first slide whenever the assigned media list itself
    // changes (a fresh sync added/removed/reordered slides) — otherwise a
    // stale index could point past the end of a now-shorter list.
    useEffect(() => {
        setIndex(0);
    }, [media]);

    useEffect(() => {
        if (media.length <= 1) return undefined;

        const timer = setTimeout(() => {
            setIndex((i) => (i + 1) % media.length);
        }, (current?.duration_seconds ?? DEFAULT_SLIDE_MS / 1000) * 1000);

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [index, media.length]);

    if (!current) return null;

    return (
        <div
            className="kiosk-fade-in"
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 50,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#000',
            }}
        >
            {current.type === 'image' ? (
                <img
                    key={current.id}
                    src={current.url}
                    alt=""
                    style={{ maxWidth: '100%', maxHeight: '100%', width: '100%', height: '100%', objectFit: 'contain' }}
                />
            ) : (
                <video
                    key={current.id}
                    src={current.url}
                    autoPlay
                    muted
                    loop
                    playsInline
                    style={{ maxWidth: '100%', maxHeight: '100%', width: '100%', height: '100%', objectFit: 'contain' }}
                />
            )}
        </div>
    );
}

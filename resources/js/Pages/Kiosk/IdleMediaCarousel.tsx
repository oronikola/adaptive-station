import { useEffect, useRef, useState } from 'react';
import type { KioskMediaRecord } from '@/kiosk/db';

/** Every slide gets at least this long, video or image, if it has no admin-set duration_seconds — long enough to actually register with someone walking past. */
const DEFAULT_SLIDE_MS = 8_000;

/**
 * Minimal inline icons (lucide's volume-2/volume-x paths) rather than pulling
 * in one of this app's full animated icon components — this is a single
 * static tap target, not something that needs hover-triggered motion.
 */
function SpeakerIcon({ muted }: { muted: boolean }) {
    return (
        <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 5 6 9H2v6h4l5 4V5Z" />
            {muted ? (
                <>
                    <line x1="22" x2="16" y1="9" y2="15" />
                    <line x1="16" x2="22" y1="9" y2="15" />
                </>
            ) : (
                <>
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                </>
            )}
        </svg>
    );
}

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

    // Defaults to unmuted — a kiosk has no mouse or keyboard for anyone to
    // tap a speaker icon with, so there's no realistic "then unmute it"
    // follow-up gesture the way there would be on an ordinary browser tab.
    // The speaker button below still exists so an operator can mute it,
    // e.g. from a touch-capable kiosk or a station where sound isn't
    // wanted.
    const [muted, setMuted] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    // Resets to the first slide whenever the assigned media list itself
    // changes (a fresh sync added/removed/reordered slides) — otherwise a
    // stale index could point past the end of a now-shorter list.
    useEffect(() => {
        setIndex(0);
    }, [media]);

    // A freshly-mounted video (new slide, or the same video looping back
    // into view after other slides played) always starts unmuted again —
    // a mute choice made for one video shouldn't silently carry over and
    // leave a later one silent for no visible reason.
    useEffect(() => {
        setMuted(false);
    }, [current?.id]);

    // Autoplay is triggered here rather than via the `autoPlay` HTML
    // attribute, which is only a request — a browser is free to silently
    // ignore it (most commonly: it allows *muted* autoplay unconditionally,
    // but blocks *unmuted* autoplay unless the browser itself is configured
    // to permit it) and there's no attribute-only way to know it failed.
    // Calling play() explicitly gives an actual rejection to react to: retry
    // muted (always allowed) rather than leave the video paused and silent
    // forever.
    useEffect(() => {
        const video = videoRef.current;
        if (!video || current?.type !== 'video') return;

        console.log('EFFECT RUNNING', current?.id, current?.type, 'muted arg:', muted);

        // Set the property imperatively so the mute button's setMuted call
        // (which reruns this effect via the muted dependency) actually
        // reaches the element, rather than relying on the muted={muted}
        // JSX attribute racing against this same effect's play() call.
        video.muted = muted;

        video.play().catch((err) => {
            console.warn('Audible play rejected:', err.name, err.message);
            video.muted = true;
            setMuted(true);
            video.play().catch((err2) => {
                console.warn('Even muted play rejected:', err2.name, err2.message);
            });
        });
    }, [current?.id, current?.type, muted]);

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
                <>
                    <video
                        key={current.id}
                        ref={videoRef}
                        src={current.url}
                        loop
                        playsInline
                        // A network-level stall/error (a slow or briefly
                        // unreachable R2 fetch, not an autoplay-policy
                        // rejection) previously left the element stuck with
                        // nothing retrying it. One reload-and-retry attempt
                        // covers a transient blip without looping forever
                        // against a genuinely broken file — see the
                        // autoplay effect above for the separate policy-
                        // rejection path.
                        onError={(e) => {
                            const video = e.currentTarget;
                            if (video.dataset.retried) return;
                            video.dataset.retried = 'true';
                            setTimeout(() => {
                                video.load();
                                video.play().catch(() => {});
                            }, 1500);
                        }}
                        style={{ maxWidth: '100%', maxHeight: '100%', width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                    <button
                        type="button"
                        onClick={() => setMuted((m) => !m)}
                        aria-label={muted ? 'Unmute video' : 'Mute video'}
                        style={{
                            position: 'absolute',
                            right: 28,
                            bottom: 28,
                            width: 52,
                            height: 52,
                            display: 'grid',
                            placeItems: 'center',
                            borderRadius: '50%',
                            border: '1px solid rgba(255,255,255,.18)',
                            background: 'rgba(15,17,24,.55)',
                            backdropFilter: 'blur(8px)',
                            color: '#fff',
                            cursor: 'pointer',
                            boxShadow: '0 8px 24px -8px rgba(0,0,0,.6)',
                        }}
                    >
                        <SpeakerIcon muted={muted} />
                    </button>
                </>
            )}
        </div>
    );
}

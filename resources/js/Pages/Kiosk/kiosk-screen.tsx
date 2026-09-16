import { BadgeAlertIcon } from '@/Components/icons/badge-alert';
import { CheckIcon } from '@/Components/icons/check';
import { ClockIcon } from '@/Components/icons/clock';
import { SmartphoneNfcIcon } from '@/Components/icons/smartphone-nfc';
import { Head } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import {
    getMeta,
    setMeta,
    getCardByUid,
    getPerson,
    getLastTap,
    setLastTap,
    addPendingEvent,
    clearCredential,
    upsertPerson,
    upsertCard,
    type TapEventType,
} from '@/kiosk/db';
import { activate, pairViaLink, resolveTap, DeviceUnauthorizedError, type ResolveTapResponse } from '@/kiosk/api';
import { syncMasterData, flushPendingEvents, heartbeat } from '@/kiosk/sync';

/**
 * `crypto.randomUUID()` only exists in secure contexts (HTTPS or
 * `localhost`) — a kiosk served over plain HTTP on a LAN hostname (e.g.
 * `http://adaptive-station.ck`) doesn't get it, and calling it throws
 * synchronously, which used to abort the whole tap handler before it ever
 * recorded the event. `crypto.getRandomValues` has no such restriction, so
 * it's used to build an RFC 4122 v4 UUID by hand; `Math.random` is a last
 * resort if `crypto` itself is unavailable.
 */
function generateEventId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }

    const bytes = new Uint8Array(16);
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
        crypto.getRandomValues(bytes);
    } else {
        for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    }

    bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10

    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const DOUBLE_TAP_GRACE_MS = 10_000;
const RESULT_CLEAR_MS = 3_000;
const MASTER_DATA_SYNC_MS = 15_000;
const EVENT_FLUSH_MS = 7_000;
const HEARTBEAT_MS = 60_000;
const EXIT_GESTURE_TAPS = 5;
const EXIT_GESTURE_WINDOW_MS = 3_000;

/**
 * Best-effort lockdown: fullscreen + the Keyboard Lock API (Chrome only,
 * requires fullscreen) so Escape/Alt+Tab/system shortcuts get captured by
 * the page instead of the OS while the kiosk is running. Both calls need a
 * user gesture in most browsers, so this is called from click/submit
 * handlers, not on mount — and both fail silently since a station already
 * running inside an OS-level kiosk browser (Chrome --kiosk, Assigned
 * Access, etc.) doesn't need either and shouldn't be blocked if they throw.
 */
function requestKioskLockdown() {
    if (document.fullscreenElement == null) {
        document.documentElement.requestFullscreen?.().catch(() => {});
    }
    const nav = navigator as Navigator & { keyboard?: { lock?: (keys?: string[]) => Promise<void> } };
    nav.keyboard?.lock?.().catch(() => {});
}

type Phase = 'booting' | 'pairing' | 'activation' | 'ready';

interface TapResult {
    kind: 'success' | 'duplicate' | 'error' | 'checking';
    title: string;
    subtitle?: string;
    photoUrl?: string | null;
}

/** Avatar fallback when a person has no photo synced — first + last initials read far better at kiosk viewing distance than a generic person icon. */
function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    const first = parts[0]?.[0] ?? '';
    const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
    return (first + last).toUpperCase();
}

function speak(text: string) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
    } catch {
        /* speech is a nice-to-have, never block the kiosk on it */
    }
}

const RESULT_THEME = {
    success: { fg: '#6ee7b7', bg: 'rgba(16,185,129,.14)', border: 'rgba(16,185,129,.4)', glow: 'rgba(16,185,129,.35)' },
    duplicate: { fg: '#fcd34d', bg: 'rgba(245,158,11,.14)', border: 'rgba(245,158,11,.4)', glow: 'rgba(245,158,11,.3)' },
    error: { fg: '#fca5a5', bg: 'rgba(239,68,68,.14)', border: 'rgba(239,68,68,.4)', glow: 'rgba(239,68,68,.3)' },
    // Shown only while waiting on resolveTap() — a card unknown to the
    // kiosk's own local cache, being checked with the server instead of
    // rejected outright. See handleTapSubmit's local-cache-miss branch.
    checking: { fg: '#93c5fd', bg: 'rgba(59,130,246,.14)', border: 'rgba(59,130,246,.4)', glow: 'rgba(59,130,246,.3)' },
} as const;

export default function KioskScreen({
    pairingToken,
    stationName: linkedStationName,
}: {
    pairingToken?: string | null;
    /** Resolved server-side from the pairing link itself, before any device/pair exchange — see KioskController::resolveStationName(). Lets this tab identify which station it is even while still on the "Pairing…" screen. */
    stationName?: string | null;
}) {
    const [phase, setPhase] = useState<Phase>('booting');
    const [stationName, setStationName] = useState<string>(linkedStationName ?? '');

    const [activationCode, setActivationCode] = useState('');
    const [activationError, setActivationError] = useState<string | null>(null);
    const [activating, setActivating] = useState(false);

    const [result, setResult] = useState<TapResult | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const resultTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Hidden admin exit: tap the station badge 5x fast to reveal a
    // reconfigure/deactivate dialog. There's no staff login on this screen
    // to gate against (the kiosk authenticates itself, not a person), so
    // this is a deliberate-friction confirmation, not a password — the real
    // security boundary is physical access to the station, same as it
    // would be to reach devtools/localStorage directly.
    const [exitDialogOpen, setExitDialogOpen] = useState(false);
    const [exitConfirmText, setExitConfirmText] = useState('');
    const exitTapCountRef = useRef(0);
    const exitTapResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    function handleBadgeTap() {
        exitTapCountRef.current += 1;
        if (exitTapResetRef.current) clearTimeout(exitTapResetRef.current);
        if (exitTapCountRef.current >= EXIT_GESTURE_TAPS) {
            exitTapCountRef.current = 0;
            setExitConfirmText('');
            setExitDialogOpen(true);
            return;
        }
        exitTapResetRef.current = setTimeout(() => {
            exitTapCountRef.current = 0;
        }, EXIT_GESTURE_WINDOW_MS);
    }

    async function confirmDeactivate() {
        await clearCredential();
        setExitDialogOpen(false);
        setExitConfirmText('');
        setPhase('activation');
    }

    // A live clock is a small, familiar touch on a physical kiosk display —
    // purely decorative, no logic depends on it.
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const clockInterval = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(clockInterval);
    }, []);

    // ── Boot: opening a station's pairing link is a deliberate action to
    // bind *this* device to *that* station, so it always takes priority over
    // whatever credential this browser happened to have cached already —
    // otherwise re-using a browser/tablet to pair a second station silently
    // keeps it bound to the first one instead (see DevicePairingController's
    // docblock). Only fall back to the cached credential, then the manual
    // activation form, when the kiosk wasn't opened via a pairing link.
    useEffect(() => {
        getMeta().then(async (meta) => {
            if (pairingToken) {
                setPhase('pairing');
                try {
                    const response = await pairViaLink(pairingToken);
                    await setMeta({
                        credentialToken: response.credential_token,
                        stationId: response.station.id,
                        stationName: response.station.name,
                        masterDataCursor: 0,
                    });
                    setStationName(response.station.name);
                    setPhase('ready');
                } catch {
                    setActivationError('This pairing link is invalid or has been revoked. Enter an activation code instead.');
                    setPhase('activation');
                }
                return;
            }

            if (meta.credentialToken) {
                setStationName(meta.stationName ?? '');
                setPhase('ready');
                return;
            }

            setPhase('activation');
        });
    }, [pairingToken]);

    // ── Background sync loops, only once activated ─────────────────────
    useEffect(() => {
        if (phase !== 'ready') return;

        function handleUnauthorized(error: unknown) {
            if (error instanceof DeviceUnauthorizedError) {
                setPhase('activation');
                return true;
            }
            return false;
        }

        let cancelled = false;

        async function runMasterDataSync() {
            try {
                await syncMasterData();
            } catch (error) {
                if (!handleUnauthorized(error)) {
                    // Offline or a transient server error — next tick retries.
                }
            }
        }

        async function runFlush() {
            try {
                await flushPendingEvents();
            } catch (error) {
                handleUnauthorized(error);
            }
        }

        async function runHeartbeat() {
            try {
                await heartbeat();
            } catch (error) {
                handleUnauthorized(error);
            }
        }

        if (!cancelled) {
            runMasterDataSync();
            runFlush();
            runHeartbeat();
        }

        const syncInterval = setInterval(runMasterDataSync, MASTER_DATA_SYNC_MS);
        const flushInterval = setInterval(runFlush, EVENT_FLUSH_MS);
        const heartbeatInterval = setInterval(runHeartbeat, HEARTBEAT_MS);

        return () => {
            cancelled = true;
            clearInterval(syncInterval);
            clearInterval(flushInterval);
            clearInterval(heartbeatInterval);
        };
    }, [phase]);

    // ── Keep the tap input focused at all times while ready ─────────────
    // Refocus is driven by the input's own blur (see onBlur on the <input>
    // below), which can tell a stray blur (click on empty space) apart from
    // focus legitimately moving to a real control (the exit dialog's text
    // field, its buttons) — a blanket "refocus on any click" would yank
    // focus away from those mid-keystroke. Window 'focus' still refocuses
    // unconditionally: that only fires when the OS hands focus back to this
    // browser window/tab (e.g. after Alt+Tab away and back), which should
    // always return control to the reader input, dialog or not.
    useEffect(() => {
        if (phase !== 'ready') return;
        inputRef.current?.focus();
        requestKioskLockdown();

        function refocusOnWindowFocus() {
            if (exitDialogOpen) return;
            setTimeout(() => inputRef.current?.focus(), 50);
        }

        window.addEventListener('focus', refocusOnWindowFocus);
        return () => window.removeEventListener('focus', refocusOnWindowFocus);
    }, [phase, exitDialogOpen]);

    function handleInputBlur(e: React.FocusEvent<HTMLInputElement>) {
        if (exitDialogOpen) return;
        const next = e.relatedTarget as HTMLElement | null;
        if (next && (next.tagName === 'BUTTON' || next.tagName === 'INPUT')) return;
        setTimeout(() => {
            if (document.activeElement === document.body) {
                inputRef.current?.focus();
            }
        }, 50);
    }

    function showResult(next: TapResult) {
        setResult(next);
        if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current);
        resultTimeoutRef.current = setTimeout(() => {
            setResult(null);
            inputRef.current?.focus();
        }, RESULT_CLEAR_MS);
    }

    async function submitActivation(e: React.FormEvent) {
        e.preventDefault();
        setActivating(true);
        setActivationError(null);
        requestKioskLockdown();

        try {
            const response = await activate(activationCode.trim());
            await setMeta({
                credentialToken: response.credential_token,
                stationId: response.station.id,
                stationName: response.station.name,
                masterDataCursor: 0,
            });
            setStationName(response.station.name);
            setActivationCode('');
            setPhase('ready');
        } catch (error) {
            const safeMessage = (() => {
                if (error instanceof Error) {
                    const msg = error.message.toLowerCase();
                    if (msg.includes('invalid') || msg.includes('not found') || msg.includes('expired')) {
                        return 'Invalid activation code — check it and try again.';
                    }
                    if (msg.includes('network') || msg.includes('fetch') || msg.includes('failed to fetch')) {
                        return 'Cannot reach the server. Check your internet connection and try again.';
                    }
                }
                return 'Activation failed. Please double-check the code or contact your administrator.';
            })();
            setActivationError(safeMessage);
        } finally {
            setActivating(false);
        }
    }

    /**
     * The fallback for a card the kiosk's own local cache doesn't have —
     * asks the server directly and waits, instead of rejecting outright.
     * For an essentiel-configured school this is what actually lets a
     * brand-new student's very first tap work (see EssentielTapResolver);
     * for any other school it's effectively the same "not recognized"
     * outcome, just confirmed with the server rather than assumed from a
     * possibly-stale local cache. Requires a live connection — a genuinely
     * offline kiosk cannot verify a card it has never cached.
     */
    async function handleUnrecognizedCardFallback(cardUid: string) {
        showResult({ kind: 'checking', title: 'Checking…', subtitle: 'Verifying this card, please wait.' });

        const now = new Date();
        // No local tap history exists for a card the kiosk has never seen,
        // so this is submitted as its first-ever local IN — the resolver
        // (essentiel, for a configured tenant) determines the real IN/OUT
        // state server-side and reports it back via `tapstate` below.
        const requestEventType: TapEventType = 'IN';

        let response: ResolveTapResponse;
        try {
            response = await resolveTap({
                id: generateEventId(),
                card_uid: cardUid,
                event_type: requestEventType,
                occurred_at: now.toISOString(),
                occurred_offset_minutes: -now.getTimezoneOffset(),
            });
        } catch {
            speak('Cannot verify this card right now.');
            showResult({
                kind: 'error',
                title: 'Cannot verify this card',
                subtitle: 'Check your connection and try again.',
            });
            return;
        }

        if (!response.found || !response.person_id) {
            speak('Card not recognized.');
            showResult({ kind: 'error', title: 'Card not recognized', subtitle: 'Please go to the office or try another card.' });
            return;
        }

        const displayName =
            response.person?.name?.full ||
            [response.person?.name?.first, response.person?.name?.last].filter(Boolean).join(' ') ||
            'Student';

        // essentiel reports '0' for an OUT tap, anything else for IN — see
        // EssentielTapResolver::formatSmsMessage() for the same convention.
        const eventType: TapEventType = response.tapstate === '0' ? 'OUT' : 'IN';
        const photoUrl = response.person?.photo_url ?? response.person?.photo_path ?? null;

        // Cache it locally now, so this same card's *next* tap resolves the
        // ordinary instant, offline-capable way — see @/kiosk/db.
        await upsertPerson({
            id: response.person_id,
            external_id: null,
            person_type: response.person?.type ?? 'student',
            display_name: displayName,
            grade_level: response.person?.level?.name ?? null,
            section: null,
            photo_url: photoUrl,
            is_active: true,
            metadata: null,
            updated_at: now.toISOString(),
        });
        await upsertCard({ card_uid: cardUid, id: cardUid, person_id: response.person_id, is_active: true });
        await setLastTap({ person_id: response.person_id, event_type: eventType, at: now.toISOString() });

        speak(`${displayName}, checked ${eventType === 'IN' ? 'in' : 'out'}.`);
        showResult({
            kind: 'success',
            title: displayName,
            subtitle: eventType === 'IN' ? 'Checked In' : 'Checked Out',
            photoUrl,
        });
    }

    async function handleTapSubmit(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key !== 'Enter') return;
        e.preventDefault();

        const rawValue = e.currentTarget.value;
        e.currentTarget.value = '';

        const cardUid = rawValue.trim().toUpperCase();
        if (!cardUid) return;

        const card = await getCardByUid(cardUid);
        if (!card || !card.is_active) {
            // Not in the kiosk's own locally-synced cache — rather than
            // rejecting outright, ask the server directly (it may still
            // resolve this via essentiel, or simply have a fresher copy
            // than this kiosk has synced down yet). See resolveTap()'s
            // docblock and TapEventResolveController.
            await handleUnrecognizedCardFallback(cardUid);
            return;
        }

        const person = await getPerson(card.person_id);
        if (!person || !person.is_active) {
            speak('No active record for this card.');
            showResult({ kind: 'error', title: 'No active record for this card', subtitle: 'Please contact the office to resolve this.' });
            return;
        }

        const lastTap = await getLastTap(person.id);
        const alreadyTapped =
            lastTap && Date.now() - new Date(lastTap.at).getTime() < DOUBLE_TAP_GRACE_MS;

        if (alreadyTapped) {
            showResult({
                kind: 'duplicate',
                title: person.display_name,
                subtitle: 'Already recorded — please wait a moment before tapping again.',
                photoUrl: person.photo_url,
            });
            return;
        }

        const eventType: TapEventType = lastTap?.event_type === 'IN' ? 'OUT' : 'IN';
        const now = new Date();

        await addPendingEvent({
            id: generateEventId(),
            card_uid: cardUid,
            event_type: eventType,
            occurred_at: now.toISOString(),
            occurred_offset_minutes: -now.getTimezoneOffset(),
        });
        await setLastTap({ person_id: person.id, event_type: eventType, at: now.toISOString() });

        speak(`${person.display_name}, checked ${eventType === 'IN' ? 'in' : 'out'}.`);
        showResult({
            kind: 'success',
            title: person.display_name,
            subtitle: eventType === 'IN' ? 'Checked In' : 'Checked Out',
            photoUrl: person.photo_url,
        });

        // Fire-and-forget: don't make the student wait on the network.
        flushPendingEvents().catch(() => {});
    }

    const theme = result ? RESULT_THEME[result.kind] : null;

    return (
        <>
            {/* Tab title reflects the paired station once known — the main way
                to tell apart several kiosk tabs/windows open at once (e.g.
                while testing multiple stations side by side). */}
            <Head title={stationName ? `${stationName} — Kiosk` : 'Kiosk'}>
                {/* Overrides app.blade.php's default viewport for this page only —
                    a physical touch kiosk shouldn't let a stray two-finger
                    gesture zoom the layout or trigger a pull-to-refresh reload. */}
                <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
            </Head>
            <style>{`
                html, body, #app {
                    height: 100%; margin: 0; background: #060a14;
                    overscroll-behavior: none;
                    touch-action: manipulation;
                    -webkit-user-select: none;
                    user-select: none;
                }
                input, textarea { -webkit-user-select: text; user-select: text; }

                @keyframes kiosk-pulse-ring {
                    0%   { transform: scale(1);    opacity: .55; }
                    70%  { transform: scale(1.55); opacity: 0; }
                    100% { transform: scale(1.55); opacity: 0; }
                }
                @keyframes kiosk-fade-in {
                    from { opacity: 0; transform: translateY(10px) scale(.98); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes kiosk-spin {
                    to { transform: rotate(360deg); }
                }
                .kiosk-pulse-ring {
                    position: absolute;
                    inset: 0;
                    border-radius: 9999px;
                    border: 2px solid currentColor;
                    animation: kiosk-pulse-ring 2.2s ease-out infinite;
                }
                .kiosk-pulse-ring--delay { animation-delay: 1.1s; }
                .kiosk-fade-in { animation: kiosk-fade-in 320ms cubic-bezier(.16,1,.3,1) both; }
                .kiosk-spinner {
                    width: 18px; height: 18px; border-radius: 50%;
                    border: 2.5px solid rgba(255,255,255,.35);
                    border-top-color: #fff;
                    animation: kiosk-spin .7s linear infinite;
                }
            `}</style>

            <div
                style={{
                    position: 'relative',
                    minHeight: '100vh',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background:
                        'radial-gradient(1100px 700px at 50% -10%, #16203f 0%, #060a14 60%), linear-gradient(180deg, #060a14 0%, #0a1122 100%)',
                    color: '#f8fafc',
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
                    padding: 24,
                    textAlign: 'center',
                }}
            >
                {/* Subtle dot-grid texture, faded toward the top — purely decorative */}
                <div
                    aria-hidden="true"
                    style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundImage: 'radial-gradient(rgba(255,255,255,.09) 1px, transparent 1px)',
                        backgroundSize: '26px 26px',
                        maskImage: 'radial-gradient(circle at 50% 30%, #000 0%, transparent 70%)',
                        WebkitMaskImage: 'radial-gradient(circle at 50% 30%, #000 0%, transparent 70%)',
                        pointerEvents: 'none',
                    }}
                />

                {/* Station identity + live clock, always visible once known */}
                {stationName && (
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '18px 32px',
                            fontSize: 13.5,
                            color: 'rgba(255,255,255,.6)',
                            background: 'linear-gradient(180deg, rgba(255,255,255,.04), transparent)',
                            borderBottom: '1px solid rgba(255,255,255,.07)',
                        }}
                    >
                        <span
                            onClick={handleBadgeTap}
                            title=""
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'flex-start',
                                gap: 2,
                                cursor: 'default',
                            }}
                        >
                            <span
                                style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    letterSpacing: '.08em',
                                    textTransform: 'uppercase',
                                    color: 'rgba(255,255,255,.4)',
                                    paddingLeft: 13,
                                }}
                            >
                                Station
                            </span>
                            <span
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 9,
                                    fontWeight: 700,
                                    fontSize: 15,
                                    padding: '7px 16px 7px 12px',
                                    borderRadius: 999,
                                    background: 'rgba(255,255,255,.06)',
                                    border: '1px solid rgba(255,255,255,.1)',
                                }}
                            >
                                <span style={{ position: 'relative', width: 8, height: 8 }}>
                                    <span
                                        style={{
                                            position: 'absolute',
                                            inset: 0,
                                            borderRadius: 999,
                                            background: '#34d399',
                                        }}
                                    />
                                    <span
                                        className="kiosk-pulse-ring"
                                        style={{ color: '#34d399', animationDuration: '1.8s' }}
                                    />
                                </span>
                                {stationName}
                            </span>
                        </span>
                        <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                            {now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Manila' })}
                            <span style={{ opacity: 0.5 }}> · </span>
                            {now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'Asia/Manila' })}
                        </span>
                    </div>
                )}

                <div
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        padding: '18px 0',
                        fontSize: 12,
                        fontWeight: 600,
                        letterSpacing: '.06em',
                        textTransform: 'uppercase',
                        color: 'rgba(255,255,255,.25)',
                    }}
                >
                    <SmartphoneNfcIcon size={13} />
                    Adaptive Station
                </div>

                {phase === 'booting' && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                        <span className="kiosk-spinner" />
                        <p style={{ opacity: 0.5, fontSize: 13.5 }}>Starting kiosk…</p>
                    </div>
                )}

                {phase === 'pairing' && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                        <span className="kiosk-spinner" />
                        <p style={{ opacity: 0.5, fontSize: 13.5 }}>Pairing this kiosk…</p>
                    </div>
                )}

                {phase === 'activation' && (
                    <form
                        onSubmit={submitActivation}
                        className="kiosk-fade-in"
                        style={{
                            width: 'min(440px, 100%)',
                            background: 'rgba(255,255,255,.05)',
                            backdropFilter: 'blur(12px)',
                            border: '1px solid rgba(255,255,255,.12)',
                            borderRadius: 24,
                            padding: '36px 32px',
                            boxShadow: '0 24px 60px -20px rgba(0,0,0,.55)',
                        }}
                    >
                        <div
                            style={{
                                width: 56,
                                height: 56,
                                margin: '0 auto 18px',
                                borderRadius: 16,
                                display: 'grid',
                                placeItems: 'center',
                                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                                boxShadow: '0 10px 24px -8px rgba(37,99,235,.6)',
                            }}
                        >
                            <SmartphoneNfcIcon size={28} />
                        </div>
                        <h1 style={{ margin: '0 0 8px', fontSize: 21, fontWeight: 800, letterSpacing: '-.01em' }}>
                            Activate This Kiosk
                        </h1>
                        <p style={{ margin: '0 0 22px', fontSize: 13.5, opacity: 0.6, lineHeight: 1.55 }}>
                            Enter the activation code issued from this station's page in the portal.
                        </p>
                        <input
                            type="text"
                            value={activationCode}
                            onChange={(e) => setActivationCode(e.target.value)}
                            autoFocus
                            required
                            autoCapitalize="characters"
                            autoCorrect="off"
                            spellCheck={false}
                            placeholder="ABCDE-2F3GH"
                            style={{
                                width: '100%',
                                boxSizing: 'border-box',
                                padding: '14px 16px',
                                borderRadius: 12,
                                border: '1px solid rgba(255,255,255,.18)',
                                background: 'rgba(255,255,255,.06)',
                                color: '#f8fafc',
                                fontSize: 20,
                                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                                letterSpacing: '.06em',
                                textTransform: 'uppercase',
                                textAlign: 'center',
                                marginBottom: 14,
                                outline: 'none',
                            }}
                        />
                        {activationError && (
                            <p style={{ color: '#fca5a5', fontSize: 13, margin: '0 0 14px' }}>
                                {activationError}
                            </p>
                        )}
                        <button
                            type="submit"
                            disabled={activating}
                            style={{
                                width: '100%',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 10,
                                padding: '13px 16px',
                                borderRadius: 12,
                                border: 'none',
                                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                                color: '#fff',
                                fontWeight: 700,
                                fontSize: 15,
                                cursor: activating ? 'default' : 'pointer',
                                opacity: activating ? 0.75 : 1,
                                boxShadow: '0 10px 24px -10px rgba(37,99,235,.7)',
                            }}
                        >
                            {activating && <span className="kiosk-spinner" />}
                            {activating ? 'Activating…' : 'Activate'}
                        </button>
                    </form>
                )}

                {phase === 'ready' && (
                    <>
                        {result && theme ? (
                            <div
                                key={result.title + result.kind}
                                className="kiosk-fade-in"
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    width: 'min(500px, 100%)',
                                    padding: '52px 44px 44px',
                                    borderRadius: 32,
                                    background: theme.bg,
                                    backdropFilter: 'blur(12px)',
                                    border: `1px solid ${theme.border}`,
                                    boxShadow: `0 0 0 1px rgba(255,255,255,.03), 0 30px 70px -25px ${theme.glow}`,
                                }}
                            >
                                {/* Avatar: photo when known, initials when not, a
                                    small status badge overlapping its edge either
                                    way — the photo/name is the focal point, the
                                    icon is a secondary confirmation, not the star. */}
                                <div style={{ position: 'relative', width: 128, height: 128, marginBottom: 28 }}>
                                    <div
                                        aria-hidden="true"
                                        style={{
                                            position: 'absolute',
                                            inset: -14,
                                            borderRadius: '50%',
                                            background: `radial-gradient(circle, ${theme.glow} 0%, transparent 70%)`,
                                        }}
                                    />
                                    {result.kind === 'checking' ? (
                                        <div
                                            style={{
                                                position: 'relative',
                                                width: '100%',
                                                height: '100%',
                                                borderRadius: '50%',
                                                display: 'grid',
                                                placeItems: 'center',
                                                background: 'rgba(255,255,255,.06)',
                                                border: `2px solid ${theme.border}`,
                                            }}
                                        >
                                            <span className="kiosk-spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
                                        </div>
                                    ) : result.photoUrl ? (
                                        <img
                                            src={result.photoUrl}
                                            alt=""
                                            style={{
                                                position: 'relative',
                                                width: '100%',
                                                height: '100%',
                                                borderRadius: '50%',
                                                objectFit: 'cover',
                                                display: 'block',
                                                border: `3px solid ${theme.border}`,
                                                boxShadow: '0 8px 24px -8px rgba(0,0,0,.5)',
                                            }}
                                        />
                                    ) : (
                                        <div
                                            style={{
                                                position: 'relative',
                                                width: '100%',
                                                height: '100%',
                                                borderRadius: '50%',
                                                display: 'grid',
                                                placeItems: 'center',
                                                background: 'rgba(255,255,255,.06)',
                                                border: `3px solid ${theme.border}`,
                                                color: theme.fg,
                                                fontSize: 40,
                                                fontWeight: 800,
                                                letterSpacing: '.02em',
                                            }}
                                        >
                                            {result.kind === 'error' ? <BadgeAlertIcon size={44} /> : getInitials(result.title)}
                                        </div>
                                    )}

                                    {result.kind !== 'checking' && (
                                        <div
                                            aria-hidden="true"
                                            style={{
                                                position: 'absolute',
                                                bottom: -2,
                                                right: -2,
                                                width: 40,
                                                height: 40,
                                                borderRadius: '50%',
                                                display: 'grid',
                                                placeItems: 'center',
                                                background: '#0b1220',
                                                border: `3px solid ${theme.border}`,
                                                color: theme.fg,
                                                boxShadow: '0 4px 14px -4px rgba(0,0,0,.6)',
                                            }}
                                        >
                                            {result.kind === 'success' && <CheckIcon size={18} />}
                                            {result.kind === 'duplicate' && <ClockIcon size={18} />}
                                            {result.kind === 'error' && <BadgeAlertIcon size={18} />}
                                        </div>
                                    )}
                                </div>

                                <h2
                                    style={{
                                        margin: '0 0 14px',
                                        maxWidth: '100%',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        fontSize: 30,
                                        fontWeight: 800,
                                        letterSpacing: '-.01em',
                                        lineHeight: 1.2,
                                    }}
                                >
                                    {result.title}
                                </h2>
                                {result.subtitle && (
                                    <p
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            margin: 0,
                                            padding: '8px 20px',
                                            maxWidth: '100%',
                                            borderRadius: 999,
                                            background: 'rgba(255,255,255,.07)',
                                            color: theme.fg,
                                            fontSize: 14.5,
                                            fontWeight: 700,
                                            lineHeight: 1.4,
                                            textWrap: 'balance',
                                        }}
                                    >
                                        {result.subtitle}
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div
                                className="kiosk-fade-in"
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    width: 'min(500px, 100%)',
                                    padding: '56px 44px',
                                    borderRadius: 32,
                                    background: 'rgba(255,255,255,.035)',
                                    backdropFilter: 'blur(12px)',
                                    border: '1px solid rgba(255,255,255,.1)',
                                    boxShadow: '0 30px 70px -30px rgba(0,0,0,.6)',
                                }}
                            >
                                <div
                                    style={{
                                        position: 'relative',
                                        width: 148,
                                        height: 148,
                                        marginBottom: 32,
                                        display: 'grid',
                                        placeItems: 'center',
                                        borderRadius: '50%',
                                        background: 'linear-gradient(135deg, rgba(37,99,235,.28), rgba(29,78,216,.08))',
                                        border: '1px solid rgba(96,165,250,.4)',
                                        color: '#bfdbfe',
                                        boxShadow: '0 0 60px -12px rgba(59,130,246,.45)',
                                    }}
                                >
                                    <span className="kiosk-pulse-ring" style={{ color: 'rgba(96,165,250,.6)' }} />
                                    <span className="kiosk-pulse-ring kiosk-pulse-ring--delay" style={{ color: 'rgba(96,165,250,.6)' }} />
                                    <SmartphoneNfcIcon size={60} />
                                </div>
                                <h1
                                    style={{
                                        margin: 0,
                                        fontSize: 34,
                                        fontWeight: 800,
                                        letterSpacing: '-.015em',
                                        backgroundImage: 'linear-gradient(135deg, #ffffff, #bcd2ff)',
                                        WebkitBackgroundClip: 'text',
                                        backgroundClip: 'text',
                                        color: 'transparent',
                                    }}
                                >
                                    Tap your card
                                </h1>
                                <p style={{ margin: '14px 0 0', fontSize: 14.5, color: 'rgba(255,255,255,.5)', lineHeight: 1.5 }}>
                                    Hold your ID near the reader to check in or out
                                </p>
                            </div>
                        )}

                        {/* Always-focused capture field for a USB-HID RFID reader,
                            which just types the card UID then Enter into whatever
                            currently has keyboard focus — same mechanism proven in
                            adaptivelibrary-web's kiosk. */}
                        <input
                            ref={inputRef}
                            type="text"
                            onKeyDown={handleTapSubmit}
                            onBlur={handleInputBlur}
                            autoFocus
                            autoComplete="off"
                            aria-label="Card reader input"
                            style={{
                                position: 'absolute',
                                opacity: 0,
                                width: 1,
                                height: 1,
                                pointerEvents: 'none',
                            }}
                        />
                    </>
                )}

                {/* Hidden admin exit — reached only via 5 fast taps on the
                    station badge (handleBadgeTap). Typing the station name
                    is friction against an accidental deactivation, not a
                    password: this screen has no staff session to protect,
                    so the real security boundary is physical access to the
                    device. Confirming clears the local credential and drops
                    back to the activation screen. */}
                {exitDialogOpen && (
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-label="Deactivate this kiosk"
                        style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 200,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(0,0,0,.7)',
                            backdropFilter: 'blur(4px)',
                            padding: 24,
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') setExitDialogOpen(false);
                        }}
                    >
                        <div
                            className="kiosk-fade-in"
                            style={{
                                width: 'min(420px, 100%)',
                                background: '#0c1326',
                                border: '1px solid rgba(255,255,255,.14)',
                                borderRadius: 20,
                                padding: '28px 26px',
                                boxShadow: '0 24px 60px -20px rgba(0,0,0,.6)',
                                textAlign: 'left',
                            }}
                        >
                            <h2 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 800 }}>
                                Deactivate this kiosk?
                            </h2>
                            <p style={{ margin: '0 0 16px', fontSize: 13, opacity: 0.65, lineHeight: 1.5 }}>
                                This clears the station's credential and returns to the activation
                                screen. Type <strong>{stationName}</strong> to confirm.
                            </p>
                            <input
                                type="text"
                                value={exitConfirmText}
                                onChange={(e) => setExitConfirmText(e.target.value)}
                                autoFocus
                                placeholder={stationName}
                                style={{
                                    width: '100%',
                                    boxSizing: 'border-box',
                                    padding: '11px 14px',
                                    borderRadius: 10,
                                    border: '1px solid rgba(255,255,255,.18)',
                                    background: 'rgba(255,255,255,.06)',
                                    color: '#f8fafc',
                                    fontSize: 14,
                                    marginBottom: 16,
                                    outline: 'none',
                                }}
                            />
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button
                                    type="button"
                                    onClick={() => setExitDialogOpen(false)}
                                    style={{
                                        flex: 1,
                                        padding: '10px 14px',
                                        borderRadius: 10,
                                        border: '1px solid rgba(255,255,255,.14)',
                                        background: 'rgba(255,255,255,.05)',
                                        color: '#f8fafc',
                                        fontWeight: 700,
                                        fontSize: 13.5,
                                        cursor: 'pointer',
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={confirmDeactivate}
                                    disabled={exitConfirmText.trim() !== stationName}
                                    style={{
                                        flex: 1,
                                        padding: '10px 14px',
                                        borderRadius: 10,
                                        border: 'none',
                                        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                        color: '#fff',
                                        fontWeight: 700,
                                        fontSize: 13.5,
                                        cursor: exitConfirmText.trim() === stationName ? 'pointer' : 'default',
                                        opacity: exitConfirmText.trim() === stationName ? 1 : 0.5,
                                    }}
                                >
                                    Deactivate
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

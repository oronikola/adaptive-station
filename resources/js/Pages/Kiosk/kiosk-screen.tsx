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
    type TapEventType,
} from '@/kiosk/db';
import { activate, DeviceUnauthorizedError } from '@/kiosk/api';
import { syncMasterData, flushPendingEvents, heartbeat } from '@/kiosk/sync';

const DOUBLE_TAP_GRACE_MS = 10_000;
const RESULT_CLEAR_MS = 3_000;
const MASTER_DATA_SYNC_MS = 15_000;
const EVENT_FLUSH_MS = 7_000;
const HEARTBEAT_MS = 60_000;

type Phase = 'booting' | 'activation' | 'ready';

interface TapResult {
    kind: 'success' | 'duplicate' | 'error';
    title: string;
    subtitle?: string;
    photoUrl?: string | null;
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

function ContactlessIcon({ size = 56 }: { size?: number }) {
    return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
            <rect x="2.5" y="5.5" width="13" height="14" rx="2.6" />
            <circle cx="9" cy="12.5" r="1.6" fill="currentColor" stroke="none" />
            <path d="M16.8 8.8a5.2 5.2 0 0 1 0 7.4" strokeWidth={1.9} />
            <path d="M19.4 6.2a9 9 0 0 1 0 13" strokeWidth={1.9} opacity={0.55} />
        </svg>
    );
}

function CheckIcon({ size = 30 }: { size?: number }) {
    return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12.5 9.5 18 20 6" />
        </svg>
    );
}

function ClockIcon({ size = 30 }: { size?: number }) {
    return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7.5V12l3.2 2" />
        </svg>
    );
}

function ErrorIcon({ size = 30 }: { size?: number }) {
    return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 9v4.5" />
            <path d="M12 17h.01" />
            <path d="M10.3 3.9 2.7 17.3A1.8 1.8 0 0 0 4.3 20h15.4a1.8 1.8 0 0 0 1.6-2.7L13.7 3.9a1.8 1.8 0 0 0-3.4 0Z" />
        </svg>
    );
}

const RESULT_THEME = {
    success: { fg: '#6ee7b7', bg: 'rgba(16,185,129,.14)', border: 'rgba(16,185,129,.4)', glow: 'rgba(16,185,129,.35)' },
    duplicate: { fg: '#fcd34d', bg: 'rgba(245,158,11,.14)', border: 'rgba(245,158,11,.4)', glow: 'rgba(245,158,11,.3)' },
    error: { fg: '#fca5a5', bg: 'rgba(239,68,68,.14)', border: 'rgba(239,68,68,.4)', glow: 'rgba(239,68,68,.3)' },
} as const;

export default function KioskScreen() {
    const [phase, setPhase] = useState<Phase>('booting');
    const [stationName, setStationName] = useState<string>('');

    const [activationCode, setActivationCode] = useState('');
    const [activationError, setActivationError] = useState<string | null>(null);
    const [activating, setActivating] = useState(false);

    const [result, setResult] = useState<TapResult | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const resultTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // A live clock is a small, familiar touch on a physical kiosk display —
    // purely decorative, no logic depends on it.
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const clockInterval = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(clockInterval);
    }, []);

    // ── Boot: is this device already activated? ────────────────────────
    useEffect(() => {
        getMeta().then((meta) => {
            if (meta.credentialToken) {
                setStationName(meta.stationName ?? '');
                setPhase('ready');
            } else {
                setPhase('activation');
            }
        });
    }, []);

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
    useEffect(() => {
        if (phase !== 'ready') return;
        const input = inputRef.current;
        input?.focus();

        function refocus() {
            // A short delay lets a genuine click elsewhere (there is none
            // today, but keeps this safe if a button is ever added) win.
            setTimeout(() => inputRef.current?.focus(), 50);
        }

        window.addEventListener('click', refocus);
        window.addEventListener('focus', refocus);
        return () => {
            window.removeEventListener('click', refocus);
            window.removeEventListener('focus', refocus);
        };
    }, [phase]);

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
            setActivationError(error instanceof Error ? error.message : 'Activation failed.');
        } finally {
            setActivating(false);
        }
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
            speak('Card not recognized.');
            showResult({ kind: 'error', title: 'Card not recognized' });
            return;
        }

        const person = await getPerson(card.person_id);
        if (!person || !person.is_active) {
            speak('No active record for this card.');
            showResult({ kind: 'error', title: 'No active record for this card' });
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
            id: crypto.randomUUID(),
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
            <Head title="Kiosk" />
            <style>{`
                html, body, #app { height: 100%; margin: 0; background: #060a14; }

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
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 9,
                                fontWeight: 700,
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
                    <ContactlessIcon size={13} />
                    Adaptive Station
                </div>

                {phase === 'booting' && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                        <span className="kiosk-spinner" />
                        <p style={{ opacity: 0.5, fontSize: 13.5 }}>Starting kiosk…</p>
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
                            <ContactlessIcon size={28} />
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
                            placeholder="Activation code"
                            style={{
                                width: '100%',
                                boxSizing: 'border-box',
                                padding: '14px 16px',
                                borderRadius: 12,
                                border: '1px solid rgba(255,255,255,.18)',
                                background: 'rgba(255,255,255,.06)',
                                color: '#f8fafc',
                                fontSize: 16,
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
                                    width: 'min(480px, 100%)',
                                    padding: '40px 36px',
                                    borderRadius: 28,
                                    background: theme.bg,
                                    border: `1px solid ${theme.border}`,
                                    boxShadow: `0 0 0 1px rgba(255,255,255,.03), 0 30px 70px -25px ${theme.glow}`,
                                }}
                            >
                                <div
                                    style={{
                                        width: 68,
                                        height: 68,
                                        margin: '0 auto 20px',
                                        borderRadius: '50%',
                                        display: 'grid',
                                        placeItems: 'center',
                                        color: theme.fg,
                                        background: 'rgba(255,255,255,.06)',
                                        border: `1px solid ${theme.border}`,
                                    }}
                                >
                                    {result.kind === 'success' && <CheckIcon />}
                                    {result.kind === 'duplicate' && <ClockIcon />}
                                    {result.kind === 'error' && <ErrorIcon />}
                                </div>

                                {result.photoUrl && (
                                    <img
                                        src={result.photoUrl}
                                        alt=""
                                        style={{
                                            width: 88,
                                            height: 88,
                                            borderRadius: '50%',
                                            objectFit: 'cover',
                                            margin: '0 auto 18px',
                                            display: 'block',
                                            border: `3px solid ${theme.border}`,
                                        }}
                                    />
                                )}
                                <h2 style={{ margin: '0 0 10px', fontSize: 30, fontWeight: 800, letterSpacing: '-.01em' }}>
                                    {result.title}
                                </h2>
                                {result.subtitle && (
                                    <p
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            margin: 0,
                                            padding: '6px 16px',
                                            borderRadius: 999,
                                            background: 'rgba(255,255,255,.07)',
                                            color: theme.fg,
                                            fontSize: 14.5,
                                            fontWeight: 700,
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
                                    width: 'min(480px, 100%)',
                                    padding: '52px 40px',
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
                                    <ContactlessIcon size={60} />
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
                                <p style={{ margin: '12px 0 0', fontSize: 14.5, color: 'rgba(255,255,255,.5)', lineHeight: 1.5 }}>
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
            </div>
        </>
    );
}

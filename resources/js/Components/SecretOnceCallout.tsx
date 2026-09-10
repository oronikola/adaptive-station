import { useState } from 'react';

/**
 * Displays a one-time secret (temporary password, activation code) flashed
 * into the session by the previous request. Never re-appears after the next
 * navigation, since the server never persists it beyond that one flash.
 * Masked by default with an eye toggle to reveal it — this only ever runs on
 * the platform/tenant-portal side, viewed by the admin who just created the
 * account, so revealing it is safe, but it shouldn't sit in plaintext on
 * screen (or in a screen-share) until they choose to look.
 */
export default function SecretOnceCallout({ label, value }: { label: string; value?: string | null }) {
    const [revealed, setRevealed] = useState(false);
    const [copied, setCopied] = useState(false);

    if (!value) {
        return null;
    }

    function handleCopy() {
        navigator.clipboard.writeText(value as string).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }

    return (
        <div className="mb-4 rounded-md border border-yellow-300 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/30">
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                {label} — shown only once, copy it now:
            </p>
            <div className="mt-2 flex items-center gap-2">
                <code className="block flex-1 break-all rounded bg-white px-3 py-2 text-sm text-gray-900 dark:bg-gray-900 dark:text-gray-100">
                    {revealed ? value : '•'.repeat(Math.min(value.length, 20))}
                </code>
                <button
                    type="button"
                    onClick={handleCopy}
                    aria-label={copied ? 'Copied' : `Copy ${label.toLowerCase()}`}
                    className="flex h-9 w-9 flex-none items-center justify-center rounded-md border border-yellow-300 bg-white text-yellow-800 transition hover:bg-yellow-100 dark:border-yellow-800 dark:bg-gray-900 dark:text-yellow-300 dark:hover:bg-gray-800"
                >
                    {copied ? (
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                    ) : (
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                    )}
                </button>
                <button
                    type="button"
                    onClick={() => setRevealed((current) => !current)}
                    aria-label={revealed ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
                    aria-pressed={revealed}
                    className="flex h-9 w-9 flex-none items-center justify-center rounded-md border border-yellow-300 bg-white text-yellow-800 transition hover:bg-yellow-100 dark:border-yellow-800 dark:bg-gray-900 dark:text-yellow-300 dark:hover:bg-gray-800"
                >
                    {revealed ? (
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                            <circle cx="12" cy="12" r="3" />
                        </svg>
                    ) : (
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 3l18 18" />
                            <path d="M10.6 5.1A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a15.3 15.3 0 0 1-4.2 4.6M6.3 6.3C3.4 8.2 2 12 2 12s3.5 7 10 7c1.4 0 2.6-.3 3.7-.8" />
                            <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
                        </svg>
                    )}
                </button>
            </div>
        </div>
    );
}

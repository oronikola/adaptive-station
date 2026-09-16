import { useEffect, useState } from 'react';
import Modal from '@/Components/Modal';

import { KeyIcon } from '@/Components/icons/key';
import { CopyIcon } from '@/Components/icons/copy';
import { CheckIcon } from '@/Components/icons/check';
import { BadgeAlertIcon } from '@/Components/icons/badge-alert';
import { XIcon } from '@/Components/icons/x';


interface SecretOnceCalloutProps {
    label: string;
    value?: string | null;
}

/**
 * Displays a one-time secret (temporary password, activation code) flashed
 * into the session by the previous request exclusively in a dedicated modal.
 * Does not render any inline content on the page itself.
 */
export default function SecretOnceCallout({ label, value }: SecretOnceCalloutProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (value) {
            setIsOpen(true);
        }
    }, [value]);

    if (!value) {
        return null;
    }

    const handleCopy = async () => {
        try {
            if (navigator?.clipboard?.writeText) {
                await navigator.clipboard.writeText(value);
            } else {
                const textArea = document.createElement('textarea');
                textArea.value = value;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch {
            // fallback
        }
    };

    return (
        <Modal show={isOpen} onClose={() => setIsOpen(false)} maxWidth="xl">
            <div className="pf-modal relative p-6 sm:p-8">
                {/* Header */}
                <div className="pf-modal-header mb-6">
                    <div className="pf-modal-hero">
                        <span className="pf-modal-hero-icon pf-modal-hero-icon--amber" aria-hidden="true">
                            <KeyIcon size={20} />
                        </span>
                        <div className="pf-modal-hero-text">
                            <div className="flex items-center gap-2.5 flex-wrap">
                                <h3 className="pf-modal-title text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                                    {label}
                                </h3>
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 dark:text-amber-300">
                                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                                    Shown only once
                                </span>
                            </div>
                            <p className="pf-modal-subtitle mt-1 text-xs text-slate-500 dark:text-slate-400">
                                Shown only once — copy it now before closing this window.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="pf-modal-close"
                        onClick={() => setIsOpen(false)}
                        aria-label="Close"
                    >
                        <XIcon size={20} />
                    </button>
                </div>

                {/* Code Container */}
                <div className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-[#071c44] p-4 text-white shadow-xl sm:p-5">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3 text-[11px] font-semibold text-slate-400">
                        <span className="inline-flex items-center gap-2 uppercase tracking-wider text-slate-300">
                            <span className="h-2 w-2 rounded-full bg-emerald-400" />
                            Secret Token ({value.length} characters)
                        </span>
                        <span className="text-[10px] text-slate-400">Click code to copy</span>
                    </div>

                    <div className="relative mt-3.5">
                        <code
                            onClick={handleCopy}
                            title="Click to copy to clipboard"
                            className="block cursor-pointer select-all font-mono text-sm sm:text-base font-semibold leading-relaxed tracking-wider text-emerald-400 break-all transition-colors duration-150 hover:text-emerald-300 focus:outline-none"
                        >
                            {value}
                        </code>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-xs">
                        <span className="text-[11px] text-slate-400">
                            {copied ? (
                                <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-400">
                                    <CheckIcon size={14} />
                                    Copied to clipboard!
                                </span>
                            ) : (
                                'Click code or copy button below'
                            )}
                        </span>
                        <button
                            type="button"
                            onClick={handleCopy}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition duration-150 ${
                                copied
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
                            }`}
                        >
                            {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
                            <span>{copied ? 'Copied' : 'Copy'}</span>
                        </button>
                    </div>
                </div>

                {/* Security Notice */}
                <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200/80 bg-amber-50/70 p-3.5 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
                    <BadgeAlertIcon size={16} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
                    <div className="leading-relaxed">
                        <strong className="font-semibold block">Store in a secure place</strong>
                        <span>For security reasons, this token cannot be recovered or retrieved again after this session. Enter it on the station kiosk immediately.</span>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="mt-6 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
                    <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="tactile-press btn-glass-secondary inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white/90 px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                        <span className="relative z-10">Done, I&apos;ve saved this code</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleCopy}
                        className={`tactile-press inline-flex items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-200 ${
                            copied
                                ? 'bg-emerald-600 hover:bg-emerald-700'
                                : 'border border-white/15 bg-gradient-to-b from-[#5b7cee] via-[#3e66ea] to-[#2247cc] hover:brightness-[1.05]'
                        }`}
                    >
                        {copied ? (
                            <>
                                <CheckIcon size={16} />
                                <span>Copied to clipboard!</span>
                            </>
                        ) : (
                            <>
                                <CopyIcon size={16} />
                                <span>Copy {label}</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

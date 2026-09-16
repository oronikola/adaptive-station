import Modal from '@/Components/Modal';
import { BadgeAlertIcon } from '@/Components/icons/badge-alert';
import { CheckIcon } from '@/Components/icons/check';
import { CopyIcon } from '@/Components/icons/copy';
import { KeyIcon } from '@/Components/icons/key';
import { LoaderCircleIcon } from '@/Components/icons/loader-circle';
import { MonitorCheckIcon } from '@/Components/icons/monitor-check';
import { XIcon } from '@/Components/icons/x';
import { useToast } from '@/Components/toast/ToastProvider';
import { router } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useState } from 'react';

interface StationTarget {
    id: number | string;
    name: string;
    station_code: string;
    status: string;
    is_online?: boolean;
}

interface IssueActivationCodeModalProps {
    station: StationTarget | null;
    show: boolean;
    onClose: () => void;
    onCodeIssued?: (code: string) => void;
}

export default function IssueActivationCodeModal({
    station,
    show,
    onClose,
    onCodeIssued,
}: IssueActivationCodeModalProps) {
    const { showToast } = useToast();

    const [isGenerating, setIsGenerating] = useState(false);
    const [activationCode, setActivationCode] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Reset when modal opens/closes or station changes
    useEffect(() => {
        if (!show || !station) {
            setActivationCode(null);
            setCopied(false);
            setErrorMessage(null);
            setIsGenerating(false);
        }
    }, [show, station]);

    if (!station) {
        return null;
    }

    async function handleGenerateCode() {
        if (!station || isGenerating) return;

        setIsGenerating(true);
        setErrorMessage(null);

        try {
            const res = await axios.post(
                route('portal.stations.activation-code', station.id),
                {},
                { headers: { Accept: 'application/json' } },
            );

            const code = res.data?.activationCode;
            if (code) {
                setActivationCode(code);
                if (onCodeIssued) {
                    onCodeIssued(code);
                }
                showToast({
                    type: 'success',
                    message: 'Activation code issued.',
                    description: `New one-time pairing code generated for ${station.name}.`,
                });
            } else {
                throw new Error('No activation code returned.');
            }
        } catch (error: any) {
            const msg =
                error.response?.data?.message ||
                'Unable to generate activation code. Please try again.';
            setErrorMessage(msg);
            showToast({
                type: 'error',
                message: 'Failed to issue activation code.',
                description: msg,
            });
        } finally {
            setIsGenerating(false);
        }
    }

    function handleCopy() {
        if (!activationCode) return;
        navigator.clipboard.writeText(activationCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
        showToast({
            type: 'info',
            message: 'Copied to clipboard',
            description: 'Activation code copied successfully.',
        });
    }

    function handleClose() {
        const hadCode = Boolean(activationCode);
        onClose();
        if (hadCode) {
            router.reload({ only: ['stations'] });
        }
    }

    return (
        <Modal show={show} onClose={handleClose} maxWidth="lg">
            <div className="pf-modal relative p-6 sm:p-8">
                {/* Header */}
                <div className="pf-modal-header mb-6">
                    <div className="pf-modal-hero">
                        <span
                            className="pf-modal-hero-icon pf-modal-hero-icon--amber"
                            aria-hidden="true"
                        >
                            <KeyIcon size={22} />
                        </span>
                        <div className="pf-modal-hero-text">
                            <h3 className="pf-modal-title text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                                Issue Activation Code
                            </h3>
                            <p className="pf-modal-subtitle text-xs text-slate-500 dark:text-slate-400">
                                Pair and authenticate physical kiosk hardware with this station.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="pf-modal-close"
                        onClick={handleClose}
                        aria-label="Close"
                    >
                        <XIcon size={16} />
                    </button>
                </div>

                {/* Target Station Card */}
                <div className="mb-6 flex items-center justify-between rounded-2xl border border-slate-200/90 bg-slate-50/90 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-sm">
                            <MonitorCheckIcon size={20} />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                {station.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                                    {station.station_code}
                                </span>
                                <span className="text-slate-300 dark:text-slate-700">·</span>
                                <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                                    {station.status === 'pending_activation'
                                        ? 'Pending Activation'
                                        : station.status}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {errorMessage && (
                    <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                        {errorMessage}
                    </div>
                )}

                {!activationCode ? (
                    /* Initial State: Confirmation & Generate Action */
                    <div className="space-y-5">
                        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/60 p-4 text-xs leading-relaxed text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
                            <div className="flex gap-2.5">
                                <BadgeAlertIcon size={16} className="flex-shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                                <div>
                                    <p className="font-bold">Important Notice</p>
                                    <p className="mt-1 text-amber-800/90 dark:text-amber-300/90">
                                        Generating an activation code will invalidate any previously issued unconsumed code for this station. The code will be valid for 15 minutes and can only be used once.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                                What happens next:
                            </h5>
                            <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                                <li>A secure 6-character alphanumeric code will be generated.</li>
                                <li>Turn on your kiosk hardware and open the Adaptive Station app.</li>
                                <li>Type the activation code on the kiosk screen to link it to your school roster.</li>
                            </ol>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                type="button"
                                className="pf-btn pf-btn-secondary"
                                onClick={handleClose}
                                disabled={isGenerating}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleGenerateCode}
                                disabled={isGenerating}
                                className="pf-btn pf-btn-primary !bg-gradient-to-r !from-amber-600 !to-orange-600 hover:!from-amber-500 hover:!to-orange-500 !text-white !border-amber-500/40 shadow-lg shadow-amber-500/20"
                            >
                                {isGenerating ? (
                                    <>
                                        <LoaderCircleIcon size={16} className="animate-spin" />
                                        Generating Code...
                                    </>
                                ) : (
                                    <>
                                        <KeyIcon size={16} />
                                        Generate Activation Code
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Generated Code Display */
                    <div className="space-y-6">
                        <div className="text-center">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Code Active &amp; Ready for Entry
                            </span>
                            <h4 className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                Enter this code on the kiosk display:
                            </h4>
                        </div>

                        {/* Monospace Code Display Box */}
                        <div className="relative rounded-2xl border-2 border-amber-300/80 bg-gradient-to-b from-amber-50 to-orange-50/50 p-6 text-center shadow-inner dark:border-amber-700/60 dark:from-amber-950/40 dark:to-orange-950/20">
                            <div className="font-mono text-4xl sm:text-5xl font-black tracking-[0.25em] text-slate-950 dark:text-white select-all">
                                {activationCode}
                            </div>
                            <div className="mt-4 flex items-center justify-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleCopy}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-800 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                                >
                                    {copied ? (
                                        <>
                                            <CheckIcon size={16} className="text-emerald-600 dark:text-emerald-400" />
                                            <span className="text-emerald-700 dark:text-emerald-400">Copied to Clipboard!</span>
                                        </>
                                    ) : (
                                        <>
                                            <CopyIcon size={16} className="text-slate-500" />
                                            <span>Copy Code</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Secret Notice */}
                        <div className="rounded-xl border border-slate-200/80 bg-slate-100/70 p-3.5 text-center text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
                            <span className="font-semibold text-slate-900 dark:text-slate-200">
                                Shown once:
                            </span>{' '}
                            This activation code cannot be recovered after this modal is closed. If closed without activating, a new code must be issued.
                        </div>

                        {/* Setup Instructions */}
                        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                                On-device activation steps:
                            </h5>
                            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                                <li className="flex items-start gap-2">
                                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                                        1
                                    </span>
                                    <span>Open the Adaptive Station setup screen on your hardware kiosk.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                                        2
                                    </span>
                                    <span>Type in the 6-character code above and confirm pairing.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                                        3
                                    </span>
                                    <span>The station will exchange cryptographic keys and activate immediately.</span>
                                </li>
                            </ul>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                type="button"
                                className="pf-btn pf-btn-secondary"
                                onClick={() => {
                                    setActivationCode(null);
                                    handleGenerateCode();
                                }}
                                disabled={isGenerating}
                            >
                                Re-issue Code
                            </button>
                            <button
                                type="button"
                                className="pf-btn pf-btn-primary"
                                onClick={handleClose}
                            >
                                Done
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}

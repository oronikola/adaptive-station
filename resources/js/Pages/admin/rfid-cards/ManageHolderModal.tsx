import InputError from '@/Components/InputError';
import Modal from '@/Components/Modal';
import { useToast } from '@/Components/toast/ToastProvider';
import { Link } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useState } from 'react';
import type { Person, RfidCard } from '@/types';

import { GraduationCapIcon } from '@/Components/icons/graduation-cap';
import { UsersIcon } from '@/Components/icons/users';
import { WifiIcon } from '@/Components/icons/wifi';
import { CheckIcon } from '@/Components/icons/check';
import { CopyIcon } from '@/Components/icons/copy';
import { CalendarDaysIcon } from '@/Components/icons/calendar-days';
import { CreditCardIcon } from '@/Components/icons/credit-card';
import { UserIcon } from '@/Components/icons/user';
import { ExternalLinkIcon } from '@/Components/icons/external-link';
import { XIcon } from '@/Components/icons/x';
interface RfidCardWithPerson extends RfidCard {
    card_uid: string;
    assigned_at: string;
    person?: Person;
}

interface ManageHolderModalProps {
    card: RfidCardWithPerson | null;
    show: boolean;
    onClose: () => void;
    onCardUpdated?: () => void;
}

type TabKey = 'card_actions' | 'holder_profile';

export default function ManageHolderModal({
    card,
    show,
    onClose,
    onCardUpdated,
}: ManageHolderModalProps) {
    const { showToast } = useToast();

    const [activeTab, setActiveTab] = useState<TabKey>('card_actions');
    const [currentCard, setCurrentCard] = useState<RfidCardWithPerson | null>(card);
    const [currentPerson, setCurrentPerson] = useState<Person | null>(card?.person ?? null);

    // Replace Card Form State
    const [newCardUid, setNewCardUid] = useState('');
    const [replaceError, setReplaceError] = useState<string | null>(null);
    const [isReplacing, setIsReplacing] = useState(false);

    // Card Deactivation State
    const [isDeactivatingCard, setIsDeactivatingCard] = useState(false);

    // Holder Profile Form State
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [gradeLevel, setGradeLevel] = useState('');
    const [section, setSection] = useState('');
    const [externalId, setExternalId] = useState('');
    const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isTogglingPersonStatus, setIsTogglingPersonStatus] = useState(false);

    // Copy UID state
    const [copiedUid, setCopiedUid] = useState(false);

    useEffect(() => {
        if (!show || !card) {
            setActiveTab('card_actions');
            setNewCardUid('');
            setReplaceError(null);
            setProfileErrors({});
            setCopiedUid(false);
            return;
        }

        setCurrentCard(card);
        setCurrentPerson(card.person ?? null);
        setNewCardUid('');
        setReplaceError(null);
        setProfileErrors({});

        if (card.person) {
            setFirstName(card.person.first_name || '');
            setLastName(card.person.last_name || '');
            setGradeLevel(card.person.grade_level || '');
            setSection(card.person.section || '');
            setExternalId(card.person.external_id || '');
        }
    }, [show, card]);

    function handleCopyUid() {
        if (!currentCard?.card_uid) return;
        navigator.clipboard.writeText(currentCard.card_uid);
        setCopiedUid(true);
        setTimeout(() => setCopiedUid(false), 2000);
    }

    async function handleReplaceCard(e: React.FormEvent) {
        e.preventDefault();
        if (!currentCard) return;

        const trimmed = newCardUid.trim();
        if (!trimmed) {
            setReplaceError('Please enter a new card UID.');
            return;
        }

        setIsReplacing(true);
        setReplaceError(null);

        try {
            const response = await axios.post(
                route('portal.rfid-cards.replace', currentCard.id),
                { card_uid: trimmed },
                { headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' } },
            );

            showToast({
                type: 'success',
                message: 'Card replaced successfully.',
                description: `New card UID ${trimmed.toUpperCase()} has been issued.`,
            });

            if (response.data?.card) {
                setCurrentCard(response.data.card);
            }
            setNewCardUid('');
            onCardUpdated?.();
        } catch (error: any) {
            const msg =
                error.response?.data?.errors?.card_uid?.[0] ||
                error.response?.data?.message ||
                'Could not replace the card. Please verify the UID and try again.';
            setReplaceError(msg);
            showToast({
                type: 'error',
                message: 'Failed to replace card.',
                description: msg,
            });
        } finally {
            setIsReplacing(false);
        }
    }

    async function handleDeactivateCard() {
        if (!currentCard) return;

        setIsDeactivatingCard(true);

        try {
            const response = await axios.patch(
                route('portal.rfid-cards.deactivate', currentCard.id),
                {},
                { headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' } },
            );

            showToast({
                type: 'success',
                message: 'Card deactivated.',
                description: `Card ${currentCard.card_uid} can no longer be used for station access.`,
            });

            if (response.data?.card) {
                setCurrentCard(response.data.card);
            } else {
                setCurrentCard((prev) => (prev ? { ...prev, is_active: false } : null));
            }
            onCardUpdated?.();
        } catch (error: any) {
            showToast({
                type: 'error',
                message: 'Could not deactivate card.',
                description: error.response?.data?.message || 'An error occurred.',
            });
        } finally {
            setIsDeactivatingCard(false);
        }
    }

    async function handleSaveProfile(e: React.FormEvent) {
        e.preventDefault();
        if (!currentPerson) return;

        setIsSavingProfile(true);
        setProfileErrors({});

        try {
            const payload: Record<string, any> = {
                person_type: currentPerson.person_type,
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                grade_level: gradeLevel.trim() || null,
                section: section.trim() || null,
                external_id: externalId.trim() || null,
            };

            const response = await axios.put(
                route('portal.people.update', currentPerson.id),
                payload,
                { headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' } },
            );

            showToast({
                type: 'success',
                message: 'Holder details updated.',
                description: 'Changes to personal records have been saved.',
            });

            if (response.data?.person) {
                setCurrentPerson(response.data.person);
                setCurrentCard((prev) =>
                    prev ? { ...prev, person: response.data.person } : null,
                );
            }
            onCardUpdated?.();
        } catch (error: any) {
            if (error.response?.data?.errors) {
                const apiErrors: Record<string, string> = {};
                for (const [k, v] of Object.entries(error.response.data.errors)) {
                    if (Array.isArray(v) && v.length > 0) {
                        apiErrors[k] = v[0] as string;
                    }
                }
                setProfileErrors(apiErrors);
            }
            showToast({
                type: 'error',
                message: 'Could not update holder details.',
                description: error.response?.data?.message || 'Check the form fields.',
            });
        } finally {
            setIsSavingProfile(false);
        }
    }

    async function handleTogglePersonStatus() {
        if (!currentPerson) return;

        setIsTogglingPersonStatus(true);
        const willDeactivate = currentPerson.is_active;
        const endpoint = willDeactivate
            ? route('portal.people.deactivate', currentPerson.id)
            : route('portal.people.reactivate', currentPerson.id);

        try {
            const response = await axios.patch(
                endpoint,
                {},
                { headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' } },
            );

            showToast({
                type: 'success',
                message: willDeactivate ? 'Holder deactivated.' : 'Holder reactivated.',
                description: `${currentPerson.display_name} is now ${willDeactivate ? 'inactive' : 'active'}.`,
            });

            if (response.data?.person) {
                setCurrentPerson(response.data.person);
                setCurrentCard((prev) =>
                    prev ? { ...prev, person: response.data.person } : null,
                );
            } else {
                setCurrentPerson((prev) =>
                    prev ? { ...prev, is_active: !willDeactivate } : null,
                );
            }
            onCardUpdated?.();
        } catch (error: any) {
            showToast({
                type: 'error',
                message: 'Action failed.',
                description: error.response?.data?.message || 'Could not update status.',
            });
        } finally {
            setIsTogglingPersonStatus(false);
        }
    }

    if (!currentCard) return null;

    const isStudent = currentPerson?.person_type === 'student';
    const initials = currentPerson
        ? (currentPerson.first_name?.[0] || '') + (currentPerson.last_name?.[0] || '')
        : '?';

    return (
        <Modal show={show} onClose={onClose} maxWidth="2xl">
            <div className="pf-modal relative p-6 sm:p-8">
                {/* Modal Header */}
                <div className="pf-modal-header mb-5">
                    <div className="pf-modal-hero">
                        <span
                            className={
                                'pf-modal-hero-icon ' +
                                (isStudent ? 'pf-modal-hero-icon--blue' : 'pf-modal-hero-icon--violet')
                            }
                            aria-hidden="true"
                        >
                            {isStudent ? (
                                <GraduationCapIcon size={20} />
                            ) : (
                                <UsersIcon size={20} />
                            )}
                        </span>
                        <div className="pf-modal-hero-text">
                            <h3 className="pf-modal-title text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                                Manage Card Holder
                            </h3>
                            <p className="pf-modal-subtitle text-xs text-slate-500 dark:text-slate-400">
                                View holder identity, perform credential replacements, and update records.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="pf-modal-close"
                        aria-label="Close modal"
                    >
                        <XIcon size={20} />
                    </button>
                </div>

                {/* Identity Cards Strip */}
                <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* Holder Info Card */}
                    <div className="rounded-2xl border border-slate-200/90 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Assigned Holder
                            </span>
                            {currentPerson && (
                                <span
                                    className={
                                        'pf-pill text-[10px] ' +
                                        (currentPerson.is_active
                                            ? 'pf-pill--active'
                                            : 'pf-pill--inactive')
                                    }
                                >
                                    {currentPerson.is_active ? 'Active' : 'Inactive'}
                                </span>
                            )}
                        </div>

                        {currentPerson ? (
                            <div className="mt-3 flex items-start gap-3">
                                <span
                                    className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm ${
                                        isStudent
                                            ? 'bg-gradient-to-br from-blue-500 to-indigo-600'
                                            : 'bg-gradient-to-br from-purple-500 to-indigo-600'
                                    }`}
                                >
                                    {initials}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="truncate text-sm font-bold text-slate-900 dark:text-white">
                                        {currentPerson.display_name}
                                    </div>
                                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                                        <span className="capitalize font-medium text-slate-700 dark:text-slate-300">
                                            {currentPerson.person_type}
                                        </span>
                                        {currentPerson.grade_level && (
                                            <>
                                                <span>·</span>
                                                <span>Gr. {currentPerson.grade_level}</span>
                                            </>
                                        )}
                                        {currentPerson.section && (
                                            <>
                                                <span>·</span>
                                                <span>Sec. {currentPerson.section}</span>
                                            </>
                                        )}
                                    </div>
                                    {currentPerson.external_id && (
                                        <div className="mt-1 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                                            ID: {currentPerson.external_id}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="mt-3 text-xs text-slate-400 italic">
                                No person record attached to this card.
                            </div>
                        )}
                    </div>

                    {/* Current Card Info Card */}
                    <div className="rounded-2xl border border-slate-200/90 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Physical RFID Card
                            </span>
                            <span
                                className={
                                    'pf-pill text-[10px] ' +
                                    (currentCard.is_active
                                        ? 'pf-pill--active'
                                        : 'pf-pill--inactive')
                                }
                            >
                                {currentCard.is_active ? 'Active' : 'Inactive'}
                            </span>
                        </div>

                        <div className="mt-3">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-blue-200/80 bg-blue-50 text-blue-600 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-400">
                                        <WifiIcon size={16} />
                                    </span>
                                    <span className="font-mono text-sm font-extrabold tracking-wider text-slate-900 dark:text-white">
                                        {currentCard.card_uid}
                                    </span>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleCopyUid}
                                    className="flex h-7 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-medium text-slate-600 hover:border-blue-300 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-blue-400 transition"
                                    title="Copy Card UID"
                                >
                                    {copiedUid ? (
                                        <>
                                            <CheckIcon size={14} className="text-emerald-600 dark:text-emerald-400" />
                                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">Copied</span>
                                        </>
                                    ) : (
                                        <>
                                            <CopyIcon size={14} />
                                            <span>Copy</span>
                                        </>
                                    )}
                                </button>
                            </div>

                            <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                <CalendarDaysIcon size={12} className="text-slate-400" />
                                <span>Assigned:</span>
                                <span className="font-semibold text-slate-700 dark:text-slate-200">
                                    {currentCard.assigned_at
                                        ? new Date(currentCard.assigned_at).toLocaleDateString(undefined, {
                                              year: 'numeric',
                                              month: 'short',
                                              day: 'numeric',
                                          })
                                        : '—'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sub Navigation Tabs */}
                <div className="mb-6 border-b border-slate-200 dark:border-slate-800">
                    <nav className="-mb-px flex gap-6" aria-label="Tabs">
                        <button
                            type="button"
                            onClick={() => setActiveTab('card_actions')}
                            className={`flex items-center gap-2 pb-3 text-xs font-semibold border-b-2 transition ${
                                activeTab === 'card_actions'
                                    ? 'border-[#234ef4] text-[#234ef4] dark:border-blue-400 dark:text-blue-400'
                                    : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                            }`}
                        >
                            <CreditCardIcon size={16} />
                            Card Operations
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('holder_profile')}
                            className={`flex items-center gap-2 pb-3 text-xs font-semibold border-b-2 transition ${
                                activeTab === 'holder_profile'
                                    ? 'border-[#234ef4] text-[#234ef4] dark:border-blue-400 dark:text-blue-400'
                                    : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                            }`}
                        >
                            <UserIcon size={16} />
                            Edit Holder Record
                        </button>
                    </nav>
                </div>

                {/* Tab 1: Card Operations */}
                {activeTab === 'card_actions' && (
                    <div className="space-y-6">
                        {/* Replace Card Form */}
                        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                Replace RFID Card
                            </h4>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                Issue a replacement card for this holder. The current card ({currentCard.card_uid}) will be safely deactivated while preserving all attendance history.
                            </p>

                            <form onSubmit={handleReplaceCard} className="mt-4 space-y-4">
                                <div>
                                    <label
                                        htmlFor="modal_new_card_uid"
                                        className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
                                    >
                                        New Card UID
                                    </label>
                                    <div className="mt-1.5 flex gap-3">
                                        <div className="relative flex-1">
                                            <input
                                                id="modal_new_card_uid"
                                                type="text"
                                                value={newCardUid}
                                                onChange={(e) => setNewCardUid(e.target.value.toUpperCase())}
                                                placeholder="e.g. CARD9922AB or 04B3C2D1"
                                                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 font-mono text-sm font-semibold tracking-wider text-slate-900 shadow-sm placeholder:font-sans placeholder:font-normal placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={isReplacing || !newCardUid.trim()}
                                            className="pf-btn pf-btn-primary flex-shrink-0"
                                        >
                                            {isReplacing ? 'Replacing...' : 'Replace Card'}
                                        </button>
                                    </div>
                                    <InputError message={replaceError || undefined} className="mt-1.5" />
                                </div>
                            </form>
                        </div>

                        {/* Card Status Actions */}
                        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                        Card Authorization
                                    </h4>
                                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                        {currentCard.is_active
                                            ? 'This card is currently active and authorized at turnstile gates.'
                                            : 'This card is currently deactivated and will be rejected at stations.'}
                                    </p>
                                </div>

                                {currentCard.is_active && (
                                    <button
                                        type="button"
                                        onClick={handleDeactivateCard}
                                        disabled={isDeactivatingCard}
                                        className="pf-btn pf-btn-danger flex-shrink-0 self-start sm:self-auto"
                                    >
                                        {isDeactivatingCard ? 'Deactivating...' : 'Deactivate Card'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab 2: Edit Holder Record */}
                {activeTab === 'holder_profile' && currentPerson && (
                    <div className="space-y-6">
                        <form onSubmit={handleSaveProfile} className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label
                                        htmlFor="modal_first_name"
                                        className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
                                    >
                                        First Name
                                    </label>
                                    <input
                                        id="modal_first_name"
                                        type="text"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                        required
                                    />
                                    <InputError message={profileErrors.first_name} className="mt-1.5" />
                                </div>

                                <div>
                                    <label
                                        htmlFor="modal_last_name"
                                        className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
                                    >
                                        Last Name
                                    </label>
                                    <input
                                        id="modal_last_name"
                                        type="text"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                        required
                                    />
                                    <InputError message={profileErrors.last_name} className="mt-1.5" />
                                </div>
                            </div>

                            {isStudent && (
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <label
                                            htmlFor="modal_grade_level"
                                            className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
                                        >
                                            Grade Level
                                        </label>
                                        <input
                                            id="modal_grade_level"
                                            type="text"
                                            value={gradeLevel}
                                            onChange={(e) => setGradeLevel(e.target.value)}
                                            placeholder="e.g. 10"
                                            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                        />
                                        <InputError message={profileErrors.grade_level} className="mt-1.5" />
                                    </div>

                                    <div>
                                        <label
                                            htmlFor="modal_section"
                                            className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
                                        >
                                            Section
                                        </label>
                                        <input
                                            id="modal_section"
                                            type="text"
                                            value={section}
                                            onChange={(e) => setSection(e.target.value)}
                                            placeholder="e.g. Diamond"
                                            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                        />
                                        <InputError message={profileErrors.section} className="mt-1.5" />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label
                                    htmlFor="modal_external_id"
                                    className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
                                >
                                    External / SIS ID
                                </label>
                                <input
                                    id="modal_external_id"
                                    type="text"
                                    value={externalId}
                                    onChange={(e) => setExternalId(e.target.value)}
                                    placeholder="e.g. STU-2024-0012"
                                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 font-mono text-sm font-medium text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                />
                                <InputError message={profileErrors.external_id} className="mt-1.5" />
                            </div>

                            <div className="flex justify-end pt-2">
                                <button
                                    type="submit"
                                    disabled={isSavingProfile}
                                    className="pf-btn pf-btn-primary"
                                >
                                    {isSavingProfile ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>

                        {/* Holder Status & Profile Link */}
                        <div className="border-t border-slate-100 pt-5 dark:border-slate-800">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                        Holder Account Status
                                    </h4>
                                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                        {currentPerson.is_active
                                            ? 'Person record is active and receiving attendance metrics.'
                                            : 'Person record is deactivated.'}
                                    </p>
                                </div>

                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={handleTogglePersonStatus}
                                        disabled={isTogglingPersonStatus}
                                        className={
                                            'pf-btn ' +
                                            (currentPerson.is_active
                                                ? 'pf-btn-danger'
                                                : 'pf-btn-secondary')
                                        }
                                    >
                                        {isTogglingPersonStatus
                                            ? 'Updating...'
                                            : currentPerson.is_active
                                            ? 'Deactivate Holder'
                                            : 'Reactivate Holder'}
                                    </button>

                                    <Link
                                        href={route('portal.people.edit', currentPerson.id)}
                                        className="pf-btn pf-btn-secondary"
                                    >
                                        Full Profile
                                        <ExternalLinkIcon size={14} />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}

import DangerButton from '@/Components/DangerButton';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import Modal from '@/Components/Modal';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import { useForm } from '@inertiajs/react';
import React, { useRef, useState } from 'react';

interface DeleteUserFormProps {
    className?: string;
}

export default function DeleteUserForm({ className = '' }: DeleteUserFormProps) {
    const [confirmingUserDeletion, setConfirmingUserDeletion] = useState(false);
    const passwordInput = useRef<HTMLInputElement>(null);

    const {
        data,
        setData,
        delete: destroy,
        processing,
        reset,
        errors,
        clearErrors,
    } = useForm({
        password: '',
    });

    const confirmUserDeletion = () => {
        setConfirmingUserDeletion(true);
    };

    const deleteUser = (e: React.FormEvent) => {
        e.preventDefault();

        destroy(route('profile.destroy'), {
            preserveScroll: true,
            onSuccess: () => closeModal(),
            onError: () => passwordInput.current?.focus(),
            onFinish: () => reset(),
        });
    };

    const closeModal = () => {
        setConfirmingUserDeletion(false);

        clearErrors();
        reset();
    };

    return (
        <section className={className}>
            <header className="flex items-start gap-3.5 border-b border-rose-100 pb-5 dark:border-rose-900/30">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 8v6M12 16h.01M10.8 4.2L4.2 15.6a1.5 1.5 0 0 0 1.3 2.2h13a1.5 1.5 0 0 0 1.3-2.2L13.2 4.2a1.5 1.5 0 0 0-2.4 0Z" />
                    </svg>
                </span>
                <div>
                    <h2 className="text-lg font-bold tracking-tight text-rose-950 dark:text-rose-200">
                        Delete Account
                    </h2>
                    <p className="mt-0.5 text-xs text-rose-600/80 dark:text-rose-400/80">
                        Permanently delete your account and all associated personal data from Adaptive Station.
                    </p>
                </div>
            </header>

            <div className="mt-5 space-y-4">
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                    Once your account is deleted, all active session tokens, permissions, and profile data will be permanently removed. This action cannot be reversed.
                </p>

                <div>
                    <DangerButton onClick={confirmUserDeletion} className="px-5 py-2 text-xs font-semibold">
                        Delete Account
                    </DangerButton>
                </div>
            </div>

            <Modal show={confirmingUserDeletion} onClose={closeModal}>
                <form onSubmit={deleteUser} className="pf-modal p-6 sm:p-8">
                    <div className="pf-modal-header mb-4">
                        <div className="pf-modal-hero">
                            <span className="pf-modal-hero-icon pf-modal-hero-icon--red" aria-hidden="true">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M12 8v6M12 16h.01M10.8 4.2L4.2 15.6a1.5 1.5 0 0 0 1.3 2.2h13a1.5 1.5 0 0 0 1.3-2.2L13.2 4.2a1.5 1.5 0 0 0-2.4 0Z" />
                                </svg>
                            </span>
                            <div className="pf-modal-hero-text">
                                <h2 className="pf-modal-title text-xl font-bold text-slate-900 dark:text-white">Delete Account?</h2>
                                <p className="pf-modal-subtitle text-xs text-slate-500 dark:text-slate-400">
                                    This action is irreversible. All of your credentials will be revoked.
                                </p>
                            </div>
                        </div>
                        <button type="button" className="pf-modal-close" onClick={closeModal} aria-label="Close">
                            <svg viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-5">
                        Please enter your password below to confirm that you wish to permanently delete your account.
                    </p>

                    <div>
                        <InputLabel
                            htmlFor="password"
                            value="Confirm Your Password"
                            className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                        />

                        <TextInput
                            id="password"
                            type="password"
                            name="password"
                            ref={passwordInput}
                            value={data.password}
                            onChange={(e) =>
                                setData('password', e.target.value)
                            }
                            className="mt-1.5 block w-full rounded-xl border-slate-200 text-sm shadow-sm focus:border-red-500 focus:ring-2 focus:ring-red-500/20 dark:border-slate-700 dark:bg-slate-900"
                            isFocused
                            placeholder="Enter password to confirm"
                        />

                        <InputError
                            message={errors.password}
                            className="mt-1.5"
                        />
                    </div>

                    <div className="mt-6 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
                        <SecondaryButton onClick={closeModal} className="px-4 py-2 text-xs font-semibold">
                            Cancel
                        </SecondaryButton>

                        <DangerButton disabled={processing} className="px-5 py-2 text-xs font-semibold">
                            {processing ? 'Deleting...' : 'Permanently Delete Account'}
                        </DangerButton>
                    </div>
                </form>
            </Modal>
        </section>
    );
}

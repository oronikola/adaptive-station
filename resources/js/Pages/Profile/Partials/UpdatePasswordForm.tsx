import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Transition } from '@headlessui/react';
import { useForm } from '@inertiajs/react';
import React, { useRef } from 'react';

import { LockIcon } from '@/Components/icons/lock';
import { CheckIcon } from '@/Components/icons/check';
interface UpdatePasswordFormProps {
    className?: string;
}

export default function UpdatePasswordForm({ className = '' }: UpdatePasswordFormProps) {
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);

    const {
        data,
        setData,
        errors,
        put,
        reset,
        processing,
        recentlySuccessful,
    } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const updatePassword = (e: React.FormEvent) => {
        e.preventDefault();

        put(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => reset(),
            onError: (errors) => {
                if (errors.password) {
                    reset('password', 'password_confirmation');
                    passwordInput.current?.focus();
                }

                if (errors.current_password) {
                    reset('current_password');
                    currentPasswordInput.current?.focus();
                }
            },
        });
    };

    return (
        <section className={className}>
            <header className="flex items-start gap-3.5 border-b border-slate-100 pb-5 dark:border-slate-800">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#234ef4] dark:bg-blue-950/40 dark:text-blue-300">
                    <LockIcon size={20} />
                </span>
                <div>
                    <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                        Update Password
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        Ensure your account is protected using a strong, unique passphrase with at least 8 characters.
                    </p>
                </div>
            </header>

            <form onSubmit={updatePassword} className="mt-6 space-y-5">
                <div>
                    <InputLabel
                        htmlFor="current_password"
                        value="Current Password"
                        className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                    />

                    <TextInput
                        id="current_password"
                        ref={currentPasswordInput}
                        value={data.current_password}
                        onChange={(e) =>
                            setData('current_password', e.target.value)
                        }
                        type="password"
                        className="mt-1.5 block w-full rounded-xl border-slate-200 text-sm shadow-sm transition duration-150 focus:border-[#234ef4] focus:ring-2 focus:ring-[#234ef4]/20 dark:border-slate-700 dark:bg-slate-900"
                        autoComplete="current-password"
                        placeholder="••••••••••••"
                    />

                    <InputError
                        message={errors.current_password}
                        className="mt-1.5"
                    />
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                        <InputLabel htmlFor="password" value="New Password" className="text-xs font-semibold text-slate-700 dark:text-slate-300" />

                        <TextInput
                            id="password"
                            ref={passwordInput}
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            type="password"
                            className="mt-1.5 block w-full rounded-xl border-slate-200 text-sm shadow-sm transition duration-150 focus:border-[#234ef4] focus:ring-2 focus:ring-[#234ef4]/20 dark:border-slate-700 dark:bg-slate-900"
                            autoComplete="new-password"
                            placeholder="••••••••••••"
                        />

                        <InputError message={errors.password} className="mt-1.5" />
                    </div>

                    <div>
                        <InputLabel
                            htmlFor="password_confirmation"
                            value="Confirm New Password"
                            className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                        />

                        <TextInput
                            id="password_confirmation"
                            value={data.password_confirmation}
                            onChange={(e) =>
                                setData('password_confirmation', e.target.value)
                            }
                            type="password"
                            className="mt-1.5 block w-full rounded-xl border-slate-200 text-sm shadow-sm transition duration-150 focus:border-[#234ef4] focus:ring-2 focus:ring-[#234ef4]/20 dark:border-slate-700 dark:bg-slate-900"
                            autoComplete="new-password"
                            placeholder="••••••••••••"
                        />

                        <InputError
                            message={errors.password_confirmation}
                            className="mt-1.5"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-4 pt-2">
                    <PrimaryButton disabled={processing} className="px-6 py-2.5 text-xs font-semibold">
                        {processing ? 'Updating...' : 'Update Password'}
                    </PrimaryButton>

                    <Transition
                        show={recentlySuccessful}
                        enter="transition ease-out duration-200"
                        enterFrom="opacity-0 translate-y-1"
                        enterTo="opacity-100 translate-y-0"
                        leave="transition ease-in duration-150"
                        leaveFrom="opacity-100 translate-y-0"
                        leaveTo="opacity-0 translate-y-1"
                    >
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                            <CheckIcon size={14} />
                            Password updated successfully
                        </span>
                    </Transition>
                </div>
            </form>
        </section>
    );
}

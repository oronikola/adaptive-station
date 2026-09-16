import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Transition } from '@headlessui/react';
import { Link, useForm, usePage } from '@inertiajs/react';
import React from 'react';

import { UserIcon } from '@/Components/icons/user';
import { CircleHelpIcon } from '@/Components/icons/circle-help';
import { CheckIcon } from '@/Components/icons/check';
interface UpdateProfileInformationProps {
    mustVerifyEmail: boolean;
    status?: string;
    className?: string;
}

export default function UpdateProfileInformation({
    mustVerifyEmail,
    status,
    className = '',
}: UpdateProfileInformationProps) {
    const { props } = usePage<import('@/types').PageProps>();
    const user = props.auth?.user;

    const { data, setData, patch, errors, processing, recentlySuccessful } =
        useForm({
            name: user?.name ?? '',
            email: user?.email ?? '',
        });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();

        patch(route('profile.update'));
    };

    return (
        <section className={className}>
            <header className="flex items-start gap-3.5 border-b border-slate-100 pb-5 dark:border-slate-800">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#234ef4] dark:bg-blue-950/40 dark:text-blue-300">
                    <UserIcon size={20} />
                </span>
                <div>
                    <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                        Personal Information
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        Update your display name and primary email address used for sign in and notifications.
                    </p>
                </div>
            </header>

            <form onSubmit={submit} className="mt-6 space-y-5">
                <div>
                    <InputLabel htmlFor="name" value="Full Name" className="text-xs font-semibold text-slate-700 dark:text-slate-300" />

                    <TextInput
                        id="name"
                        className="mt-1.5 block w-full rounded-xl border-slate-200 text-sm shadow-sm transition duration-150 focus:border-[#234ef4] focus:ring-2 focus:ring-[#234ef4]/20 dark:border-slate-700 dark:bg-slate-900"
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        required
                        isFocused
                        autoComplete="name"
                        placeholder="e.g. Jane Doe"
                    />

                    <InputError className="mt-1.5" message={errors.name} />
                </div>

                <div>
                    <InputLabel htmlFor="email" value="Email Address" className="text-xs font-semibold text-slate-700 dark:text-slate-300" />

                    <TextInput
                        id="email"
                        type="email"
                        className="mt-1.5 block w-full rounded-xl border-slate-200 text-sm shadow-sm transition duration-150 focus:border-[#234ef4] focus:ring-2 focus:ring-[#234ef4]/20 dark:border-slate-700 dark:bg-slate-900"
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                        required
                        autoComplete="username"
                        placeholder="user@example.com"
                    />

                    <InputError className="mt-1.5" message={errors.email} />
                </div>

                {mustVerifyEmail && user?.email_verified_at === null && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
                        <div className="flex items-start gap-2.5">
                            <CircleHelpIcon size={16} className="text-amber-600 dark:text-amber-400 mt-0.5" />
                            <div>
                                <p className="font-semibold">Your email address is unverified.</p>
                                <p className="mt-1">
                                    <Link
                                        href={route('verification.send')}
                                        method="post"
                                        as="button"
                                        className="font-semibold text-amber-800 underline hover:text-amber-950 dark:text-amber-300"
                                    >
                                        Click here to re-send the verification email.
                                    </Link>
                                </p>
                            </div>
                        </div>

                        {status === 'verification-link-sent' && (
                            <div className="mt-2.5 font-semibold text-emerald-700 dark:text-emerald-400">
                                A new verification link has been sent to your email address.
                            </div>
                        )}
                    </div>
                )}

                <div className="flex items-center gap-4 pt-2">
                    <PrimaryButton disabled={processing} className="px-6 py-2.5 text-xs font-semibold">
                        {processing ? 'Saving...' : 'Save Changes'}
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
                            Saved successfully
                        </span>
                    </Transition>
                </div>
            </form>
        </section>
    );
}

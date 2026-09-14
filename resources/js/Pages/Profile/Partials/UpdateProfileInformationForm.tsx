import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Transition } from '@headlessui/react';
import { Link, useForm, usePage } from '@inertiajs/react';
import React from 'react';

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
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="8" r="4" />
                        <path d="M5 20c0-4 3.5-7 7-7s7 3 7 7" />
                    </svg>
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
                            <svg className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
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
                            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                            </svg>
                            Saved successfully
                        </span>
                    </Transition>
                </div>
            </form>
        </section>
    );
}

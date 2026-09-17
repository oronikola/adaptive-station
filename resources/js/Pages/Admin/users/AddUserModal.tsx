import InputError from '@/Components/InputError';
import { CircleHelpIcon } from '@/Components/icons/circle-help';
import { MessageSquareIcon } from '@/Components/icons/message-square';
import { ShieldCheckIcon } from '@/Components/icons/shield-check';
import { UserIcon } from '@/Components/icons/user';
import { UserPlusIcon } from '@/Components/icons/user-plus';
import Modal, { ModalHero } from '@/Components/Modal';
import PremiumSelect from '@/Components/PremiumSelect';
import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';

interface AddUserModalProps {
    show: boolean;
    onClose: () => void;
}

export default function AddUserModal({ show, onClose }: AddUserModalProps) {
    const form = useForm({
        name: '',
        email: '',
        role: 'tenant_operator',
    });

    useEffect(() => {
        if (!show) {
            form.reset();
            form.clearErrors();
        }
    }, [show]);

    function submit(event: React.FormEvent<HTMLFormElement>): void {
        event.preventDefault();
        form.post(route('portal.users.store'), { preserveScroll: true });
    }

    const isAdministrator = form.data.role === 'tenant_admin';

    return (
        <Modal show={show} onClose={onClose} maxWidth="2xl">
            <div className="pf-modal">
                <ModalHero
                    tone={isAdministrator ? 'violet' : 'blue'}
                    title="Add Staff User"
                    subtitle="Provision secure portal access for an administrator or attendance operator."
                    onClose={onClose}
                >
                    <UserPlusIcon size={22} />
                </ModalHero>

                <form onSubmit={submit}>
                    <div className="space-y-5 px-6 py-5 sm:px-7">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/50">
                            <div className="flex gap-3">
                                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-slate-500 shadow-sm dark:bg-slate-800 dark:text-slate-300" aria-hidden="true">
                                    <CircleHelpIcon size={18} />
                                </span>
                                <div>
                                    <strong className="block text-sm text-slate-900 dark:text-slate-100">Temporary password</strong>
                                    <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">
                                        A secure password is generated after creation and shown once on the user directory. Share it directly with the new user.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label htmlFor="new_user_name" className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-600 dark:text-slate-300">
                                    <UserIcon size={14} aria-hidden="true" />
                                    Full name
                                </label>
                                <input
                                    id="new_user_name"
                                    type="text"
                                    value={form.data.name}
                                    onChange={(event) => form.setData('name', event.target.value)}
                                    placeholder="Eleanor Vance"
                                    autoComplete="name"
                                    autoFocus
                                    required
                                    className="pf-field w-full"
                                />
                                <InputError message={form.errors.name} className="mt-2" />
                            </div>

                            <div>
                                <label htmlFor="new_user_email" className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-600 dark:text-slate-300">
                                    <MessageSquareIcon size={14} aria-hidden="true" />
                                    Email address
                                </label>
                                <input
                                    id="new_user_email"
                                    type="email"
                                    value={form.data.email}
                                    onChange={(event) => form.setData('email', event.target.value)}
                                    placeholder="eleanor@school.edu"
                                    autoComplete="email"
                                    required
                                    className="pf-field w-full"
                                />
                                <InputError message={form.errors.email} className="mt-2" />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="new_user_role" className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-600 dark:text-slate-300">
                                <ShieldCheckIcon size={14} aria-hidden="true" />
                                Portal access role
                            </label>
                            <PremiumSelect
                                id="new_user_role"
                                value={form.data.role}
                                onChange={(role) => form.setData('role', role)}
                                options={[
                                    { value: 'tenant_operator', label: 'Operator — attendance and kiosk operations' },
                                    { value: 'tenant_admin', label: 'Administrator — full school management' },
                                ]}
                                invalid={Boolean(form.errors.role)}
                                disabled={form.processing}
                                className="w-full"
                            />
                            <InputError message={form.errors.role} className="mt-2" />

                            <div className="mt-3 flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs leading-5 text-slate-600 dark:bg-slate-900/50 dark:text-slate-400">
                                {isAdministrator ? <ShieldCheckIcon size={15} className="mt-0.5 shrink-0" aria-hidden="true" /> : <UserIcon size={15} className="mt-0.5 shrink-0" aria-hidden="true" />}
                                <span>
                                    {isAdministrator
                                        ? 'Administrators can manage staff access, school configuration, integrations, and operational records.'
                                        : 'Operators can manage attendance and station workflows without access to staff provisioning or school settings.'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="pf-modal-footer">
                        <button type="button" className="pf-btn pf-btn-secondary" onClick={onClose} disabled={form.processing}>Cancel</button>
                        <button type="submit" className={'pf-btn pf-btn-primary' + (form.processing ? ' pf-btn--loading' : '')} disabled={form.processing}>
                            <UserPlusIcon size={16} />
                            {form.processing ? 'Creating User…' : 'Create User'}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
}

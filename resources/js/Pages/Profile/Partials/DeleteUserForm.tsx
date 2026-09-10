import InputError from '@/Components/InputError';
import Modal from '@/Components/Modal';
import { useForm } from '@inertiajs/react';
import { useRef, useState } from 'react';

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
            <header>
                <h2>Delete Account</h2>
                <p>
                    Once your account is deleted, all of its resources and data
                    will be permanently deleted. Before deleting your account,
                    please download any data or information that you wish to retain.
                </p>
            </header>

            <button
                type="button"
                className="pf-btn pf-btn-danger profile-delete-button"
                style={{ marginTop: 12 }}
                onClick={confirmUserDeletion}
            >
                <svg viewBox="0 0 24 24">
                    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                </svg>
                Delete Account
            </button>

            <Modal show={confirmingUserDeletion} onClose={closeModal}>
                <form onSubmit={deleteUser} className="pf-modal">
                    <div className="pf-modal-header">
                        <div>
                            <h2 className="pf-modal-title">Delete your account?</h2>
                            <p className="pf-modal-subtitle">
                                This is permanent. All your data will be removed and cannot be recovered.
                                Enter your password to confirm.
                            </p>
                        </div>
                        <button
                            type="button"
                            className="pf-modal-close"
                            onClick={closeModal}
                            aria-label="Close"
                        >
                            <svg viewBox="0 0 24 24">
                                <path d="M18 6 6 18M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="pf-field">
                        <label htmlFor="delete-password">Password</label>
                        <input
                            id="delete-password"
                            type="password"
                            ref={passwordInput}
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            autoFocus
                            placeholder="Enter your current password"
                        />
                        <InputError message={errors.password} className="mt-2" />
                    </div>

                    <div className="pf-modal-footer">
                        <button
                            type="button"
                            className="pf-btn pf-btn-secondary"
                            onClick={closeModal}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className={'pf-btn pf-btn-danger' + (processing ? ' pf-btn--loading' : '')}
                            disabled={processing}
                        >
                            {processing ? 'Deleting…' : 'Delete Account'}
                        </button>
                    </div>
                </form>
            </Modal>
        </section>
    );
}

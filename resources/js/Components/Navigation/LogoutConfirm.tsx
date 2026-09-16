import { LogoutIcon } from '@/Components/icons/logout';
import Modal, { ModalHero } from '@/Components/Modal';
import { router } from '@inertiajs/react';
import { useState } from 'react';
import '../../../css/platform-dashboard.css';

interface LogoutConfirmProps {
    collapsed?: boolean;
    onShowTooltip?: (
        e: React.MouseEvent<HTMLElement>,
        text: string,
        variant?: 'default' | 'danger',
    ) => void;
    onHideTooltip?: () => void;
}

export default function LogoutConfirm({
    collapsed = false,
    onShowTooltip,
    onHideTooltip,
}: LogoutConfirmProps) {
    const [open, setOpen] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const closeModal = () => {
        if (isLoggingOut) {
            return;
        }

        setOpen(false);
    };

    const confirmLogout = () => {
        setIsLoggingOut(true);
        router.post(route('logout'));
    };

    return (
        <>
            <button
                type="button"
                className={
                    'pf-sidebar-footer-link pf-sidebar-footer-link--logout' +
                    (isLoggingOut ? ' is-logging-out' : '')
                }
                title={collapsed ? undefined : 'Log out'}
                onMouseEnter={(e) => onShowTooltip?.(e, 'Log Out', 'danger')}
                onMouseLeave={onHideTooltip}
                onClick={() => {
                    onHideTooltip?.();
                    setOpen(true);
                }}
            >
                <span className="pf-sidebar-footer-icon">
                    <LogoutIcon size={18} />
                </span>
                <span className="pf-sidebar-label">
                    {isLoggingOut ? 'Logging out...' : 'Log Out'}
                </span>
            </button>

            <Modal show={open} maxWidth="sm" closeable={!isLoggingOut} onClose={closeModal}>
                <div className="pf-modal">
                    <ModalHero
                        tone="red"
                        title="Log out of Adaptive Station?"
                        subtitle="You'll need to sign in again to continue."
                        onClose={closeModal}
                    >
                        <LogoutIcon size={22} />
                    </ModalHero>

                    <div className="pf-modal-footer">
                        <button
                            type="button"
                            className="pf-btn pf-btn-secondary"
                            onClick={closeModal}
                            disabled={isLoggingOut}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="pf-btn pf-btn-danger"
                            onClick={confirmLogout}
                            disabled={isLoggingOut}
                        >
                            {isLoggingOut ? 'Logging out…' : 'Log Out'}
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
}

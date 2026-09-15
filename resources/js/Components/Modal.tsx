import {
    Dialog,
    DialogPanel,
    Transition,
    TransitionChild,
} from '@headlessui/react';

export default function Modal({
    children,
    show = false,
    maxWidth = '2xl',
    closeable = true,
    onClose = () => {},
}: {
    children: React.ReactNode;
    show?: boolean;
    maxWidth?: string;
    closeable?: boolean;
    onClose?: () => void;
}) {
    const close = () => {
        if (closeable) {
            onClose();
        }
    };

    const maxWidthClass = {
        sm: 'sm:max-w-sm',
        md: 'sm:max-w-md',
        lg: 'sm:max-w-lg',
        xl: 'sm:max-w-xl',
        '2xl': 'sm:max-w-2xl',
        '3xl': 'sm:max-w-3xl',
        '4xl': 'sm:max-w-4xl',
    }[maxWidth] ?? 'sm:max-w-2xl';

    return (
        <Transition show={show} leave="duration-200">
            <Dialog
                as="div"
                id="modal"
                className="fixed inset-0 z-50 flex transform items-center overflow-y-auto px-4 py-6 transition-all sm:px-0"
                onClose={close}
            >
                <TransitionChild
                    enter="ease-[cubic-bezier(0.22,1,0.36,1)] duration-[320ms]"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="absolute inset-0 bg-[#0f172a]/45 backdrop-blur-[6px] dark:bg-[#020617]/60" />
                </TransitionChild>

                <TransitionChild
                    enter="ease-[cubic-bezier(0.22,1,0.36,1)] duration-[360ms]"
                    enterFrom="opacity-0 translate-y-3 scale-[0.97]"
                    enterTo="opacity-100 translate-y-0 scale-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100 translate-y-0 scale-100"
                    leaveTo="opacity-0 translate-y-4 scale-[0.97]"
                >
                    <DialogPanel
                        className={`mb-6 transform overflow-hidden rounded-[28px] border border-[#e2e8f0] bg-white shadow-[0_24px_64px_-16px_rgba(15,23,42,0.22),0_12px_32px_-8px_rgba(15,23,42,0.12)] ring-1 ring-black/[0.04] transition-all sm:mx-auto sm:w-full dark:border-gray-700 dark:bg-gray-800 ${maxWidthClass}`}
                    >
                        {children}
                    </DialogPanel>
                </TransitionChild>
            </Dialog>
        </Transition>
    );
}

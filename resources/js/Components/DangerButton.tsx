export default function DangerButton({
    className = '',
    disabled,
    children,
    ...props
}: { className?: string; disabled?: boolean; children?: React.ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            {...props}
            className={
                `pressable inline-flex items-center justify-center gap-2 rounded-full border border-transparent bg-gradient-to-b from-[#f43f5e] via-[#dc2626] to-[#991b1b] px-5 py-2.5 text-sm font-semibold text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.35),0_8px_20px_-8px_rgba(220,38,38,0.45),0_16px_36px_-20px_rgba(220,38,38,0.35)] transition-[transform,filter,box-shadow] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-px hover:brightness-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-55 ${
                    disabled && 'opacity-55'
                } ` + className
            }
            disabled={disabled}
        >
            {children}
        </button>
    );
}

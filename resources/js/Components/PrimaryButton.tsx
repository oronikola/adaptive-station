export default function PrimaryButton({
    className = '',
    disabled,
    children,
    ...props
}: { className?: string; disabled?: boolean; children?: React.ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            {...props}
            className={
                `pressable inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-gradient-to-b from-[#5b7cee] via-[#3e66ea] to-[#2247cc] px-5 py-2.5 text-sm font-semibold text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.45),0_10px_24px_-4px_rgba(35,78,225,0.42),0_4px_10px_-2px_rgba(35,78,225,0.25)] transition-[transform,filter,box-shadow,background-color,border-color] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-px hover:brightness-[1.05] hover:shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.5),0_14px_30px_-4px_rgba(35,78,225,0.52),0_6px_14px_-2px_rgba(35,78,225,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#234EF4] focus-visible:ring-offset-2 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-55 ${
                    disabled && 'opacity-55'
                } ` + className
            }
            disabled={disabled}
        >
            {children}
        </button>
    );
}

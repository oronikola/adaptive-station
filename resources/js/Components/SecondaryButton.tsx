export default function SecondaryButton({
    type = 'button',
    className = '',
    disabled,
    children,
    ...props
}: { type?: string; className?: string; disabled?: boolean; children?: React.ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            {...props}
            type={type}
            className={
                `tactile-press btn-glass-secondary relative isolate inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-white/80 px-5 py-2.5 text-sm font-semibold text-slate-800 shadow-sm backdrop-blur transition duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-0.5 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#234EF4] focus-visible:ring-offset-2 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-55 ${
                    disabled && 'opacity-55'
                } ` + className
            }
            disabled={disabled}
        >
            <span className="relative z-10 inline-flex items-center justify-center gap-2">
                {children}
            </span>
        </button>
    );
}

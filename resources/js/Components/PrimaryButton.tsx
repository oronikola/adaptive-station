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
                `inline-flex items-center rounded-md border border-transparent bg-[#334155] px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white transition duration-150 ease-in-out hover:bg-[#1e293b] focus:bg-[#1e293b] focus:outline-none focus:ring-2 focus:ring-[#475569] focus:ring-offset-2 active:bg-[#1e293b] dark:bg-[#475569] dark:hover:bg-[#334155] dark:focus:bg-[#334155] dark:focus:ring-offset-gray-800 dark:active:bg-[#334155] ${
                    disabled && 'opacity-25'
                } ` + className
            }
            disabled={disabled}
        >
            {children}
        </button>
    );
}

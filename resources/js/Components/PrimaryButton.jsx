export default function PrimaryButton({
    className = '',
    disabled,
    children,
    ...props
}) {
    return (
        <button
            {...props}
            className={
                `inline-flex items-center rounded-md border border-transparent bg-[#0b2a5b] px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white transition duration-150 ease-in-out hover:bg-[#071c44] focus:bg-[#071c44] focus:outline-none focus:ring-2 focus:ring-[#2863bd] focus:ring-offset-2 active:bg-[#071c44] dark:bg-[#1f3f77] dark:hover:bg-[#0b2a5b] dark:focus:bg-[#0b2a5b] dark:focus:ring-offset-gray-800 dark:active:bg-[#0b2a5b] ${
                    disabled && 'opacity-25'
                } ` + className
            }
            disabled={disabled}
        >
            {children}
        </button>
    );
}

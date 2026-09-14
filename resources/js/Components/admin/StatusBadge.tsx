const palettes: Record<string, string> = {
    green: 'bg-[#e3f6ea] text-[#188352] ring-1 ring-inset ring-[#c6ecd4] dark:bg-green-900/40 dark:text-green-300 dark:ring-green-800',
    gray: 'bg-[#f1f5fb] text-[#64748b] ring-1 ring-inset ring-[#e2e8f0] dark:bg-gray-700 dark:text-gray-300 dark:ring-gray-600',
    red: 'bg-[#fef2f2] text-[#dc2626] ring-1 ring-inset ring-[#fecaca] dark:bg-red-900/40 dark:text-red-300 dark:ring-red-800',
    yellow: 'bg-[#fefce8] text-[#a16207] ring-1 ring-inset ring-[#fde68a] dark:bg-yellow-900/40 dark:text-yellow-300 dark:ring-yellow-800',
};

export default function StatusBadge({ color = 'gray', children }: { color?: 'green' | 'gray' | 'red' | 'yellow'; children?: React.ReactNode }) {
    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${palettes[color] ?? palettes.gray}`}
        >
            {children}
        </span>
    );
}

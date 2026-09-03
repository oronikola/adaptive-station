const palettes = {
    green: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    gray: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    red: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
};

export default function StatusBadge({ color = 'gray', children }) {
    return (
        <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${palettes[color] ?? palettes.gray}`}
        >
            {children}
        </span>
    );
}

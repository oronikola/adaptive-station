function Table({ children }) {
    return (
        <div className="overflow-hidden overflow-x-auto rounded-lg bg-white shadow-sm dark:bg-gray-800">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                {children}
            </table>
        </div>
    );
}

function Th({ children, className = '' }) {
    return (
        <th
            scope="col"
            className={
                'px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 ' +
                className
            }
        >
            {children}
        </th>
    );
}

function Td({ children, className = '' }) {
    return (
        <td
            className={
                'whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300 ' +
                className
            }
        >
            {children}
        </td>
    );
}

function Empty({ colSpan, children }) {
    return (
        <tr>
            <td
                colSpan={colSpan}
                className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
            >
                {children}
            </td>
        </tr>
    );
}

Table.Head = ({ children }) => (
    <thead className="bg-gray-50 dark:bg-gray-900/50">
        <tr>{children}</tr>
    </thead>
);
Table.Body = ({ children }) => (
    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
        {children}
    </tbody>
);
Table.Th = Th;
Table.Td = Td;
Table.Empty = Empty;

export default Table;

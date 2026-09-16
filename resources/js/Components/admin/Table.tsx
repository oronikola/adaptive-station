import React from 'react';

function Table({ children }: { children: React.ReactNode }) {
    return (
        <div className="overflow-hidden overflow-x-auto rounded-2xl border border-[#e2e8f0] bg-white shadow-[0_8px_24px_-4px_rgba(10,27,115,0.12)] dark:border-gray-700 dark:bg-gray-800">
            <table className="min-w-full divide-y divide-[#eef1f6] dark:divide-gray-700">
                {children}
            </table>
        </div>
    );
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return (
        <th
            scope="col"
            className={
                'px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-[#64748b] dark:text-gray-400 ' +
                className
            }
        >
            {children}
        </th>
    );
}

function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return (
        <td
            className={
                'whitespace-nowrap px-4 py-3 text-[13px] text-[#334155] dark:text-gray-300 ' +
                className
            }
        >
            {children}
        </td>
    );
}

function Empty({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
    return (
        <tr>
            <td
                colSpan={colSpan}
                className="pf-empty text-center text-sm text-gray-500 dark:text-gray-400"
            >
                {children}
            </td>
        </tr>
    );
}

Table.Head = ({ children }: { children: React.ReactNode }) => (
    <thead className="bg-[#f8faff] dark:bg-gray-900/50">
        <tr>{children}</tr>
    </thead>
);
Table.Body = ({ children }: { children: React.ReactNode }) => (
    <tbody className="divide-y divide-[#f1f4f9] dark:divide-gray-700">
        {children}
    </tbody>
);
Table.Th = Th;
Table.Td = Td;
Table.Empty = Empty;

export default Table;

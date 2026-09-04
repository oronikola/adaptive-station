import { Link } from '@inertiajs/react';
import { PaginationLink } from '@/types';

/**
 * Renders the `links` array from a Laravel paginator response
 * (`{ url, label, active }[]`), including the "Previous"/"Next" entries
 * Laravel includes at each end.
 */
export default function Pagination({ links }: { links: PaginationLink[] }) {
    if (!links || links.length <= 3) {
        return null;
    }

    return (
        <nav className="flex flex-wrap items-center gap-1 px-1 py-4">
            {links.map((link, index) => {
                const label = link.label
                    .replace('&laquo; Previous', '‹ Previous')
                    .replace('Next &raquo;', 'Next ›');

                if (link.url === null) {
                    return (
                        <span
                            key={index}
                            className="rounded-md px-3 py-1 text-sm text-gray-400 dark:text-gray-600"
                        >
                            {label}
                        </span>
                    );
                }

                return (
                    <Link
                        key={index}
                        href={link.url}
                        preserveScroll
                        className={
                            'rounded-md px-3 py-1 text-sm transition duration-150 ease-in-out ' +
                            (link.active
                                ? 'bg-[#0b2a5b] text-white dark:bg-[#1f3f77]'
                                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700')
                        }
                    >
                        {label}
                    </Link>
                );
            })}
        </nav>
    );
}

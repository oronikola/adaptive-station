interface ClientPaginationProps {
    page: number;
    pageCount: number;
    total: number;
    rangeStart: number;
    rangeEnd: number;
    onPageChange: (page: number) => void;
    className?: string;
}

/** Builds a compact page-number window (with ellipses) for large page counts. */
function pageItems(page: number, pageCount: number): Array<number | '…'> {
    if (pageCount <= 7) {
        return Array.from({ length: pageCount }, (_, i) => i + 1);
    }

    const candidates = new Set([1, 2, page - 1, page, page + 1, pageCount - 1, pageCount]);
    const pages = [...candidates].filter((p) => p >= 1 && p <= pageCount).sort((a, b) => a - b);

    const items: Array<number | '…'> = [];
    let previous = 0;
    for (const p of pages) {
        if (p - previous > 1) items.push('…');
        items.push(p);
        previous = p;
    }

    return items;
}

/**
 * Client-side pagination bar for array-backed tables, mirroring the server-side
 * `Pagination` component's styling (`pf-page-link` pills). Renders nothing when
 * everything fits on one page.
 */
export default function ClientPagination({
    page,
    pageCount,
    total,
    rangeStart,
    rangeEnd,
    onPageChange,
    className = '',
}: ClientPaginationProps) {
    if (pageCount <= 1) {
        return null;
    }

    return (
        <nav className={`pf-pagination ${className}`} aria-label="Pagination">
            <span className="pf-pagination-count">
                Showing <strong>{rangeStart}</strong>–<strong>{rangeEnd}</strong> of{' '}
                <strong>{total}</strong>
            </span>

            <div className="pf-pagination-controls" role="group" aria-label="Pagination controls">
                <button
                    type="button"
                    className="pf-page-link"
                    disabled={page === 1}
                    onClick={() => onPageChange(page - 1)}
                    aria-label="Previous page"
                >
                    ‹
                </button>

                {pageItems(page, pageCount).map((item, index) =>
                    item === '…' ? (
                        <span key={`ellipsis-${index}`} className="pf-page-link pf-page-link--ellipsis" aria-hidden="true">
                            …
                        </span>
                    ) : (
                        <button
                            key={item}
                            type="button"
                            className={'pf-page-link' + (item === page ? ' pf-page-link--active' : '')}
                            onClick={() => onPageChange(item)}
                            aria-current={item === page ? 'page' : undefined}
                            aria-label={`Page ${item}`}
                        >
                            {item}
                        </button>
                    ),
                )}

                <button
                    type="button"
                    className="pf-page-link"
                    disabled={page === pageCount}
                    onClick={() => onPageChange(page + 1)}
                    aria-label="Next page"
                >
                    ›
                </button>
            </div>
        </nav>
    );
}
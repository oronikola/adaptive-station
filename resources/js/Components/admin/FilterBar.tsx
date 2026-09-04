import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import { Link } from '@inertiajs/react';

export default function FilterBar({ onSubmit, resetHref, children }: { onSubmit: (e: React.FormEvent) => void; resetHref?: string; children?: React.ReactNode }) {
    return (
        <form
            onSubmit={onSubmit}
            className="mb-4 flex flex-wrap items-end gap-3 rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800"
        >
            {children}

            <div className="flex gap-2">
                <PrimaryButton type="submit">Filter</PrimaryButton>
                {resetHref && (
                    <Link href={resetHref}>
                        <SecondaryButton type="button">Reset</SecondaryButton>
                    </Link>
                )}
            </div>
        </form>
    );
}

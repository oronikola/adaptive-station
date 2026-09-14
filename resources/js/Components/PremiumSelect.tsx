import {
    Listbox,
    ListboxButton,
    ListboxOption,
    ListboxOptions,
} from '@headlessui/react';
import { Check, ChevronDown } from 'reicon-react';

export interface PremiumSelectOption<T extends string | number> {
    value: T;
    label: string;
    disabled?: boolean;
}

interface PremiumSelectProps<T extends string | number> {
    id?: string;
    value: T;
    onChange: (value: T) => void;
    options: PremiumSelectOption<T>[];
    placeholder?: string;
    disabled?: boolean;
    invalid?: boolean;
    className?: string;
}

/**
 * Premium dropdown select shared by every form and filter bar.
 *
 * Headless UI Listbox with an anchored, portaled options panel (never
 * clipped by modals or cards), full keyboard support, Reicon affordances,
 * and token styling: 20px radius, slate hairline, brand focus ring,
 * ink-tinted dropdown shadow, tactile press.
 */
export default function PremiumSelect<T extends string | number>({
    id,
    value,
    onChange,
    options,
    placeholder = 'Select an option',
    disabled = false,
    invalid = false,
    className = '',
}: PremiumSelectProps<T>) {
    const selected = options.find((option) => option.value === value);

    return (
        <div className={`relative ${className}`}>
            <Listbox value={value} onChange={onChange} disabled={disabled}>
                <ListboxButton
                    id={id}
                    className={`group relative flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border bg-white px-3.5 py-2.5 text-left text-sm text-gray-900 shadow-sm transition-[border-color,box-shadow,background-color,transform] duration-200 hover:border-slate-400 focus:outline-none focus-visible:border-station-blue-bright focus-visible:ring-4 focus-visible:ring-station-blue-bright/15 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 data-[open]:border-station-blue-bright data-[open]:ring-4 data-[open]:ring-station-blue-bright/15 motion-reduce:transition-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-gray-600 ${
                        invalid ? 'border-red-400' : 'border-slate-300'
                    }`}
                >
                    <span
                        className={`block truncate ${
                            selected
                                ? 'text-gray-900 dark:text-gray-200'
                                : 'text-gray-400 dark:text-gray-500'
                        }`}
                    >
                        {selected?.label ?? placeholder}
                    </span>
                    <ChevronDown
                        size={16}
                        className="shrink-0 text-gray-400 transition-transform duration-200 group-data-[open]:rotate-180 motion-reduce:transition-none"
                    />
                </ListboxButton>

                <ListboxOptions
                    anchor="bottom start"
                    portal
                    modal={false}
                    transition
                    className="z-[80] max-h-60 w-[var(--button-width)] origin-top overflow-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_12px_32px_-8px_rgba(15,23,42,0.18)] transition duration-150 ease-out data-[closed]:-translate-y-1 data-[closed]:opacity-0 data-[closed]:scale-[0.98] motion-reduce:transition-none dark:border-gray-700 dark:bg-gray-800"
                >
                    {options.length === 0 && (
                        <div className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500">
                            No options available
                        </div>
                    )}

                    {options.map((option) => (
                        <ListboxOption
                            key={String(option.value)}
                            value={option.value}
                            disabled={option.disabled}
                            className="group flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm text-gray-700 transition-colors duration-150 data-[focus]:bg-slate-100 data-[focus]:text-gray-900 data-[selected]:font-semibold data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40 motion-reduce:transition-none dark:text-gray-200 dark:data-[focus]:bg-gray-700 dark:data-[focus]:text-white"
                        >
                            <span className="block truncate">{option.label}</span>
                            <span className="invisible shrink-0 text-station-blue-bright group-data-[selected]:visible">
                                <Check size={16} />
                            </span>
                        </ListboxOption>
                    ))}
                </ListboxOptions>
            </Listbox>
        </div>
    );
}

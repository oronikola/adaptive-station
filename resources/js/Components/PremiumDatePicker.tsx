import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { CalendarDaysIcon } from '@/Components/icons/calendar-days';
import { ChevronLeftIcon } from '@/Components/icons/chevron-left';
import { ChevronRightIcon } from '@/Components/icons/chevron-right';
import { useEffect, useMemo, useState } from 'react';

interface PremiumDatePickerProps {
    id?: string;
    value: string;
    onChange: (value: string) => void;
    min?: string;
    max?: string;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function parseDate(value?: string): Date | null {
    if (!value) {
        return null;
    }

    const [year, month, day] = value.split('-').map(Number);

    return new Date(year, month - 1, day);
}

function toDateValue(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

function formatDate(value: string): string {
    return parseDate(value)?.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }) ?? value;
}

export default function PremiumDatePicker({
    id,
    value,
    onChange,
    min,
    max,
    placeholder = 'Select date',
    disabled = false,
    className = '',
}: PremiumDatePickerProps) {
    const initialDate = parseDate(value) ?? parseDate(max) ?? new Date();
    const [visibleMonth, setVisibleMonth] = useState(
        new Date(initialDate.getFullYear(), initialDate.getMonth(), 1),
    );

    useEffect(() => {
        const selectedDate = parseDate(value);
        if (selectedDate) {
            setVisibleMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
        }
    }, [value]);

    const days = useMemo(() => {
        const leadingBlanks = visibleMonth.getDay();
        const daysInMonth = new Date(
            visibleMonth.getFullYear(),
            visibleMonth.getMonth() + 1,
            0,
        ).getDate();

        return [
            ...Array.from({ length: leadingBlanks }, () => null),
            ...Array.from(
                { length: daysInMonth },
                (_, index) => new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), index + 1),
            ),
        ];
    }, [visibleMonth]);

    const today = toDateValue(new Date());

    function isUnavailable(dateValue: string): boolean {
        return Boolean((min && dateValue < min) || (max && dateValue > max));
    }

    return (
        <Popover className={`relative ${className}`}>
            <PopoverButton
                id={id}
                disabled={disabled}
                className="group flex min-h-[42px] w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-left text-sm text-gray-900 shadow-sm transition-[border-color,box-shadow,background-color,transform] duration-200 hover:border-slate-400 focus:outline-none focus-visible:border-station-blue-bright focus-visible:ring-4 focus-visible:ring-station-blue-bright/15 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 data-[open]:border-station-blue-bright data-[open]:ring-4 data-[open]:ring-station-blue-bright/15 motion-reduce:transition-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-gray-600"
            >
                <span className={`truncate ${value ? '' : 'text-gray-400 dark:text-gray-500'}`}>
                    {value ? formatDate(value) : placeholder}
                </span>
                <CalendarDaysIcon
                    size={16}
                    className="shrink-0 text-gray-400 transition-colors group-data-[open]:text-station-blue-bright"
                    aria-hidden="true"
                />
            </PopoverButton>

            <PopoverPanel
                anchor="bottom start"
                portal
                transition
                className="z-[80] mt-2 w-[292px] origin-top rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_12px_32px_-8px_rgba(15,23,42,0.18)] transition duration-150 ease-out data-[closed]:-translate-y-1 data-[closed]:scale-[0.98] data-[closed]:opacity-0 motion-reduce:transition-none dark:border-gray-700 dark:bg-gray-800"
            >
                {({ close }) => (
                    <>
                        <div className="flex items-center justify-between gap-3 px-1 pb-3">
                            <button
                                type="button"
                                onClick={() => setVisibleMonth((month) => new Date(month.getFullYear(), month.getMonth() - 1, 1))}
                                className="grid size-8 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-station-blue-bright dark:hover:bg-gray-700 dark:hover:text-white"
                                aria-label="Previous month"
                            >
                                <ChevronLeftIcon size={16} />
                            </button>
                            <strong className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                {visibleMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                            </strong>
                            <button
                                type="button"
                                onClick={() => setVisibleMonth((month) => new Date(month.getFullYear(), month.getMonth() + 1, 1))}
                                className="grid size-8 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-station-blue-bright dark:hover:bg-gray-700 dark:hover:text-white"
                                aria-label="Next month"
                            >
                                <ChevronRightIcon size={16} />
                            </button>
                        </div>

                        <div className="grid grid-cols-7 gap-1" role="grid">
                            {WEEKDAYS.map((day) => (
                                <span key={day} className="grid h-7 place-items-center text-[10px] font-bold text-slate-400">
                                    {day}
                                </span>
                            ))}
                            {days.map((date, index) => {
                                if (!date) {
                                    return <span key={`blank-${index}`} />;
                                }

                                const dateValue = toDateValue(date);
                                const selected = dateValue === value;
                                const unavailable = isUnavailable(dateValue);

                                return (
                                    <button
                                        key={dateValue}
                                        type="button"
                                        disabled={unavailable}
                                        aria-current={dateValue === today ? 'date' : undefined}
                                        aria-pressed={selected}
                                        onClick={() => {
                                            onChange(dateValue);
                                            close();
                                        }}
                                        className="grid size-9 place-items-center rounded-xl text-xs font-semibold text-slate-700 transition-[background-color,color,box-shadow,transform] hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-station-blue-bright aria-[current=date]:text-station-blue-bright aria-pressed:bg-station-blue-bright aria-pressed:text-white aria-pressed:shadow-[0_5px_12px_-5px_rgba(40,99,189,0.7)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-25 dark:text-slate-200 dark:hover:bg-gray-700 dark:aria-pressed:bg-station-blue-bright"
                                    >
                                        {date.getDate()}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-gray-700">
                            <button
                                type="button"
                                onClick={() => {
                                    onChange('');
                                    close();
                                }}
                                className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-station-blue-bright dark:hover:bg-gray-700 dark:hover:text-white"
                            >
                                Clear
                            </button>
                            {!isUnavailable(today) && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        onChange(today);
                                        close();
                                    }}
                                    className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-station-blue-bright hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-station-blue-bright dark:hover:bg-blue-950/40"
                                >
                                    Today
                                </button>
                            )}
                        </div>
                    </>
                )}
            </PopoverPanel>
        </Popover>
    );
}

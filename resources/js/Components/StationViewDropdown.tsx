import {
    Popover,
    PopoverButton,
    PopoverPanel,
} from '@headlessui/react';
import { useMemo, useState } from 'react';
import { Tenant } from '@/types';

export interface StationOption {
    value: string;
    label: string;
    tenant_id: number | string;
    tenant_name: string;
    status: string;
    code?: string;
}

interface StationViewDropdownProps {
    tenants: Tenant[];
    currentTenantId?: string;
    currentStatus?: string;
    allStationOptions?: StationOption[];
    currentStationId?: string;
    onSchoolChange: (tenantId: string) => void;
    onStatusChange: (status: string) => void;
    onStationSelect: (stationId: string, tenantId: string | number) => void;
    onReset?: () => void;
    className?: string;
}

const statusOptions = [
    { value: 'all', label: 'All Station Views', description: 'Show all provisioned devices', tone: 'slate' },
    { value: 'active', label: 'Active Stations', description: 'Operating & paired kiosks', tone: 'green' },
    { value: 'pending_activation', label: 'Pending Activation', description: 'Awaiting device setup code', tone: 'amber' },
    { value: 'offline', label: 'Offline / Inactive', description: 'No heartbeat or disabled', tone: 'red' },
];

export default function StationViewDropdown({
    tenants,
    currentTenantId = '',
    currentStatus = 'all',
    allStationOptions = [],
    currentStationId = '',
    onSchoolChange,
    onStatusChange,
    onStationSelect,
    onReset,
    className = '',
}: StationViewDropdownProps) {
    const [stationSearch, setStationSearch] = useState('');
    const [schoolSearch, setSchoolSearch] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | 'school' | 'view' | 'station'>('all');

    const selectedTenant = useMemo(() => {
        return tenants.find((t) => String(t.id) === String(currentTenantId));
    }, [tenants, currentTenantId]);

    const selectedStatusObj = useMemo(() => {
        return statusOptions.find((s) => s.value === currentStatus) ?? statusOptions[0];
    }, [currentStatus]);

    const currentStation = useMemo(() => {
        if (!currentStationId) return null;
        return allStationOptions.find((s) => String(s.value) === String(currentStationId));
    }, [allStationOptions, currentStationId]);

    const hasActiveFilters = Boolean(currentTenantId || (currentStatus && currentStatus !== 'all'));

    // Filter schools based on local search term
    const filteredTenants = useMemo(() => {
        if (!schoolSearch.trim()) return tenants;
        const query = schoolSearch.toLowerCase();
        return tenants.filter(
            (t) =>
                t.name.toLowerCase().includes(query) ||
                (t.code && t.code.toLowerCase().includes(query))
        );
    }, [tenants, schoolSearch]);

    // Filter stations based on currently selected school & local search term
    const availableStations = useMemo(() => {
        let list = allStationOptions;
        if (currentTenantId) {
            list = list.filter((s) => String(s.tenant_id) === String(currentTenantId));
        }
        if (stationSearch.trim()) {
            const query = stationSearch.toLowerCase();
            list = list.filter(
                (s) =>
                    s.label.toLowerCase().includes(query) ||
                    s.tenant_name.toLowerCase().includes(query) ||
                    (s.code && s.code.toLowerCase().includes(query))
            );
        }
        return list;
    }, [allStationOptions, currentTenantId, stationSearch]);

    return (
        <div className={`relative inline-block ${className}`}>
            <Popover className="relative">
                {({ open, close }) => (
                    <>
                        <PopoverButton
                            className={`group relative inline-flex items-center rounded-2xl border bg-white shadow-sm transition-all duration-200 hover:border-slate-400 hover:shadow-md focus:outline-none focus-visible:border-blue-600 focus-visible:ring-4 focus-visible:ring-blue-600/15 active:scale-[0.99] dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600 ${
                                open
                                    ? 'border-blue-600 ring-4 ring-blue-600/15'
                                    : hasActiveFilters
                                      ? 'border-blue-300 bg-blue-50/20 dark:border-blue-900/40'
                                      : 'border-slate-300'
                            }`}
                            aria-label="Open School and Station View Dropdown"
                        >
                            {/* DESKTOP LAYOUT (md:flex) */}
                            <div className="hidden md:flex items-center divide-x divide-slate-200 dark:divide-gray-800">
                                {/* SEGMENT 1: School Switcher */}
                                <div
                                    onPointerDown={() => setActiveTab('school')}
                                    className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-gray-800/60 transition-colors rounded-l-2xl cursor-pointer"
                                    title="School Switcher"
                                >
                                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 shadow-xs">
                                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M4 21V7l8-4 8 4v14" />
                                            <path d="M9 21v-6h6v6" />
                                            <path d="M4 11h16" />
                                        </svg>
                                    </span>
                                    <div className="flex flex-col text-left leading-tight">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                                            School Switcher
                                        </span>
                                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate max-w-[140px]">
                                            {selectedTenant ? selectedTenant.name : 'All Schools'}
                                        </span>
                                    </div>
                                </div>

                                {/* SEGMENT 2: Station View */}
                                <div
                                    onPointerDown={() => setActiveTab('view')}
                                    className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-gray-800/60 transition-colors cursor-pointer"
                                    title="Station View"
                                >
                                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 shadow-xs">
                                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="3" y="4" width="18" height="12" rx="2" />
                                            <path d="M8 20h8" />
                                            <path d="M12 16v4" />
                                        </svg>
                                    </span>
                                    <div className="flex flex-col text-left leading-tight">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                                            Station View
                                        </span>
                                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate max-w-[130px]">
                                            {selectedStatusObj.label}
                                        </span>
                                    </div>
                                </div>

                                {/* SEGMENT 3: Specific Station View */}
                                <div
                                    onPointerDown={() => setActiveTab('station')}
                                    className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-gray-800/60 transition-colors cursor-pointer"
                                    title="Specific Station View"
                                >
                                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 shadow-xs">
                                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="12" cy="12" r="10" />
                                            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
                                        </svg>
                                    </span>
                                    <div className="flex flex-col text-left leading-tight">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                            Specific Station View
                                        </span>
                                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate max-w-[140px]">
                                            {currentStation ? currentStation.label : 'Select to view...'}
                                        </span>
                                    </div>
                                </div>

                                {/* Chevron Indicator */}
                                <div className="flex items-center px-3 py-3 text-slate-400 group-hover:text-slate-600 dark:text-gray-500 dark:group-hover:text-gray-300 transition-colors">
                                    <svg
                                        className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-180 text-blue-600' : ''}`}
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    >
                                        <path d="m6 9 6 6 6-6" />
                                    </svg>
                                </div>
                            </div>

                            {/* MOBILE LAYOUT (< md) */}
                            <div className="flex md:hidden items-center gap-2 px-3 py-2">
                                <div className="flex items-center -space-x-1.5">
                                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-white dark:border-gray-900 shadow-xs">
                                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 21V7l8-4 8 4v14M9 21v-6h6v6M4 11h16" /></svg>
                                    </span>
                                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 border border-white dark:border-gray-900 shadow-xs">
                                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></svg>
                                    </span>
                                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-white dark:border-gray-900 shadow-xs">
                                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" /></svg>
                                    </span>
                                </div>
                                <div className="flex flex-col text-left leading-tight">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        Fleet Navigator
                                    </span>
                                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate max-w-[170px]">
                                        {selectedTenant ? selectedTenant.name : 'All Schools'} · {selectedStatusObj.label}
                                    </span>
                                </div>
                                <svg
                                    className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                >
                                    <path d="m6 9 6 6 6-6" />
                                </svg>
                            </div>
                        </PopoverButton>

                        <PopoverPanel
                            anchor="bottom start"
                            portal
                            transition
                            className="z-[90] mt-2 w-[580px] max-w-[95vw] origin-top rounded-2xl border border-slate-200 bg-white shadow-[0_20px_48px_-12px_rgba(15,23,42,0.22)] transition duration-150 ease-out data-[closed]:scale-95 data-[closed]:opacity-0 dark:border-gray-800 dark:bg-gray-900 overflow-hidden"
                        >
                            {/* Panel Top Header */}
                            <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-3.5 dark:border-gray-800 dark:bg-gray-800/40">
                                <div className="flex items-center justify-between gap-2">
                                    <div>
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                            Fleet Navigator & View Controls
                                        </h4>
                                        <p className="text-[12px] text-slate-500 dark:text-slate-400">
                                            Switch schools, operational views, or jump to specific stations.
                                        </p>
                                    </div>
                                    {hasActiveFilters && onReset && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                onReset();
                                                close();
                                            }}
                                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 dark:border-gray-700 dark:bg-gray-800 dark:text-slate-300 dark:hover:bg-gray-700"
                                        >
                                            Reset All
                                        </button>
                                    )}
                                </div>

                                {/* Section Quick Tabs */}
                                <div className="mt-3 flex items-center gap-1 rounded-xl bg-slate-200/70 p-1 dark:bg-gray-800">
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('all')}
                                        className={`flex items-center justify-center gap-1.5 flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
                                            activeTab === 'all'
                                                ? 'bg-white text-slate-900 shadow-sm dark:bg-gray-900 dark:text-white'
                                                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                                        }`}
                                    >
                                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="3" y="3" width="7" height="7" rx="1" />
                                            <rect x="14" y="3" width="7" height="7" rx="1" />
                                            <rect x="3" y="14" width="7" height="7" rx="1" />
                                            <rect x="14" y="14" width="7" height="7" rx="1" />
                                        </svg>
                                        All in One
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('school')}
                                        className={`flex items-center justify-center gap-1.5 flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
                                            activeTab === 'school'
                                                ? 'bg-white text-blue-700 shadow-sm dark:bg-gray-900 dark:text-blue-400'
                                                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                                        }`}
                                    >
                                        <svg className="w-3.5 h-3.5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M4 21V7l8-4 8 4v14M9 21v-6h6v6M4 11h16" />
                                        </svg>
                                        School Switcher
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('view')}
                                        className={`flex items-center justify-center gap-1.5 flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
                                            activeTab === 'view'
                                                ? 'bg-white text-indigo-700 shadow-sm dark:bg-gray-900 dark:text-indigo-400'
                                                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                                        }`}
                                    >
                                        <svg className="w-3.5 h-3.5 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="3" y="4" width="18" height="12" rx="2" />
                                            <path d="M8 20h8M12 16v4" />
                                        </svg>
                                        Station View
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('station')}
                                        className={`flex items-center justify-center gap-1.5 flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
                                            activeTab === 'station'
                                                ? 'bg-white text-emerald-700 shadow-sm dark:bg-gray-900 dark:text-emerald-400'
                                                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                                        }`}
                                    >
                                        <svg className="w-3.5 h-3.5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="10" />
                                            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
                                        </svg>
                                        Specific Station
                                    </button>
                                </div>
                            </div>

                            <div className="max-h-[460px] divide-y divide-slate-100 overflow-y-auto p-3 dark:divide-gray-800">
                                {/* SECTION 1: School Switcher */}
                                {(activeTab === 'all' || activeTab === 'school') && (
                                    <div className="py-3">
                                        <div className="mb-2.5 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400">
                                                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M4 21V7l8-4 8 4v14M9 21v-6h6v6M4 11h16" />
                                                    </svg>
                                                </span>
                                                <div>
                                                    <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                                        School Switcher
                                                    </h5>
                                                    <p className="text-[11px] text-slate-500">
                                                        Filter fleet by school or view all schools platform-wide
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="text-[11px] font-medium text-slate-400">
                                                {tenants.length} registered
                                            </span>
                                        </div>

                                        {/* School Search bar if many schools */}
                                        {tenants.length > 5 && (
                                            <div className="relative mb-2">
                                                <input
                                                    type="text"
                                                    value={schoolSearch}
                                                    onChange={(e) => setSchoolSearch(e.target.value)}
                                                    placeholder="Search school name or code..."
                                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 pl-8 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                                />
                                                <svg
                                                    className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                >
                                                    <circle cx="11" cy="11" r="8" />
                                                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                                </svg>
                                            </div>
                                        )}

                                        <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    onSchoolChange('');
                                                    if (activeTab === 'school') close();
                                                }}
                                                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-medium transition ${
                                                    !currentTenantId
                                                        ? 'bg-blue-50 text-blue-700 font-bold dark:bg-blue-950/40 dark:text-blue-400'
                                                        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-gray-800'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <svg className="w-3.5 h-3.5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <circle cx="12" cy="12" r="10" />
                                                        <line x1="2" y1="12" x2="22" y2="12" />
                                                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                                                    </svg>
                                                    <span>All Schools</span>
                                                    <span className="rounded bg-slate-200/70 px-1.5 py-0.2 text-[10px] text-slate-600 dark:bg-gray-700 dark:text-slate-300">
                                                        Platform-wide
                                                    </span>
                                                </div>
                                                {!currentTenantId && (
                                                    <svg className="h-4 w-4 text-blue-600 shrink-0 ml-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                        <polyline points="20 6 9 17 4 12" />
                                                    </svg>
                                                )}
                                            </button>

                                            {filteredTenants.map((tenant) => {
                                                const isSelected = String(tenant.id) === currentTenantId;
                                                return (
                                                    <button
                                                        key={tenant.id}
                                                        type="button"
                                                        onClick={() => {
                                                            onSchoolChange(String(tenant.id));
                                                            if (activeTab === 'school') close();
                                                        }}
                                                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-medium transition ${
                                                            isSelected
                                                                ? 'bg-blue-50 text-blue-700 font-bold dark:bg-blue-950/40 dark:text-blue-400'
                                                                : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-gray-800'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2 truncate">
                                                            <span className="truncate">{tenant.name}</span>
                                                            <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500 shrink-0">
                                                                {tenant.code}
                                                            </span>
                                                        </div>
                                                        {isSelected && (
                                                            <svg className="h-4 w-4 text-blue-600 shrink-0 ml-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                                <polyline points="20 6 9 17 4 12" />
                                                            </svg>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* SECTION 2: Station View (Filter) */}
                                {(activeTab === 'all' || activeTab === 'view') && (
                                    <div className="py-3">
                                        <div className="mb-2.5 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400">
                                                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <rect x="3" y="4" width="18" height="12" rx="2" />
                                                        <path d="M8 20h8M12 16v4" />
                                                    </svg>
                                                </span>
                                                <div>
                                                    <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                                        Station View
                                                    </h5>
                                                    <p className="text-[11px] text-slate-500">
                                                        Filter by operational lifecycle and connectivity status
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="text-[11px] font-medium text-slate-400">
                                                Status Filter
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-1.5">
                                            {statusOptions.map((opt) => {
                                                const isSelected = currentStatus === opt.value;
                                                return (
                                                    <button
                                                        key={opt.value}
                                                        type="button"
                                                        onClick={() => {
                                                            onStatusChange(opt.value);
                                                            if (activeTab === 'view') close();
                                                        }}
                                                        className={`flex flex-col rounded-xl border p-2.5 text-left transition ${
                                                            isSelected
                                                                ? 'border-indigo-500 bg-indigo-50/60 shadow-sm dark:border-indigo-500 dark:bg-indigo-950/40'
                                                                : 'border-slate-200/80 hover:border-slate-300 hover:bg-slate-50 dark:border-gray-800 dark:hover:bg-gray-800'
                                                        }`}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-1.5">
                                                                <span
                                                                    className={`h-2 w-2 rounded-full ${
                                                                        opt.value === 'active'
                                                                            ? 'bg-emerald-500'
                                                                            : opt.value === 'pending_activation'
                                                                              ? 'bg-amber-500'
                                                                              : opt.value === 'offline'
                                                                                ? 'bg-red-500'
                                                                                : 'bg-slate-400'
                                                                    }`}
                                                                />
                                                                <span
                                                                    className={`text-xs font-bold ${
                                                                        isSelected
                                                                            ? 'text-indigo-900 dark:text-indigo-300'
                                                                            : 'text-slate-800 dark:text-slate-200'
                                                                    }`}
                                                                >
                                                                    {opt.label}
                                                                </span>
                                                            </div>
                                                            {isSelected && (
                                                                <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
                                                            )}
                                                        </div>
                                                        <span className="mt-0.5 text-[10.5px] text-slate-500 dark:text-slate-400">
                                                            {opt.description}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* SECTION 3: Specific Station View */}
                                {(activeTab === 'all' || activeTab === 'station') && (
                                    <div className="py-3">
                                        <div className="mb-2.5 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                                                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <circle cx="12" cy="12" r="10" />
                                                        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
                                                    </svg>
                                                </span>
                                                <div>
                                                    <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                                        Specific Station View
                                                    </h5>
                                                    <p className="text-[11px] text-slate-500">
                                                        Jump directly to individual kiosk telemetry and credentials
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="text-[11px] font-medium text-slate-400">
                                                {availableStations.length} kiosks
                                            </span>
                                        </div>

                                        {/* Station Search bar */}
                                        <div className="relative mb-2">
                                            <input
                                                type="text"
                                                value={stationSearch}
                                                onChange={(e) => setStationSearch(e.target.value)}
                                                placeholder="Search station by name, code, or school..."
                                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 pl-8 pr-8 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/15 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                            />
                                            <svg
                                                className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                            >
                                                <circle cx="11" cy="11" r="8" />
                                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                            </svg>
                                            {stationSearch && (
                                                <button
                                                    type="button"
                                                    onClick={() => setStationSearch('')}
                                                    className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-600"
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>

                                        {/* Station List */}
                                        <div className="max-h-48 space-y-1 overflow-y-auto pr-1">
                                            {availableStations.length === 0 ? (
                                                <p className="py-4 text-center text-xs text-slate-400">
                                                    No stations found for this filter.
                                                </p>
                                            ) : (
                                                availableStations.map((stn) => {
                                                    const isCurrent = String(stn.value) === String(currentStationId);
                                                    return (
                                                        <button
                                                            key={stn.value}
                                                            type="button"
                                                            onClick={() => {
                                                                onStationSelect(stn.value, stn.tenant_id);
                                                                close();
                                                            }}
                                                            className={`group flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition ${
                                                                isCurrent
                                                                    ? 'bg-emerald-50 text-emerald-800 font-bold dark:bg-emerald-950/40 dark:text-emerald-400'
                                                                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-gray-800 dark:hover:text-white'
                                                            }`}
                                                        >
                                                            <div className="min-w-0 pr-2">
                                                                <div className="flex items-center gap-1.5">
                                                                    <p className="truncate font-semibold">{stn.label}</p>
                                                                    {stn.code && (
                                                                        <span className="font-mono text-[10px] text-slate-400 bg-slate-100 dark:bg-gray-800 px-1 rounded">
                                                                            {stn.code}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {!currentTenantId && (
                                                                    <p className="truncate text-[10px] text-slate-400">
                                                                        {stn.tenant_name}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-1.5 shrink-0">
                                                                <span
                                                                    className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                                                                        stn.status === 'active'
                                                                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                                                                            : 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                                                                    }`}
                                                                >
                                                                    {stn.status === 'active' ? 'Active' : 'Pending'}
                                                                </span>
                                                                <svg
                                                                    className="h-3.5 w-3.5 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-600"
                                                                    viewBox="0 0 24 24"
                                                                    fill="none"
                                                                    stroke="currentColor"
                                                                    strokeWidth="2"
                                                                >
                                                                    <path d="M9 6l6 6-6 6" />
                                                                </svg>
                                                            </div>
                                                        </button>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Dropdown Panel Footer */}
                            <div className="border-t border-slate-100 bg-slate-50/90 px-4 py-2.5 dark:border-gray-800 dark:bg-gray-800/40 flex items-center justify-between text-xs text-slate-500">
                                <div className="truncate pr-2">
                                    <span className="font-medium text-slate-600 dark:text-slate-400">Active:</span>{' '}
                                    <span>{selectedTenant ? selectedTenant.name : 'All Schools'}</span>
                                    <span className="mx-1.5 text-slate-300 dark:text-slate-600">•</span>
                                    <span>{selectedStatusObj.label}</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => close()}
                                    className="rounded-lg bg-slate-200/70 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-300/70 dark:bg-gray-700 dark:text-slate-200 dark:hover:bg-gray-600 transition"
                                >
                                    Done
                                </button>
                            </div>
                        </PopoverPanel>
                    </>
                )}
            </Popover>
        </div>
    );
}

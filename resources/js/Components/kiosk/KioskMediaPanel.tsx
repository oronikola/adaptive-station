import InputError from '@/Components/InputError';
import StatusBadge from '@/Components/admin/StatusBadge';
import { useForm, router } from '@inertiajs/react';
import { useRef, useState } from 'react';
import type { KioskMediaItem } from '@/types';
import { UploadIcon } from '@/Components/icons/upload';
import { ChevronUpIcon } from '@/Components/icons/chevron-up';
import { ChevronDownIcon } from '@/Components/icons/chevron-down';
import { MonitorCheckIcon } from '@/Components/icons/monitor-check';
import { DeleteIcon } from '@/Components/icons/delete';
import { XIcon } from '@/Components/icons/x';
import { ClockIcon } from '@/Components/icons/clock';

/**
 * The kiosk idle-screen slideshow's admin side — shared by Portal and
 * Platform station-detail screens, which differ only in which route names
 * and (for Platform) extra form fields (tenant_id) a request needs. All
 * mutation logic itself (upload, reorder, toggle, delete) lives here once.
 */
interface KioskMediaPanelProps {
    media: KioskMediaItem[];
    storeUrl: string;
    updateUrl: (mediaId: string) => string;
    destroyUrl: (mediaId: string) => string;
    /** e.g. { tenant_id } on the Platform screen, where every station mutation must disambiguate which school's database to use. */
    extraFormData?: Record<string, string>;
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const TYPE_PILL: Record<string, string> = {
    image: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:ring-blue-800/60',
    video: 'bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:ring-violet-800/60',
};

export default function KioskMediaPanel({ media, storeUrl, updateUrl, destroyUrl, extraFormData = {} }: KioskMediaPanelProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [dragging, setDragging] = useState(false);
    const [movingId, setMovingId] = useState<string | null>(null);
    const { data, setData, post, processing, progress, errors, reset, transform } = useForm<{
        file: File | null;
        duration_seconds: string;
    }>({
        file: null,
        duration_seconds: '',
    });

    function handleFile(file: File | null) {
        if (!file) return;
        if (!file.name.match(/\.(jpe?g|png|webp|mp4|webm)$/i)) return;
        setData('file', file);
    }

    function handleDrop(e: React.DragEvent<HTMLDivElement>) {
        e.preventDefault();
        setDragging(false);
        if (processing) return;
        handleFile(e.dataTransfer.files?.[0] ?? null);
    }

    function submitUpload(e: React.FormEvent) {
        e.preventDefault();
        transform((formData) => ({ ...formData, ...extraFormData }));
        post(storeUrl, {
            forceFormData: true,
            onSuccess: () => {
                reset();
                if (fileInputRef.current) fileInputRef.current.value = '';
            },
        });
    }

    function toggleActive(item: KioskMediaItem) {
        router.patch(updateUrl(item.id), { is_active: !item.is_active, ...extraFormData });
    }

    /** Swaps this item's position with its neighbor — the simplest reorder UI that needs no drag-and-drop library for what's usually a handful of slides. */
    function move(item: KioskMediaItem, direction: -1 | 1) {
        const sorted = [...media].sort((a, b) => a.position - b.position);
        const index = sorted.findIndex((m) => m.id === item.id);
        const neighbor = sorted[index + direction];
        if (!neighbor) return;

        setMovingId(item.id);
        router.patch(updateUrl(item.id), { swap_with: neighbor.id, ...extraFormData }, {
            preserveScroll: true,
            onFinish: () => setMovingId(null),
        });
    }

    function destroy(item: KioskMediaItem) {
        if (!confirm('Remove this slide? This deletes the file permanently.')) return;
        router.delete(destroyUrl(item.id), { data: extraFormData });
    }

    const sorted = [...media].sort((a, b) => a.position - b.position);
    const uploadPercent = progress?.percentage ?? null;

    return (
        <div className="pf-panel p-6">
            <div className="mb-5 flex items-center gap-3">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/15 to-blue-500/15 text-indigo-500 ring-1 ring-inset ring-indigo-500/20 dark:text-indigo-300">
                    <MonitorCheckIcon size={18} />
                </span>
                <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Idle-Screen Media</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Shown on this kiosk after 10 seconds with no tap. Images (max 10MB) use the selected display time; videos (max 100MB) play to the end before the next item appears.
                    </p>
                </div>
            </div>

            <form onSubmit={submitUpload} className="mb-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch">
                    {/* Drag-and-drop zone */}
                    <div
                        role="button"
                        tabIndex={0}
                        aria-label="Upload image or video — drag and drop or click to browse"
                        onClick={() => !processing && fileInputRef.current?.click()}
                        onKeyDown={(e) => e.key === 'Enter' && !processing && fileInputRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); if (!processing) setDragging(true); }}
                        onDragLeave={(e) => { e.preventDefault(); setDragging(false); }}
                        onDrop={handleDrop}
                        className={
                            'relative flex-1 flex items-center gap-3 rounded-2xl border-2 border-dashed px-5 py-4 overflow-hidden transition-colors duration-150 ' +
                            (processing
                                ? 'cursor-default border-indigo-300 bg-indigo-50/70 dark:border-indigo-800/70 dark:bg-indigo-950/30'
                                : dragging
                                  ? 'cursor-pointer border-indigo-400 bg-indigo-50/70 dark:bg-indigo-950/30'
                                  : data.file
                                    ? 'cursor-pointer border-emerald-300 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20'
                                    : 'cursor-pointer border-slate-200 bg-slate-50 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900/40 dark:hover:border-slate-600')
                        }
                    >
                        <span
                            className={
                                'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ' +
                                (processing
                                    ? 'bg-indigo-100 text-indigo-500 dark:bg-indigo-900/50 dark:text-indigo-300'
                                    : data.file
                                      ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-300'
                                      : 'bg-white text-slate-400 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:ring-slate-700')
                            }
                        >
                            <UploadIcon size={18} className={processing ? 'animate-bounce' : ''} />
                        </span>

                        <div className="min-w-0 flex-1">
                            {processing ? (
                                <>
                                    <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">
                                        Uploading {data.file?.name}
                                    </p>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                        {data.file ? formatFileSize(data.file.size) : 'Transferring to kiosk storage…'}
                                    </p>
                                </>
                            ) : data.file ? (
                                <>
                                    <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">{data.file.name}</p>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{formatFileSize(data.file.size)}</p>
                                </>
                            ) : (
                                <>
                                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                                        {dragging ? 'Drop to add' : 'Drag & drop an image or video'}
                                    </p>
                                    <p className="text-[11px] text-slate-400">or click to browse — JPG, PNG, WEBP, MP4, WEBM</p>
                                </>
                            )}
                        </div>

                        {processing ? (
                            <div className="ml-auto flex flex-shrink-0 items-baseline gap-1">
                                {uploadPercent !== null ? (
                                    <>
                                        <span className="text-2xl font-extrabold leading-none tabular-nums text-indigo-600 dark:text-indigo-300">
                                            {Math.round(uploadPercent)}
                                        </span>
                                        <span className="text-[11px] font-bold text-slate-400">%</span>
                                    </>
                                ) : (
                                    <span className="animate-pulse text-[11px] font-bold uppercase tracking-wide text-indigo-500/80 dark:text-indigo-300/80">
                                        Uploading…
                                    </span>
                                )}
                            </div>
                        ) : data.file ? (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setData('file', null);
                                    if (fileInputRef.current) fileInputRef.current.value = '';
                                }}
                                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200/70 hover:text-slate-600 dark:hover:bg-slate-700"
                                aria-label="Clear selected file"
                            >
                                <XIcon size={14} />
                            </button>
                        ) : null}

                        {processing && (
                            <div className="absolute inset-x-3 bottom-0 h-1 overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-700/60">
                                {uploadPercent !== null ? (
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 transition-[width] duration-150 ease-out"
                                        style={{ width: `${uploadPercent}%` }}
                                    />
                                ) : (
                                    <div className="h-full w-1/2 animate-pulse rounded-full bg-gradient-to-r from-indigo-500 to-blue-500" />
                                )}
                            </div>
                        )}
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,.mp4,.webm"
                        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                        className="hidden"
                    />

                    {/* Duration + submit */}
                    <div className="flex items-end gap-3">
                        <div className="w-28">
                            <label htmlFor="kiosk-media-duration" className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                <ClockIcon size={11} />
                                Image seconds
                            </label>
                            <input
                                id="kiosk-media-duration"
                                type="number"
                                min={1}
                                max={120}
                                placeholder="Default"
                                value={data.duration_seconds}
                                onChange={(e) => setData('duration_seconds', e.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-900 shadow-sm focus:border-indigo-400 focus:ring-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={processing || !data.file}
                            className="pf-btn pf-btn-primary !h-[42px] !rounded-xl !text-xs !px-5 disabled:opacity-50"
                        >
                            <UploadIcon size={15} />
                            {processing ? 'Uploading…' : 'Upload'}
                        </button>
                    </div>
                </div>

                <InputError message={errors.file} className="mt-2" />
            </form>

            {sorted.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 py-10 text-center dark:border-slate-700">
                    <MonitorCheckIcon size={22} className="text-slate-300 dark:text-slate-600" />
                    <p className="text-xs font-medium text-slate-400 dark:text-slate-500">No media assigned to this kiosk yet.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {sorted.map((item, index) => (
                        <div
                            key={item.id}
                            className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition-opacity dark:border-slate-700 dark:bg-slate-900/40"
                            style={{ opacity: movingId && movingId !== item.id ? 0.5 : 1 }}
                        >
                            <div className="h-14 w-24 flex-shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                                {item.type === 'image' ? (
                                    <img src={item.url} alt="" className="h-full w-full object-cover" />
                                ) : (
                                    <video src={item.url} muted className="h-full w-full object-cover" />
                                )}
                            </div>

                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${TYPE_PILL[item.type]}`}>
                                        {item.type}
                                    </span>
                                    <span className="text-[11px] text-slate-400">
                                        {item.type === 'video'
                                            ? 'Plays to end'
                                            : item.duration_seconds
                                                ? `${item.duration_seconds}s slide`
                                                : 'Default duration'}
                                    </span>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => toggleActive(item)}
                                    className="mt-1.5 inline-flex items-center gap-2 group"
                                    title={item.is_active ? 'Click to hide from the kiosk' : 'Click to show on the kiosk'}
                                >
                                    <span
                                        className={
                                            'relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors ' +
                                            (item.is_active ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600')
                                        }
                                    >
                                        <span
                                            className={
                                                'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ' +
                                                (item.is_active ? 'translate-x-4.5' : 'translate-x-1')
                                            }
                                            style={{ transform: item.is_active ? 'translateX(18px)' : 'translateX(2px)' }}
                                        />
                                    </span>
                                    <StatusBadge color={item.is_active ? 'green' : 'gray'}>
                                        {item.is_active ? 'Active' : 'Hidden'}
                                    </StatusBadge>
                                </button>
                            </div>

                            <div className="flex flex-shrink-0 items-center gap-1">
                                <button
                                    type="button"
                                    disabled={index === 0 || movingId !== null}
                                    onClick={() => move(item, -1)}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-25 disabled:hover:bg-transparent dark:hover:bg-slate-800"
                                    aria-label="Move up"
                                >
                                    <ChevronUpIcon size={15} />
                                </button>
                                <button
                                    type="button"
                                    disabled={index === sorted.length - 1 || movingId !== null}
                                    onClick={() => move(item, 1)}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-25 disabled:hover:bg-transparent dark:hover:bg-slate-800"
                                    aria-label="Move down"
                                >
                                    <ChevronDownIcon size={15} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => destroy(item)}
                                    className="ml-1 flex h-8 w-8 items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                                    aria-label="Delete slide"
                                >
                                    <DeleteIcon size={15} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

import InputError from '@/Components/InputError';
import Table from '@/Components/admin/Table';
import StatusBadge from '@/Components/admin/StatusBadge';
import { useForm, router } from '@inertiajs/react';
import { useRef, useState } from 'react';
import type { KioskMediaItem } from '@/types';
import { UploadIcon } from '@/Components/icons/upload';
import { ChevronUpIcon } from '@/Components/icons/chevron-up';
import { ChevronDownIcon } from '@/Components/icons/chevron-down';

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

export default function KioskMediaPanel({ media, storeUrl, updateUrl, destroyUrl, extraFormData = {} }: KioskMediaPanelProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [movingId, setMovingId] = useState<string | null>(null);
    const { data, setData, post, processing, errors, reset, transform } = useForm<{
        file: File | null;
        duration_seconds: string;
    }>({
        file: null,
        duration_seconds: '',
    });

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
        router.patch(updateUrl(item.id), { position: neighbor.position, ...extraFormData }, {
            onFinish: () => {
                router.patch(updateUrl(neighbor.id), { position: item.position, ...extraFormData }, {
                    onFinish: () => setMovingId(null),
                });
            },
        });
    }

    function destroy(item: KioskMediaItem) {
        if (!confirm('Remove this slide? This deletes the file permanently.')) return;
        router.delete(destroyUrl(item.id), { data: extraFormData });
    }

    const sorted = [...media].sort((a, b) => a.position - b.position);

    return (
        <div className="pf-panel p-6">
            <div className="mb-5">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Idle-Screen Media</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Shown on this kiosk after 10 seconds with no tap. Images (max 10MB) cycle in order; videos (max 100MB) play muted and loop.
                </p>
            </div>

            <form onSubmit={submitUpload} className="mb-5 flex flex-wrap items-end gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/40">
                <div className="flex-1 min-w-[220px]">
                    <label htmlFor="kiosk-media-file" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Image or video
                    </label>
                    <input
                        id="kiosk-media-file"
                        ref={fileInputRef}
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,.mp4,.webm"
                        onChange={(e) => setData('file', e.target.files?.[0] ?? null)}
                        className="block w-full text-xs text-slate-600 dark:text-slate-300"
                    />
                    {data.file && (
                        <p className="mt-1 text-[11px] text-slate-400">{formatFileSize(data.file.size)}</p>
                    )}
                    <InputError message={errors.file} className="mt-1" />
                </div>

                <div className="w-32">
                    <label htmlFor="kiosk-media-duration" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Seconds shown
                    </label>
                    <input
                        id="kiosk-media-duration"
                        type="number"
                        min={1}
                        max={120}
                        placeholder="Default"
                        value={data.duration_seconds}
                        onChange={(e) => setData('duration_seconds', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                </div>

                <button type="submit" disabled={processing || !data.file} className="pf-btn pf-btn-primary !h-9 !text-xs">
                    <UploadIcon size={16} />
                    {processing ? 'Uploading...' : 'Upload'}
                </button>
            </form>

            <Table>
                <Table.Head>
                    <Table.Th>Preview</Table.Th>
                    <Table.Th>Type</Table.Th>
                    <Table.Th>Duration</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>
                        <span className="sr-only">Actions</span>
                    </Table.Th>
                </Table.Head>
                <Table.Body>
                    {sorted.length === 0 && <Table.Empty colSpan={5}>No media assigned to this kiosk yet.</Table.Empty>}

                    {sorted.map((item, index) => (
                        <tr key={item.id}>
                            <Table.Td>
                                {item.type === 'image' ? (
                                    <img src={item.url} alt="" className="h-12 w-20 rounded-md object-cover" />
                                ) : (
                                    <video src={item.url} muted className="h-12 w-20 rounded-md object-cover" />
                                )}
                            </Table.Td>
                            <Table.Td className="capitalize">{item.type}</Table.Td>
                            <Table.Td>{item.duration_seconds ? `${item.duration_seconds}s` : 'Default'}</Table.Td>
                            <Table.Td>
                                <button
                                    type="button"
                                    onClick={() => toggleActive(item)}
                                    className="cursor-pointer"
                                    title={item.is_active ? 'Click to hide from the kiosk' : 'Click to show on the kiosk'}
                                >
                                    <StatusBadge color={item.is_active ? 'green' : 'gray'}>
                                        {item.is_active ? 'Active' : 'Hidden'}
                                    </StatusBadge>
                                </button>
                            </Table.Td>
                            <Table.Td className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                    <button
                                        type="button"
                                        disabled={index === 0 || movingId !== null}
                                        onClick={() => move(item, -1)}
                                        className="rounded-md border border-slate-200 p-1 text-slate-500 disabled:opacity-30 dark:border-slate-700"
                                        aria-label="Move up"
                                    >
                                        <ChevronUpIcon size={14} />
                                    </button>
                                    <button
                                        type="button"
                                        disabled={index === sorted.length - 1 || movingId !== null}
                                        onClick={() => move(item, 1)}
                                        className="rounded-md border border-slate-200 p-1 text-slate-500 disabled:opacity-30 dark:border-slate-700"
                                        aria-label="Move down"
                                    >
                                        <ChevronDownIcon size={14} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => destroy(item)}
                                        className="font-bold text-red-600 hover:text-red-700 hover:underline dark:text-red-400 text-xs"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </Table.Td>
                        </tr>
                    ))}
                </Table.Body>
            </Table>
        </div>
    );
}

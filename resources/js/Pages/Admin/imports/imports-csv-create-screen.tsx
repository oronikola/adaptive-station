import InputError from '@/Components/InputError';
import { ClipboardCheckIcon } from '@/Components/icons/clipboard-check';
import { DownloadIcon } from '@/Components/icons/download';
import { PlusIcon } from '@/Components/icons/plus';
import { SearchIcon } from '@/Components/icons/search';
import { UploadIcon } from '@/Components/icons/upload';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm } from '@inertiajs/react';
import { useRef, useState } from 'react';
import '../../../../css/platform-dashboard.css';
import '../../../../css/platform-overview.css';

const COLUMNS: { name: string; required: boolean; note: string }[] = [
    { name: 'external_id', required: false, note: 'Your own student/staff ID. Strongly recommended — without it, re-uploading the same file creates duplicates instead of updating.' },
    { name: 'person_type', required: true, note: '"student" or "staff".' },
    { name: 'first_name', required: true, note: '' },
    { name: 'middle_name', required: false, note: '' },
    { name: 'last_name', required: true, note: '' },
    { name: 'display_name', required: false, note: 'Defaults to first + middle + last name.' },
    { name: 'grade_level', required: false, note: '' },
    { name: 'section', required: false, note: '' },
    { name: 'photo_url', required: false, note: 'Must be a full URL if provided.' },
    { name: 'status', required: false, note: '"active" (default) or "inactive".' },
    { name: 'rfid_card_uid', required: false, note: 'Skipped if the card is already assigned to someone else.' },
    { name: 'guardian_name', required: false, note: 'One primary guardian per row.' },
    { name: 'guardian_email', required: false, note: 'Required if guardian_name or guardian_phone is set. Used to detect the same guardian across sibling rows.' },
    { name: 'guardian_phone', required: false, note: 'Where SMS tap alerts are sent — the guardian must still enable SMS notifications after logging in.' },
];

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ImportsCsvCreateScreen() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [dragging, setDragging] = useState(false);
    const { data, setData, post, processing, errors } = useForm<{ file: File | null; commit: boolean }>({
        file: null,
        commit: false,
    });

    function handleFile(file: File | null) {
        if (!file) return;
        if (!file.name.match(/\.(csv|txt)$/i)) return;
        setData('file', file);
    }

    function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
        e.preventDefault();
        setDragging(true);
    }

    function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
        e.preventDefault();
        setDragging(false);
    }

    function handleDrop(e: React.DragEvent<HTMLDivElement>) {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files?.[0] ?? null;
        handleFile(file);
    }

    function submit(commit: boolean) {
        return (e: React.MouseEvent<HTMLButtonElement>) => {
            e.preventDefault();
            setData('commit', commit);
            post(route('portal.imports.csv.store'), { forceFormData: true });
        };
    }

    return (
        <AdminLayout>
            <Head title="Upload CSV Import" />

            <div className="pf-dashboard pft-page">
                <div className="pft-hero">
                    <div className="pft-hero-main">
                        <span className="pft-hero-icon" aria-hidden="true">
                            <DownloadIcon size={22} />
                        </span>
                        <div>
                            <h1 className="pft-hero-title">Upload CSV Import</h1>
                            <p className="pft-hero-subtitle">
                                <strong>Preview</strong> runs the same matching logic read-only — nothing is written.{' '}
                                <strong>Commit</strong> performs the real import; re-running Commit is always safe for rows that include an{' '}
                                <code style={{ fontSize: 11, background: 'var(--as-surface-active)', padding: '1px 5px', borderRadius: 4 }}>external_id</code>{' '}
                                (already-imported rows are skipped, never duplicated).
                            </p>
                        </div>
                    </div>
                </div>

                <div className="pf-panel">
                    <div className="pf-panel-header">
                        <div>
                            <h2 className="pf-panel-title">Upload file</h2>
                            <p className="pf-panel-count">Header row required. Column order does not matter. Accepts .csv and .txt files.</p>
                        </div>
                    </div>

                    <form className="pft-form-panel">
                        {/* Drop zone */}
                        <div
                            role="button"
                            tabIndex={0}
                            aria-label="Upload CSV file — drag and drop or click to browse"
                            onClick={() => fileInputRef.current?.click()}
                            onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 10,
                                minHeight: 160,
                                border: `2px dashed ${dragging ? 'var(--as-brand-blue)' : data.file ? 'var(--as-success)' : 'var(--as-border-mid)'}`,
                                borderRadius: 20,
                                background: dragging ? 'color-mix(in srgb, var(--as-brand) 4%, var(--as-surface))' : data.file ? 'color-mix(in srgb, var(--as-success) 4%, var(--as-surface))' : 'var(--as-surface)',
                                cursor: 'pointer',
                                transition: 'border-color 180ms, background 180ms',
                                marginBottom: 4,
                                padding: 20,
                                textAlign: 'center',
                            }}
                        >
                            {data.file ? (
                                <>
                                    <ClipboardCheckIcon size={22} style={{ color: 'var(--as-success)' }} />
                                    <div>
                                        <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: 'var(--as-text)' }}>{data.file.name}</p>
                                        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--as-text-muted)' }}>{formatFileSize(data.file.size)}</p>
                                    </div>
                                    <button
                                        type="button"
                                        className="pf-btn pf-btn-secondary"
                                        style={{ padding: '0 14px', height: 32, fontSize: 12 }}
                                        onClick={(e) => { e.stopPropagation(); setData('file', null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                                    >
                                        Change file
                                    </button>
                                </>
                            ) : (
                                <>
                                    <UploadIcon
                                        size={22}
                                        style={{ color: dragging ? 'var(--as-brand-blue)' : 'var(--as-text-muted)', transition: 'color 180ms' }}
                                    />
                                    <div>
                                        <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: 'var(--as-text)' }}>
                                            {dragging ? 'Drop to upload' : 'Drag & drop your CSV here'}
                                        </p>
                                        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--as-text-muted)' }}>
                                            or <span style={{ color: 'var(--as-brand-blue)', textDecoration: 'underline' }}>browse files</span> — .csv or .txt accepted
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Hidden file input */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv,.txt"
                            style={{ display: 'none' }}
                            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                        />
                        <InputError message={errors.file} className="mt-2" />

                        <div className="pft-form-actions">
                            <button
                                type="button"
                                className="pf-btn pf-btn-secondary"
                                disabled={processing || !data.file}
                                onClick={submit(false)}
                            >
                                <SearchIcon size={16} />
                                Preview
                            </button>
                            <button
                                type="button"
                                className={'pf-btn pf-btn-primary' + (processing ? ' pf-btn--loading' : '')}
                                disabled={processing || !data.file}
                                onClick={submit(true)}
                            >
                                <PlusIcon size={16} />
                                Commit Import
                            </button>
                        </div>
                    </form>
                </div>

                <div className="pf-panel">
                    <div className="pf-panel-header">
                        <div>
                            <h2 className="pf-panel-title">Expected columns</h2>
                            <p className="pf-panel-count">Column names are case-insensitive; spaces are treated as underscores.</p>
                        </div>
                    </div>

                    <div className="pf-table-wrap">
                        <table className="pf-table">
                            <thead>
                                <tr>
                                    <th scope="col">Column</th>
                                    <th scope="col">Required</th>
                                    <th scope="col">Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {COLUMNS.map((column) => (
                                    <tr key={column.name}>
                                        <td className="pft-created" style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 600, color: 'var(--as-brand-mid)' }}>{column.name}</td>
                                        <td>
                                            <span className={column.required ? 'pf-pill pf-pill--active' : 'pf-pill pf-pill--inactive'}>
                                                {column.required ? 'Yes' : 'No'}
                                            </span>
                                        </td>
                                        <td style={{ color: 'var(--as-text-secondary)' }}>{column.note || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}

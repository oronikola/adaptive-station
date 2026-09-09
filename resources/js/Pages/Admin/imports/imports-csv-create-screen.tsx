import InputError from '@/Components/InputError';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm } from '@inertiajs/react';
import { useRef } from 'react';
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

export default function ImportsCsvCreateScreen() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { data, setData, post, processing, errors } = useForm<{ file: File | null; commit: boolean }>({
        file: null,
        commit: false,
    });

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
                            <svg viewBox="0 0 24 24">
                                <rect x="4" y="15.4" width="16" height="4.6" rx="1.4" />
                                <rect x="10.6" y="4" width="2.8" height="7.4" rx="1.2" />
                                <polygon points="7.4,11 16.6,11 12,15.6" />
                            </svg>
                        </span>
                        <div>
                            <h1 className="pft-hero-title">Upload CSV Import</h1>
                            <p className="pft-hero-subtitle">
                                Preview runs the same matching logic read-only — nothing is written. Commit performs the
                                real import; re-running Commit is always safe for rows that include an external_id
                                (already-imported rows are skipped, never duplicated).
                            </p>
                        </div>
                    </div>
                </div>

                <div className="pf-panel">
                    <div className="pf-panel-header">
                        <div>
                            <h2 className="pf-panel-title">File</h2>
                            <p className="pf-panel-count">Header row required; column order does not matter.</p>
                        </div>
                    </div>

                    <form className="pft-form-panel">
                        <div className="pft-form-grid">
                            <div className="pf-field">
                                <label htmlFor="file">CSV file</label>
                                <input
                                    id="file"
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".csv,.txt"
                                    onChange={(e) => setData('file', e.target.files?.[0] ?? null)}
                                />
                                <InputError message={errors.file} className="mt-2" />
                            </div>
                        </div>

                        <div className="pft-form-actions">
                            <button
                                type="button"
                                className="pf-btn pf-btn-secondary"
                                disabled={processing || !data.file}
                                onClick={submit(false)}
                            >
                                Preview
                            </button>
                            <button
                                type="button"
                                className="pf-btn pf-btn-primary"
                                disabled={processing || !data.file}
                                onClick={submit(true)}
                            >
                                Commit
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
                                        <td className="pft-created" style={{ fontFamily: 'monospace' }}>{column.name}</td>
                                        <td>{column.required ? 'Yes' : 'No'}</td>
                                        <td>{column.note || '—'}</td>
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

import InputError from '@/Components/InputError';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import '../../../../css/platform-dashboard.css';
import '../../../../css/platform-overview.css';

const DEFAULT_CONFIG = JSON.stringify(
    {
        host: '',
        port: 3306,
        database: '',
        username: '',
        password: '',
        tables: {
            studinfo: { table: 'studinfo', columns: {} },
            gradelevel: { table: 'gradelevel', columns: {} },
            teacher: { table: 'teacher', columns: {} },
            taphistory: { table: 'taphistory', columns: {} },
        },
    },
    null,
    2,
);

export default function IntegrationsCreateScreen() {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        driver: 'legacy_mysql',
        direction: 'import_only',
        config: DEFAULT_CONFIG,
    });

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const pendingCursorRef = useRef<number | null>(null);
    const [jsonError, setJsonError] = useState('');
    const [jsonValid, setJsonValid] = useState(true);
    const [lineCount, setLineCount] = useState(DEFAULT_CONFIG.split('\n').length);
    const lineCountRef = useRef<HTMLDivElement>(null);

    // Restore cursor after controlled update
    useEffect(() => {
        if (pendingCursorRef.current !== null && textareaRef.current) {
            textareaRef.current.selectionStart = pendingCursorRef.current;
            textareaRef.current.selectionEnd = pendingCursorRef.current;
            pendingCursorRef.current = null;
        }
    });

    // Sync line-number scroll with textarea scroll
    function handleScroll() {
        if (lineCountRef.current && textareaRef.current) {
            lineCountRef.current.scrollTop = textareaRef.current.scrollTop;
        }
    }

    function handleConfigChange(value: string) {
        setData('config', value);
        const lines = value.split('\n').length;
        setLineCount(lines);
        try {
            JSON.parse(value);
            setJsonError('');
            setJsonValid(true);
        } catch (e: unknown) {
            setJsonError(e instanceof Error ? e.message : 'Invalid JSON');
            setJsonValid(false);
        }
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
        const ta = e.currentTarget;

        if (e.key === 'Tab') {
            e.preventDefault();
            const start = ta.selectionStart;
            const end = ta.selectionEnd;
            const value = ta.value;
            const spaces = '  ';
            const newValue = value.substring(0, start) + spaces + value.substring(end);
            handleConfigChange(newValue);
            pendingCursorRef.current = start + 2;
            return;
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            const start = ta.selectionStart;
            const value = ta.value;
            const lineStart = value.lastIndexOf('\n', start - 1) + 1;
            const currentLine = value.substring(lineStart, start);
            const indent = currentLine.match(/^(\s*)/)?.[1] ?? '';
            // Extra indent after opening brace/bracket
            const extraIndent = /[{[]$/.test(currentLine.trimEnd()) ? '  ' : '';
            const newValue = value.substring(0, start) + '\n' + indent + extraIndent + value.substring(start);
            handleConfigChange(newValue);
            pendingCursorRef.current = start + 1 + indent.length + extraIndent.length;
            return;
        }

        // Ctrl+Shift+F  or  Shift+Alt+F  → Format JSON
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
            e.preventDefault();
            formatJson();
            return;
        }

        // Ctrl+] → indent line, Ctrl+[ → unindent line
        if ((e.ctrlKey || e.metaKey) && (e.key === ']' || e.key === '[')) {
            e.preventDefault();
            const start = ta.selectionStart;
            const value = ta.value;
            const lineStart = value.lastIndexOf('\n', start - 1) + 1;
            const lineEnd = value.indexOf('\n', start);
            const end = lineEnd === -1 ? value.length : lineEnd;
            const line = value.substring(lineStart, end);
            let newLine: string;
            if (e.key === ']') {
                newLine = '  ' + line;
            } else {
                newLine = line.startsWith('  ') ? line.substring(2) : line.replace(/^ /, '');
            }
            const diff = newLine.length - line.length;
            const newValue = value.substring(0, lineStart) + newLine + value.substring(end);
            handleConfigChange(newValue);
            pendingCursorRef.current = Math.max(lineStart, start + diff);
            return;
        }
    }

    function formatJson() {
        try {
            const parsed = JSON.parse(data.config);
            const formatted = JSON.stringify(parsed, null, 2);
            handleConfigChange(formatted);
        } catch {
            // already captured in jsonError
        }
    }

    function submit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        post(route('portal.integrations.store'));
    }

    const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

    return (
        <AdminLayout>
            <Head title="New Integration Profile" />

            <div className="pf-dashboard pft-page">
                <div className="pft-hero">
                    <div className="pft-hero-main">
                        <span className="pft-hero-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24">
                                <circle cx="7" cy="12" r="3.4" />
                                <rect x="9" y="10.3" width="6" height="3.4" rx="1.2" />
                                <circle cx="17" cy="12" r="3.4" />
                            </svg>
                        </span>
                        <div>
                            <h1 className="pft-hero-title">New Integration Profile</h1>
                            <p className="pft-hero-subtitle">
                                Connects to a school's existing legacy tapping database
                                (read-only for roster/attendance import; write access
                                only if you enable export). Credentials are encrypted
                                and never shown again after saving.
                            </p>
                        </div>
                    </div>
                    <div className="pft-hero-actions">
                        <Link href={route('portal.integrations.index')} className="pf-btn pf-btn-secondary">
                            Back to Integrations
                        </Link>
                    </div>
                </div>

                <div className="pf-panel">
                    <form onSubmit={submit} style={{ padding: 28 }}>
                        <div className="pft-form-grid" style={{ marginBottom: 20 }}>
                            <div className="pf-field">
                                <label htmlFor="name">Name <span aria-hidden="true" style={{ color: 'var(--as-danger)' }}>*</span></label>
                                <input
                                    id="name"
                                    type="text"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    autoFocus
                                    required
                                    placeholder="e.g. Main Campus Legacy DB"
                                />
                                <p className="pf-field-hint">Identifies this profile in imports and history.</p>
                                <InputError message={errors.name} className="mt-2" />
                            </div>

                            <div className="pf-field">
                                <label htmlFor="direction">Direction</label>
                                <select
                                    id="direction"
                                    value={data.direction}
                                    onChange={(e) => setData('direction', e.target.value)}
                                >
                                    <option value="import_only">Import only (read from legacy DB)</option>
                                    <option value="export_only">Export only (write to legacy DB)</option>
                                    <option value="bidirectional">Import + Export</option>
                                </select>
                                <InputError message={errors.direction} className="mt-2" />
                            </div>
                        </div>

                        {/* JSON IDE editor */}
                        <div className="pf-field">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                <label htmlFor="config" style={{ margin: 0 }}>
                                    Connection &amp; Table Mapping{' '}
                                    <span style={{ fontFamily: 'monospace', fontWeight: 400, fontSize: 11, color: 'var(--as-text-muted)' }}>(JSON)</span>
                                </label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    {jsonValid ? (
                                        <span style={{ fontSize: 11, color: 'var(--as-success)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <svg viewBox="0 0 24 24" style={{ width: 12, height: 12, fill: 'none', stroke: 'currentColor', strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                            Valid JSON
                                        </span>
                                    ) : (
                                        <span style={{ fontSize: 11, color: 'var(--as-danger)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <svg viewBox="0 0 24 24" style={{ width: 12, height: 12, fill: 'none', stroke: 'currentColor', strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                                                <path d="M18 6 6 18M6 6l12 12" />
                                            </svg>
                                            Invalid JSON
                                        </span>
                                    )}
                                    <button
                                        type="button"
                                        onClick={formatJson}
                                        style={{
                                            padding: '4px 10px',
                                            borderRadius: 8,
                                            border: '1px solid var(--as-border)',
                                            background: 'var(--as-surface)',
                                            color: 'var(--as-text-secondary)',
                                            fontSize: 11,
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 5,
                                        }}
                                        title="Format JSON (Ctrl+Shift+F)"
                                    >
                                        <svg viewBox="0 0 24 24" style={{ width: 11, height: 11, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' }}>
                                            <path d="M4 6h16M4 12h10M4 18h12" />
                                        </svg>
                                        Format
                                    </button>
                                </div>
                            </div>

                            {/* Editor: line numbers + textarea */}
                            <div
                                style={{
                                    display: 'flex',
                                    border: `1px solid ${jsonValid ? 'var(--as-border)' : 'var(--as-danger-bg-alt)'}`,
                                    borderRadius: 12,
                                    overflow: 'hidden',
                                    fontFamily: 'ui-monospace, "Cascadia Code", "Fira Code", Consolas, monospace',
                                    fontSize: 13,
                                    lineHeight: '1.6',
                                    background: '#f8fafc',
                                    transition: 'border-color 200ms',
                                }}
                            >
                                {/* Line numbers */}
                                <div
                                    ref={lineCountRef}
                                    aria-hidden="true"
                                    style={{
                                        padding: '12px 10px 12px 14px',
                                        background: '#f1f5f9',
                                        borderRight: '1px solid var(--as-border)',
                                        color: '#94a3b8',
                                        textAlign: 'right',
                                        userSelect: 'none',
                                        overflowY: 'hidden',
                                        flexShrink: 0,
                                        minWidth: 40,
                                    }}
                                >
                                    {lineNumbers.map((n) => (
                                        <div key={n} style={{ lineHeight: '1.6' }}>{n}</div>
                                    ))}
                                </div>

                                {/* Textarea */}
                                <textarea
                                    ref={textareaRef}
                                    id="config"
                                    rows={24}
                                    value={data.config}
                                    onChange={(e) => handleConfigChange(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    onScroll={handleScroll}
                                    spellCheck={false}
                                    style={{
                                        flex: 1,
                                        resize: 'vertical',
                                        border: 'none',
                                        outline: 'none',
                                        background: 'transparent',
                                        padding: '12px 14px',
                                        color: 'var(--as-text)',
                                        fontFamily: 'inherit',
                                        fontSize: 'inherit',
                                        lineHeight: 'inherit',
                                    }}
                                />
                            </div>

                            {/* Hotkey hints */}
                            <div style={{ display: 'flex', gap: 16, marginTop: 6, flexWrap: 'wrap' }}>
                                {[
                                    ['Tab', '2-space indent'],
                                    ['Enter', 'Auto-indent'],
                                    ['Ctrl+Shift+F', 'Format JSON'],
                                    ['Ctrl+]', 'Indent line'],
                                    ['Ctrl+[', 'Unindent line'],
                                ].map(([key, hint]) => (
                                    <span key={key} style={{ fontSize: 10, color: 'var(--as-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <kbd style={{ padding: '1px 5px', background: 'var(--as-surface-active)', border: '1px solid var(--as-border)', borderRadius: 4, fontFamily: 'inherit', fontSize: 10 }}>{key}</kbd>
                                        {hint}
                                    </span>
                                ))}
                            </div>

                            {jsonError && (
                                <p style={{ marginTop: 6, fontSize: 11, color: 'var(--as-danger)', fontFamily: 'monospace' }} role="alert">
                                    {jsonError}
                                </p>
                            )}
                            <InputError message={errors.config} className="mt-2" />
                        </div>

                        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
                            <button
                                type="submit"
                                className={'pf-btn pf-btn-primary' + (processing ? ' pf-btn--loading' : '')}
                                disabled={processing || !jsonValid}
                            >
                                Create
                            </button>
                            <Link href={route('portal.integrations.index')} className="pf-btn pf-btn-secondary">
                                Cancel
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </AdminLayout>
    );
}

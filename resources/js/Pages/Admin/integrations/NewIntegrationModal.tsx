import InputError from '@/Components/InputError';
import Modal, { ModalHero } from '@/Components/Modal';
import PremiumSelect from '@/Components/PremiumSelect';
import { ConnectIcon } from '@/Components/icons/connect';
import { useForm } from '@inertiajs/react';
import { useMemo, useRef } from 'react';

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

function highlightedJson(value: string) {
    const tokenPattern = /("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"\s*:)|("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*")|\b(true|false)\b|\b(null)\b|(-?\d+(?:\.\d+)?)/g;
    const parts = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = tokenPattern.exec(value)) !== null) {
        if (match.index > lastIndex) {
            parts.push(value.slice(lastIndex, match.index));
        }

        const className = match[1]
            ? 'text-[#9cdcfe]'
            : match[2]
              ? 'text-[#ce9178]'
              : match[3]
                ? 'text-[#569cd6]'
                : match[4]
                  ? 'text-[#c586c0]'
                  : 'text-[#b5cea8]';

        parts.push(
            <span key={`${match.index}-${match[0]}`} className={className}>
                {match[0]}
            </span>,
        );
        lastIndex = tokenPattern.lastIndex;
    }

    parts.push(value.slice(lastIndex));

    return parts;
}

export default function NewIntegrationModal({
    show,
    onClose,
}: {
    show: boolean;
    onClose: () => void;
}) {
    const codeLayerRef = useRef<HTMLPreElement>(null);
    const lineNumberRef = useRef<HTMLPreElement>(null);
    const form = useForm({
        name: '',
        driver: 'legacy_mysql',
        direction: 'import_only',
        config: DEFAULT_CONFIG,
    });

    const renderedConfig = useMemo(() => highlightedJson(form.data.config), [form.data.config]);
    const lineNumbers = useMemo(
        () => form.data.config.split('\n').map((_, index) => index + 1).join('\n'),
        [form.data.config],
    );

    function closeModal() {
        if (form.processing) {
            return;
        }

        form.reset();
        form.clearErrors();
        onClose();
    }

    function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        form.post(route('portal.integrations.store'), {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                onClose();
            },
        });
    }

    return (
        <Modal show={show} onClose={closeModal} closeable={!form.processing} maxWidth="4xl">
            <div className="pf-modal max-h-[calc(100vh-3rem)] overflow-y-auto">
                <ModalHero
                    tone="blue"
                    title="New Integration Profile"
                    subtitle="Connect a legacy database and define how its tables map into Adaptive Station."
                    onClose={closeModal}
                >
                    <ConnectIcon size={22} />
                </ModalHero>

                <form onSubmit={submit} className="space-y-5">
                    <div className="rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-xs leading-relaxed text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200">
                        Credentials are encrypted after saving and are never displayed again. Import access can remain read-only; write access is only needed when export is enabled.
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.55fr)]">
                        <div className="pf-field !mb-0">
                            <label htmlFor="integration_name">Profile name</label>
                            <input
                                id="integration_name"
                                value={form.data.name}
                                onChange={(event) => form.setData('name', event.target.value)}
                                placeholder="e.g. Main Campus Legacy Database"
                                autoFocus
                            />
                            <InputError message={form.errors.name} className="mt-1" />
                        </div>

                        <div className="pf-field !mb-0">
                            <label htmlFor="integration_direction">Sync direction</label>
                            <PremiumSelect
                                id="integration_direction"
                                value={form.data.direction}
                                onChange={(direction) => form.setData('direction', direction)}
                                options={[
                                    { value: 'import_only', label: 'Import only' },
                                    { value: 'export_only', label: 'Export only' },
                                    { value: 'bidirectional', label: 'Import + Export' },
                                ]}
                                invalid={Boolean(form.errors.direction)}
                            />
                            <InputError message={form.errors.direction} className="mt-1" />
                        </div>
                    </div>

                    <section aria-labelledby="connection-mapping-title">
                        <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
                            <div>
                                <h4 id="connection-mapping-title" className="text-sm font-bold text-slate-900 dark:text-white">
                                    Connection &amp; table mapping
                                </h4>
                                <p id="connection-mapping-hint" className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                    Add database credentials, then map each legacy table and its columns using valid JSON.
                                </p>
                            </div>
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-[10px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                legacy_mysql
                            </span>
                        </div>

                        <div className="overflow-hidden rounded-2xl border border-[#30363d] bg-[#1e1e1e] shadow-[0_6px_8px_-6px_rgba(15,23,42,0.55)]">
                            <div className="flex items-center justify-between border-b border-[#30363d] bg-[#181818] px-4 py-2.5">
                                <div className="flex items-center gap-2">
                                    <span className="h-2.5 w-2.5 rounded-full bg-[#f87171]" aria-hidden="true" />
                                    <span className="h-2.5 w-2.5 rounded-full bg-[#fbbf24]" aria-hidden="true" />
                                    <span className="h-2.5 w-2.5 rounded-full bg-[#34d399]" aria-hidden="true" />
                                    <span className="ml-2 font-mono text-[11px] text-[#cccccc]">connection.json</span>
                                </div>
                                <div className="flex items-center gap-2 font-mono text-[10px] text-[#858585]">
                                    <span>JSON</span>
                                    <span>UTF-8</span>
                                </div>
                            </div>

                            <div className="relative h-[340px] overflow-hidden font-mono text-[12px] leading-5">
                                <pre
                                    ref={lineNumberRef}
                                    aria-hidden="true"
                                    className="pointer-events-none absolute inset-y-0 left-0 w-11 overflow-hidden border-r border-[#30363d] bg-[#181818] px-3 py-4 text-right text-[#6e7681]"
                                >
                                    {lineNumbers}
                                </pre>
                                <pre
                                    ref={codeLayerRef}
                                    aria-hidden="true"
                                    className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre px-4 py-4 pl-14 text-[#d4d4d4]"
                                >
                                    {renderedConfig}
                                </pre>
                                <textarea
                                    id="integration_config"
                                    aria-describedby="connection-mapping-hint"
                                    aria-label="Connection and table mapping JSON"
                                    spellCheck={false}
                                    value={form.data.config}
                                    onChange={(event) => form.setData('config', event.target.value)}
                                    onScroll={(event) => {
                                        if (codeLayerRef.current) {
                                            codeLayerRef.current.scrollTop = event.currentTarget.scrollTop;
                                            codeLayerRef.current.scrollLeft = event.currentTarget.scrollLeft;
                                        }
                                        if (lineNumberRef.current) {
                                            lineNumberRef.current.scrollTop = event.currentTarget.scrollTop;
                                        }
                                    }}
                                    className="absolute inset-0 h-full w-full resize-none overflow-auto border-0 bg-transparent px-4 py-4 pl-14 font-mono text-[12px] leading-5 text-transparent caret-white outline-none selection:bg-blue-500/35 focus:ring-0"
                                />
                            </div>
                        </div>
                        <InputError message={form.errors.config} className="mt-2" />
                    </section>

                    <div className="pf-modal-footer border-t border-slate-100 pt-4 dark:border-slate-800">
                        <button type="button" className="pf-btn pf-btn-secondary" onClick={closeModal} disabled={form.processing}>
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className={`pf-btn pf-btn-primary${form.processing ? ' pf-btn--loading' : ''}`}
                            disabled={form.processing}
                        >
                            {form.processing ? 'Creating profile…' : 'Create integration'}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
}

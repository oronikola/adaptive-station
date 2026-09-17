import InputError from '@/Components/InputError';
import { CalendarDaysIcon } from '@/Components/icons/calendar-days';
import { DownloadIcon } from '@/Components/icons/download';
import { SearchIcon } from '@/Components/icons/search';
import { ServerIcon } from '@/Components/icons/server';
import Modal, { ModalHero } from '@/Components/Modal';
import PremiumDatePicker from '@/Components/PremiumDatePicker';
import PremiumSelect from '@/Components/PremiumSelect';
import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';

export interface ImportIntegrationProfile {
    id: number | string;
    name: string;
}

interface NewLegacyImportModalProps {
    show: boolean;
    profiles: ImportIntegrationProfile[];
    onClose: () => void;
}

export default function NewLegacyImportModal({ show, profiles, onClose }: NewLegacyImportModalProps) {
    const form = useForm({
        integration_profile_id: profiles[0]?.id ?? '',
        date_from: '',
        date_to: '',
        commit: false,
    });

    useEffect(() => {
        if (!show) {
            form.clearErrors();
        }
    }, [show]);

    function submit(commit: boolean): void {
        form.transform((data) => ({ ...data, commit })).post(
            route('portal.imports.store'),
            { preserveScroll: true },
        );
    }

    return (
        <Modal show={show} onClose={onClose} maxWidth="2xl">
            <div className="pf-modal">
                <ModalHero
                    tone="blue"
                    title="New Legacy Import"
                    subtitle="Choose a connected source and the attendance period to preview or import."
                    onClose={onClose}
                >
                    <DownloadIcon size={22} />
                </ModalHero>

                <form onSubmit={(event) => { event.preventDefault(); submit(false); }}>
                    <div className="space-y-5 px-6 py-5 sm:px-7">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/50">
                            <div className="flex gap-3">
                                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-slate-500 shadow-sm dark:bg-slate-800 dark:text-slate-300" aria-hidden="true">
                                    <ServerIcon size={18} />
                                </span>
                                <div>
                                    <strong className="block text-sm text-slate-900 dark:text-slate-100">Safe to preview first</strong>
                                    <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">
                                        Preview is read-only. Commit performs the import, skips records already imported, and can be run again safely.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="integration_profile_id" className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-600 dark:text-slate-300">
                                <ServerIcon size={14} aria-hidden="true" />
                                Integration profile
                            </label>
                            <PremiumSelect
                                id="integration_profile_id"
                                value={form.data.integration_profile_id}
                                onChange={(profileId) => form.setData('integration_profile_id', profileId)}
                                options={profiles.map((profile) => ({ value: profile.id, label: profile.name }))}
                                placeholder="Select a connected profile"
                                invalid={Boolean(form.errors.integration_profile_id)}
                                disabled={form.processing || profiles.length === 0}
                                className="block w-full"
                            />
                            <InputError message={form.errors.integration_profile_id} className="mt-2" />
                            {profiles.length === 0 && <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">Add an integration profile before starting a legacy import.</p>}
                        </div>

                        <fieldset>
                            <legend className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-600 dark:text-slate-300">
                                <CalendarDaysIcon size={14} aria-hidden="true" />
                                Attendance period
                            </legend>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label htmlFor="date_from" className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">From</label>
                                    <PremiumDatePicker id="date_from" value={form.data.date_from} onChange={(date) => form.setData('date_from', date)} max={form.data.date_to || undefined} placeholder="Start date" disabled={form.processing} />
                                </div>
                                <div>
                                    <label htmlFor="date_to" className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">To</label>
                                    <PremiumDatePicker id="date_to" value={form.data.date_to} onChange={(date) => form.setData('date_to', date)} min={form.data.date_from || undefined} placeholder="End date" disabled={form.processing} />
                                </div>
                            </div>
                            <InputError message={form.errors.date_from ?? form.errors.date_to} className="mt-2" />
                        </fieldset>
                    </div>

                    <div className="pf-modal-footer">
                        <button type="button" className="pf-btn pf-btn-secondary" onClick={onClose} disabled={form.processing}>Cancel</button>
                        <button type="submit" className="pf-btn pf-btn-secondary" disabled={form.processing || profiles.length === 0}>
                            <SearchIcon size={16} />
                            {form.processing ? 'Running…' : 'Preview Import'}
                        </button>
                        <button type="button" className={'pf-btn pf-btn-primary' + (form.processing ? ' pf-btn--loading' : '')} onClick={() => submit(true)} disabled={form.processing || profiles.length === 0}>
                            <DownloadIcon size={16} />
                            {form.processing ? 'Importing…' : 'Commit Import'}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
}

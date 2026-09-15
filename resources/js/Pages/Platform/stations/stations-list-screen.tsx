import InputError from '@/Components/InputError';
import Modal from '@/Components/Modal';
import SecretOnceCallout from '@/Components/SecretOnceCallout';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import Pagination from '@/Components/admin/Pagination';
import { PageProps, PaginatedData, Tenant } from '@/types';
import '../../../../css/platform-dashboard.css';
import '../../../../css/platform-overview.css';

interface StationRow {
    id: number;
    name: string;
    station_code: string;
    status: string;
    tenant?: { name: string } | null;
    tenant_id: number;
}

interface StationsListScreenProps {
    stations: PaginatedData<StationRow>;
    tenants: Tenant[];
}

interface PagePropsWithFlash {
    flash?: {
        pairingLink?: string;
    };
}

// Mirrors server-side slugification for station codes
function slugifyStation(value: string): string {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export default function StationsListScreen({ stations, tenants }: StationsListScreenProps) {
    const { flash } = usePage().props as PagePropsWithFlash;
    const { auth } = usePage<PageProps>().props;
    const canManage = auth.user.role === 'platform_super_admin';

    const [createOpen, setCreateOpen] = useState(false);
    const [stationCodeTouched, setStationCodeTouched] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({
        tenant_id: tenants[0]?.id ?? '',
        name: '',
        station_code: '',
    });

    function handleStationNameChange(value: string) {
        setData((current) => ({
            ...current,
            name: value,
            station_code: stationCodeTouched ? current.station_code : slugifyStation(value),
        }));
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post(route('platform.stations.store'), {
            onSuccess: () => {
                setCreateOpen(false);
                setStationCodeTouched(false);
                reset();
            },
        });
    }

    function resetLink(station: StationRow) {
        router.post(route('platform.stations.pairing-link', station.id), {
            tenant_id: station.tenant_id,
        });
    }

    const [deletingStation, setDeletingStation] = useState<StationRow | null>(null);
    const deleteForm = useForm({ confirm_code: '', tenant_id: '' });
    const deleteConfirmed = deletingStation !== null && deleteForm.data.confirm_code === deletingStation.station_code;

    function openDeleteModal(station: StationRow) {
        setDeletingStation(station);
        deleteForm.setData({ confirm_code: '', tenant_id: String(station.tenant_id) });
    }

    function submitDeleteStation(e: React.FormEvent) {
        e.preventDefault();
        if (!deletingStation || !deleteConfirmed) return;
        deleteForm.delete(route('platform.stations.destroy', deletingStation.id), {
            onSuccess: () => {
                setDeletingStation(null);
                deleteForm.reset();
            },
        });
    }

    return (
        <PlatformLayout>
            <Head title="Stations" />

            <div className="pf-dashboard pft-page">
                <div className="pft-hero">
                    <div className="pft-hero-main">
                        <span className="pft-hero-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24">
                                <rect x="4" y="5" width="16" height="10" rx="1.6" />
                                <rect x="9.5" y="17" width="5" height="2" rx="1" />
                                <rect x="7" y="19.4" width="10" height="1.6" rx="0.8" />
                            </svg>
                        </span>
                        <div>
                            <h1 className="pft-hero-title">Stations</h1>
                            <p className="pft-hero-subtitle">
                                Every tap-in device registered across all schools on
                                Adaptive Station.
                            </p>
                        </div>
                    </div>
                    {canManage && (
                        <div className="pft-hero-actions">
                            <button
                                type="button"
                                className="pf-btn pf-btn-primary"
                                onClick={() => setCreateOpen(true)}
                            >
                                <svg viewBox="0 0 24 24">
                                    <path d="M12 5v14M5 12h14" />
                                </svg>
                                Add Station
                            </button>
                        </div>
                    )}
                </div>

                <SecretOnceCallout label="Station link" value={flash?.pairingLink} />

                <div className="pf-panel">
                    <div className="pf-panel-header">
                        <div>
                            <h2 className="pf-panel-title">All Stations</h2>
                            <p className="pf-panel-count">
                                {stations.from !== null ? `${stations.from}–${stations.to} of ${stations.total}` : 'No results'}
                            </p>
                        </div>
                    </div>

                    <div className="pf-table-wrap">
                        <table className="pf-table">
                            <thead>
                                <tr>
                                    <th scope="col">Name</th>
                                    <th scope="col">Code</th>
                                    <th scope="col">School</th>
                                    <th scope="col">Status</th>
                                    <th scope="col">
                                        <span className="sr-only">Actions</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {stations.data.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="pf-empty">
                                            No stations registered yet.
                                        </td>
                                    </tr>
                                )}

                                {stations.data.map((station) => (
                                    <tr key={station.id}>
                                        <td className="pf-tenant-name">{station.name}</td>
                                        <td className="font-mono">{station.station_code}</td>
                                        <td>{station.tenant?.name ?? '—'}</td>
                                        <td>
                                            <span
                                                className={
                                                    'pf-pill ' +
                                                    ({
                                                        active: 'pf-pill--active',
                                                        pending_activation: 'pf-pill--suspended',
                                                        disabled: 'pf-pill--archived',
                                                        retired: 'pf-pill--archived',
                                                    }[station.status] ?? 'pf-pill--inactive')
                                                }
                                            >
                                                {station.status.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td>
                                            {canManage && (
                                                <button
                                                    type="button"
                                                    onClick={() => resetLink(station)}
                                                    className="pf-row-action"
                                                >
                                                    Reset Link
                                                    <svg viewBox="0 0 24 24">
                                                        <path d="M9 6l6 6-6 6" />
                                                    </svg>
                                                </button>
                                            )}
                                            {canManage && (
                                                <button
                                                    type="button"
                                                    onClick={() => openDeleteModal(station)}
                                                    className="pf-row-action pf-row-action--danger"
                                                >
                                                    <svg viewBox="0 0 24 24">
                                                        <path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m-7 0v12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V7" />
                                                    </svg>
                                                    Delete
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <Pagination links={stations.links} />
                </div>
            </div>

            <Modal show={createOpen} onClose={() => { setCreateOpen(false); setStationCodeTouched(false); reset(); }}>
                <form onSubmit={submit} className="pf-modal">
                    <div className="pf-modal-header">
                        <h3 className="pf-modal-title">Add Station</h3>
                        <button
                            type="button"
                            className="pf-modal-close"
                            onClick={() => { setCreateOpen(false); setStationCodeTouched(false); reset(); }}
                            aria-label="Close"
                        >
                            <svg viewBox="0 0 24 24">
                                <path d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="pf-field">
                        <label htmlFor="tenant_id">School</label>
                        <select
                            id="tenant_id"
                            value={data.tenant_id}
                            onChange={(e) => setData('tenant_id', e.target.value as unknown as number)}
                        >
                            {tenants.map((tenant) => (
                                <option key={tenant.id} value={tenant.id}>
                                    {tenant.name}
                                </option>
                            ))}
                        </select>
                        <InputError message={errors.tenant_id} className="mt-2" />
                    </div>

                    <div className="pf-field">
                        <label htmlFor="name">Station name</label>
                        <input
                            id="name"
                            type="text"
                            value={data.name}
                            onChange={(e) => handleStationNameChange(e.target.value)}
                            autoFocus
                            required
                        />
                        <InputError message={errors.name} className="mt-2" />
                    </div>

                    <div className="pf-field">
                        <label htmlFor="station_code">Station code</label>
                        <input
                            id="station_code"
                            type="text"
                            value={data.station_code}
                            onChange={(e) => { setStationCodeTouched(true); setData('station_code', e.target.value); }}
                            className="font-mono"
                            required
                        />
                        <p className="pf-field-hint">Auto-filled from the station name — edit if you want something different.</p>
                        <InputError message={errors.station_code} className="mt-2" />
                    </div>

                    <div className="pf-modal-footer">
                        <button
                            type="button"
                            className="pf-btn pf-btn-secondary"
                            onClick={() => { setCreateOpen(false); setStationCodeTouched(false); reset(); }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className={'pf-btn pf-btn-primary' + (processing ? ' pf-btn--loading' : '')}
                            disabled={processing}
                        >
                            Create
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal
                show={deletingStation !== null}
                onClose={() => {
                    setDeletingStation(null);
                    deleteForm.reset();
                }}
            >
                <form onSubmit={submitDeleteStation} className="pf-modal">
                    <div className="pf-modal-header">
                        <h2 className="pf-modal-title">Delete station?</h2>
                        <p className="pf-modal-desc">
                            <strong>{deletingStation?.name}</strong> will be permanently deleted, along with its
                            device credentials and station link. This only works for a station that has never
                            recorded an attendance tap — one with real attendance history must be kept.
                        </p>
                    </div>

                    <div className="pf-field">
                        <label htmlFor="confirm_code">
                            Type "{deletingStation?.station_code}" to confirm
                        </label>
                        <input
                            id="confirm_code"
                            type="text"
                            className="font-mono"
                            value={deleteForm.data.confirm_code}
                            onChange={(e) => deleteForm.setData('confirm_code', e.target.value)}
                            autoFocus
                        />
                        <InputError message={deleteForm.errors.confirm_code} className="mt-2" />
                    </div>

                    <div className="pf-modal-footer">
                        <button
                            type="button"
                            className="pf-btn pf-btn-secondary"
                            onClick={() => {
                                setDeletingStation(null);
                                deleteForm.reset();
                            }}
                            disabled={deleteForm.processing}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className={'pf-btn pf-btn-danger' + (deleteForm.processing ? ' pf-btn--loading' : '')}
                            disabled={deleteForm.processing || !deleteConfirmed}
                        >
                            Delete station
                        </button>
                    </div>
                </form>
            </Modal>
        </PlatformLayout>
    );
}

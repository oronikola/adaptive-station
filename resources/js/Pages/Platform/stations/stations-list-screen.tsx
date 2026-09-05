import InputError from '@/Components/InputError';
import Modal from '@/Components/Modal';
import SecretOnceCallout from '@/Components/SecretOnceCallout';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { PaginatedData, PaginationLink, Tenant } from '@/types';
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

interface PaginationBarProps {
    links: PaginationLink[];
}

function PaginationBar({ links }: PaginationBarProps) {
    if (!links || links.length <= 3) {
        return null;
    }

    return (
        <nav className="pf-pagination">
            {links.map((link, index) => {
                const label = link.label
                    .replace('&laquo; Previous', '‹ Previous')
                    .replace('Next &raquo;', 'Next ›');

                if (link.url === null) {
                    return (
                        <span key={index} className="pf-page-link pf-page-link--disabled">
                            {label}
                        </span>
                    );
                }

                return (
                    <Link
                        key={index}
                        href={link.url}
                        preserveScroll
                        className={
                            'pf-page-link' +
                            (link.active ? ' pf-page-link--active' : '')
                        }
                    >
                        {label}
                    </Link>
                );
            })}
        </nav>
    );
}

interface StationsListScreenProps {
    stations: PaginatedData<StationRow>;
    tenants: Tenant[];
}

interface PagePropsWithFlash {
    flash?: {
        activationCode?: string;
    };
}

export default function StationsListScreen({ stations, tenants }: StationsListScreenProps) {
    const { flash } = usePage().props as PagePropsWithFlash;

    const [createOpen, setCreateOpen] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({
        tenant_id: tenants[0]?.id ?? '',
        name: '',
        station_code: '',
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post(route('platform.stations.store'), {
            onSuccess: () => {
                setCreateOpen(false);
                reset();
            },
        });
    }

    function issueCode(station: StationRow) {
        router.post(route('platform.stations.activation-code', station.id), {
            tenant_id: station.tenant_id,
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
                </div>

                <SecretOnceCallout label="Activation code" value={flash?.activationCode} />

                <div className="pf-panel">
                    <div className="pf-panel-header">
                        <div>
                            <h2 className="pf-panel-title">All Stations</h2>
                            <p className="pf-panel-count">
                                {stations.data.length} shown
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
                                                    (station.status === 'active'
                                                        ? 'pf-pill--active'
                                                        : 'pf-pill--inactive')
                                                }
                                            >
                                                {station.status}
                                            </span>
                                        </td>
                                        <td>
                                            {station.status === 'pending_activation' && (
                                                <button
                                                    type="button"
                                                    onClick={() => issueCode(station)}
                                                    className="pf-row-action"
                                                >
                                                    Issue Activation Code
                                                    <svg viewBox="0 0 24 24">
                                                        <path d="M9 6l6 6-6 6" />
                                                    </svg>
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <PaginationBar links={stations.links} />
                </div>
            </div>

            <Modal show={createOpen} onClose={() => setCreateOpen(false)}>
                <form onSubmit={submit} className="pf-modal">
                    <div className="pf-modal-header">
                        <h3 className="pf-modal-title">Add Station</h3>
                        <button
                            type="button"
                            className="pf-modal-close"
                            onClick={() => setCreateOpen(false)}
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
                            onChange={(e) => setData('name', e.target.value)}
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
                            onChange={(e) => setData('station_code', e.target.value)}
                            className="font-mono"
                            required
                        />
                        <InputError message={errors.station_code} className="mt-2" />
                    </div>

                    <div className="pf-modal-footer">
                        <button
                            type="button"
                            className="pf-btn pf-btn-secondary"
                            onClick={() => setCreateOpen(false)}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="pf-btn pf-btn-primary"
                            disabled={processing}
                        >
                            Create
                        </button>
                    </div>
                </form>
            </Modal>
        </PlatformLayout>
    );
}

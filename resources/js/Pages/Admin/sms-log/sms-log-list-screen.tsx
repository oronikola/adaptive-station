import Pagination from '@/Components/admin/Pagination';
import PremiumSelect from '@/Components/PremiumSelect';
import Modal, { ModalHero } from '@/Components/Modal';
import { BadgeAlertIcon } from '@/Components/icons/badge-alert';
import { CheckIcon } from '@/Components/icons/check';
import { ClockIcon } from '@/Components/icons/clock';
import { FileTextIcon } from '@/Components/icons/file-text';
import { PhoneIcon } from '@/Components/icons/phone';
import { RotateCWIcon } from '@/Components/icons/rotate-cw';
import { SendIcon } from '@/Components/icons/send';
import { SmartphoneNfcIcon } from '@/Components/icons/smartphone-nfc';
import { useToast } from '@/Components/toast/ToastProvider';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { PageProps, PaginatedData } from '@/types';
import '../../../../css/platform-dashboard.css';
import '../../../../css/platform-overview.css';

interface SmsOutboxRow {
    id: string;
    phone_number: string;
    message: string;
    status: string;
    attempts: number;
    sent_at: string | null;
    delivered_at: string | null;
    last_error: string | null;
    created_at: string;
    is_plausible_phone_number: boolean;
    // Only ever set once a fleet phone has actually claimed the message
    // (sent/delivered) — a failure clears it, so pending/failed/expired
    // rows show "—" here, not a bug.
    device: { id: string; label: string } | null;
    // 0 or 1 (SIM 1 / SIM 2) — only present once the fleet phone's app
    // build is new enough to report which SIM it sent from; null on an
    // older build's message, not a data problem.
    sim_slot: number | null;
}

interface Filters {
    status?: string;
    device_id?: string;
    phone_number?: string;
    date_from?: string;
    date_to?: string;
}

interface Stats {
    total: number;
    pending: number;
    sent: number;
    delivered: number;
    failed: number;
}

interface SmsLogListScreenProps {
    messages: PaginatedData<SmsOutboxRow>;
    devices: { id: string; label: string }[];
    filters: Filters;
    stats: Stats;
}

const STATUS_PILL_CLASS: Record<string, string> = {
    sent: 'pf-pill--active',
    delivered: 'pf-pill--active',
    pending: 'pf-pill--inactive',
    claimed: 'pf-pill--inactive',
    failed: 'pf-pill--danger',
    expired: 'pf-pill--danger',
};

interface StatCardProps {
    label: string;
    value: number;
    icon: React.ReactNode;
    tone: 'blue' | 'amber' | 'violet' | 'green' | 'red';
}

function StatCard({ label, value, icon, tone }: StatCardProps) {
    return (
        <div className="pft-stat-card">
            <div className="pft-stat-card-top">
                <p className="pft-stat-label">{label}</p>
                <span className={`pft-stat-icon pft-stat-icon--${tone}`}>{icon}</span>
            </div>
            <p className="pft-stat-value">{value}</p>
        </div>
    );
}

const ICON_PENDING = <ClockIcon size={18} />;
const ICON_SENT = <SendIcon size={18} />;
const ICON_DELIVERED = <CheckIcon size={18} />;
const ICON_FAILED = <BadgeAlertIcon size={18} />;

// hour12 explicit, not left to the browser locale default — some locales
// (e.g. en-GB) render toLocaleString()'s time in 24-hour "military" format
// otherwise.
function formatDateTime(value: string | Date): string {
    return new Date(value).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
}

export default function SmsLogListScreen({ messages, devices, filters, stats }: SmsLogListScreenProps) {
    const { tenant } = usePage<PageProps>().props;
    const { showToast } = useToast();
    const [isFiltering, setIsFiltering] = useState(false);
    const [phoneNumberError, setPhoneNumberError] = useState(false);
    const [resendingRow, setResendingRow] = useState<SmsOutboxRow | null>(null);
    const resendForm = useForm({});
    const hasFilters = Boolean(filters.status || filters.device_id || filters.phone_number || filters.date_from || filters.date_to);
    const { data, setData } = useForm({
        status: filters.status ?? '',
        device_id: filters.device_id ?? '',
        phone_number: filters.phone_number ?? '',
        date_from: filters.date_from ?? '',
        date_to: filters.date_to ?? '',
    });

    // Guard: prevent date_to before date_from, same pattern as Audit Log.
    const today = new Date().toISOString().slice(0, 10);

    function handleDateFrom(value: string) {
        setData((d) => ({
            ...d,
            date_from: value,
            date_to: d.date_to && d.date_to < value ? '' : d.date_to,
        }));
    }

    function submit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsFiltering(true);
        router.get(route('portal.sms-log.index'), data, {
            preserveState: true,
            onFinish: () => setIsFiltering(false),
        });
    }

    // Opens a standalone preview in a new tab (not window.print() on this
    // page) so the admin can review the report first — printing/saving as
    // PDF happens from a button on that page, not immediately on click.
    // Always clickable (not disabled) so the validation message below
    // actually gets a chance to show — a disabled button never fires
    // onClick at all.
    function handlePrint() {
        const phoneNumber = data.phone_number.trim();
        if (!phoneNumber) {
            setPhoneNumberError(true);
            showToast({
                type: 'error',
                message: 'Put a phone number first.',
                description: 'Printing needs one specific number\'s log — enter it above, then try again.',
            });
            return;
        }

        setPhoneNumberError(false);
        const params = new URLSearchParams();
        params.set('phone_number', phoneNumber);
        if (data.date_from) params.set('date_from', data.date_from);
        if (data.date_to) params.set('date_to', data.date_to);

        window.open(`${route('portal.sms-log.print')}?${params.toString()}`, '_blank');
    }

    // Only a dead-lettered row is a candidate — pending/claimed/sent/
    // delivered aren't stuck, so resending would just create a duplicate.
    function canResend(row: SmsOutboxRow): boolean {
        return row.status === 'failed' || row.status === 'expired';
    }

    function openResend(row: SmsOutboxRow) {
        if (!row.is_plausible_phone_number) {
            showToast({
                type: 'error',
                message: "That number doesn't look valid.",
                description: `"${row.phone_number}" isn't shaped like a real phone number, so resending would just waste a message on it.`,
            });
            return;
        }

        setResendingRow(row);
    }

    function submitResend(e: React.FormEvent) {
        e.preventDefault();
        if (!resendingRow) return;
        resendForm.patch(route('portal.sms-log.resend', resendingRow.id), {
            onSuccess: () => setResendingRow(null),
        });
    }

    return (
        <AdminLayout>
            <Head title="SMS Delivery Log" />

            <div className="pf-dashboard pft-page">
                <div className="pft-hero">
                    <div className="pft-hero-main">
                        <span className="pft-hero-icon" aria-hidden="true">
                            <SmartphoneNfcIcon size={22} />
                        </span>
                        <div>
                            <h1 className="pft-hero-title">SMS Delivery Log</h1>
                            <p className="pft-hero-subtitle">
                                Every tap-alert SMS attempted for {tenant?.name ?? 'this school'} —
                                which phone numbers were sent/delivered vs. still pending or failed.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="pft-stat-grid">
                    <StatCard label="Pending" value={stats.pending} icon={ICON_PENDING} tone="amber" />
                    <StatCard label="Sent" value={stats.sent} icon={ICON_SENT} tone="violet" />
                    <StatCard label="Delivered" value={stats.delivered} icon={ICON_DELIVERED} tone="green" />
                    <StatCard label="Failed" value={stats.failed} icon={ICON_FAILED} tone="red" />
                </div>

                <form onSubmit={submit} className="pf-filter-bar" role="search">
                    <div className="pf-field">
                        <label htmlFor="status">Status</label>
                        <PremiumSelect
                            id="status"
                            value={data.status}
                            onChange={(value) => setData('status', value)}
                            options={[
                                { value: '', label: 'All' },
                                { value: 'pending', label: 'Pending' },
                                { value: 'claimed', label: 'Claimed' },
                                { value: 'sent', label: 'Sent' },
                                { value: 'delivered', label: 'Delivered' },
                                { value: 'failed', label: 'Failed' },
                                { value: 'expired', label: 'Expired' },
                            ]}
                            placeholder="All"
                        />
                    </div>

                    <div className="pf-field">
                        <label htmlFor="device_id">Phone</label>
                        <PremiumSelect
                            id="device_id"
                            value={data.device_id}
                            onChange={(value) => setData('device_id', value)}
                            options={[
                                { value: '', label: 'All phones' },
                                ...devices.map((device) => ({
                                    value: String(device.id),
                                    label: device.label,
                                })),
                            ]}
                            placeholder="All phones"
                        />
                    </div>

                    <div className={'pf-field' + (phoneNumberError ? ' pf-field--error' : '')}>
                        <label htmlFor="phone_number">Phone number</label>
                        <input
                            id="phone_number"
                            type="text"
                            value={data.phone_number}
                            onChange={(e) => {
                                setData('phone_number', e.target.value);
                                if (phoneNumberError) setPhoneNumberError(false);
                            }}
                            placeholder="e.g. 0917..."
                            aria-invalid={phoneNumberError}
                        />
                    </div>

                    <div className="pf-field">
                        <label htmlFor="date_from">From</label>
                        <input
                            id="date_from"
                            type="date"
                            value={data.date_from}
                            max={today}
                            onChange={(e) => handleDateFrom(e.target.value)}
                        />
                    </div>

                    <div className="pf-field">
                        <label htmlFor="date_to">To</label>
                        <input
                            id="date_to"
                            type="date"
                            value={data.date_to}
                            min={data.date_from || undefined}
                            max={today}
                            onChange={(e) => setData('date_to', e.target.value)}
                        />
                    </div>

                    <div className="pf-filter-bar-actions">
                        <button
                            type="submit"
                            className={'pf-btn pf-btn-primary' + (isFiltering ? ' pf-btn--loading' : '')}
                            disabled={isFiltering}
                        >
                            Filter
                        </button>
                        {hasFilters && (
                            <Link
                                href={route('portal.sms-log.index')}
                                className="pf-btn pf-btn-secondary"
                            >
                                Reset
                            </Link>
                        )}
                    </div>
                </form>

                <div className="pf-panel">
                    <div className="pf-panel-header">
                        <div>
                            <h2 className="pf-panel-title">Messages</h2>
                            <p className="pf-panel-count">
                                {messages.from !== null ? `${messages.from}–${messages.to} of ${messages.total}` : 'No results'}
                            </p>
                        </div>
                        <button
                            type="button"
                            className="pf-btn pf-btn-secondary"
                            onClick={handlePrint}
                        >
                            <FileTextIcon size={16} />
                            Print
                        </button>
                    </div>

                    {messages.data.length === 0 ? (
                        <div className="pf-empty-state">
                            <span className="pf-empty-state-icon">
                                <SmartphoneNfcIcon size={26} />
                            </span>
                            <div>
                                <strong>{hasFilters ? 'No matching messages' : 'No SMS messages yet'}</strong>
                                <p>
                                    {hasFilters
                                        ? 'Try clearing filters or searching a different phone number.'
                                        : 'Tap alerts will appear here as fleet phones claim and send them.'}
                                </p>
                            </div>
                        </div>
                    ) : (
                    <div className="pf-table-wrap">
                        <table className="pf-table sms-log-table">
                            <thead>
                                <tr>
                                    <th scope="col">When</th>
                                    <th scope="col">Phone</th>
                                    <th scope="col">Device</th>
                                    <th scope="col">SIM</th>
                                    <th scope="col">Status</th>
                                    <th scope="col">Error</th>
                                    <th scope="col"><span className="sr-only">Actions</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                {messages.data.map((row) => (
                                    <tr key={row.id}>
                                        <td><span className="sms-log-meta"><ClockIcon size={14} aria-hidden="true" />{formatDateTime(row.created_at)}</span></td>
                                        <td><span className="sms-log-phone"><PhoneIcon size={14} aria-hidden="true" />{row.phone_number}</span></td>
                                        <td>{row.device ? <span className="sms-log-device"><span className="sms-log-device-icon" aria-hidden="true"><SmartphoneNfcIcon size={15} /></span>{row.device.label}</span> : <span className="sms-log-empty-value">Unassigned</span>}</td>
                                        <td>{row.sim_slot !== null ? <span className="sms-log-sim">SIM {row.sim_slot + 1}</span> : <span className="sms-log-empty-value">—</span>}</td>
                                        <td>
                                            <span
                                                className={
                                                    'pf-pill ' +
                                                    (STATUS_PILL_CLASS[row.status] ?? 'pf-pill--inactive')
                                                }
                                            >
                                                {row.status}
                                            </span>
                                        </td>
                                        <td>{row.last_error ? <span className="sms-log-error"><BadgeAlertIcon size={14} aria-hidden="true" />{row.last_error}</span> : <span className="sms-log-empty-value">No error</span>}</td>
                                        <td className="sms-log-action-cell">
                                            {canResend(row) && (
                                                <button
                                                    type="button"
                                                    className="pf-row-action pf-row-action--control"
                                                    onClick={() => openResend(row)}
                                                >
                                                    <RotateCWIcon size={15} aria-hidden="true" />
                                                    Resend
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    )}

                    <Pagination links={messages.links} />
                </div>
            </div>

            {/* Resend confirmation modal */}
            <Modal show={resendingRow !== null} onClose={() => setResendingRow(null)}>
                <form onSubmit={submitResend} className="pf-modal">
                    <ModalHero
                        tone="blue"
                        title="Resend Message"
                        subtitle="The tap alert goes back into the queue for the next available device, with a fresh attempt count."
                        onClose={() => setResendingRow(null)}
                    >
                        <RotateCWIcon size={22} />
                    </ModalHero>

                    <p style={{ padding: '0 0 8px' }}>
                        Resend the tap alert to <strong className="font-mono">{resendingRow?.phone_number}</strong>?
                        It goes back into the queue for the next available device to send, with a
                        fresh attempt count.
                    </p>

                    <div className="pf-modal-footer">
                        <button
                            type="button"
                            className="pf-btn pf-btn-secondary"
                            onClick={() => setResendingRow(null)}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className={'pf-btn pf-btn-primary' + (resendForm.processing ? ' pf-btn--loading' : '')}
                            disabled={resendForm.processing}
                        >
                            Resend
                        </button>
                    </div>
                </form>
            </Modal>
        </AdminLayout>
    );
}

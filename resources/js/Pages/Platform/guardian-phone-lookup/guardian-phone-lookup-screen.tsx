import Pagination from '@/Components/admin/Pagination';
import { PhoneIcon } from '@/Components/icons/phone';
import { UsersIcon } from '@/Components/icons/users';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { PaginatedData } from '@/types';
import '../../../../css/platform-dashboard.css';
import '../../../../css/platform-overview.css';

interface Student {
    id: string;
    display_name: string;
    external_id: string | null;
    grade_level: string | null;
    section: string | null;
    is_active: boolean;
}

interface GuardianAccount {
    id: string;
    name: string;
    phone_number: string;
    is_active: boolean;
    tenant: { id: string; name: string; code: string } | null;
    students: Student[];
}

interface GuardianPhoneLookupScreenProps {
    guardianAccounts: PaginatedData<GuardianAccount>;
    filters: { phone_number: string };
}

export default function GuardianPhoneLookupScreen({ guardianAccounts, filters }: GuardianPhoneLookupScreenProps) {
    const [isFiltering, setIsFiltering] = useState(false);
    const { data, setData } = useForm({ phone_number: filters.phone_number });

    function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setIsFiltering(true);
        router.get(route('platform.guardian-phone-lookup.index'), data, {
            preserveState: true,
            onFinish: () => setIsFiltering(false),
        });
    }

    return (
        <PlatformLayout>
            <Head title="Guardian Phone Lookup" />

            <div className="pf-dashboard pft-page">
                <div className="pft-hero">
                    <div className="pft-hero-main">
                        <span className="pft-hero-icon" aria-hidden="true">
                            <PhoneIcon size={22} />
                        </span>
                        <div>
                            <h1 className="pft-hero-title">Guardian Phone Lookup</h1>
                            <p className="pft-hero-subtitle">
                                Find a guardian phone number and every student linked to it, across all schools.
                            </p>
                        </div>
                    </div>
                </div>

                <form onSubmit={submit} className="pf-filter-bar" role="search">
                    <div className="pf-field">
                        <label htmlFor="phone_number">Phone number</label>
                        <input
                            id="phone_number"
                            type="search"
                            value={data.phone_number}
                            onChange={(event) => setData('phone_number', event.target.value)}
                            placeholder="e.g. 0917 or +63917"
                        />
                    </div>

                    <div className="pf-filter-bar-actions">
                        <button
                            type="submit"
                            className={'pf-btn pf-btn-primary' + (isFiltering ? ' pf-btn--loading' : '')}
                            disabled={isFiltering}
                        >
                            Search
                        </button>
                        {filters.phone_number && (
                            <Link href={route('platform.guardian-phone-lookup.index')} className="pf-btn pf-btn-secondary">
                                Reset
                            </Link>
                        )}
                    </div>
                </form>

                <div className="pf-panel">
                    <div className="pf-panel-header">
                        <div>
                            <h2 className="pf-panel-title">Guardian numbers</h2>
                            <p className="pf-panel-count">
                                {guardianAccounts.from !== null
                                    ? `${guardianAccounts.from}–${guardianAccounts.to} of ${guardianAccounts.total}`
                                    : 'No results'}
                            </p>
                        </div>
                    </div>

                    {guardianAccounts.data.length === 0 ? (
                        <div className="pf-empty-state">
                            <span className="pf-empty-state-icon" aria-hidden="true"><PhoneIcon size={26} /></span>
                            <div>
                                <strong>No guardian phone numbers found</strong>
                                <p>Try a different part of the phone number.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="pf-table-wrap">
                            <table className="pf-table">
                                <thead>
                                    <tr>
                                        <th scope="col">Phone number</th>
                                        <th scope="col">Guardian</th>
                                        <th scope="col">School</th>
                                        <th scope="col">Linked students</th>
                                        <th scope="col">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {guardianAccounts.data.map((guardian) => (
                                        <tr key={guardian.id}>
                                            <td><span className="sms-log-phone"><PhoneIcon size={14} aria-hidden="true" />{guardian.phone_number}</span></td>
                                            <td><span className="pf-tenant-name">{guardian.name}</span></td>
                                            <td>{guardian.tenant?.name ?? 'Unknown school'}</td>
                                            <td>
                                                {guardian.students.length === 0 ? (
                                                    <span className="sms-log-empty-value">No linked students</span>
                                                ) : (
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {guardian.students.map((student) => (
                                                            <span key={student.id} className="pfs-meta-pill pfs-meta-pill--school">
                                                                <UsersIcon size={13} aria-hidden="true" />
                                                                {student.display_name}
                                                                {student.external_id ? ` (${student.external_id})` : ''}
                                                                {!student.is_active ? ' — inactive' : ''}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                <span className={'pf-pill ' + (guardian.is_active ? 'pf-pill--active' : 'pf-pill--inactive')}>
                                                    {guardian.is_active ? 'active' : 'inactive'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <Pagination links={guardianAccounts.links} />
                </div>
            </div>
        </PlatformLayout>
    );
}

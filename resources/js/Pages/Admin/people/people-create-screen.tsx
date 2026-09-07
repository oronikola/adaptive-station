import InputError from '@/Components/InputError';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import '../../../../css/platform-dashboard.css';
import '../../../../css/platform-overview.css';

export default function PeopleCreateScreen() {
    const { data, setData, post, processing, errors } = useForm({
        person_type: 'student',
        first_name: '',
        middle_name: '',
        last_name: '',
        display_name: '',
        grade_level: '',
        section: '',
        external_id: '',
        photo_url: '',
    });

    function submit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        post(route('portal.people.store'));
    }

    return (
        <AdminLayout>
            <Head title="Add Person" />

            <div className="pf-dashboard pft-page">
                <Link href={route('portal.people.index')} className="pft-panel-link" style={{ marginBottom: 14 }}>
                    <svg viewBox="0 0 24 24">
                        <path d="m15 6-6 6 6 6" />
                    </svg>
                    Back to People
                </Link>

                <div className="pft-hero">
                    <div className="pft-hero-main">
                        <span className="pft-hero-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24">
                                <circle cx="8.5" cy="8.5" r="3" />
                                <circle cx="16" cy="9.5" r="2.6" />
                                <path d="M3.2 19.5a5.5 4.6 0 0 1 11 0z" />
                                <path d="M12.8 19.5a5.2 4.2 0 0 1 10.4 0z" />
                            </svg>
                        </span>
                        <div>
                            <h1 className="pft-hero-title">Add Person</h1>
                            <p className="pft-hero-subtitle">
                                Create a new student or staff record for your school.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="pf-panel">
                    <form onSubmit={submit} className="pft-form-panel">
                        <div className="pf-field">
                            <label htmlFor="person_type">Type</label>
                            <select
                                id="person_type"
                                value={data.person_type}
                                onChange={(e) =>
                                    setData('person_type', e.target.value)
                                }
                            >
                                <option value="student">Student</option>
                                <option value="staff">Staff</option>
                            </select>
                            <InputError message={errors.person_type} className="mt-2" />
                        </div>

                        <div className="pft-form-grid">
                            <div className="pf-field">
                                <label htmlFor="first_name">First name</label>
                                <input
                                    id="first_name"
                                    type="text"
                                    value={data.first_name}
                                    onChange={(e) => setData('first_name', e.target.value)}
                                    required
                                />
                                <InputError message={errors.first_name} className="mt-2" />
                            </div>

                            <div className="pf-field">
                                <label htmlFor="last_name">Last name</label>
                                <input
                                    id="last_name"
                                    type="text"
                                    value={data.last_name}
                                    onChange={(e) => setData('last_name', e.target.value)}
                                    required
                                />
                                <InputError message={errors.last_name} className="mt-2" />
                            </div>

                            <div className="pf-field">
                                <label htmlFor="middle_name">Middle name</label>
                                <input
                                    id="middle_name"
                                    type="text"
                                    value={data.middle_name}
                                    onChange={(e) => setData('middle_name', e.target.value)}
                                />
                                <InputError message={errors.middle_name} className="mt-2" />
                            </div>
                        </div>

                        <div className="pf-field">
                            <label htmlFor="display_name">
                                Display name (optional — derived from the name above if left blank)
                            </label>
                            <input
                                id="display_name"
                                type="text"
                                value={data.display_name}
                                onChange={(e) => setData('display_name', e.target.value)}
                            />
                            <InputError message={errors.display_name} className="mt-2" />
                        </div>

                        <div className="pft-form-grid">
                            <div className="pf-field">
                                <label htmlFor="grade_level">Grade level</label>
                                <input
                                    id="grade_level"
                                    type="text"
                                    value={data.grade_level}
                                    onChange={(e) => setData('grade_level', e.target.value)}
                                />
                                <InputError message={errors.grade_level} className="mt-2" />
                            </div>

                            <div className="pf-field">
                                <label htmlFor="section">Section</label>
                                <input
                                    id="section"
                                    type="text"
                                    value={data.section}
                                    onChange={(e) => setData('section', e.target.value)}
                                />
                                <InputError message={errors.section} className="mt-2" />
                            </div>
                        </div>

                        <div className="pf-field">
                            <label htmlFor="external_id">External ID (from SIS, optional)</label>
                            <input
                                id="external_id"
                                type="text"
                                value={data.external_id}
                                onChange={(e) => setData('external_id', e.target.value)}
                            />
                            <InputError message={errors.external_id} className="mt-2" />
                        </div>

                        <div className="pf-field">
                            <label htmlFor="photo_url">Photo URL (optional)</label>
                            <input
                                id="photo_url"
                                type="text"
                                value={data.photo_url}
                                onChange={(e) => setData('photo_url', e.target.value)}
                            />
                            <InputError message={errors.photo_url} className="mt-2" />
                        </div>

                        <div className="pft-form-actions">
                            <Link href={route('portal.people.index')} className="pf-btn pf-btn-secondary">
                                Cancel
                            </Link>
                            <button type="submit" className="pf-btn pf-btn-primary" disabled={processing}>
                                Create Person
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AdminLayout>
    );
}

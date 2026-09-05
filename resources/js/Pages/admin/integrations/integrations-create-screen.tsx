import InputError from '@/Components/InputError';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import '../../../../css/platform-dashboard.css';

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

    function submit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        post(route('portal.integrations.store'));
    }

    return (
        <AdminLayout>
            <Head title="New Integration Profile" />

            <div className="pf-dashboard">
                <div className="pf-dashboard-header">
                    <div>
                        <p className="pf-dashboard-kicker">Admin overview</p>
                        <h1 className="pf-dashboard-title">New Integration Profile</h1>
                        <p className="pf-dashboard-subtitle">
                            Connects to a school's existing legacy tapping database
                            (read-only for roster/attendance import; write access
                            only if you enable export). Credentials are encrypted
                            and never shown again after saving.
                        </p>
                    </div>
                    <Link href={route('portal.integrations.index')} className="pf-btn pf-btn-secondary">
                        Back to Integrations
                    </Link>
                </div>

                <div className="pf-panel">
                    <form onSubmit={submit} className="pf-modal">
                        <div className="pf-field">
                            <label htmlFor="name">Name</label>
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
                            <label htmlFor="direction">Direction</label>
                            <select
                                id="direction"
                                value={data.direction}
                                onChange={(e) => setData('direction', e.target.value)}
                            >
                                <option value="import_only">Import only</option>
                                <option value="export_only">Export only</option>
                                <option value="bidirectional">Import + Export</option>
                            </select>
                            <InputError message={errors.direction} className="mt-2" />
                        </div>

                        <div className="pf-field">
                            <label htmlFor="config">Connection &amp; Table Mapping (JSON)</label>
                            <textarea
                                id="config"
                                rows={16}
                                value={data.config}
                                onChange={(e) => setData('config', e.target.value)}
                                className="font-mono"
                                style={{
                                    width: '100%',
                                    padding: '12px 14px',
                                    border: '1px solid #d7dde7',
                                    borderRadius: 12,
                                    outline: 'none',
                                    fontSize: 13,
                                }}
                            />
                            <InputError message={errors.config} className="mt-2" />
                        </div>

                        <div className="pf-modal-footer" style={{ justifyContent: 'flex-start' }}>
                            <button type="submit" className="pf-btn pf-btn-primary" disabled={processing}>
                                Create
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AdminLayout>
    );
}

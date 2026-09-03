import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, useForm } from '@inertiajs/react';

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

    function submit(e) {
        e.preventDefault();
        post(route('portal.people.store'));
    }

    return (
        <AdminLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                    Add Person
                </h2>
            }
        >
            <Head title="Add Person" />

            <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:px-8">
                <form
                    onSubmit={submit}
                    className="space-y-6 rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800"
                >
                    <div>
                        <InputLabel htmlFor="person_type" value="Type" />
                        <select
                            id="person_type"
                            value={data.person_type}
                            onChange={(e) =>
                                setData('person_type', e.target.value)
                            }
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                        >
                            <option value="student">Student</option>
                            <option value="staff">Staff</option>
                        </select>
                        <InputError message={errors.person_type} className="mt-2" />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div>
                            <InputLabel htmlFor="first_name" value="First name" />
                            <TextInput
                                id="first_name"
                                value={data.first_name}
                                onChange={(e) => setData('first_name', e.target.value)}
                                className="mt-1 block w-full"
                                required
                            />
                            <InputError message={errors.first_name} className="mt-2" />
                        </div>

                        <div>
                            <InputLabel htmlFor="middle_name" value="Middle name" />
                            <TextInput
                                id="middle_name"
                                value={data.middle_name}
                                onChange={(e) => setData('middle_name', e.target.value)}
                                className="mt-1 block w-full"
                            />
                            <InputError message={errors.middle_name} className="mt-2" />
                        </div>

                        <div>
                            <InputLabel htmlFor="last_name" value="Last name" />
                            <TextInput
                                id="last_name"
                                value={data.last_name}
                                onChange={(e) => setData('last_name', e.target.value)}
                                className="mt-1 block w-full"
                                required
                            />
                            <InputError message={errors.last_name} className="mt-2" />
                        </div>
                    </div>

                    <div>
                        <InputLabel
                            htmlFor="display_name"
                            value="Display name (optional — derived from the name above if left blank)"
                        />
                        <TextInput
                            id="display_name"
                            value={data.display_name}
                            onChange={(e) => setData('display_name', e.target.value)}
                            className="mt-1 block w-full"
                        />
                        <InputError message={errors.display_name} className="mt-2" />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <InputLabel htmlFor="grade_level" value="Grade level" />
                            <TextInput
                                id="grade_level"
                                value={data.grade_level}
                                onChange={(e) => setData('grade_level', e.target.value)}
                                className="mt-1 block w-full"
                            />
                            <InputError message={errors.grade_level} className="mt-2" />
                        </div>

                        <div>
                            <InputLabel htmlFor="section" value="Section" />
                            <TextInput
                                id="section"
                                value={data.section}
                                onChange={(e) => setData('section', e.target.value)}
                                className="mt-1 block w-full"
                            />
                            <InputError message={errors.section} className="mt-2" />
                        </div>
                    </div>

                    <div>
                        <InputLabel htmlFor="external_id" value="External ID (from SIS, optional)" />
                        <TextInput
                            id="external_id"
                            value={data.external_id}
                            onChange={(e) => setData('external_id', e.target.value)}
                            className="mt-1 block w-full"
                        />
                        <InputError message={errors.external_id} className="mt-2" />
                    </div>

                    <div>
                        <InputLabel htmlFor="photo_url" value="Photo URL (optional)" />
                        <TextInput
                            id="photo_url"
                            value={data.photo_url}
                            onChange={(e) => setData('photo_url', e.target.value)}
                            className="mt-1 block w-full"
                        />
                        <InputError message={errors.photo_url} className="mt-2" />
                    </div>

                    <div className="flex items-center gap-3">
                        <PrimaryButton disabled={processing}>
                            Create Person
                        </PrimaryButton>
                        <Link href={route('portal.people.index')}>
                            <SecondaryButton type="button">
                                Cancel
                            </SecondaryButton>
                        </Link>
                    </div>
                </form>
            </div>
        </AdminLayout>
    );
}

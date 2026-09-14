import InputError from '@/Components/InputError';
import Modal from '@/Components/Modal';
import { useToast } from '@/Components/toast/ToastProvider';
import { Person } from '@/types';
import { router } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useState } from 'react';

interface AddPersonModalProps {
    show: boolean;
    onClose: () => void;
    onSuccess?: (person: Person) => void;
}

export default function AddPersonModal({
    show,
    onClose,
    onSuccess,
}: AddPersonModalProps) {
    const { showToast } = useToast();

    const [personType, setPersonType] = useState<'student' | 'staff'>('student');
    const [firstName, setFirstName] = useState('');
    const [middleName, setMiddleName] = useState('');
    const [lastName, setLastName] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [gradeLevel, setGradeLevel] = useState('');
    const [section, setSection] = useState('');
    const [externalId, setExternalId] = useState('');
    const [photoUrl, setPhotoUrl] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Reset form when modal closes or opens
    useEffect(() => {
        if (!show) {
            setPersonType('student');
            setFirstName('');
            setMiddleName('');
            setLastName('');
            setDisplayName('');
            setGradeLevel('');
            setSection('');
            setExternalId('');
            setPhotoUrl('');
            setErrors({});
        }
    }, [show]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setIsSubmitting(true);
        setErrors({});

        const payload = {
            person_type: personType,
            first_name: firstName,
            middle_name: middleName || null,
            last_name: lastName,
            display_name: displayName || null,
            grade_level: gradeLevel || null,
            section: section || null,
            external_id: externalId || null,
            photo_url: photoUrl || null,
        };

        try {
            const res = await axios.post(route('portal.people.store'), payload, {
                headers: { Accept: 'application/json' },
            });

            const createdPerson = res.data.person;
            showToast({
                type: 'success',
                message: 'Person created successfully.',
                description: `${createdPerson.display_name} has been added to your school roster.`,
            });

            if (onSuccess) {
                onSuccess(createdPerson);
            }

            onClose();
            router.reload({ only: ['people'] });
        } catch (error: any) {
            if (error.response?.data?.errors) {
                const apiErrors: Record<string, string> = {};
                for (const [key, msgs] of Object.entries(error.response.data.errors)) {
                    if (Array.isArray(msgs) && msgs.length > 0) {
                        apiErrors[key] = msgs[0] as string;
                    }
                }
                setErrors(apiErrors);
            } else {
                showToast({
                    type: 'error',
                    message: 'Could not create person.',
                    description: error.response?.data?.message || 'Please check your inputs and try again.',
                });
            }
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Modal show={show} onClose={onClose} maxWidth="2xl">
            <div className="pf-modal relative p-6 sm:p-8">
                {/* Header */}
                <div className="pf-modal-header mb-6">
                    <div className="pf-modal-hero">
                        <span
                            className={
                                'pf-modal-hero-icon ' +
                                (personType === 'student'
                                    ? 'pf-modal-hero-icon--blue'
                                    : 'pf-modal-hero-icon--violet')
                            }
                            aria-hidden="true"
                        >
                            {personType === 'student' ? (
                                <svg viewBox="0 0 24 24">
                                    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                                    <path d="M6 12v5c3 3 9 3 12 0v-5" />
                                </svg>
                            ) : (
                                <svg viewBox="0 0 24 24">
                                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                    <circle cx="9" cy="7" r="4" />
                                    <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                                </svg>
                            )}
                        </span>
                        <div className="pf-modal-hero-text">
                            <h3 className="pf-modal-title text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                                Add {personType === 'student' ? 'Student' : 'Staff Member'}
                            </h3>
                            <p className="pf-modal-subtitle text-xs text-slate-500 dark:text-slate-400">
                                Register a new profile for RFID card assignment and attendance tracking.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="pf-modal-close"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        <svg viewBox="0 0 24 24">
                            <path d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Person Type Selector */}
                    <div>
                        <label className="mb-2 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Profile Type
                        </label>
                        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200/90 bg-slate-100/80 p-1 dark:border-slate-700/80 dark:bg-slate-800/80">
                            <button
                                type="button"
                                onClick={() => setPersonType('student')}
                                className={`flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold transition-all duration-150 ${
                                    personType === 'student'
                                        ? 'border border-blue-200/80 bg-white text-blue-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-blue-400'
                                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                                }`}
                            >
                                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-currentColor stroke-2">
                                    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                                    <path d="M6 12v5c3 3 9 3 12 0v-5" />
                                </svg>
                                Student
                            </button>
                            <button
                                type="button"
                                onClick={() => setPersonType('staff')}
                                className={`flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold transition-all duration-150 ${
                                    personType === 'staff'
                                        ? 'border border-purple-200/80 bg-white text-purple-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-purple-400'
                                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                                }`}
                            >
                                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-currentColor stroke-2">
                                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                    <circle cx="9" cy="7" r="4" />
                                </svg>
                                Staff Member
                            </button>
                        </div>
                    </div>

                    {/* Name Fields (3 Columns) */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="pf-field !mb-0">
                            <label htmlFor="modal_first_name">First Name *</label>
                            <input
                                id="modal_first_name"
                                type="text"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                placeholder="e.g. Jane"
                                required
                            />
                            <InputError message={errors.first_name} className="mt-1" />
                        </div>

                        <div className="pf-field !mb-0">
                            <label htmlFor="modal_middle_name">Middle Name</label>
                            <input
                                id="modal_middle_name"
                                type="text"
                                value={middleName}
                                onChange={(e) => setMiddleName(e.target.value)}
                                placeholder="e.g. Reyes"
                            />
                            <InputError message={errors.middle_name} className="mt-1" />
                        </div>

                        <div className="pf-field !mb-0">
                            <label htmlFor="modal_last_name">Last Name *</label>
                            <input
                                id="modal_last_name"
                                type="text"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                placeholder="e.g. Doe"
                                required
                            />
                            <InputError message={errors.last_name} className="mt-1" />
                        </div>
                    </div>

                    {/* Display Name */}
                    <div className="pf-field !mb-0">
                        <label htmlFor="modal_display_name">Display Name (Optional)</label>
                        <input
                            id="modal_display_name"
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder={
                                firstName || lastName
                                    ? [firstName, middleName, lastName].filter(Boolean).join(' ')
                                    : 'Derived automatically if left blank'
                            }
                        />
                        <p className="pf-field-hint">
                            How this person's name will appear on station screens upon tapping RFID.
                        </p>
                        <InputError message={errors.display_name} className="mt-1" />
                    </div>

                    {/* Contextual Academic / Department Fields */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="pf-field !mb-0">
                            <label htmlFor="modal_grade_level">
                                {personType === 'student' ? 'Grade / Year Level' : 'Role / Title'}
                            </label>
                            <input
                                id="modal_grade_level"
                                type="text"
                                value={gradeLevel}
                                onChange={(e) => setGradeLevel(e.target.value)}
                                placeholder={
                                    personType === 'student'
                                        ? 'e.g. Grade 10'
                                        : 'e.g. Faculty / Teacher'
                                }
                            />
                            <InputError message={errors.grade_level} className="mt-1" />
                        </div>

                        <div className="pf-field !mb-0">
                            <label htmlFor="modal_section">
                                {personType === 'student' ? 'Section' : 'Department'}
                            </label>
                            <input
                                id="modal_section"
                                type="text"
                                value={section}
                                onChange={(e) => setSection(e.target.value)}
                                placeholder={
                                    personType === 'student'
                                        ? 'e.g. Emerald'
                                        : 'e.g. Science Department'
                                }
                            />
                            <InputError message={errors.section} className="mt-1" />
                        </div>
                    </div>

                    {/* External ID and Photo URL */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="pf-field !mb-0">
                            <label htmlFor="modal_external_id">External ID / SIS ID (Optional)</label>
                            <input
                                id="modal_external_id"
                                type="text"
                                value={externalId}
                                onChange={(e) => setExternalId(e.target.value)}
                                placeholder="e.g. SIS-2024-0012"
                                className="font-mono text-xs"
                            />
                            <InputError message={errors.external_id} className="mt-1" />
                        </div>

                        <div className="pf-field !mb-0">
                            <label htmlFor="modal_photo_url">Photo URL (Optional)</label>
                            <input
                                id="modal_photo_url"
                                type="url"
                                value={photoUrl}
                                onChange={(e) => setPhotoUrl(e.target.value)}
                                placeholder="https://example.com/photo.jpg"
                            />
                            <InputError message={errors.photo_url} className="mt-1" />
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="pf-modal-footer mt-6 !pt-4 border-t border-slate-100 dark:border-slate-800">
                        <button
                            type="button"
                            className="pf-btn pf-btn-secondary"
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="pf-btn pf-btn-primary"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Creating...' : 'Create Person'}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
}

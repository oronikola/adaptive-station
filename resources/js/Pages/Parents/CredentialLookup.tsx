import AuthInput from '@/Components/AuthInput';
import { IdCardIcon } from '@/Components/icons/id-card';
import AuthLayout from '@/Layouts/AuthLayout';
import axios from 'axios';
import { useEffect, useRef, useState } from 'react';
import '../../../css/pages/parent-credential-lookup.css';

interface School {
    id: string;
    name: string;
}

interface ParentResult {
    id: string;
    name: string;
    masked_phone: string;
    has_phone: boolean;
}

type SendState = 'idle' | 'sending' | 'queued' | 'already_requested' | 'error';

export default function CredentialLookup() {
    const [schoolQuery, setSchoolQuery] = useState('');
    const [schools, setSchools] = useState<School[]>([]);
    const [school, setSchool] = useState<School | null>(null);
    const [showSchoolResults, setShowSchoolResults] = useState(false);

    const [name, setName] = useState('');
    const [parents, setParents] = useState<ParentResult[]>([]);
    const [searched, setSearched] = useState(false);

    const [sendStateById, setSendStateById] = useState<Record<string, SendState>>({});
    const [sendMessageById, setSendMessageById] = useState<Record<string, string>>({});

    const schoolDebounce = useRef<ReturnType<typeof setTimeout>>(undefined);
    const nameDebounce = useRef<ReturnType<typeof setTimeout>>(undefined);

    useEffect(() => {
        clearTimeout(schoolDebounce.current);
        schoolDebounce.current = setTimeout(() => {
            axios.get(route('parents.credentials.schools'), { params: { search: schoolQuery } })
                .then((response) => setSchools(response.data.schools))
                .catch(() => setSchools([]));
        }, 250);

        return () => clearTimeout(schoolDebounce.current);
    }, [schoolQuery]);

    useEffect(() => {
        if (!school || name.trim().length < 2) {
            setParents([]);
            setSearched(false);

            return;
        }

        clearTimeout(nameDebounce.current);
        nameDebounce.current = setTimeout(() => {
            axios.get(route('parents.credentials.search'), { params: { tenant_id: school.id, name } })
                .then((response) => {
                    setParents(response.data.parents);
                    setSearched(true);
                })
                .catch(() => {
                    setParents([]);
                    setSearched(true);
                });
        }, 300);

        return () => clearTimeout(nameDebounce.current);
    }, [school, name]);

    const sendCredentials = (parent: ParentResult) => {
        if (!school) {
            return;
        }

        setSendStateById((state) => ({ ...state, [parent.id]: 'sending' }));

        axios.post(route('parents.credentials.send', parent.id), { tenant_id: school.id })
            .then((response) => {
                const status = response.data.status as SendState;
                setSendStateById((state) => ({ ...state, [parent.id]: status }));
                setSendMessageById((state) => ({
                    ...state,
                    [parent.id]: status === 'already_requested'
                        ? `Already sent recently to ${response.data.masked_phone}.`
                        : `Sent to ${response.data.masked_phone}.`,
                }));
            })
            .catch((error) => {
                setSendStateById((state) => ({ ...state, [parent.id]: 'error' }));
                setSendMessageById((state) => ({
                    ...state,
                    [parent.id]: error.response?.data?.message ?? 'Could not send credentials. Please try again.',
                }));
            });
    };

    return (
        <AuthLayout
            title="Get Your Parent Portal Credentials"
            eyebrow="PARENT SELF-SERVICE"
            heading="Your login, one text away."
            caption="Find your account by school and name, and we'll text your login ID and password straight to the phone number your school has on file."
            formHeading="Get your credentials"
            formSubheading="Search for your school, then your name, to locate your parent account."
            topbarPrompt="Are you school staff?"
            topbarLinkText="Sign in"
            topbarLinkHref={route('login')}
        >
            <div className="pcl-form">
                <div className="auth-field pcl-school-field">
                    <label htmlFor="school">School</label>
                    <input
                        id="school"
                        type="text"
                        autoComplete="off"
                        placeholder="Search for your school"
                        value={school ? school.name : schoolQuery}
                        onFocus={() => setShowSchoolResults(true)}
                        onBlur={() => setTimeout(() => setShowSchoolResults(false), 150)}
                        onChange={(event) => {
                            setSchool(null);
                            setSchoolQuery(event.target.value);
                            setShowSchoolResults(true);
                        }}
                    />
                    {showSchoolResults && !school && schools.length > 0 && (
                        <ul className="pcl-dropdown" role="listbox">
                            {schools.map((item) => (
                                <li key={item.id}>
                                    <button
                                        type="button"
                                        onMouseDown={(event) => event.preventDefault()}
                                        onClick={() => {
                                            setSchool(item);
                                            setShowSchoolResults(false);
                                        }}
                                    >
                                        {item.name}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <AuthInput
                    id="parent-name"
                    type="text"
                    label="Your full name"
                    name="name"
                    autoComplete="off"
                    disabled={!school}
                    placeholder={school ? 'Enter your full name' : 'Select your school first'}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                />

                <div className="pcl-results">
                    {searched && parents.length === 0 && (
                        <p className="pcl-empty">
                            No matching account found. Check the spelling of your name, or contact your school if you believe this is an error.
                        </p>
                    )}

                    {parents.map((parent) => {
                        const state = sendStateById[parent.id] ?? 'idle';
                        const message = sendMessageById[parent.id];
                        const isDone = state === 'queued' || state === 'already_requested';

                        return (
                            <div key={parent.id} className="pcl-result-row">
                                <span className="pcl-result-icon" aria-hidden="true">
                                    <IdCardIcon size={18} />
                                </span>
                                <div className="pcl-result-info">
                                    <p className="pcl-result-name">{parent.name}</p>
                                    <p className="pcl-result-phone">
                                        {parent.has_phone ? parent.masked_phone : 'No phone number on file — contact your school.'}
                                    </p>
                                    {message && (
                                        <p className={`pcl-result-message ${state === 'error' ? 'pcl-result-message--error' : 'pcl-result-message--success'}`}>
                                            {message}
                                        </p>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    disabled={!parent.has_phone || state === 'sending' || isDone}
                                    onClick={() => sendCredentials(parent)}
                                    className={'pcl-send-btn' + (state === 'sending' ? ' pcl-send-btn--loading' : '')}
                                >
                                    {state === 'sending' ? 'Sending…' : isDone ? 'Sent' : 'Send credentials'}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </AuthLayout>
    );
}

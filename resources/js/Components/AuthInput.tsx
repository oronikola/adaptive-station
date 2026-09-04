import InputError from '@/Components/InputError';

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string;
    labelExtra?: React.ReactNode;
}

/**
 * Text input styled to match the Auth pages' shared design (see AuthLayout).
 * Renders a label, the input itself, and an inline validation message.
 */
export default function AuthInput({ label, error, labelExtra, id, ...props }: AuthInputProps) {
    return (
        <div className="auth-field">
            {labelExtra ? (
                <div className="auth-label-row">
                    <label htmlFor={id}>{label}</label>
                    {labelExtra}
                </div>
            ) : (
                <label htmlFor={id}>{label}</label>
            )}

            <input
                id={id}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? `${id}-error` : undefined}
                {...props}
            />

            <InputError id={`${id}-error`} message={error} className="auth-field-error" />
        </div>
    );
}

/**
 * Displays a one-time secret (temporary password, activation code) flashed
 * into the session by the previous request. Never re-appears after the next
 * navigation, since the server never persists it beyond that one flash.
 */
export default function SecretOnceCallout({ label, value }) {
    if (!value) {
        return null;
    }

    return (
        <div className="mb-4 rounded-md border border-yellow-300 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/30">
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                {label} — shown only once, copy it now:
            </p>
            <code className="mt-2 block break-all rounded bg-white px-3 py-2 text-sm text-gray-900 dark:bg-gray-900 dark:text-gray-100">
                {value}
            </code>
        </div>
    );
}

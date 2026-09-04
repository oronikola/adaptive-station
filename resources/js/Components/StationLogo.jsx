export default function StationLogo(props) {
    return (
        <svg {...props} viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <rect
                x="7"
                y="5"
                width="14"
                height="17"
                rx="3"
                stroke="currentColor"
                strokeWidth="1.7"
            />
            <path
                d="M10 18h8M11 9h6M11 12.5h4"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
            />
            <path
                d="M5 22.5h18"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
            />
        </svg>
    );
}

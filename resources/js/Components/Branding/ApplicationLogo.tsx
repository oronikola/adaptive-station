import officialLogo from '../../../assets/images/adaptive_station_logo.png';

export const applicationLogoUrl = officialLogo;

export default function ApplicationLogo({
    alt = 'Adaptive Station',
    ...props
}: React.ImgHTMLAttributes<HTMLImageElement>) {
    return (
        <img
            {...props}
            src={officialLogo}
            alt={alt}
            draggable={false}
        />
    );
}

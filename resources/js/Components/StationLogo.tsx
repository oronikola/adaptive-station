import ApplicationLogo from '@/Components/ApplicationLogo';

export default function StationLogo({
    alt = '',
    ...props
}: React.ImgHTMLAttributes<HTMLImageElement>) {
    return <ApplicationLogo {...props} alt={alt} />;
}

export function SettingsTabHeader({
    title,
    description,
}: {
    title: string;
    description: string;
}) {
    return (
        <div>
            <h2 className="text-2xl font-semibold mb-2">{title}</h2>
            <p className="text-muted-foreground text-sm">{description}</p>
        </div>
    );
}

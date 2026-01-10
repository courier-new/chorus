import type { LucideIcon } from "lucide-react";

export function SettingsTabHeader({
    icon: Icon,
    title,
    description,
}: {
    icon: LucideIcon;
    title: string;
    description: string;
}) {
    return (
        <div>
            <h2 className="text-2xl font-semibold mb-2 flex items-center gap-2">
                <Icon className="w-6" />
                {title}
            </h2>
            <p className="text-muted-foreground text-sm">{description}</p>
        </div>
    );
}

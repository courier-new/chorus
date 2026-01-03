import type { ModelConfig } from "@core/chorus/Models";
import { useShiftKey } from "../hooks/useShiftKey";
import { Badge } from "../ui/badge";
import { ProviderLogo } from "../ui/provider-logo";
import { XIcon } from "lucide-react";

/** A component to render a draggable model pill */
export function ModelPill({
    modelConfig,
    index,
    onRemove,
    isDragging,
}: {
    modelConfig: ModelConfig;
    index: number;
    onRemove: (index: number, shiftKey: boolean) => void;
    isDragging: boolean;
}) {
    const shiftKeyRef = useShiftKey();
    return (
        <Badge
            variant="secondary"
            className={`${isDragging ? "opacity-75" : ""} flex-shrink-0 h-7 font-sans normal-case`}
        >
            <div className="flex items-center gap-2 overflow-hidden">
                <div className="flex-shrink-0">
                    <ProviderLogo modelId={modelConfig.modelId} size="sm" />
                </div>
                <span className="text-sm">{modelConfig.displayName}</span>
            </div>
            <button
                onClick={() => onRemove(index, shiftKeyRef.current)}
                className="ml-1 rounded-full text-badge-foreground/50 border-none text-sm p-1 hover:text-badge-foreground flex-shrink-0"
            >
                <XIcon className="w-3 h-3" />
            </button>
        </Badge>
    );
}

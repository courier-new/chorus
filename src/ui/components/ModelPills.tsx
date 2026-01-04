import { ModelConfig } from "@core/chorus/Models";
import { ProviderLogo } from "./ui/provider-logo";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { BoxIcon } from "lucide-react";
import { dialogActions } from "@core/infra/DialogStore";
import { ModelGroup } from "@core/chorus/api/ModelGroupsAPI";
import { useShortcutDisplay } from "@core/utilities/ShortcutsAPI";

export function ManageModelsButtonCompare({
    activeGroup,
    selectedModelConfigs,
    dialogId,
    showShortcut = true,
}: {
    activeGroup?: ModelGroup;
    selectedModelConfigs?: ModelConfig[];
    dialogId: string;
    showShortcut?: boolean;
}) {
    const modelPickerShortcut = useShortcutDisplay("model-picker");
    const totalInstanceCount = selectedModelConfigs?.length ?? 0;
    return (
        <button
            className="inline-flex bg-muted items-center justify-center rounded-full h-7 pl-2 text-sm hover:bg-muted/80 px-3 py-1 ring-offset-background placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1 flex-shrink-0"
            onClick={() => dialogActions.openDialog(dialogId)}
            aria-label="Add or manage models"
        >
            <div className="flex items-center gap-0.5">
                {/* Only show box icon when there are no models selected */}
                {totalInstanceCount === 0 && (
                    <BoxIcon className="w-3 h-3 text-muted-foreground mr-0.5" />
                )}

                {totalInstanceCount > 0 && (
                    <div className="flex items-center">
                        {selectedModelConfigs
                            ?.slice(0, 4)
                            ?.map((modelConfig, index) => (
                                <Tooltip key={`${modelConfig.id}-${index}`}>
                                    <TooltipTrigger asChild>
                                        <div
                                            className="relative w-5 h-5 rounded-full bg-background flex items-center justify-center -ml-1.5 first:ml-0 border border-border shadow-sm"
                                            style={{
                                                zIndex:
                                                    totalInstanceCount - index,
                                            }}
                                        >
                                            <div className="w-3 h-3">
                                                <ProviderLogo
                                                    modelId={
                                                        modelConfig.modelId
                                                    }
                                                    size="xs"
                                                />
                                            </div>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{modelConfig.displayName}</p>
                                    </TooltipContent>
                                </Tooltip>
                            ))}
                    </div>
                )}

                {/* Show "Models" text when no models or multiple models, show model name when single model */}
                {totalInstanceCount === 1 ? (
                    <span className="pl-0.5">
                        {selectedModelConfigs?.[0]?.displayName}
                    </span>
                ) : activeGroup ? (
                    <span className="pl-0.5">{activeGroup.name}</span>
                ) : totalInstanceCount > 1 ? (
                    <span className="pl-0.5">{totalInstanceCount} Models</span>
                ) : (
                    <span className="pl-0.5">Models</span>
                )}

                {showShortcut && modelPickerShortcut && (
                    <span className="ml-1 text-muted-foreground font-light">
                        {modelPickerShortcut}
                    </span>
                )}
            </div>
        </button>
    );
}

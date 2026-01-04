import {
    getProviderName,
    ModelConfig,
    ModelInstance,
} from "@core/chorus/Models";
import * as AppMetadataAPI from "@core/chorus/api/AppMetadataAPI";
import * as ModelsAPI from "@core/chorus/api/ModelsAPI";
import * as ModelGroupsAPI from "@core/chorus/api/ModelGroupsAPI";
import { ProviderLogo } from "../ui/provider-logo";
import { Badge } from "../ui/badge";
import { useSettings } from "../hooks/useSettings";
import { useCallback, useMemo, useRef } from "react";
import { Button } from "../ui/button";
import { hasApiKey } from "@core/utilities/ProxyUtils";
import { CommandItem } from "../ui/command";
import { useShiftKey, useShiftKeyRef } from "../hooks/useShiftKey";
import { CircleCheckIcon, MinusIcon, PlusIcon } from "lucide-react";

const MAX_INSTANCES_PER_MODEL = 5;

// Helper function to format pricing for display (per million tokens)
const formatPricing = (
    promptPricePerToken?: number,
    completionPricePerToken?: number,
): string | null => {
    if (
        promptPricePerToken === undefined ||
        completionPricePerToken === undefined
    ) {
        return null;
    }

    const inputPricePerMillion = promptPricePerToken * 1_000_000;
    const outputPricePerMillion = completionPricePerToken * 1_000_000;

    // Format with appropriate decimal places
    const formatPrice = (price: number): string => {
        if (price >= 100) return price.toFixed(0);
        if (price >= 10) return price.toFixed(1);
        if (price >= 1) return price.toFixed(2);
        return price.toFixed(3);
    };

    return `$${formatPrice(inputPricePerMillion)} / $${formatPrice(outputPricePerMillion)} per 1M tokens`;
};

// Helper function to check if a model is still considered "new"
const isNewModel = (newUntil: string | undefined): boolean => {
    if (!newUntil) return false;

    const newUntilDate = new Date(newUntil);
    const now = new Date();

    return newUntilDate > now;
};

// Helper hook to get the model instances for a given model config ID
const useDefaultGetModelInstancesForConfig = (
    modelConfigId: string,
): ModelInstance[] => {
    const { data: selectedModelConfigsData = [] } =
        ModelsAPI.useSelectedModelConfigsCompare();
    return useMemo(
        () =>
            selectedModelConfigsData
                .filter((m) => m.id === modelConfigId)
                .map((m) => ({
                    modelConfigId: m.id,
                    instanceId: m.instanceId,
                })),
        [selectedModelConfigsData, modelConfigId],
    );
};

/**
 * Simple toggle-based props for the model picker: callback is invoked whenever
 * the model command item is selected.
 */
export type ModelPickerToggleProps = {
    onToggleModelConfig: (modelConfigId: string, shiftKey: boolean) => void;
};

/**
 * Multi-select-based props for the model picker: exposes instance controls to
 * add and remove instances of a model, as well as a toggle callback for when
 * the model command item is selected.
 */
export type ModelPickerMultiSelectProps = {
    onToggleModelConfig: (modelConfigId: string, shiftKey: boolean) => void;
    onAddModelConfigInstance: (
        modelConfigId: string,
        shiftKey: boolean,
    ) => void;
    onRemoveModelConfigInstance: (
        modelConfigId: string,
        shiftKey: boolean,
    ) => void;
};

type ModelCommandItemProps = {
    modelConfig: ModelConfig;
    onAddApiKey: () => void;
    groupId?: string;
    useGetModelInstancesForConfig?: (modelConfigId: string) => ModelInstance[];
} & (ModelPickerToggleProps | ModelPickerMultiSelectProps);

export function ModelCommandItem({
    modelConfig,
    onAddApiKey,
    groupId,
    useGetModelInstancesForConfig = useDefaultGetModelInstancesForConfig,
    ...modelPickerCallbacks
}: ModelCommandItemProps) {
    const { data: apiKeys } = AppMetadataAPI.useApiKeys();
    // Determine if a model should be disabled (no API key for the provider)
    const isModelAllowed = useMemo(() => {
        const provider = getProviderName(modelConfig.modelId);

        // Local models (ollama, lmstudio) don't require API keys
        if (provider === "ollama" || provider === "lmstudio") {
            return true;
        }

        // If user has API key for this provider, allow it
        if (
            apiKeys &&
            provider &&
            hasApiKey(provider.toLowerCase() as keyof typeof apiKeys, apiKeys)
        ) {
            return true;
        }

        // No API key for this provider - model is not allowed
        return false;
    }, [apiKeys, modelConfig.modelId]);

    const { data: settings } = useSettings();
    const showCost = settings?.showCost ?? false;
    const price = useMemo(
        () =>
            formatPricing(
                modelConfig.promptPricePerToken,
                modelConfig.completionPricePerToken,
            ),
        [modelConfig.promptPricePerToken, modelConfig.completionPricePerToken],
    );

    const isMultiSelect =
        "onAddModelConfigInstance" in modelPickerCallbacks &&
        "onRemoveModelConfigInstance" in modelPickerCallbacks;
    const instanceCount = useGetModelInstancesForConfig(modelConfig.id).length;
    const canAddMore = instanceCount < MAX_INSTANCES_PER_MODEL;

    const shiftKeyRef = useShiftKeyRef();

    const onAddInstance = useCallback(() => {
        if ("onAddModelConfigInstance" in modelPickerCallbacks) {
            modelPickerCallbacks.onAddModelConfigInstance(
                modelConfig.id,
                shiftKeyRef.current,
            );
        }
    }, [modelConfig.id, modelPickerCallbacks, shiftKeyRef]);

    const onRemoveInstance = useCallback(() => {
        if ("onRemoveModelConfigInstance" in modelPickerCallbacks) {
            modelPickerCallbacks.onRemoveModelConfigInstance(
                modelConfig.id,
                shiftKeyRef.current,
            );
        }
    }, [modelConfig.id, modelPickerCallbacks, shiftKeyRef]);

    return (
        <CommandItem
            value={groupId ? `${groupId}-${modelConfig.id}` : modelConfig.id}
            onSelect={() => {
                if (isModelAllowed) {
                    modelPickerCallbacks.onToggleModelConfig(
                        modelConfig.id,
                        shiftKeyRef.current,
                    );
                } else {
                    onAddApiKey();
                }
            }}
            disabled={!modelConfig.isEnabled}
            className={`group ${isModelAllowed ? "" : "opacity-60"}`}
        >
            <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                    <ProviderLogo modelId={modelConfig.modelId} size="sm" />
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <p>{modelConfig.displayName}</p>
                            {isNewModel(modelConfig.newUntil) && (
                                <Badge variant="secondary">
                                    <p className="text-muted-foreground text-xs">
                                        NEW
                                    </p>
                                </Badge>
                            )}
                        </div>
                        {showCost && price && (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                {price}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2 h-5">
                    {!isModelAllowed ? (
                        <Button
                            variant="link"
                            size="sm"
                            className="text-accent-foreground h-auto p-0 px-1.5"
                            onClick={(
                                e: React.MouseEvent<HTMLButtonElement>,
                            ) => {
                                e.stopPropagation();
                                onAddApiKey();
                            }}
                        >
                            Add API Key
                        </Button>
                    ) : (
                        // Help text (always shown on hover) + selection indicator
                        <>
                            {isMultiSelect ? (
                                <MultiSelectModelSelectionHelpText
                                    instanceCount={instanceCount}
                                />
                            ) : (
                                <SimpleModelSelectionHelpText />
                            )}
                            {instanceCount > 0 && isMultiSelect ? (
                                // Multi-instance UI: show +/- buttons and count badge
                                <InstanceControls
                                    instanceCount={instanceCount}
                                    canAddMore={canAddMore}
                                    onAdd={onAddInstance}
                                    onRemove={onRemoveInstance}
                                />
                            ) : instanceCount > 0 ? (
                                // Standard checkmark (only when no instance support)
                                <CircleCheckIcon className="!w-5 !h-5 fill-primary text-primary-foreground" />
                            ) : null}
                        </>
                    )}
                </div>
            </div>
        </CommandItem>
    );
}

function SimpleModelSelectionHelpText() {
    return (
        <p className="text-sm text-muted-foreground opacity-0 group-data-[selected=true]:opacity-100 transition-opacity">
            ⤶ to add
        </p>
    );
}

function MultiSelectModelSelectionHelpText({
    instanceCount,
}: {
    instanceCount: number;
}) {
    const { data: activeGroupId } = ModelGroupsAPI.useActiveModelGroupId();
    const shiftKeyEnabled = useShiftKey();

    const text = useMemo(() => {
        if (instanceCount > 0) {
            if (activeGroupId && shiftKeyEnabled) {
                return "⇧⤶ to remove all from group";
            }
            return "⤶ to remove all";
        }
        if (activeGroupId && shiftKeyEnabled) {
            return "⇧⤶ to add to group";
        }
        return "⤶ to add";
    }, [activeGroupId, instanceCount, shiftKeyEnabled]);

    return (
        <p className="text-sm text-muted-foreground opacity-0 group-data-[selected=true]:opacity-100 transition-opacity">
            {text}
        </p>
    );
}

/** Component for +/- instance controls with focus management and group support */
function InstanceControls({
    instanceCount,
    canAddMore,
    onAdd,
    onRemove,
}: {
    instanceCount: number;
    canAddMore: boolean;
    onAdd: () => void;
    onRemove: () => void;
}) {
    const minusRef = useRef<HTMLButtonElement>(null);

    const handleAdd = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            if (!canAddMore) return;

            // Check if this action will disable the + button (reaching max)
            const willDisable = instanceCount + 1 >= MAX_INSTANCES_PER_MODEL;

            onAdd();

            // Transfer focus to minus button if plus will be disabled
            if (willDisable) {
                setTimeout(() => minusRef.current?.focus(), 0);
            }
        },
        [onAdd, canAddMore, instanceCount],
    );

    const handleRemove = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            onRemove();
        },
        [onRemove],
    );

    return (
        <div className="flex items-center gap-1">
            {/* Remove instance button */}
            <button
                ref={minusRef}
                className="w-5 h-5 inline-flex items-center justify-center rounded-full hover:bg-muted/75 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
                onClick={handleRemove}
            >
                <MinusIcon className="w-3.5 h-3.5" />
            </button>

            {/* Instance count badge */}
            <span className="inline-flex items-center justify-center w-5 h-5 text-sm font-medium rounded-full bg-primary text-primary-foreground">
                {instanceCount}
            </span>

            {/* Add instance button */}
            <button
                className="w-5 h-5 inline-flex items-center justify-center rounded-full hover:bg-muted/75 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
                onClick={handleAdd}
                disabled={!canAddMore}
            >
                <PlusIcon className="w-3.5 h-3.5" />
            </button>
        </div>
    );
}

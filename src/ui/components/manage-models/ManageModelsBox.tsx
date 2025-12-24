import {
    useState,
    useCallback,
    useMemo,
    useRef,
    useLayoutEffect,
    useEffect,
} from "react";
import {
    DragDropContext,
    Droppable,
    Draggable,
    DropResult,
    DraggableProvided,
    DraggableStateSnapshot,
    DraggableRubric,
} from "@hello-pangea/dnd";
import { useNavigate } from "react-router-dom";
import {
    ModelConfig,
    getProviderLabel,
    getProviderName,
} from "@core/chorus/Models";
import {
    PlusIcon,
    RefreshCcwIcon,
    XIcon,
    ArrowBigUpIcon,
    CircleCheckIcon,
} from "lucide-react";
import { ProviderLogo } from "../ui/provider-logo";
import {
    CommandDialog,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandEmpty,
} from "../ui/command";
import { Button } from "../ui/button";
import { emit } from "@tauri-apps/api/event";
import { Badge } from "../ui/badge";
import { dialogActions, useDialogStore } from "@core/infra/DialogStore";
import * as AppMetadataAPI from "@core/chorus/api/AppMetadataAPI";
import { hasApiKey } from "@core/utilities/ProxyUtils";
import * as ModelsAPI from "@core/chorus/api/ModelsAPI";
import * as MessageAPI from "@core/chorus/api/MessageAPI";
import * as ModelGroupsAPI from "@core/chorus/api/ModelGroupsAPI";
import { ModelGroupsList } from "./ModelGroupsList";
import { useShiftKey } from "../hooks/useShiftKey";
import { SectionHeading } from "./SectionHeading";
import { useSettings } from "../hooks/useSettings";

// Helper function to filter models by search terms
const filterBySearch = (models: ModelConfig[], searchTerms: string[]) => {
    if (searchTerms.length === 0) return models;
    return models.filter((m) => {
        const providerLabel = getProviderLabel(m.modelId);

        return searchTerms.every(
            (term) =>
                m.displayName.toLowerCase().includes(term) ||
                providerLabel.toLowerCase().includes(term),
        );
    });
};

// Helper function to format pricing for display (per million tokens)
const formatPricing = (model: ModelConfig): string | null => {
    if (
        model.promptPricePerToken === undefined ||
        model.completionPricePerToken === undefined
    ) {
        return null;
    }

    const inputPricePerMillion = model.promptPricePerToken * 1_000_000;
    const outputPricePerMillion = model.completionPricePerToken * 1_000_000;

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

type ModelPickerMode =
    | {
          type: "default"; // multiselect for updating selectedModelConfigs (deprecated)
          onToggleModelConfig: (id: string) => void;
          onClearModelConfigs: () => void;
      }
    | {
          type: "add"; // used for adding to an existing set
          checkedModelConfigIds: string[];
          onAddModel: (id: string) => void;
      }
    | {
          type: "single"; // single select for updating selectedModelConfig
          onSetModel: (id: string) => void;
          selectedModelConfigId: string;
      };

/** Component to render help text for model selection actions */
function ModelSelectionHelpText({
    mode,
    modelId,
    checkedModelConfigIds,
    activeGroupId,
}: {
    mode: ModelPickerMode;
    modelId: string;
    checkedModelConfigIds: string[];
    activeGroupId?: string;
}) {
    const isChecked = checkedModelConfigIds.includes(modelId);
    const hasActiveGroup = activeGroupId !== "NONE";

    const text = useMemo(() => {
        if (mode.type === "single") {
            return "⤶ to select";
        }

        if (isChecked) {
            return (
                "⤶ to remove" +
                (hasActiveGroup ? " / ⇧⤶ to remove from group" : "")
            );
        }
        return "⤶ to add" + (hasActiveGroup ? " / ⇧⤶ to add to group" : "");
    }, [mode, isChecked, hasActiveGroup]);

    return (
        <p className="text-sm text-muted-foreground opacity-0 group-data-[selected=true]:opacity-100 transition-opacity">
            {text}
        </p>
    );
}

/** A component to render a draggable model pill */
function ModelPill({
    modelConfig,
    handleRemoveModelConfig,
    isDragging,
}: {
    modelConfig: ModelConfig;
    handleRemoveModelConfig: (id: string, shiftKey: boolean) => void;
    isDragging: boolean;
}) {
    const shiftKeyRef = useShiftKey();
    return (
        <Badge
            variant="secondary"
            className={`${isDragging ? "opacity-75" : ""} flex-shrink-0 max-w-[200px] h-7 font-sans normal-case`}
        >
            <div className="flex items-center gap-2 overflow-hidden">
                <div className="flex-shrink-0">
                    <ProviderLogo modelId={modelConfig.modelId} size="sm" />
                </div>
                <span className="truncate text-sm">
                    {modelConfig.displayName}
                </span>
            </div>
            <button
                onClick={() =>
                    handleRemoveModelConfig(modelConfig.id, shiftKeyRef.current)
                }
                className="ml-1 rounded-full text-badge-foreground/50 border-none text-sm p-1 hover:text-badge-foreground flex-shrink-0"
            >
                <XIcon className="w-3 h-3" />
            </button>
        </Badge>
    );
}

/** A component to render a section of models with a heading */
function ModelSection({
    heading,
    models,
    checkedModelConfigIds,
    mode,
    onToggleModelConfig,
    refreshButton,
    emptyState,
    onAddApiKey,
    groupId,
    activeGroupId,
    showCost,
}: {
    heading: React.ReactNode;
    models: ModelConfig[];
    checkedModelConfigIds: string[];
    mode: ModelPickerMode;
    onToggleModelConfig: (id: string, shiftKey: boolean) => void;
    refreshButton?: React.ReactNode;
    emptyState?: React.ReactNode;
    onAddApiKey: () => void;
    groupId?: string;
    activeGroupId?: string;
    showCost: boolean;
}) {
    const { data: apiKeys } = AppMetadataAPI.useApiKeys();
    const shiftKeyRef = useShiftKey();

    // Determine if a model should be disabled (no API key for the provider)
    const isModelNotAllowed = useCallback(
        (model: ModelConfig) => {
            const provider = getProviderName(model.modelId);

            // Local models (ollama, lmstudio) don't require API keys
            if (provider === "ollama" || provider === "lmstudio") {
                return false;
            }

            // If user has API key for this provider, allow it
            if (
                apiKeys &&
                provider &&
                hasApiKey(
                    provider.toLowerCase() as keyof typeof apiKeys,
                    apiKeys,
                )
            ) {
                return false;
            }

            // No API key for this provider - model is not allowed
            return true;
        },
        [apiKeys],
    );

    return (
        <CommandGroup
            heading={
                <div className="flex items-center justify-between w-full">
                    {heading}
                    {refreshButton}
                </div>
            }
        >
            {emptyState ||
                models.map((m) => (
                    <CommandItem
                        key={m.id}
                        value={groupId ? `${groupId}-${m.id}` : m.id}
                        onSelect={() => {
                            if (!isModelNotAllowed(m)) {
                                onToggleModelConfig(m.id, shiftKeyRef.current);
                            } else {
                                onAddApiKey();
                            }
                        }}
                        disabled={
                            !m.isEnabled ||
                            (mode.type === "add" &&
                                checkedModelConfigIds.includes(m.id))
                        }
                        className={`group ${isModelNotAllowed(m) ? "opacity-60" : ""}`}
                    >
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-3">
                                <ProviderLogo modelId={m.modelId} size="sm" />
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <p>{m.displayName}</p>
                                        {isNewModel(m.newUntil) && (
                                            <Badge variant="secondary">
                                                <p className="text-muted-foreground text-xs">
                                                    NEW
                                                </p>
                                            </Badge>
                                        )}
                                    </div>
                                    {showCost && formatPricing(m) && (
                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                            {formatPricing(m)}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                {isModelNotAllowed(m) ? (
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
                                    <>
                                        <ModelSelectionHelpText
                                            mode={mode}
                                            modelId={m.id}
                                            checkedModelConfigIds={
                                                checkedModelConfigIds
                                            }
                                            activeGroupId={activeGroupId}
                                        />
                                        {checkedModelConfigIds.includes(
                                            m.id,
                                        ) && (
                                            <CircleCheckIcon className="!w-5 !h-5 fill-primary text-primary-foreground" />
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </CommandItem>
                ))}
        </CommandGroup>
    );
}

export const MANAGE_MODELS_CHAT_DIALOG_ID = "manage-models-chat";
export const MANAGE_MODELS_COMPARE_DIALOG_ID = "manage-models-compare";
export const MANAGE_MODELS_COMPARE_INLINE_DIALOG_ID =
    "manage-models-compare-inline"; // dialog for the inline add model button

/** Main component that handles all model grouping and UI. */
export function ManageModelsBox({
    mode,
    id,
}: {
    mode: ModelPickerMode;
    id: string; // Allow any string ID for flexibility
}) {
    const { data: apiKeys } = AppMetadataAPI.useApiKeys();
    const navigate = useNavigate();
    const isDialogClosed = useDialogStore(
        (state) => state.activeDialogId === null,
    );
    const containerRef = useRef<HTMLDivElement>(null);
    const [showMoreIndicator, setShowMoreIndicator] = useState(false);

    const selectedModelConfigsCompareResult =
        ModelsAPI.useSelectedModelConfigsCompare();
    const selectedModelConfigsCompare = useMemo(
        () => selectedModelConfigsCompareResult.data ?? [],
        [selectedModelConfigsCompareResult.data],
    );

    const updateSelectedModelConfigsCompare =
        MessageAPI.useUpdateSelectedModelConfigsCompare();
    const modelConfigs = ModelsAPI.useModelConfigs();
    const settings = useSettings();
    const showCost = settings?.showCost ?? false;

    const selectedSingleModelConfig = useMemo(() => {
        if (mode.type === "single") {
            return modelConfigs.data?.find(
                (m) => m.id === mode.selectedModelConfigId,
            );
        }
        return undefined;
    }, [mode, modelConfigs.data]);

    // model configs that will show a check mark
    const checkedModelConfigIds = useMemo(() => {
        if (mode.type === "default") {
            return selectedModelConfigsCompare.map((m) => m.id);
        } else if (mode.type === "single") {
            return selectedSingleModelConfig?.id
                ? [selectedSingleModelConfig.id]
                : [];
        } else {
            return mode.checkedModelConfigIds;
        }
    }, [mode, selectedModelConfigsCompare, selectedSingleModelConfig]);

    // Model groups hooks
    const { data: activeGroupId = "NONE" } =
        ModelGroupsAPI.useActiveModelGroupId();
    const clearActiveGroup = ModelGroupsAPI.useClearActiveModelGroup();
    const addModelToActiveGroup = ModelGroupsAPI.useAddModelToActiveGroup();
    const removeModelFromActiveGroup =
        ModelGroupsAPI.useRemoveModelFromActiveGroup();
    const updateActiveGroupOrder = ModelGroupsAPI.useUpdateActiveGroupOrder();

    const handleToggleModelConfig = useCallback(
        (id: string, shiftKey = false) => {
            const isCurrentlySelected = checkedModelConfigIds.includes(id);

            // Handle group interactions only in default mode
            if (mode.type === "default" && activeGroupId !== "NONE") {
                if (shiftKey) {
                    // Shift+click: Add/remove from active group
                    if (isCurrentlySelected) {
                        void removeModelFromActiveGroup.mutateAsync({
                            groupId: activeGroupId,
                            modelConfigId: id,
                        });
                    } else {
                        void addModelToActiveGroup.mutateAsync({
                            groupId: activeGroupId,
                            modelConfigId: id,
                        });
                    }
                } else {
                    // Regular click: Detach from group
                    void clearActiveGroup.mutateAsync();
                }
            }

            // Execute normal toggle behavior
            if (mode.type === "default") {
                mode.onToggleModelConfig(id);
            } else if (mode.type === "add") {
                mode.onAddModel(id);
                dialogActions.closeDialog();
            } else if (mode.type === "single") {
                mode.onSetModel(id);
                dialogActions.closeDialog();
            }
        },
        [
            mode,
            checkedModelConfigIds,
            activeGroupId,
            removeModelFromActiveGroup,
            addModelToActiveGroup,
            clearActiveGroup,
        ],
    );

    const handleAddApiKey = () => {
        void emit("open_settings", { tab: "api-keys" });
        dialogActions.closeDialog();
    };

    // Get all section visibility state
    const sectionsVisibility = AppMetadataAPI.useSectionsVisibility();
    const setSectionVisibility = AppMetadataAPI.useSetSectionVisibility();

    // Helper function to toggle a section
    const toggleSection = useCallback(
        (section: string) => {
            setSectionVisibility.mutate({
                section,
                visible: !sectionsVisibility[section],
            });
        },
        [sectionsVisibility, setSectionVisibility],
    );

    const [searchQuery, setSearchQuery] = useState("");
    const [spinningProviders, setSpinningProviders] = useState<
        Record<string, boolean>
    >({
        ollama: false,
        lmstudio: false,
        openrouter: false,
    });
    const listRef = useRef<HTMLDivElement>(null);

    // clear query when dropdown closes
    useEffect(() => {
        if (isDialogClosed) {
            setSearchQuery("");
        }
    }, [isDialogClosed]);

    // Drag and drop handlers
    async function onDragEnd(result: DropResult) {
        if (!result.destination) return;

        const items = [...selectedModelConfigsCompare];
        const [moved] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, moved);
        await updateSelectedModelConfigsCompare.mutateAsync({
            modelConfigs: items,
        });

        // If there's an active group, update its order too
        if (activeGroupId !== "NONE") {
            await updateActiveGroupOrder.mutateAsync({
                groupId: activeGroupId,
                modelConfigIds: items.map((m) => m.id),
            });
        }
    }

    const handleRemoveModelConfig = useCallback(
        (id: string, shiftKey: boolean) => {
            if (mode.type === "default") {
                if (activeGroupId !== "NONE") {
                    if (shiftKey) {
                        // Shift+click: Remove from group
                        void removeModelFromActiveGroup.mutateAsync({
                            groupId: activeGroupId,
                            modelConfigId: id,
                        });
                    } else {
                        // Regular click: Clear active group
                        void clearActiveGroup.mutateAsync();
                    }
                }
                mode.onToggleModelConfig(id);
            }
        },
        [mode, activeGroupId, removeModelFromActiveGroup, clearActiveGroup],
    );

    const handleRemoveAll = useCallback(
        (e: React.MouseEvent<HTMLButtonElement>) => {
            if (mode.type !== "default") return;
            if (activeGroupId !== "NONE") {
                // Clear active group
                void clearActiveGroup.mutateAsync();
            }
            e.preventDefault();
            mode.onClearModelConfigs();
        },
        [mode, activeGroupId, clearActiveGroup],
    );

    // Helper function to render model pills for dragging
    const renderModelPill = (
        provided: DraggableProvided,
        snapshot: DraggableStateSnapshot,
        rubric: DraggableRubric,
    ) => {
        const modelConfig = selectedModelConfigsCompare[rubric.source.index];
        return (
            <div
                ref={provided.innerRef}
                {...provided.draggableProps}
                {...provided.dragHandleProps}
            >
                <ModelPill
                    modelConfig={modelConfig}
                    handleRemoveModelConfig={handleRemoveModelConfig}
                    isDragging={snapshot.isDragging}
                />
            </div>
        );
    };

    // Check if scrolled to end for gradient overlay
    const checkScroll = useCallback(() => {
        const container = containerRef.current;
        if (!container) return;

        const isScrolledToEnd =
            Math.abs(
                container.scrollWidth -
                    container.scrollLeft -
                    container.clientWidth,
            ) < 10; // Small tolerance for rounding errors

        setShowMoreIndicator(
            !isScrolledToEnd && selectedModelConfigsCompare.length >= 3,
        );
    }, [selectedModelConfigsCompare.length]);

    // Check on mount and when model configs change
    useEffect(() => {
        checkScroll();
    }, [selectedModelConfigsCompare, checkScroll]);

    const handleScroll = useCallback(() => {
        checkScroll();
    }, [checkScroll]);

    const refreshLMStudio = ModelsAPI.useRefreshLMStudioModels();
    const refreshOllama = ModelsAPI.useRefreshOllamaModels();
    const refreshOpenRouter = ModelsAPI.useRefreshOpenRouterModels();

    const handleRefreshProviders = async (
        provider: "ollama" | "lmstudio" | "openrouter",
    ) => {
        setSpinningProviders((prev) => ({ ...prev, [provider]: true }));
        try {
            if (provider === "ollama") {
                await refreshOllama.mutateAsync();
            } else if (provider === "lmstudio") {
                await refreshLMStudio.mutateAsync();
            } else if (provider === "openrouter") {
                await refreshOpenRouter.mutateAsync();
            }
        } finally {
            setTimeout(() => {
                setSpinningProviders((prev) => ({
                    ...prev,
                    [provider]: false,
                }));
            }, 600);
        }
    };

    // Helper to add a new custom model
    const handleAddCustomModel = useCallback(() => {
        navigate("/new-prompt");
    }, [navigate]);

    // Compute filtered model sections based on search
    const modelSections = useMemo(() => {
        const searchTerms = searchQuery
            .toLowerCase()
            .split(" ")
            .filter(Boolean);

        const nonInternalModelConfigs =
            modelConfigs.data?.filter((m) => !m.isInternal) ?? [];
        const systemModels = nonInternalModelConfigs.filter(
            (m) => m.author === "system",
        );
        const userModels = nonInternalModelConfigs.filter(
            (m) => m.author === "user",
        );

        const localModels = systemModels.filter((m) => {
            const provider = getProviderName(m.modelId);
            return provider === "ollama" || provider === "lmstudio";
        });

        const openrouterModels = systemModels.filter(
            (m) => getProviderName(m.modelId) === "openrouter",
        );

        // Direct provider models grouped by provider
        const directProviders = [
            "anthropic",
            "openai",
            "google",
            "perplexity",
            "grok",
        ] as const;

        const directByProvider = Object.fromEntries(
            directProviders.map((provider) => [
                provider,
                filterBySearch(
                    systemModels.filter(
                        (m) => getProviderName(m.modelId) === provider,
                    ),
                    searchTerms,
                ),
            ]),
        ) as Record<(typeof directProviders)[number], ModelConfig[]>;

        const custom = filterBySearch(userModels, searchTerms);
        const local = filterBySearch(localModels, searchTerms);
        const openrouter = filterBySearch(openrouterModels, searchTerms);

        return {
            custom,
            local,
            openrouter,
            directByProvider,
        };
    }, [modelConfigs.data, searchQuery]);

    // Check if there are ANY matching models across all sections (for CommandEmpty)
    const hasAnyMatches = useMemo(() => {
        return (
            modelSections.openrouter.length > 0 ||
            modelSections.custom.length > 0 ||
            modelSections.local.length > 0 ||
            Object.values(modelSections.directByProvider).some(
                (models) => models.length > 0,
            )
        );
    }, [modelSections]);

    useLayoutEffect(() => {
        if (!listRef.current) return;

        requestAnimationFrame(() => {
            if (!listRef.current) {
                console.error("Can't find the scroll container");
                return;
            }
            console.log("resetting scroll on", listRef.current.scrollTop);
            listRef.current.scrollTop = 0;
        });
    }, [searchQuery]);

    const handleSearchInput = useCallback((value: string) => {
        setSearchQuery(value);
    }, []);

    return (
        <>
            <CommandDialog
                id={id}
                commandProps={{
                    shouldFilter: false,
                }}
            >
                <div>
                    {mode.type === "default" &&
                        selectedModelConfigsCompare.length > 0 && (
                            <div className="px-3 py-2 relative overflow-hidden border-b border-border">
                                <div
                                    className="overflow-x-auto no-scrollbar flex-grow"
                                    ref={containerRef}
                                    onScroll={handleScroll}
                                >
                                    <DragDropContext
                                        onDragEnd={(result) =>
                                            void onDragEnd(result)
                                        }
                                    >
                                        <Droppable
                                            droppableId="model-pills"
                                            direction="horizontal"
                                            getContainerForClone={() =>
                                                document.body
                                            }
                                            renderClone={renderModelPill}
                                        >
                                            {(provided) => (
                                                <div
                                                    className="flex items-center gap-2 whitespace-nowrap pr-8"
                                                    ref={provided.innerRef}
                                                    {...provided.droppableProps}
                                                >
                                                    {selectedModelConfigsCompare.map(
                                                        (
                                                            modelConfig,
                                                            index,
                                                        ) => (
                                                            <Draggable
                                                                key={
                                                                    modelConfig.id
                                                                }
                                                                draggableId={
                                                                    modelConfig.id
                                                                }
                                                                index={index}
                                                            >
                                                                {
                                                                    renderModelPill
                                                                }
                                                            </Draggable>
                                                        ),
                                                    )}
                                                    {provided.placeholder}
                                                    <button
                                                        onClick={
                                                            handleRemoveAll
                                                        }
                                                        className="text-sm text-muted-foreground hover:text-foreground flex-shrink-0"
                                                        title="Clear all models"
                                                    >
                                                        Clear{" "}
                                                        <span className="text-[10px] inline-flex items-center gap-0.5 bg-muted-foreground/10 rounded px-1 py-0.5">
                                                            <span>⌘</span>
                                                            <ArrowBigUpIcon className="w-2.5 h-2.5 -mt-0.5" />
                                                            <span>⌫</span>
                                                        </span>
                                                    </button>
                                                </div>
                                            )}
                                        </Droppable>
                                    </DragDropContext>
                                </div>
                                {/* Gradient overlay */}
                                {showMoreIndicator && (
                                    <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-r from-transparent to-background pointer-events-none"></div>
                                )}
                            </div>
                        )}
                    <CommandInput
                        placeholder="Search models..."
                        value={searchQuery}
                        onValueChange={handleSearchInput}
                        autoFocus
                    />
                </div>
                <CommandList ref={listRef}>
                    {!hasAnyMatches && (
                        <CommandEmpty>No models found</CommandEmpty>
                    )}

                    {/* Model Groups Section */}
                    {!searchQuery && mode.type === "default" && (
                        <ModelGroupsList
                            isVisible={sectionsVisibility.groups}
                            onToggleVisibility={() => toggleSection("groups")}
                            selectedModelConfigs={selectedModelConfigsCompare}
                            activeGroupId={activeGroupId}
                            allModelConfigs={modelConfigs.data ?? []}
                        />
                    )}

                    {/* OpenRouter Models - main list */}
                    {modelSections.openrouter.length > 0 && (
                        <ModelSection
                            heading={
                                <SectionHeading
                                    title="OpenRouter"
                                    isVisible={sectionsVisibility.openrouter}
                                    onToggleVisibility={() =>
                                        toggleSection("openrouter")
                                    }
                                    rightButton={
                                        <Button
                                            variant="outline"
                                            size="xs"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                void handleRefreshProviders(
                                                    "openrouter",
                                                );
                                            }}
                                            className="gap-1 px-1.5 tracking-normal"
                                            title="Refresh OpenRouter models"
                                            disabled={
                                                spinningProviders.openrouter
                                            }
                                        >
                                            <RefreshCcwIcon
                                                className={`w-3.5 h-3.5 ${
                                                    spinningProviders.openrouter
                                                        ? "animate-spin"
                                                        : ""
                                                }`}
                                            />
                                            <span className="text-sm font-sans normal-case">
                                                Refresh
                                            </span>
                                        </Button>
                                    }
                                />
                            }
                            showCost={showCost}
                            models={
                                sectionsVisibility.openrouter
                                    ? modelSections.openrouter
                                    : []
                            }
                            checkedModelConfigIds={checkedModelConfigIds}
                            mode={mode}
                            onToggleModelConfig={handleToggleModelConfig}
                            onAddApiKey={handleAddApiKey}
                            groupId="openrouter"
                            activeGroupId={activeGroupId}
                            emptyState={
                                apiKeys && !apiKeys.openrouter ? (
                                    <div className="px-2 mb-4 text-sm text-muted-foreground">
                                        <p className="mb-2">
                                            OpenRouter models require an API
                                            key.
                                        </p>
                                        <Button
                                            variant="outline"
                                            className="w-full"
                                            size="sm"
                                            onClick={(
                                                e: React.MouseEvent<HTMLButtonElement>,
                                            ) => {
                                                e.preventDefault();
                                                handleAddApiKey();
                                            }}
                                        >
                                            Add OpenRouter API key in Settings
                                        </Button>
                                    </div>
                                ) : undefined
                            }
                        />
                    )}

                    {/* Direct Provider Models (Anthropic, OpenAI, Google, etc.) */}
                    {modelSections.directByProvider.anthropic.length > 0 && (
                        <ModelSection
                            heading={
                                <SectionHeading
                                    title="Anthropic"
                                    isVisible={sectionsVisibility.anthropic}
                                    onToggleVisibility={() =>
                                        toggleSection("anthropic")
                                    }
                                />
                            }
                            models={
                                sectionsVisibility.anthropic
                                    ? modelSections.directByProvider.anthropic
                                    : []
                            }
                            checkedModelConfigIds={checkedModelConfigIds}
                            mode={mode}
                            onToggleModelConfig={handleToggleModelConfig}
                            onAddApiKey={handleAddApiKey}
                            groupId="anthropic"
                            activeGroupId={activeGroupId}
                            showCost={showCost}
                        />
                    )}
                    {modelSections.directByProvider.openai.length > 0 && (
                        <ModelSection
                            heading={
                                <SectionHeading
                                    title="OpenAI"
                                    isVisible={sectionsVisibility.openai}
                                    onToggleVisibility={() =>
                                        toggleSection("openai")
                                    }
                                />
                            }
                            models={
                                sectionsVisibility.openai
                                    ? modelSections.directByProvider.openai
                                    : []
                            }
                            checkedModelConfigIds={checkedModelConfigIds}
                            mode={mode}
                            onToggleModelConfig={handleToggleModelConfig}
                            onAddApiKey={handleAddApiKey}
                            groupId="openai"
                            activeGroupId={activeGroupId}
                            showCost={showCost}
                        />
                    )}
                    {modelSections.directByProvider.google.length > 0 && (
                        <ModelSection
                            heading={
                                <SectionHeading
                                    title="Google"
                                    isVisible={sectionsVisibility.google}
                                    onToggleVisibility={() =>
                                        toggleSection("google")
                                    }
                                />
                            }
                            models={
                                sectionsVisibility.google
                                    ? modelSections.directByProvider.google
                                    : []
                            }
                            checkedModelConfigIds={checkedModelConfigIds}
                            mode={mode}
                            onToggleModelConfig={handleToggleModelConfig}
                            onAddApiKey={handleAddApiKey}
                            groupId="google"
                            activeGroupId={activeGroupId}
                            showCost={showCost}
                        />
                    )}
                    {modelSections.directByProvider.grok.length > 0 && (
                        <ModelSection
                            heading={
                                <SectionHeading
                                    title="Grok"
                                    isVisible={sectionsVisibility.grok}
                                    onToggleVisibility={() =>
                                        toggleSection("grok")
                                    }
                                />
                            }
                            models={
                                sectionsVisibility.grok
                                    ? modelSections.directByProvider.grok
                                    : []
                            }
                            checkedModelConfigIds={checkedModelConfigIds}
                            mode={mode}
                            onToggleModelConfig={handleToggleModelConfig}
                            onAddApiKey={handleAddApiKey}
                            groupId="grok"
                            activeGroupId={activeGroupId}
                            showCost={showCost}
                        />
                    )}
                    {modelSections.directByProvider.perplexity.length > 0 && (
                        <ModelSection
                            heading={
                                <SectionHeading
                                    title="Perplexity"
                                    isVisible={sectionsVisibility.perplexity}
                                    onToggleVisibility={() =>
                                        toggleSection("perplexity")
                                    }
                                />
                            }
                            models={
                                sectionsVisibility.perplexity
                                    ? modelSections.directByProvider.perplexity
                                    : []
                            }
                            checkedModelConfigIds={checkedModelConfigIds}
                            mode={mode}
                            onToggleModelConfig={handleToggleModelConfig}
                            onAddApiKey={handleAddApiKey}
                            groupId="perplexity"
                            activeGroupId={activeGroupId}
                            showCost={showCost}
                        />
                    )}

                    {/* Custom Models */}
                    {(modelSections.custom.length > 0 || !searchQuery) && (
                        <ModelSection
                            heading={
                                <SectionHeading
                                    title="Custom"
                                    isVisible={sectionsVisibility.custom}
                                    onToggleVisibility={() =>
                                        toggleSection("custom")
                                    }
                                    rightButton={
                                        <Button
                                            variant="outline"
                                            size="xs"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                handleAddCustomModel();
                                            }}
                                            className="gap-1 px-1.5 tracking-normal"
                                            title="Add custom model"
                                        >
                                            <PlusIcon className="w-3.5 h-3.5" />
                                            <span className="text-sm font-sans normal-case">
                                                Add
                                            </span>
                                        </Button>
                                    }
                                />
                            }
                            models={
                                sectionsVisibility.custom
                                    ? modelSections.custom
                                    : []
                            }
                            checkedModelConfigIds={checkedModelConfigIds}
                            mode={mode}
                            onToggleModelConfig={handleToggleModelConfig}
                            onAddApiKey={handleAddApiKey}
                            groupId="custom"
                            activeGroupId={activeGroupId}
                            showCost={showCost}
                        />
                    )}

                    {/* Local Models */}
                    {(modelSections.local.length > 0 || !searchQuery) && (
                        <ModelSection
                            heading={
                                <SectionHeading
                                    title="Local"
                                    isVisible={sectionsVisibility.local}
                                    onToggleVisibility={() =>
                                        toggleSection("local")
                                    }
                                    rightButton={
                                        <Button
                                            variant="outline"
                                            size="xs"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                void handleRefreshProviders(
                                                    "ollama",
                                                );
                                                void handleRefreshProviders(
                                                    "lmstudio",
                                                );
                                            }}
                                            className="gap-1 px-1.5 tracking-normal"
                                            title="Refresh local models"
                                            disabled={
                                                spinningProviders.ollama ||
                                                spinningProviders.lmstudio
                                            }
                                        >
                                            <RefreshCcwIcon
                                                className={`w-3.5 h-3.5 ${
                                                    spinningProviders.ollama ||
                                                    spinningProviders.lmstudio
                                                        ? "animate-spin"
                                                        : ""
                                                }`}
                                            />
                                            <span className="text-sm font-sans normal-case">
                                                Refresh
                                            </span>
                                        </Button>
                                    }
                                />
                            }
                            showCost={showCost}
                            models={
                                sectionsVisibility.local
                                    ? modelSections.local
                                    : []
                            }
                            checkedModelConfigIds={checkedModelConfigIds}
                            mode={mode}
                            onToggleModelConfig={handleToggleModelConfig}
                            onAddApiKey={handleAddApiKey}
                            groupId="local"
                            activeGroupId={activeGroupId}
                            emptyState={
                                modelSections.local.length === 0 ? (
                                    <div className="flex flex-col gap-2 px-2">
                                        <div className="text-sm text-muted-foreground">
                                            No local models found. To run local
                                            models, you must have Ollama or LM
                                            Studio installed.
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={(
                                                e: React.MouseEvent<HTMLButtonElement>,
                                            ) => {
                                                e.preventDefault();
                                                void handleRefreshProviders(
                                                    "ollama",
                                                );
                                                void handleRefreshProviders(
                                                    "lmstudio",
                                                );
                                            }}
                                            title="Refresh local models"
                                        >
                                            Refresh local models
                                            <RefreshCcwIcon
                                                className={`w-3 h-3 ml-2 ${
                                                    spinningProviders[
                                                        "ollama"
                                                    ] ||
                                                    spinningProviders[
                                                        "lmstudio"
                                                    ]
                                                        ? "animate-spin"
                                                        : ""
                                                }`}
                                            />
                                        </Button>
                                    </div>
                                ) : undefined
                            }
                        />
                    )}
                </CommandList>
            </CommandDialog>
        </>
    );
}

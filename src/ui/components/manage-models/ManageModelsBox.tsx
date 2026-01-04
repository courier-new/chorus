import {
    useState,
    useCallback,
    useMemo,
    useRef,
    useLayoutEffect,
    useEffect,
} from "react";
import { useNavigate } from "react-router-dom";
import {
    ModelConfig,
    ModelInstance,
    getProviderLabel,
    getProviderName,
} from "@core/chorus/Models";
import { PlusIcon, RefreshCcwIcon } from "lucide-react";
import {
    CommandDialog,
    CommandGroup,
    CommandInput,
    CommandList,
    CommandEmpty,
} from "../ui/command";
import { Button } from "../ui/button";
import { emit } from "@tauri-apps/api/event";
import { dialogActions, useDialogStore } from "@core/infra/DialogStore";
import * as AppMetadataAPI from "@core/chorus/api/AppMetadataAPI";
import * as ModelsAPI from "@core/chorus/api/ModelsAPI";
import { ModelGroupsList } from "./ModelGroupsList";
import { SectionHeading } from "./SectionHeading";
import {
    ModelCommandItem,
    ModelPickerMultiSelectProps,
    ModelPickerToggleProps,
} from "./ModelCommandItem";
import { ActiveModelGroupSection } from "./ActiveReadOnlyModelGroupSection";

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

type ModelPickerMode = "ADD" | "MULTI";

type ModelSectionProps = {
    heading: React.ReactNode;
    models: ModelConfig[];
    refreshButton?: React.ReactNode;
    emptyState?: React.ReactNode;
    onAddApiKey: () => void;
    groupId?: string;
    useGetModelInstancesForConfig?: (modelConfigId: string) => ModelInstance[];
} & (ModelPickerToggleProps | ModelPickerMultiSelectProps);

/** A component to render a section of models with a heading */
function ModelSection({
    heading,
    models,
    refreshButton,
    emptyState,
    onAddApiKey,
    groupId,
    useGetModelInstancesForConfig,
    ...modelPickerCallbacks
}: ModelSectionProps) {
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
                    <ModelCommandItem
                        key={m.id}
                        groupId={groupId}
                        modelConfig={m}
                        onAddApiKey={onAddApiKey}
                        useGetModelInstancesForConfig={
                            useGetModelInstancesForConfig
                        }
                        {...modelPickerCallbacks}
                    />
                ))}
        </CommandGroup>
    );
}

export const MANAGE_MODELS_CHAT_DIALOG_ID = "manage-models-chat";
export const MANAGE_MODELS_COMPARE_DIALOG_ID = "manage-models-compare";
export const MANAGE_MODELS_COMPARE_INLINE_DIALOG_ID =
    "manage-models-compare-inline"; // dialog for the inline add model button

type ManageModelsBoxProps = {
    children?: React.ReactNode;
    mode: ModelPickerMode;
    id: string; // Allow any string ID for flexibility
    /**
     * Helper function to get the model instances for a given model config ID.
     * If not provided, will default to checking the currently selected model
     * instances in the app metadata.
     */
    useGetModelInstancesForConfig?: (modelConfigId: string) => ModelInstance[];
} & (ModelPickerToggleProps | ModelPickerMultiSelectProps);

/** Main component that handles all model grouping and UI. */
export function ManageModelsBox({
    children,
    id,
    mode,
    useGetModelInstancesForConfig,
    ...modelPickerCallbacks
}: ManageModelsBoxProps) {
    const { data: apiKeys } = AppMetadataAPI.useApiKeys();
    const navigate = useNavigate();
    const isDialogClosed = useDialogStore(
        (state) => state.activeDialogId === null,
    );

    const { data: modelConfigs = [] } = ModelsAPI.useModelConfigs();

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
            modelConfigs.filter((m) => !m.isInternal) ?? [];
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
    }, [modelConfigs, searchQuery]);

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
        <CommandDialog
            id={id}
            commandProps={{
                shouldFilter: false,
            }}
        >
            <div>
                {children}
                <CommandInput
                    placeholder="Search models..."
                    value={searchQuery}
                    onValueChange={handleSearchInput}
                    autoFocus
                />
            </div>
            <CommandList ref={listRef}>
                {mode === "MULTI" && searchQuery && <ActiveModelGroupSection />}

                {!hasAnyMatches && <CommandEmpty>No models found</CommandEmpty>}

                {/* Model Groups Section */}
                {mode === "MULTI" && !searchQuery && (
                    <ModelGroupsList
                        isVisible={sectionsVisibility.groups}
                        onToggleVisibility={() => toggleSection("groups")}
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
                                        disabled={spinningProviders.openrouter}
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
                        models={
                            sectionsVisibility.openrouter
                                ? modelSections.openrouter
                                : []
                        }
                        useGetModelInstancesForConfig={
                            useGetModelInstancesForConfig
                        }
                        {...modelPickerCallbacks}
                        onAddApiKey={handleAddApiKey}
                        groupId="openrouter"
                        emptyState={
                            apiKeys && !apiKeys.openrouter ? (
                                <div className="px-2 mb-4 text-sm text-muted-foreground">
                                    <p className="mb-2">
                                        OpenRouter models require an API key.
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
                        useGetModelInstancesForConfig={
                            useGetModelInstancesForConfig
                        }
                        {...modelPickerCallbacks}
                        onAddApiKey={handleAddApiKey}
                        groupId="anthropic"
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
                        useGetModelInstancesForConfig={
                            useGetModelInstancesForConfig
                        }
                        {...modelPickerCallbacks}
                        onAddApiKey={handleAddApiKey}
                        groupId="openai"
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
                        useGetModelInstancesForConfig={
                            useGetModelInstancesForConfig
                        }
                        {...modelPickerCallbacks}
                        onAddApiKey={handleAddApiKey}
                        groupId="google"
                    />
                )}
                {modelSections.directByProvider.grok.length > 0 && (
                    <ModelSection
                        heading={
                            <SectionHeading
                                title="Grok"
                                isVisible={sectionsVisibility.grok}
                                onToggleVisibility={() => toggleSection("grok")}
                            />
                        }
                        models={
                            sectionsVisibility.grok
                                ? modelSections.directByProvider.grok
                                : []
                        }
                        useGetModelInstancesForConfig={
                            useGetModelInstancesForConfig
                        }
                        {...modelPickerCallbacks}
                        onAddApiKey={handleAddApiKey}
                        groupId="grok"
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
                        useGetModelInstancesForConfig={
                            useGetModelInstancesForConfig
                        }
                        {...modelPickerCallbacks}
                        onAddApiKey={handleAddApiKey}
                        groupId="perplexity"
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
                        useGetModelInstancesForConfig={
                            useGetModelInstancesForConfig
                        }
                        {...modelPickerCallbacks}
                        onAddApiKey={handleAddApiKey}
                        groupId="custom"
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
                        models={
                            sectionsVisibility.local ? modelSections.local : []
                        }
                        useGetModelInstancesForConfig={
                            useGetModelInstancesForConfig
                        }
                        {...modelPickerCallbacks}
                        onAddApiKey={handleAddApiKey}
                        groupId="local"
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
                                                spinningProviders["ollama"] ||
                                                spinningProviders["lmstudio"]
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
    );
}

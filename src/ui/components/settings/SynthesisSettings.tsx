import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { SYNTHESIS_SYSTEM_PROMPT } from "@core/chorus/prompts/prompts";
import * as ModelsAPI from "@core/chorus/api/ModelsAPI";
import * as AppMetadataAPI from "@core/chorus/api/AppMetadataAPI";
import {
    useSynthesisModelConfigId,
    useSetSynthesisModelConfigId,
    useSynthesisPrompt,
    useSetSynthesisPrompt,
    useAutoSynthesize,
    useSetAutoSynthesize,
    useAutoCollapse,
    useSetAutoCollapse,
    useAllowShortcutRegenerate,
    useSetAllowShortcutRegenerate,
} from "@ui/components/hooks/useSettings";
import { useReactQueryAutoSync } from "use-react-query-auto-sync";
import { ProviderLogo } from "../ui/provider-logo";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../ui/select";
import { getProviderName } from "@core/chorus/Models";
import { canProceedWithProvider } from "@core/utilities/ProxyUtils";
import { useCallback, useMemo, useState } from "react";
import {
    comboToDisplayString,
    validateShortcut,
} from "@core/utilities/Shortcuts";
import { Switch } from "../ui/switch";
import {
    useResetShortcut,
    useShortcutConfig,
    useUpdateShortcut,
} from "@core/utilities/ShortcutsAPI";
import ShortcutRecorder from "./ShortcutRecorder";
import { MergeIcon, RotateCcw } from "lucide-react";
import { DEFAULT_SYNTHESIS_MODEL_CONFIG_ID } from "@core/utilities/Settings";
import { SettingsTabHeader } from "./SettingsTabHeader";
import { cn } from "@ui/lib/utils";

export function SynthesisSettings() {
    // Synthesis settings hooks
    const synthesisModelConfigId = useSynthesisModelConfigId();
    const { mutateAsync: setSynthesisModelConfigId } =
        useSetSynthesisModelConfigId();
    const synthesisPromptFromSettings = useSynthesisPrompt();
    const { mutateAsync: setSynthesisPrompt } = useSetSynthesisPrompt();
    const { combo: shortcut, disabled: shortcutDisabled } =
        useShortcutConfig("synthesize");
    const { mutate: updateShortcut } = useUpdateShortcut();
    const { mutate: resetShortcut } = useResetShortcut();

    // Auto-synthesis settings
    const autoSynthesize = useAutoSynthesize();
    const { mutateAsync: setAutoSynthesize } = useSetAutoSynthesize();
    const autoCollapse = useAutoCollapse();
    const { mutateAsync: setAutoCollapse } = useSetAutoCollapse();
    const allowShortcutRegenerate = useAllowShortcutRegenerate();
    const { mutateAsync: setAllowShortcutRegenerate } =
        useSetAllowShortcutRegenerate();

    // Synthesis prompt autosync
    const { draft: synthesisPromptDraft, setDraft: setSynthesisPromptDraft } =
        useReactQueryAutoSync({
            queryOptions: {
                queryKey: ["synthesisPrompt"],
                queryFn: () =>
                    Promise.resolve(
                        synthesisPromptFromSettings ?? SYNTHESIS_SYSTEM_PROMPT,
                    ),
            },
            mutationOptions: {
                mutationFn: async (value: string) => {
                    await setSynthesisPrompt(value);
                    return value;
                },
            },
            autoSaveOptions: {
                wait: 1000, // Wait 1 second after last change
            },
        });

    // Model configs for synthesis model picker
    const { data: modelConfigs } = ModelsAPI.useModelConfigs();
    const { data: apiKeys = {} } = AppMetadataAPI.useApiKeys();

    // Filter models to only show enabled, non-deprecated, non-internal models
    // that have API keys configured (or are local models like ollama/lmstudio)
    const availableModels = useMemo(() => {
        if (!modelConfigs) return [];

        return modelConfigs.filter((m) => {
            // Filter out internal and deprecated models
            if (m.isInternal || m.isDeprecated) return false;

            // Filter out disabled models
            if (!m.isEnabled) return false;

            // Filter out models that don't have an API key configured
            const provider = getProviderName(m.modelId);
            const { canProceed } = canProceedWithProvider(provider, apiKeys);

            return canProceed;
        });
    }, [modelConfigs, apiKeys]);

    // Get the selected model config for display
    const selectedModelConfig = modelConfigs?.find(
        (m) => m.modelId === synthesisModelConfigId,
    );

    const handleModelChange = useCallback(
        async (modelId: string) => {
            await setSynthesisModelConfigId(modelId);
        },
        [setSynthesisModelConfigId],
    );

    const onResetModelClick = useCallback(() => {
        void setSynthesisModelConfigId(DEFAULT_SYNTHESIS_MODEL_CONFIG_ID);
    }, [setSynthesisModelConfigId]);

    // Artificial value to force a reset of the synthesis shortcut recorder by
    // its parent component (this one)
    const [shortcutForceReset, setShortcutForceReset] = useState(0);

    const handleShortcutChange = useCallback(
        (combo: string) => {
            updateShortcut({
                shortcutId: "synthesize",
                config: { combo, disabled: false },
            });
        },
        [updateShortcut],
    );

    const handleShortcutEnabledChange = useCallback(
        (enabled: boolean) => {
            updateShortcut({
                shortcutId: "synthesize",
                config: { combo: shortcut, disabled: !enabled },
            });
        },
        [shortcut, updateShortcut],
    );

    const onResetShortcutClick = useCallback(() => {
        resetShortcut("synthesize");
        setShortcutForceReset((prev) => prev + 1);
    }, [resetShortcut]);

    const onResetPromptClick = useCallback(async () => {
        await setSynthesisPrompt(undefined);
        setSynthesisPromptDraft(SYNTHESIS_SYSTEM_PROMPT);
    }, [setSynthesisPrompt, setSynthesisPromptDraft]);

    return (
        <div className="space-y-6">
            <SettingsTabHeader
                icon={MergeIcon}
                title="Synthesis"
                description="Configure settings for synthesizing responses from multiple models."
            />

            <div className="space-y-4">
                {/* Auto-Synthesize and Auto-Collapse toggles */}
                <div>
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <label className="font-semibold">
                                Auto-synthesize
                            </label>
                            <p className="text-sm text-muted-foreground">
                                Automatically synthesize responses when all
                                models finish
                            </p>
                        </div>
                        <Switch
                            checked={autoSynthesize}
                            onCheckedChange={(enabled) =>
                                void setAutoSynthesize(enabled)
                            }
                        />
                    </div>

                    {/* Only visible when Auto-Synthesize is enabled */}
                    <div
                        className={cn(
                            "grid transition-[grid-template-rows] duration-200 ease-out",
                            autoSynthesize
                                ? "grid-rows-[1fr]"
                                : "grid-rows-[0fr]",
                        )}
                    >
                        <div className="min-h-0 overflow-hidden">
                            <div className="flex items-center justify-between pt-4">
                                <div className="space-y-0.5">
                                    <label className="font-semibold">
                                        Auto-collapse responses
                                    </label>
                                    <p className="text-sm text-muted-foreground">
                                        Individual model responses start
                                        collapsed by default
                                    </p>
                                </div>
                                <Switch
                                    checked={autoCollapse}
                                    onCheckedChange={(enabled) =>
                                        void setAutoCollapse(enabled)
                                    }
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Shortcut trigger, recorder, and Allow Shortcut Regenerate toggles */}
                <div>
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <label className="font-semibold">
                                Shortcut trigger
                            </label>
                            <p className="text-sm text-muted-foreground">
                                Synthesize a response with{" "}
                                <span className="font-mono">
                                    {comboToDisplayString(shortcut, true)}
                                </span>
                            </p>
                        </div>
                        <Switch
                            checked={!shortcutDisabled}
                            onCheckedChange={handleShortcutEnabledChange}
                        />
                    </div>

                    {/* Only visible when shortcut is enabled */}
                    <div
                        className={cn(
                            "grid transition-[grid-template-rows] duration-200 ease-out",
                            !shortcutDisabled
                                ? "grid-rows-[1fr]"
                                : "grid-rows-[0fr]",
                        )}
                    >
                        <div className="min-h-0 overflow-hidden">
                            <div className="space-y-4 pt-4">
                                <div className="space-y-2">
                                    <p className="text-sm text-muted-foreground">
                                        Enter the shortcut you want to use to
                                        synthesize a response
                                    </p>
                                    <div className="flex items-start justify-between gap-2">
                                        <ShortcutRecorder
                                            disabled={shortcutDisabled}
                                            className="w-full flex-1"
                                            value={shortcut}
                                            onChange={handleShortcutChange}
                                            onValidate={validateShortcut}
                                            forceReset={shortcutForceReset}
                                        />
                                        <Button
                                            className="gap-1"
                                            disabled={shortcutDisabled}
                                            variant="secondary"
                                            size="xs"
                                            onClick={onResetShortcutClick}
                                            title="Reset to default"
                                        >
                                            <RotateCcw /> Reset
                                        </Button>
                                    </div>
                                </div>

                                {/* Allow Shortcut Regenerate toggle */}
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <label className="font-semibold">
                                            Allow shortcut to regenerate
                                        </label>
                                        <p className="text-sm text-muted-foreground">
                                            Activate the shortcut trigger to
                                            regenerate existing synthesis
                                        </p>
                                    </div>
                                    <Switch
                                        checked={allowShortcutRegenerate}
                                        onCheckedChange={(enabled) =>
                                            void setAllowShortcutRegenerate(
                                                enabled,
                                            )
                                        }
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="space-y-0.5">
                        <label className="font-semibold">Model</label>
                        <p className="text-sm text-muted-foreground">
                            Choose which model to use for synthesis
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Select
                            value={synthesisModelConfigId || ""}
                            onValueChange={handleModelChange}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select a model...">
                                    {selectedModelConfig && (
                                        <div className="flex items-center gap-2">
                                            <ProviderLogo
                                                modelId={
                                                    selectedModelConfig.modelId
                                                }
                                                className="w-4 h-4"
                                            />
                                            <span>
                                                {
                                                    selectedModelConfig.displayName
                                                }
                                            </span>
                                        </div>
                                    )}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                {availableModels.length === 0 ? (
                                    <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                                        No models available. Add API keys in the
                                        API Keys tab.
                                    </div>
                                ) : (
                                    availableModels.map((modelConfig) => (
                                        <SelectItem
                                            key={modelConfig.id}
                                            value={modelConfig.modelId}
                                        >
                                            <div className="flex items-center gap-2">
                                                <ProviderLogo
                                                    modelId={
                                                        modelConfig.modelId
                                                    }
                                                    className="w-4 h-4"
                                                />
                                                <span>
                                                    {modelConfig.displayName}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {getProviderName(
                                                        modelConfig.modelId,
                                                    )}
                                                </span>
                                            </div>
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                        <Button
                            className="gap-1"
                            variant="secondary"
                            size="xs"
                            onClick={onResetModelClick}
                            title="Reset to default"
                        >
                            <RotateCcw /> Reset
                        </Button>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="space-y-0.5">
                        <label className="font-semibold">Prompt</label>
                        <p className="text-sm text-muted-foreground">
                            Customize the system prompt used for synthesis
                        </p>
                    </div>
                    <Textarea
                        value={synthesisPromptDraft || ""}
                        onChange={(e) =>
                            setSynthesisPromptDraft(e.target.value)
                        }
                        placeholder="Enter custom synthesis prompt..."
                        rows={15}
                        className="w-full font-mono text-sm resize-y min-h-[200px]"
                    />
                    <div className="flex justify-end pt-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onResetPromptClick}
                        >
                            Reset to default
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

import { useEffect } from "react";
import {
    Settings,
    SettingsManager,
    DEFAULT_SYNTHESIS_MODEL_CONFIG_ID,
} from "@core/utilities/Settings";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const settingsManager = SettingsManager.getInstance();

export function listenForSettingsChanges(
    callback: (settings: Settings) => void,
) {
    return listen<Settings>("settings-changed", (event) => {
        callback(event.payload);
    });
}

/**
 * We use a global, module-level listener for settings changes to ensure the
 * Tauri event listener is only registered once across the app lifecycle. The
 * listener invalidates the settings queries when settings change externally
 * from another part of the application.
 */
let settingsListener: Promise<UnlistenFn> | null = null;
function initializeSettingsListener(
    queryClient: ReturnType<typeof useQueryClient>,
) {
    if (settingsListener) return;
    settingsListener = listen<Settings>("settings-changed", () => {
        void queryClient.invalidateQueries({
            queryKey: settingsQueryKeys.all,
        });
    });
}

export function useSettings() {
    const queryClient = useQueryClient();

    // Initialize the settings listener once, queryClient should be stable
    // across the app lifecycle.
    useEffect(() => {
        initializeSettingsListener(queryClient);
    }, [queryClient]);

    return useQuery({
        queryKey: settingsQueryKeys.settings(),
        queryFn: async (): Promise<Settings> => {
            return await settingsManager.get();
        },
    });
}

export const settingsQueryKeys = {
    all: ["settings"] as const,
    settings: () => [...settingsQueryKeys.all, "settings"] as const,
};

/**
 * Generic hook to create a mutation for updating settings.
 */
function useSettingsMutation<T>(
    mutationKey: readonly string[],
    updater: (currentSettings: Settings, value: T) => Settings,
) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationKey,
        mutationFn: async (value: T) => {
            const currentSettings = await settingsManager.get();
            await settingsManager.set(updater(currentSettings, value));
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({
                queryKey: settingsQueryKeys.all,
            });
        },
    });
}

/**
 * Hook to get the synthesis model config ID
 */
export function useSynthesisModelConfigId() {
    const { data: settings } = useSettings();
    return (
        settings?.synthesis.modelConfigId ?? DEFAULT_SYNTHESIS_MODEL_CONFIG_ID
    );
}

/**
 * Hook to set the synthesis model config ID
 */
export function useSetSynthesisModelConfigId() {
    return useSettingsMutation(
        ["setSynthesisModelConfigId"],
        (settings, modelConfigId: string) => ({
            ...settings,
            synthesis: { ...settings.synthesis, modelConfigId },
        }),
    );
}

/**
 * Hook to get the synthesis prompt
 */
export function useSynthesisPrompt() {
    const { data: settings } = useSettings();
    return settings?.synthesis.prompt ?? undefined;
}

/**
 * Hook to set the synthesis prompt
 */
export function useSetSynthesisPrompt() {
    return useSettingsMutation(
        ["setSynthesisPrompt"],
        (settings, prompt: string | undefined) => ({
            ...settings,
            synthesis: { ...settings.synthesis, prompt },
        }),
    );
}

/**
 * Hook to set the global new chat config
 */
export function useSetGlobalNewChatConfig() {
    return useSettingsMutation(
        ["setGlobalNewChatConfig"],
        (settings, config: Settings["globalNewChat"]) => ({
            ...settings,
            globalNewChat: config,
        }),
    );
}

/**
 * Hook to get the auto-synthesize setting
 */
export function useAutoSynthesize(): boolean {
    const { data: settings } = useSettings();
    return settings?.synthesis.autoSynthesize ?? false;
}

/**
 * Hook to set the auto-synthesize setting
 * When disabling auto-synthesize, also disables auto-collapse
 */
export function useSetAutoSynthesize() {
    return useSettingsMutation(
        ["setAutoSynthesize"],
        (settings, autoSynthesize: boolean) => ({
            ...settings,
            synthesis: {
                ...settings.synthesis,
                autoSynthesize,
                // When disabling auto-synthesize, also disable auto-collapse
                ...(autoSynthesize ? {} : { autoCollapse: false }),
            },
        }),
    );
}

/**
 * Hook to get the auto-collapse setting
 */
export function useAutoCollapse(): boolean {
    const { data: settings } = useSettings();
    return settings?.synthesis.autoCollapse ?? false;
}

/**
 * Hook to set the auto-collapse setting
 */
export function useSetAutoCollapse() {
    return useSettingsMutation(
        ["setAutoCollapse"],
        (settings, autoCollapse: boolean) => ({
            ...settings,
            synthesis: { ...settings.synthesis, autoCollapse },
        }),
    );
}

/**
 * Hook to get the allow-shortcut-regenerate setting
 */
export function useAllowShortcutRegenerate(): boolean {
    const { data: settings } = useSettings();
    return settings?.synthesis.allowShortcutRegenerate ?? false;
}

/**
 * Hook to set the allow-shortcut-regenerate setting
 */
export function useSetAllowShortcutRegenerate() {
    return useSettingsMutation(
        ["setAllowShortcutRegenerate"],
        (settings, allowShortcutRegenerate: boolean) => ({
            ...settings,
            synthesis: { ...settings.synthesis, allowShortcutRegenerate },
        }),
    );
}

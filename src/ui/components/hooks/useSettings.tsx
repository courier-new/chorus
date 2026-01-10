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
    const queryClient = useQueryClient();
    return useMutation({
        mutationKey: ["setSynthesisModelConfigId"] as const,
        mutationFn: async (modelConfigId: string) => {
            const currentSettings = await settingsManager.get();
            await settingsManager.set({
                ...currentSettings,
                synthesis: {
                    ...currentSettings.synthesis,
                    modelConfigId,
                },
            });
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({
                queryKey: settingsQueryKeys.all,
            });
        },
    });
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
    const queryClient = useQueryClient();
    return useMutation({
        mutationKey: ["setSynthesisPrompt"] as const,
        mutationFn: async (prompt: string | undefined) => {
            const currentSettings = await settingsManager.get();
            await settingsManager.set({
                ...currentSettings,
                synthesis: {
                    ...currentSettings.synthesis,
                    prompt,
                },
            });
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({
                queryKey: settingsQueryKeys.all,
            });
        },
    });
}

/**
 * Hook to set the global new chat config
 */
export function useSetGlobalNewChatConfig() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationKey: ["setGlobalNewChatConfig"] as const,
        mutationFn: async (config: Settings["globalNewChat"]) => {
            const currentSettings = await settingsManager.get();
            await settingsManager.set({
                ...currentSettings,
                globalNewChat: config,
            });
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({
                queryKey: settingsQueryKeys.all,
            });
        },
    });
}

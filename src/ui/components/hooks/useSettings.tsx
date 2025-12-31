import { useEffect } from "react";
import { Settings, SettingsManager } from "@core/utilities/Settings";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { useQuery, useQueryClient } from "@tanstack/react-query";

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

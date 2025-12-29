import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useEffect } from "react";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { SettingsManager, Settings } from "./Settings";
import {
    ShortcutId,
    ShortcutUserConfig,
    ShortcutsSettings,
    DEFAULT_SHORTCUTS,
    createDefaultShortcutsConfig,
    comboToDisplayString,
    ShortcutDefinition,
    parseBinding,
    bindingIsDefault,
} from "./Shortcuts";

const settingsManager = SettingsManager.getInstance();

/**
 * We use a global, module-level listener for settings changes to ensure the
 * Tauri event listener is only registered once across the app lifecycle. The
 * listener invalidates the keyboard shortcuts settings queries when settings
 * change externally from another part of the application.
 */
let settingsListener: Promise<UnlistenFn> | null = null;
function initializeSettingsListener(
    queryClient: ReturnType<typeof useQueryClient>,
) {
    if (settingsListener) return;
    settingsListener = listen<Settings>("settings-changed", () => {
        console.log("settings-changed for shortcutsAPI");
        void queryClient.invalidateQueries({
            queryKey: shortcutsQueryKeys.all,
        });
    });
}

export const shortcutsQueryKeys = {
    all: ["shortcuts"] as const,
    settings: () => [...shortcutsQueryKeys.all, "settings"] as const,
};

/**
 * Hook to get all shortcuts settings
 */
export function useShortcutsSettings() {
    const queryClient = useQueryClient();

    // Initialize the settings listener once, queryClient should be stable
    // across the app lifecycle.
    useEffect(() => {
        initializeSettingsListener(queryClient);
    }, [queryClient]);

    return useQuery({
        queryKey: shortcutsQueryKeys.settings(),
        queryFn: async (): Promise<ShortcutsSettings> => {
            const settings = await settingsManager.get();
            return settings.shortcuts;
        },
    });
}

/**
 * Hook to get a single shortcut's effective configuration (based on default and
 * user settings)
 */
export function useShortcutConfig(shortcutId: ShortcutId): {
    combo: string;
    disabled: boolean;
    isDefault: boolean;
    definition: ShortcutDefinition;
} {
    const { data: shortcuts } = useShortcutsSettings();

    const config = shortcuts?.[shortcutId];
    const defaultDefinition = DEFAULT_SHORTCUTS[shortcutId];

    return useMemo(
        () => ({
            combo: config?.combo ?? defaultDefinition.defaultCombo,
            // All shortcuts are enabled by default
            disabled: config?.disabled ?? false,
            isDefault:
                !config ||
                bindingIsDefault(shortcutId, parseBinding(config.combo)),
            definition: defaultDefinition,
        }),
        [config, shortcutId, defaultDefinition],
    );
}

/**
 * Hook to get a shortcut's display string (e.g., "⌘K")
 */
export function useShortcutDisplay(
    shortcutId: ShortcutId,
    withPlus = false,
): string | null {
    const { combo, disabled } = useShortcutConfig(shortcutId);
    return disabled ? null : comboToDisplayString(combo, withPlus);
}

/**
 * Hook to update a single shortcut's user configuration.
 */
export function useUpdateShortcut() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            shortcutId,
            config,
        }: {
            shortcutId: ShortcutId;
            config: ShortcutUserConfig;
        }) => {
            const settings = await settingsManager.get();

            const updatedShortcuts: ShortcutsSettings = {
                ...settings.shortcuts,
                [shortcutId]: config,
            };

            const updatedSettings: Settings = {
                ...settings,
                shortcuts: updatedShortcuts,
            };

            await settingsManager.set(updatedSettings);
            return updatedShortcuts;
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({
                queryKey: shortcutsQueryKeys.all,
            });
        },
    });
}

/**
 * Hook to reset a single shortcut to its default
 */
export function useResetShortcut() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (shortcutId: ShortcutId) => {
            console.log("Resetting shortcut", shortcutId);
            const settings = await settingsManager.get();
            const definition = DEFAULT_SHORTCUTS[shortcutId];

            const updatedShortcuts: ShortcutsSettings = {
                ...settings.shortcuts,
                [shortcutId]: {
                    combo: definition.defaultCombo,
                    disabled: false,
                },
            };

            const updatedSettings: Settings = {
                ...settings,
                shortcuts: updatedShortcuts,
            };

            await settingsManager.set(updatedSettings);
            return updatedShortcuts;
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({
                queryKey: shortcutsQueryKeys.all,
            });
        },
    });
}

/**
 * Hook to reset all shortcuts to their defaults
 */
export function useResetAllShortcuts() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            const settings = await settingsManager.get();
            const defaultShortcuts = createDefaultShortcutsConfig();

            const updatedSettings: Settings = {
                ...settings,
                shortcuts: defaultShortcuts,
            };

            await settingsManager.set(updatedSettings);
            return defaultShortcuts;
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({
                queryKey: shortcutsQueryKeys.all,
            });
        },
    });
}

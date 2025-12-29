import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useEffect } from "react";
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
// Query keys
export const shortcutsQueryKeys = {
    all: ["shortcuts"] as const,
    settings: () => [...shortcutsQueryKeys.all, "settings"] as const,
};

/**
 * Hook to get all shortcuts settings
 */
export function useShortcutsSettings() {
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

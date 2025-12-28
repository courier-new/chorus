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

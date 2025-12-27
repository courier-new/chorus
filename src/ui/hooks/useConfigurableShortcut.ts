import { useShortcut, type UseShortcutOptions } from "./useShortcut";
import { useShortcutConfig } from "@core/utilities/ShortcutsAPI";
import { parseBinding, type ShortcutId } from "@core/utilities/Shortcuts";
import { useMemo } from "react";

/**
 * A wrapper around useShortcut that reads the user-configurable key combo from
 * Settings and registers a keyboard event listener for the shortcut with the
 * given callback. Supports the same options as useShortcut.
 *
 * @param shortcutId - The unique ID of the shortcut
 * @param callback - **Stable** function reference to call when the shortcut is
 * triggered
 * @param options - Context options for when the shortcut should fire, see
 * {@link UseShortcutOptions}
 */
export function useConfigurableShortcut(
    shortcutId: ShortcutId,
    callback: () => void,
    options?: UseShortcutOptions,
) {
    const { combo, disabled } = useShortcutConfig(shortcutId);

    const isEnabled = useMemo(() => {
        if (disabled) return false;
        if (options?.isEnabled !== undefined) return options.isEnabled;
        return true;
    }, [disabled, options?.isEnabled]);

    const comboArray = useMemo(() => parseBinding(combo), [combo]);

    useShortcut(comboArray, callback, { ...options, isEnabled });
}

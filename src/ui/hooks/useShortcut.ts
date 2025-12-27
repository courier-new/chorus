import { useEffect, useMemo } from "react";
import { matchesBinding } from "@core/utilities/Shortcuts";
import { useInputStore } from "@core/infra/InputStore";
import { useDialogStore } from "@core/infra/DialogStore";

/**
 * Hook for mounting a keyboard shortcut.
 *
 * Options:
 * - enableOnChatFocus: defaults to true, keeps the shortcut enabled when the
 *   main chat input is focused
 * - enableOnDialogIds: defaults to [], list of open dialog IDs this shortcut
 *   will be enabled on
 * - isEnabled: defaults to true, use to enable or disable the shortcut
 *   conditionally based on application state, e.g. when a dialog is open
 * - isGlobal: defaults to false, use to enable this shortcut globally,
 *   overriding any other options "global" here means the scope the shortcut is
 *   declared in if its parent component is torn down, the shortcut will be
 *   removed
 *
 * @param combo - **Stable** array of modifier keys and main key (e.g., ["Meta",
 * "K"], ["Control", "Shift", "K"], ["Shift", "Enter"]
 * @param callback - **Stable** function reference to call when shortcut is
 * triggered
 * @param options - Context options for when the shortcut should fire
 */
export function useShortcut(
    combo: string[],
    callback: () => void,
    {
        enableOnChatFocus = true,
        enableOnDialogIds = [],
        isEnabled = true,
        isGlobal = false,
    }: {
        enableOnChatFocus?: boolean;
        enableOnDialogIds?: string[] | null;
        isEnabled?: boolean;
        isGlobal?: boolean;
    } = {},
) {
    const focusedInputId = useInputStore.getState().focusedInputId;
    const activeDialogId = useDialogStore.getState().activeDialogId;

    const isShortcutEnabled = useMemo(() => {
        if (!isEnabled) return false;
        if (isGlobal) return true;
        // Context guards
        if (focusedInputId && !enableOnChatFocus) return false;
        if (activeDialogId && !enableOnDialogIds?.includes(activeDialogId))
            return false;
        return true;
    }, [
        focusedInputId,
        enableOnChatFocus,
        activeDialogId,
        enableOnDialogIds,
        isEnabled,
        isGlobal,
    ]);

    useEffect(() => {
        if (combo.length === 0 || !isShortcutEnabled) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (!matchesBinding(event, Array.isArray(combo) ? combo : [combo]))
                return;

            event.preventDefault();
            callback();
        };

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [combo, isShortcutEnabled, callback]);
}

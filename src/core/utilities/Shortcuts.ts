/**
 * Keyboard Shortcuts Configuration
 *
 * This module defines the types, defaults, and validation logic for user
 * configurable keyboard shortcuts.
 *
 * Shortcuts use tinykeys format: "$mod+K", "Shift+Enter", etc.
 * - $mod = Cmd on Mac, Ctrl on Windows
 * - Modifiers: $mod, Control, Alt, Shift
 * - Keys are case-insensitive
 */

/** Unique identifier for each customizable shortcut */
export type ShortcutId =
    // Navigation
    | "new-chat"
    | "new-project"
    | "settings"
    | "command-menu"
    | "navigate-back"
    | "navigate-forward"
    | "prompts"
    | "toggle-sidebar"
    // Zoom
    | "zoom-in"
    | "zoom-out"
    | "zoom-reset"
    // Chat
    | "model-picker"
    | "clear-models"
    | "focus-input"
    | "synthesize"
    | "share-chat"
    | "toggle-reviews"
    | "new-group-chat"
    | "find-in-page"
    | "find-next"
    | "find-previous"
    | "tools-box"
    // Quick chat (ambient chat)
    | "ambient-chat"
    | "open-in-main"
    | "toggle-vision";

/** The scope of a shortcut */
export type ShortcutScope = "navigation" | "zoom" | "chat" | "quick-chat";

/** A system-defined shortcut definition */
export interface ShortcutDefinition {
    id: ShortcutId;
    label: string;
    description: string;
    scope: ShortcutScope;
    /** The default combination for the shortcut (tinykeys format: "$mod+K") */
    defaultCombo: string;
    /** Whether the app needs to be restarted for the shortcut to take effect */
    requiresRestart: boolean;
    /** Whether the shortcut should be visible in the UI */
    visible: boolean;
}

/** Default shortcuts registry */
export const DEFAULT_SHORTCUTS: Record<ShortcutId, ShortcutDefinition> = {
    // Navigation
    "new-chat": {
        id: "new-chat",
        label: "New Chat",
        description: "Creates a new chat in the current project context",
        scope: "navigation",
        defaultCombo: "$mod+N",
        requiresRestart: true,
        visible: true,
    },
    "new-project": {
        id: "new-project",
        label: "New Project",
        description: "Creates a new project",
        scope: "navigation",
        defaultCombo: "$mod+Shift+N",
        requiresRestart: true,
        visible: true,
    },
    settings: {
        id: "settings",
        label: "Settings",
        description: "Opens the Settings dialog",
        scope: "navigation",
        defaultCombo: "$mod+,",
        requiresRestart: true,
        visible: true,
    },
    "command-menu": {
        id: "command-menu",
        label: "Command Menu",
        description:
            "Opens the command menu for searching chats, messages, and actions.",
        scope: "navigation",
        defaultCombo: "$mod+K",
        requiresRestart: false,
        visible: true,
    },
    "navigate-back": {
        id: "navigate-back",
        label: "Navigate Back",
        description: "Navigates to the previous page in history.",
        scope: "navigation",
        defaultCombo: "$mod+[",
        requiresRestart: false,
        visible: true,
    },
    "navigate-forward": {
        id: "navigate-forward",
        label: "Navigate Forward",
        description: "Navigates to the next page in history.",
        scope: "navigation",
        defaultCombo: "$mod+]",
        requiresRestart: false,
        visible: true,
    },
    prompts: {
        id: "prompts",
        label: "Prompts",
        description: "Opens the custom prompts management page.",
        scope: "navigation",
        defaultCombo: "$mod+P",
        requiresRestart: false,
        visible: true,
    },
    "toggle-sidebar": {
        id: "toggle-sidebar",
        label: "Toggle Sidebar",
        description: "Shows or hides the sidebar.",
        scope: "navigation",
        defaultCombo: "$mod+B",
        requiresRestart: false,
        visible: true,
    },

    // Zoom
    "zoom-in": {
        id: "zoom-in",
        label: "Zoom In",
        description: "Increases the UI zoom level by 10%.",
        scope: "zoom",
        defaultCombo: "$mod+=",
        requiresRestart: false,
        visible: true,
    },
    "zoom-out": {
        id: "zoom-out",
        label: "Zoom Out",
        description: "Decreases the UI zoom level by 10%.",
        scope: "zoom",
        defaultCombo: "$mod+-",
        requiresRestart: false,
        visible: true,
    },
    "zoom-reset": {
        id: "zoom-reset",
        label: "Reset Zoom",
        description: "Resets the UI zoom level to 100%.",
        scope: "zoom",
        defaultCombo: "$mod+0",
        requiresRestart: false,
        visible: true,
    },

    // Chat
    "model-picker": {
        id: "model-picker",
        label: "Model Picker",
        description: "Opens the model picker to select or compare AI models.",
        scope: "chat",
        defaultCombo: "$mod+J",
        requiresRestart: false,
        visible: true,
    },
    "clear-models": {
        id: "clear-models",
        label: "Clear Models",
        description: "Clears all models from the compare view.",
        scope: "chat",
        defaultCombo: "$mod+Shift+Backspace",
        requiresRestart: false,
        visible: true,
    },
    "focus-input": {
        id: "focus-input",
        label: "Focus Input",
        description: "Focuses the chat input field.",
        scope: "chat",
        defaultCombo: "$mod+L",
        requiresRestart: false,
        visible: true,
    },
    synthesize: {
        id: "synthesize",
        label: "Synthesize",
        description: "Generates a synthesis from compared model responses.",
        scope: "chat",
        defaultCombo: "$mod+S",
        requiresRestart: false,
        visible: true,
    },
    "share-chat": {
        id: "share-chat",
        label: "Share Chat",
        description: "Creates a shareable web link for the current chat.",
        scope: "chat",
        defaultCombo: "$mod+Shift+S",
        requiresRestart: false,
        visible: true,
    },
    "toggle-reviews": {
        id: "toggle-reviews",
        label: "Toggle Reviews",
        description: "Toggles the reviews mode for the current chat.",
        scope: "chat",
        defaultCombo: "$mod+Shift+R",
        requiresRestart: false,
        visible: false,
    },
    "new-group-chat": {
        id: "new-group-chat",
        label: "New Group Chat",
        description: "Creates a new group chat.",
        scope: "chat",
        defaultCombo: "$mod+Shift+G",
        requiresRestart: false,
        visible: false,
    },
    "find-in-page": {
        id: "find-in-page",
        label: "Find in Page",
        description: "Opens the find-in-page search bar.",
        scope: "chat",
        defaultCombo: "$mod+F",
        requiresRestart: false,
        visible: true,
    },
    "find-next": {
        id: "find-next",
        label: "Find Next",
        description: "Jumps to the next search result.",
        scope: "chat",
        defaultCombo: "$mod+G",
        requiresRestart: false,
        visible: true,
    },
    "find-previous": {
        id: "find-previous",
        label: "Find Previous",
        description: "Jumps to the previous search result.",
        scope: "chat",
        defaultCombo: "$mod+Shift+G",
        requiresRestart: false,
        visible: true,
    },
    "tools-box": {
        id: "tools-box",
        label: "Tools",
        description: "Opens the tools and connections management dialog.",
        scope: "chat",
        defaultCombo: "$mod+T",
        requiresRestart: false,
        visible: true,
    },

    // Quick chat (ambient chat)
    "ambient-chat": {
        id: "ambient-chat",
        label: "Ambient Chat",
        description: "Starts an ambient chat.",
        scope: "quick-chat",
        defaultCombo: "Alt+Space",
        requiresRestart: true,
        visible: true,
    },
    "open-in-main": {
        id: "open-in-main",
        label: "Open in Main Window",
        description: "Opens the current quick chat in the main window.",
        scope: "quick-chat",
        defaultCombo: "$mod+O",
        requiresRestart: false,
        visible: true,
    },
    "toggle-vision": {
        id: "toggle-vision",
        label: "Toggle Vision",
        description: "Toggles vision mode to let the AI see your screen.",
        scope: "quick-chat",
        defaultCombo: "$mod+I",
        requiresRestart: false,
        visible: true,
    },
};

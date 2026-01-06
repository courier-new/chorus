/**
 * Keyboard Shortcuts Configuration
 *
 * This module defines the types, defaults, and validation logic for user
 * configurable keyboard shortcuts.
 *
 * Shortcuts use explicit modifier format: "Meta+K", "Control+Shift+K", etc.
 * - Meta = Cmd on Mac
 * - Control = Ctrl on Windows/Linux
 * - Modifiers: Meta, Control, Alt, Shift
 * - Keys use KeyboardEvent.key values (capitalized: "K", "Enter", "Space", etc.)
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
    /** The default combination for the shortcut (e.g., "Meta+K", "Control+Shift+K") */
    defaultCombo: string;
    /** Whether the app needs to be restarted for the shortcut to take effect */
    requiresRestart: boolean;
    /** Whether the shortcut should be visible in the UI */
    visible: boolean;
}

/** A user-defined shortcut configuration */
export interface ShortcutUserConfig {
    /** The combination for the shortcut (e.g., "Meta+K", "Control+Shift+K") */
    combo: string;
    /** Whether the user has disabled the shortcut */
    disabled: boolean;
}

/** A collection of user-defined shortcut configurations */
export type ShortcutsSettings = Record<ShortcutId, ShortcutUserConfig>;

/** Default shortcuts registry */
export const DEFAULT_SHORTCUTS: Record<ShortcutId, ShortcutDefinition> = {
    // Navigation
    "new-chat": {
        id: "new-chat",
        label: "New Chat",
        description: "Creates a new chat in the current project context",
        scope: "navigation",
        defaultCombo: "Meta+N",
        requiresRestart: true,
        visible: true,
    },
    "new-project": {
        id: "new-project",
        label: "New Project",
        description: "Creates a new project",
        scope: "navigation",
        defaultCombo: "Meta+Shift+N",
        requiresRestart: true,
        visible: true,
    },
    settings: {
        id: "settings",
        label: "Settings",
        description: "Opens the Settings dialog",
        scope: "navigation",
        defaultCombo: "Meta+,",
        requiresRestart: true,
        visible: true,
    },
    "command-menu": {
        id: "command-menu",
        label: "Command Menu",
        description:
            "Opens the command menu for searching chats, messages, and actions.",
        scope: "navigation",
        defaultCombo: "Meta+K",
        requiresRestart: false,
        visible: true,
    },
    "navigate-back": {
        id: "navigate-back",
        label: "Navigate Back",
        description: "Navigates to the previous page in history.",
        scope: "navigation",
        defaultCombo: "Meta+[",
        requiresRestart: false,
        visible: true,
    },
    "navigate-forward": {
        id: "navigate-forward",
        label: "Navigate Forward",
        description: "Navigates to the next page in history.",
        scope: "navigation",
        defaultCombo: "Meta+]",
        requiresRestart: false,
        visible: true,
    },
    prompts: {
        id: "prompts",
        label: "Prompts",
        description: "Opens the custom prompts management page.",
        scope: "navigation",
        defaultCombo: "Meta+P",
        requiresRestart: false,
        visible: true,
    },
    "toggle-sidebar": {
        id: "toggle-sidebar",
        label: "Toggle Sidebar",
        description: "Shows or hides the sidebar.",
        scope: "navigation",
        defaultCombo: "Meta+B",
        requiresRestart: false,
        visible: true,
    },

    // Zoom
    "zoom-in": {
        id: "zoom-in",
        label: "Zoom In",
        description: "Increases the UI zoom level by 10%.",
        scope: "zoom",
        defaultCombo: "Meta+=",
        requiresRestart: false,
        visible: true,
    },
    "zoom-out": {
        id: "zoom-out",
        label: "Zoom Out",
        description: "Decreases the UI zoom level by 10%.",
        scope: "zoom",
        defaultCombo: "Meta+-",
        requiresRestart: false,
        visible: true,
    },
    "zoom-reset": {
        id: "zoom-reset",
        label: "Reset Zoom",
        description: "Resets the UI zoom level to 100%.",
        scope: "zoom",
        defaultCombo: "Meta+0",
        requiresRestart: false,
        visible: true,
    },

    // Chat
    "model-picker": {
        id: "model-picker",
        label: "Model Picker",
        description: "Opens the model picker to select AI models.",
        scope: "chat",
        defaultCombo: "Meta+J",
        requiresRestart: false,
        visible: true,
    },
    "clear-models": {
        id: "clear-models",
        label: "Clear Models",
        description: "Clears all models currently selected.",
        scope: "chat",
        defaultCombo: "Meta+Shift+Backspace",
        requiresRestart: false,
        visible: true,
    },
    "focus-input": {
        id: "focus-input",
        label: "Focus Input",
        description: "Focuses the chat input field.",
        scope: "chat",
        defaultCombo: "Meta+L",
        requiresRestart: false,
        visible: true,
    },
    synthesize: {
        id: "synthesize",
        label: "Synthesize",
        description: "Generates a synthesis from model responses.",
        scope: "chat",
        defaultCombo: "Meta+S",
        requiresRestart: false,
        visible: true,
    },
    "share-chat": {
        id: "share-chat",
        label: "Share Chat",
        description: "Creates a shareable web link for the current chat.",
        scope: "chat",
        defaultCombo: "Meta+Shift+S",
        requiresRestart: false,
        visible: true,
    },
    "find-in-page": {
        id: "find-in-page",
        label: "Find in Page",
        description: "Opens the find-in-page search bar.",
        scope: "chat",
        defaultCombo: "Meta+F",
        requiresRestart: false,
        visible: true,
    },
    "find-next": {
        id: "find-next",
        label: "Find Next",
        description: "Jumps to the next search result.",
        scope: "chat",
        defaultCombo: "Meta+G",
        requiresRestart: false,
        visible: true,
    },
    "find-previous": {
        id: "find-previous",
        label: "Find Previous",
        description: "Jumps to the previous search result.",
        scope: "chat",
        defaultCombo: "Meta+Shift+G",
        requiresRestart: false,
        visible: true,
    },
    "tools-box": {
        id: "tools-box",
        label: "Tools",
        description: "Opens the tools and connections management dialog.",
        scope: "chat",
        defaultCombo: "Meta+T",
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
        defaultCombo: "Meta+O",
        requiresRestart: false,
        visible: true,
    },
    "toggle-vision": {
        id: "toggle-vision",
        label: "Toggle Vision",
        description: "Toggles vision mode to let the AI see your screen.",
        scope: "quick-chat",
        defaultCombo: "Meta+I",
        requiresRestart: false,
        visible: true,
    },
};

/** System-reserved shortcuts that cannot be used */
export const RESERVED_SHORTCUTS: string[][] = [
    ["Meta", "Q"], // Quit app (macOS)
    ["Control", "Q"], // Quit app (Windows/Linux)
    ["Meta", "W"], // Close window (macOS)
    ["Control", "W"], // Close window (Windows/Linux)
    ["Meta", "H"], // Hide app (macOS)
    ["Meta", "M"], // Minimize (macOS)
    ["Meta", "C"], // Copy (macOS)
    ["Control", "C"], // Copy (Windows/Linux)
    ["Meta", "V"], // Paste (macOS)
    ["Control", "V"], // Paste (Windows/Linux)
    ["Meta", "X"], // Cut (macOS)
    ["Control", "X"], // Cut (Windows/Linux)
    ["Meta", "Z"], // Undo (macOS)
    ["Control", "Z"], // Undo (Windows/Linux)
    ["Meta", "Shift", "Z"], // Redo (macOS)
    ["Control", "Shift", "Z"], // Redo (Windows/Linux)
    ["Meta", "A"], // Select all (macOS)
    ["Control", "A"], // Select all (Windows/Linux)
    ["Alt", "Tab"], // Window switch (Windows)
    ["Meta", "Tab"], // App switcher (macOS)
    ["Meta", "Space"], // Menu (macOS)
];

/** Modifier keys */
const MODIFIER_KEYS = ["Meta", "Control", "Alt", "Shift"] as const;
type ModifierKey = (typeof MODIFIER_KEYS)[number];

/**
 * Type guard to check if a part of a binding is a modifier key.
 */
function isModifier(part: string): part is ModifierKey {
    return MODIFIER_KEYS.includes(part as ModifierKey);
}

/**
 * Parse an untrusted binding string from Settings into an array of keys.
 * @param binding - The untrusted binding string from Settings
 * @returns An array of modifier keys and main keys
 * @example
 * ```ts
 * parseBinding("Meta+Shift+K") // ["Meta", "Shift", "K"]
 * parseBinding("Control") // ["Control"]
 * parseBinding(0) // []
 * ```
 */
export function parseBinding(binding: unknown): string[] {
    if (!binding || typeof binding !== "string") {
        return [];
    }
    return binding.split("+").map((part) => part.trim());
}

/**
 * Normalize a binding (uppercase letters, sorted, with modifiers and main keys separated).
 *
 * @example
 * ```ts
 * normalizeBinding(["Meta", "Shift", "k"]) // { modifiers: ["Meta", "Shift"], mainKeys: ["K"] }
 * normalizeBinding(["Control", "Enter"]) // { modifiers: ["Control"], mainKeys: ["Enter"] }
 * ```
 */
function normalizeBinding(binding: string[]): {
    modifiers: string[];
    mainKeys: string[];
} {
    const modifiers = binding.filter((p) => isModifier(p)).sort();
    const mainKeys = binding
        .filter((p) => !isModifier(p))
        .map((p) => (p.length === 1 ? p.toUpperCase() : p))
        .sort();
    return { modifiers, mainKeys };
}

/**
 * Check if two bindings are equal
 */
function bindingsEqual(a: string[], b: string[]): boolean {
    const { modifiers: modifiersA, mainKeys: mainKeysA } = normalizeBinding(a);
    const { modifiers: modifiersB, mainKeys: mainKeysB } = normalizeBinding(b);
    return (
        modifiersA.join("+") === modifiersB.join("+") &&
        mainKeysA.join("+") === mainKeysB.join("+")
    );
}

/**
 * Check if the binding is the default binding for the given shortcut id
 */
export function bindingIsDefault(id: ShortcutId, binding: string[]): boolean {
    return bindingsEqual(
        parseBinding(DEFAULT_SHORTCUTS[id].defaultCombo),
        binding,
    );
}

/**
 * Check if a binding matches a reserved shortcut
 */
function isReservedShortcut(binding: string[]): boolean {
    return RESERVED_SHORTCUTS.some((reserved) =>
        bindingsEqual(binding, reserved),
    );
}

/** A validation result for a keyboard shortcut binding */
export interface ValidationResult {
    valid: boolean;
    error?: string;
}

/**
 * Validate a keyboard shortcut binding
 */
export function validateShortcut(binding: string[]): ValidationResult {
    if (binding.length === 0) {
        return { valid: false, error: "Shortcut cannot be empty" };
    }

    const hasModifier = binding.some((p) => isModifier(p));
    const mainKey = binding.find((p) => !isModifier(p));

    // Shortcut requires at least one modifier and at least one main key
    if (!hasModifier) {
        return {
            valid: false,
            error: "Shortcut must include at least one modifier key (Meta, Control, Alt, or Shift)",
        };
    }

    if (!mainKey) {
        return {
            valid: false,
            error: "Shortcut must include at least one non-modifier key (Letter, Number, Symbol)",
        };
    }

    // Check reserved shortcuts
    if (isReservedShortcut(binding)) {
        return {
            valid: false,
            error: "This shortcut is reserved by the system",
        };
    }

    return { valid: true };
}

/**
 * Detect conflicts with other configured shortcuts
 */
export function detectConflicts(
    shortcutId: ShortcutId,
    binding: string[],
    allShortcuts: ShortcutsSettings,
): ShortcutId[] {
    return Object.entries(allShortcuts)
        .filter(([id, config]) => {
            if (id === shortcutId) return false;
            if (
                !config ||
                config.disabled ||
                !DEFAULT_SHORTCUTS[id as ShortcutId].visible
            )
                return false;
            return bindingsEqual(parseBinding(config.combo), binding);
        })
        .map(([id]) => id as ShortcutId);
}

/**
 * Convert a binding string to a display string with symbols
 *
 * @param binding - The binding string to convert
 * @param withPlus - Whether to include the plus sign between modifiers and main keys
 * @returns The display string
 * @example
 * ```ts
 * comboToDisplayString("Meta+Shift+S") // "⌘⇧S"
 * comboToDisplayString("Alt+K") // "⌥K"
 * comboToDisplayString("Meta+Shift+S", true) // "⌘+⇧+S"
 * comboToDisplayString("Alt+K", true) // "⌥+K"
 * ```
 */
export function comboToDisplayString(
    binding: string,
    withPlus = false,
): string {
    const symbolMap: Record<string, string> = {
        meta: "⌘",
        control: "⌃",
        alt: "⌥",
        shift: "⇧",
        enter: "↵",
        backspace: "⌫",
        delete: "⌦",
        escape: "⎋",
        tab: "⇥",
        space: "␣",
        arrowup: "↑",
        arrowdown: "↓",
        arrowleft: "←",
        arrowright: "→",
    };

    const { modifiers, mainKeys } = normalizeBinding(parseBinding(binding));

    return [
        ...modifiers.map((m) => symbolMap[m.toLowerCase()]),
        ...mainKeys.map((k) =>
            k.toLowerCase() in symbolMap ? symbolMap[k.toLowerCase()] : k,
        ),
    ].join(withPlus ? "+" : "");
}

/**
 * Gets the raw key from a keyboard event, without modifier states.
 */
export function keyFromEvent(
    event: Pick<KeyboardEvent, "code" | "key">,
): string {
    // We use e.code for keys and digits to get their raw keyboard value so
    // modifier keys can't affect their values (e.g., Alt+G gives "©" in
    // event.key, which is not what we want)
    if (event.code === "Space") return "Space";
    if (event.code.startsWith("Key")) return event.code.replace("Key", "");
    if (event.code.startsWith("Digit")) return event.code.replace("Digit", "");

    // Normalize common punctuation keys
    if (event.code === "Slash") return "/";
    if (event.code === "Comma") return ",";
    if (event.code === "Period") return ".";
    if (event.code === "Semicolon") return ";";
    if (event.code === "Quote") return "'";
    if (event.code === "BracketLeft") return "[";
    if (event.code === "BracketRight") return "]";
    if (event.code === "Backslash") return "\\";
    if (event.code === "Minus") return "-";
    if (event.code === "Equal") return "=";
    if (event.code === "Backquote") return "`";

    return event.key;
}

/**
 * Check if a KeyboardEvent matches a combo binding
 * @param event - The keyboard event
 * @param combo - The combo array (e.g., ["Meta", "Shift", "K"], ["Control", "Enter"], ["Shift", "Enter"])
 * @returns true if the event matches the binding
 */
export function matchesBinding(event: KeyboardEvent, combo: string[]): boolean {
    if (combo.length === 0) return false;

    const modifiers = new Set(combo.filter((p) => isModifier(p)));
    const mainKeys = new Set(combo.filter((p) => !isModifier(p)));

    // Compare every modifier for what is expected in the combo vs. what was
    // actually active in the event.
    const matchesModifiers = MODIFIER_KEYS.every((m) => {
        const modifierState = event.getModifierState(m);
        // Only modifiers in the combo should be active in the event
        if (modifiers.has(m)) {
            return modifierState;
        }
        // Other modifiers should be inactive in the event
        return !modifierState;
    });

    return matchesModifiers && mainKeys.has(keyFromEvent(event));
}

/**
 * Create default shortcuts config (all using defaults, none disabled)
 */
export function createDefaultShortcutsConfig(): ShortcutsSettings {
    return Object.fromEntries(
        Object.entries(DEFAULT_SHORTCUTS).map(([id, definition]) => [
            id as ShortcutId,
            {
                combo: definition.defaultCombo,
                disabled: false,
            },
        ]),
    ) satisfies Partial<ShortcutsSettings> as ShortcutsSettings;
}

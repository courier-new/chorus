import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import { Separator } from "../ui/separator";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "../ui/collapsible";
import { ChevronDown, RotateCcw } from "lucide-react";
import ShortcutRecorder from "./ShortcutRecorder";
import { relaunch } from "@tauri-apps/plugin-process";
import {
    ShortcutId,
    ShortcutScope,
    DEFAULT_SHORTCUTS,
    validateShortcut,
    detectConflicts,
    ShortcutDefinition,
    ShortcutsSettings,
    bindingIsDefault,
    parseBinding,
} from "@core/utilities/Shortcuts";
import {
    useShortcutsSettings,
    useUpdateShortcut,
    useResetShortcut,
    useResetAllShortcuts,
    useShortcutConfig,
} from "@core/utilities/ShortcutsAPI";
import { cn } from "@ui/lib/utils";

const SCOPE_ORDER: { scope: ShortcutScope; label: string }[] = [
    { scope: "navigation", label: "Navigation" },
    { scope: "chat", label: "Chat" },
    { scope: "zoom", label: "Zoom" },
    { scope: "quick-chat", label: "Quick Chat" },
];

interface ShortcutRowProps {
    shortcutId: ShortcutId;
    label: string;
    description: string;
    onUpdate: (combo: string, disabled: boolean) => void;
    onReset: () => void;
    allShortcuts: ShortcutsSettings;
}

function ShortcutRow({
    shortcutId,
    label,
    description,
    onUpdate: onUpdateProp,
    onReset: onResetProp,
    allShortcuts,
}: ShortcutRowProps) {
    const [requiresRestart, setRequiresRestart] = useState(false);
    const { combo, disabled, isDefault } = useShortcutConfig(shortcutId);
    const initialCombo = useRef<string>(combo);
    const initialDisabled = useRef<boolean>(disabled);

    const conflictWarning = useMemo(() => {
        if (disabled) return undefined;

        const conflicts = detectConflicts(
            shortcutId,
            parseBinding(combo),
            allShortcuts,
        );
        if (conflicts.length === 0) return undefined;

        const conflictLabels = conflicts
            .map((conflict) => DEFAULT_SHORTCUTS[conflict].label)
            .join(", ");
        return `Conflicts with: ${conflictLabels}`;
    }, [allShortcuts, combo, disabled, shortcutId]);

    const onUpdate = useCallback(
        (newCombo: string, newDisabled: boolean) => {
            onUpdateProp?.(newCombo, newDisabled);
            setRequiresRestart(
                (initialCombo.current !== newCombo ||
                    initialDisabled.current !== newDisabled) &&
                    DEFAULT_SHORTCUTS[shortcutId].requiresRestart,
            );
        },
        [onUpdateProp, shortcutId],
    );

    const onReset = useCallback(() => {
        onResetProp?.();
        setRequiresRestart(
            initialCombo.current !==
                DEFAULT_SHORTCUTS[shortcutId].defaultCombo &&
                DEFAULT_SHORTCUTS[shortcutId].requiresRestart,
        );
    }, [onResetProp, shortcutId]);

    return (
        <div className="grid grid-cols-[1fr_auto] gap-4 py-3">
            <div className="min-w-0">
                <div className="flex items-center gap-2">
                    <span className="font-medium text-base">{label}</span>
                    {!isDefault && (
                        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            Modified
                        </span>
                    )}
                    {requiresRestart && (
                        <span className="text-xs text-background bg-yellow-500 px-1.5 py-0.5 rounded">
                            Requires restart
                        </span>
                    )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {description}
                </p>
            </div>

            <div className="flex items-start gap-2">
                <ShortcutRecorder
                    value={combo}
                    onChange={(newCombo: string) => {
                        onUpdate?.(newCombo, disabled);
                    }}
                    onValidate={validateShortcut}
                    warning={conflictWarning}
                    disabled={disabled}
                    className="w-36"
                />

                <div className="flex items-center gap-2">
                    <Switch
                        checked={!disabled}
                        onCheckedChange={(checked: boolean) => {
                            onUpdate?.(combo, !checked);
                        }}
                        aria-label={`${disabled ? "Enable" : "Disable"} ${label}`}
                        title={`${disabled ? "Enable" : "Disable"} ${label}`}
                    />

                    {/* Since disabled form elements are treated as inert and don't receive mouse events, we need to wrap the button in a span to ensure the title can be shown even when the button is disabled. */}
                    <span
                        title={
                            isDefault
                                ? "Shortcut is already using default"
                                : undefined
                        }
                    >
                        <Button
                            disabled={isDefault}
                            className="gap-1"
                            variant="secondary"
                            size="xs"
                            onClick={onReset}
                            title="Reset to default"
                        >
                            <RotateCcw /> Reset
                        </Button>
                    </span>
                </div>
            </div>
        </div>
    );
}

interface ScopeSectionProps {
    title: string;
    shortcutsSettings: ShortcutsSettings;
    shortcuts: ShortcutDefinition[];
    onUpdateShortcut?: (
        id: ShortcutId,
        combo: string,
        disabled: boolean,
    ) => void;
    onResetShortcut?: (id: ShortcutId) => void;
}

function ScopeSection({
    title,
    shortcuts,
    shortcutsSettings,
    onUpdateShortcut,
    onResetShortcut,
}: ScopeSectionProps) {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger className="flex items-center gap-1 py-2 pr-2 hover:opacity-80">
                <h3 className="font-semibold text-base">
                    {title}{" "}
                    <span className="text-muted-foreground font-normal">
                        ({shortcuts.length})
                    </span>
                </h3>
                <ChevronDown
                    className={cn(
                        "h-5 w-5 transition-transform",
                        !isOpen && "-rotate-90",
                    )}
                />
            </CollapsibleTrigger>
            <CollapsibleContent>
                <div className="pl-3 divide-y">
                    {shortcuts
                        .filter((shortcut) => shortcut.visible)
                        .map((shortcut) => {
                            return (
                                <ShortcutRow
                                    key={shortcut.id}
                                    shortcutId={shortcut.id}
                                    label={shortcut.label}
                                    description={shortcut.description}
                                    onUpdate={(combo, disabled) => {
                                        onUpdateShortcut?.(
                                            shortcut.id,
                                            combo,
                                            disabled,
                                        );
                                    }}
                                    onReset={() =>
                                        onResetShortcut?.(shortcut.id)
                                    }
                                    allShortcuts={shortcutsSettings}
                                />
                            );
                        })}
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}

export function KeyboardShortcutsSettings() {
    const { data: shortcutsSettings, isLoading } = useShortcutsSettings();
    const { mutateAsync: updateShortcut } = useUpdateShortcut();
    const { mutateAsync: resetShortcut } = useResetShortcut();
    const {
        mutateAsync: resetAllShortcuts,
        isPending: resetAllShortcutsPending,
    } = useResetAllShortcuts();
    const initialShortcuts = useRef<ShortcutsSettings | null>(
        shortcutsSettings ?? null,
    );
    const dirtyShortcuts = useRef<Set<ShortcutId>>(new Set());

    useEffect(() => {
        if (initialShortcuts.current === null && shortcutsSettings) {
            initialShortcuts.current = shortcutsSettings;
        }
    }, [shortcutsSettings]);

    const shortcutsByScopeInOrder = useMemo(
        () =>
            SCOPE_ORDER.map(({ scope, label }) => ({
                label,
                scope,
                shortcuts: Object.values(DEFAULT_SHORTCUTS).filter(
                    (definition) => definition.scope === scope,
                ),
            })),
        [],
    );

    const handleUpdateShortcut = useCallback(
        async (id: ShortcutId, combo: string, disabled: boolean) => {
            await updateShortcut({
                shortcutId: id,
                config: { combo, disabled },
            });
            dirtyShortcuts.current.add(id);
        },
        [updateShortcut],
    );

    const handleResetShortcut = useCallback(
        async (id: ShortcutId) => {
            await resetShortcut(id);
            dirtyShortcuts.current.add(id);
        },
        [resetShortcut],
    );

    const handleResetAll = useCallback(async () => {
        await resetAllShortcuts();
        dirtyShortcuts.current.clear();
    }, [resetAllShortcuts]);

    // Check if any shortcuts have been modified from their defaults, for "Reset all" button.
    const hasModifications = Object.entries(shortcutsSettings ?? {}).some(
        ([id, config]) => {
            return (
                config.disabled ||
                !bindingIsDefault(id as ShortcutId, parseBinding(config.combo))
            );
        },
    );

    // Check if any of the shortcuts that have been touched since the initial
    // load require a restart to take effect.
    const requiresRestart = Array.from(dirtyShortcuts.current).some((id) => {
        return (
            (initialShortcuts.current?.[id]?.combo !==
                shortcutsSettings?.[id]?.combo ||
                initialShortcuts.current?.[id]?.disabled !==
                    shortcutsSettings?.[id]?.disabled) &&
            DEFAULT_SHORTCUTS[id].requiresRestart
        );
    });

    if (isLoading || !shortcutsSettings) {
        return (
            <div className="space-y-6">
                <div>
                    <h2 className="text-2xl font-semibold mb-2">
                        Keyboard Shortcuts
                    </h2>
                    <p className="text-muted-foreground text-sm">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-semibold mb-2">
                    Keyboard Shortcuts
                </h2>
                <p className="text-muted-foreground text-sm">
                    Enable, disable, and customize keyboard shortcuts.
                </p>
            </div>

            <div className="flex justify-end gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetAll}
                    disabled={!hasModifications || resetAllShortcutsPending}
                >
                    <RotateCcw />
                    Reset all
                </Button>
                {requiresRestart && (
                    <Button variant="outline" size="sm" onClick={relaunch}>
                        Save and restart
                    </Button>
                )}
            </div>

            <Separator />

            <div className="space-y-4">
                {shortcutsByScopeInOrder.map(({ scope, label, shortcuts }) => (
                    <ScopeSection
                        key={scope}
                        title={label}
                        shortcuts={shortcuts}
                        shortcutsSettings={shortcutsSettings}
                        onUpdateShortcut={handleUpdateShortcut}
                        onResetShortcut={handleResetShortcut}
                    />
                ))}
            </div>
        </div>
    );
}

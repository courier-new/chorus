import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@ui/components/ui/select";
import { Collapsible, CollapsibleContent } from "@ui/components/ui/collapsible";
import { SettingsManager } from "@core/utilities/Settings";
import { useTheme } from "@ui/hooks/useTheme";
import { Separator } from "../ui/separator";
import { BookOpen, KeyIcon } from "lucide-react";
import { toast } from "sonner";
import { config } from "@core/config";
import { Button } from "../ui/button";
import { Switch } from "@ui/components/ui/switch";
import Database from "@tauri-apps/plugin-sql";
import { useDatabase } from "@ui/hooks/useDatabase";
import { AmbientChatPermissions } from "./AmbientChatPermissions";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@ui/lib/utils";
import { comboToDisplayString } from "@core/utilities/Shortcuts";
import {
    useUpdateShortcut,
    useShortcutConfig,
} from "@core/utilities/ShortcutsAPI";
import { useSettings, useSetGlobalNewChatConfig } from "../hooks/useSettings";
import * as ProjectAPI from "@core/chorus/api/ProjectAPI";
import { useQuery } from "@tanstack/react-query";
import { RadioGroup, RadioGroupItem } from "@ui/components/ui/radio-group";
import type { SettingsTabId } from "./Settings";

const FONT_OPTIONS = [
    "Geist",
    "Inter",
    "Fira Code",
    "Monaspace Neon",
    "Monaspace Xenon",
] as const;

interface GeneralSettingsProps {
    navigateToTab: (tab: SettingsTabId, scrollToId?: string) => void;
}

export function GeneralSettings({ navigateToTab }: GeneralSettingsProps) {
    const settingsManager = SettingsManager.getInstance();
    const { mode, setMode, setSansFont, setMonoFont, sansFont } = useTheme();
    const { db } = useDatabase();
    const queryClient = useQueryClient();

    const { combo: quickChatShortcut, disabled: quickChatDisabled } =
        useShortcutConfig("ambient-chat");

    const { data: settings } = useSettings();
    const showCost = settings?.showCost ?? false;
    const autoConvertLongText = settings?.autoConvertLongText ?? true;
    const autoScrapeUrls = settings?.autoScrapeUrls ?? true;
    const cautiousEnter = settings?.cautiousEnter ?? false;

    const { mutate: updateShortcut } = useUpdateShortcut();

    useEffect(() => {
        const loadSettings = async () => {
            const settings = await settingsManager.get();
            setSansFont(settings.sansFont ?? "Geist");
            setMonoFont(settings.monoFont ?? "Fira Code");
        };

        void loadSettings();
    }, [db, setMonoFont, setSansFont, settingsManager]);

    const handleThemeChange = useCallback(
        (value: string) => {
            const [_, themeMode] = value.split("-");
            setMode(themeMode as "light" | "dark" | "system");
        },
        [setMode],
    );

    const handleSansFontChange = useCallback(
        async (value: string) => {
            setSansFont(value);
            const currentSettings = await settingsManager.get();
            void settingsManager.set({ ...currentSettings, sansFont: value });
        },
        [setSansFont, settingsManager],
    );

    const handleQuickChatEnabledChange = useCallback(
        (enabled: boolean) => {
            updateShortcut({
                shortcutId: "ambient-chat",
                config: { combo: quickChatShortcut, disabled: !enabled },
            });
        },
        [quickChatShortcut, updateShortcut],
    );

    const handleAutoConvertLongTextChange = useCallback(
        async (enabled: boolean) => {
            const currentSettings = await settingsManager.get();
            void settingsManager.set({
                ...currentSettings,
                autoConvertLongText: enabled,
            });
        },
        [settingsManager],
    );

    const handleAutoScrapeUrlsChange = useCallback(
        async (enabled: boolean) => {
            const currentSettings = await settingsManager.get();
            void settingsManager.set({
                ...currentSettings,
                autoScrapeUrls: enabled,
            });
        },
        [settingsManager],
    );

    const handleCautiousEnterChange = useCallback(
        async (enabled: boolean) => {
            const currentSettings = await settingsManager.get();
            void settingsManager.set({
                ...currentSettings,
                cautiousEnter: enabled,
            });

            // Update the app_metadata table directly
            await db.execute(
                `INSERT OR REPLACE INTO app_metadata (key, value) VALUES ('cautious_enter', ?)`,
                [enabled ? "true" : "false"],
            );

            // Invalidate app metadata query to update all components using it
            await queryClient.invalidateQueries({
                queryKey: ["appMetadata"],
            });
        },
        [settingsManager, queryClient, db],
    );

    const handleShowCostChange = useCallback(
        async (enabled: boolean) => {
            const currentSettings = await settingsManager.get();
            void settingsManager.set({
                ...currentSettings,
                showCost: enabled,
            });
        },
        [settingsManager],
    );

    const showOnboarding = useCallback(async () => {
        const database = await Database.load(config.dbUrl);
        await database.execute(
            "UPDATE app_metadata SET value = 'false' WHERE key = 'has_dismissed_onboarding'; UPDATE app_metadata SET value = '0' WHERE key = 'onboarding_step';",
        );

        // Invalidate the app metadata queries to trigger instant update
        await queryClient.invalidateQueries({ queryKey: ["appMetadata"] });
        await queryClient.invalidateQueries({
            queryKey: ["hasDismissedOnboarding"],
        });

        toast("Onboarding Reset", {
            description: "Onboarding will appear now.",
        });
    }, [queryClient]);

    const handleChangeAmbientChatShortcut = useCallback(
        () => navigateToTab("keyboard-shortcuts", "ambient-chat"),
        [navigateToTab],
    );

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-semibold mb-2">General</h2>
                <p className="text-sm text-muted-foreground">
                    Chorus requires you to bring your own API keys to use AI
                    models. Add your keys in the API Keys tab.
                </p>
            </div>
            <div className="flex gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateToTab("api-keys")}
                >
                    <KeyIcon className="h-4 w-4" />
                    Configure API keys
                </Button>
                <Button variant="outline" size="sm" onClick={showOnboarding}>
                    <BookOpen className="h-4 w-4" />
                    Restart onboarding
                </Button>
            </div>

            <Separator className="my-4" />

            <div className="space-y-4">
                <div>
                    <label
                        htmlFor="theme-selector"
                        className="block font-semibold mb-2"
                    >
                        Theme
                    </label>
                    <Select
                        onValueChange={(value) => void handleThemeChange(value)}
                        value={`default-${mode}`}
                    >
                        <SelectTrigger id="theme-selector" className="w-full">
                            <SelectValue placeholder="Select theme" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="default-system">
                                System
                            </SelectItem>
                            <Separator />
                            <SelectItem value="default-light">Light</SelectItem>
                            <SelectItem value="default-dark">Dark</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div>
                    <label
                        htmlFor="sans-font"
                        className="block font-semibold mb-2"
                    >
                        Font
                    </label>
                    <Select
                        onValueChange={(value) =>
                            void handleSansFontChange(value)
                        }
                        value={sansFont}
                    >
                        <SelectTrigger id="sans-font" className="w-full">
                            <SelectValue placeholder="Select sans font" />
                        </SelectTrigger>
                        <SelectContent>
                            {FONT_OPTIONS.map((font) => (
                                <SelectItem key={font} value={font}>
                                    <span
                                        className={`font-${font
                                            .toLowerCase()
                                            .replace(/\s+/g, "-")}`}
                                    >
                                        {font}
                                    </span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center justify-between pt-6">
                    <div className="space-y-0.5">
                        <label className="font-semibold">
                            Auto-convert long text
                        </label>
                        <p className="text-sm text-muted-foreground">
                            Automatically convert pasted text longer than 5000
                            characters to a file attachment
                        </p>
                    </div>
                    <Switch
                        checked={autoConvertLongText}
                        onCheckedChange={(enabled) =>
                            void handleAutoConvertLongTextChange(enabled)
                        }
                    />
                </div>

                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <label className="font-semibold">
                            Auto-scrape URLs
                        </label>
                        <p className="text-sm text-muted-foreground">
                            Automatically scrape and attach content from URLs in
                            your messages
                        </p>
                    </div>
                    <Switch
                        checked={autoScrapeUrls}
                        onCheckedChange={(enabled) =>
                            void handleAutoScrapeUrlsChange(enabled)
                        }
                    />
                </div>

                <div className="flex items-center justify-between pt-2">
                    <div className="space-y-0.5">
                        <label className="font-semibold">
                            Cautious Enter key
                        </label>
                        <p className="text-sm text-muted-foreground">
                            Use Cmd+Enter to send messages instead of Enter
                        </p>
                    </div>
                    <Switch
                        checked={cautiousEnter}
                        onCheckedChange={(enabled) =>
                            void handleCautiousEnterChange(enabled)
                        }
                    />
                </div>

                <div className="flex items-center justify-between pt-2">
                    <div className="space-y-0.5">
                        <label className="font-semibold">
                            Show message cost
                        </label>
                        <p className="text-sm text-muted-foreground">
                            Display cost estimates alongside messages and in the
                            sidebar
                        </p>
                    </div>
                    <Switch
                        checked={showCost}
                        onCheckedChange={(enabled) =>
                            void handleShowCostChange(enabled)
                        }
                    />
                </div>
            </div>

            <Separator className="my-4" />

            {/* Ambient Chat Settings */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <label className="font-semibold">Ambient Chat</label>
                        <p className="text-sm text-muted-foreground">
                            Start an ambient chat with{" "}
                            <span className="font-mono">
                                {comboToDisplayString(quickChatShortcut, true)}
                            </span>
                        </p>
                    </div>
                    <Switch
                        checked={!quickChatDisabled}
                        onCheckedChange={handleQuickChatEnabledChange}
                    />
                </div>

                <Collapsible open={!quickChatDisabled}>
                    <CollapsibleContent className="space-y-4 pl-4">
                        <AmbientChatPermissions />

                        <ChangeShortcutButton
                            onClick={handleChangeAmbientChatShortcut}
                        />
                    </CollapsibleContent>
                </Collapsible>
            </div>

            <Separator className="my-4" />


            <div className="flex justify-end mt-4 mb-2"></div>
        </div>
    );
}

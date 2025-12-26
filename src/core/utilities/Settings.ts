import { getStore } from "@core/infra/Store";
import { emit } from "@tauri-apps/api/event";
import { createDefaultShortcutsConfig, ShortcutsSettings } from "./Shortcuts";

export interface Settings {
    defaultEditor: string;
    sansFont: string;
    monoFont: string;
    autoConvertLongText: boolean;
    autoScrapeUrls: boolean;
    showCost: boolean;
    apiKeys?: {
        anthropic?: string;
        openai?: string;
        google?: string;
        perplexity?: string;
        openrouter?: string;
        firecrawl?: string;
    };
    quickChat?: {
        /** @deprecated Use the "ambient-chat" shortcut instead */
        enabled?: boolean;
        modelConfigId?: string;
        /** @deprecated Use the "ambient-chat" shortcut instead */
        shortcut?: string;
    };
    lmStudioBaseUrl?: string;
    cautiousEnter?: boolean;
    shortcuts: ShortcutsSettings;
}

export class SettingsManager {
    private static instance: SettingsManager;
    private storeName = "settings";

    private constructor() {}

    public static getInstance(): SettingsManager {
        if (!SettingsManager.instance) {
            SettingsManager.instance = new SettingsManager();
        }
        return SettingsManager.instance;
    }

    public async get(): Promise<Settings> {
        try {
            const store = await getStore(this.storeName);
            const settings = (await store.get("settings")) as Partial<Settings>;

            // If we're accessing shortcut settings for the first time, we'll
            // prefer the quick chat shortcut setting from the new shortcuts
            // object, but fall back to the deprecated quick chat setting to
            // ensure we preserve any previous user setting.
            const quickChatEnabled =
                settings?.shortcuts?.["ambient-chat"]?.disabled ??
                settings?.quickChat?.enabled ??
                false;
            const quickChatShortcut =
                settings?.shortcuts?.["ambient-chat"]?.combo ??
                settings?.quickChat?.shortcut ??
                "Alt+Space";

            const defaultSettings: Settings = {
                defaultEditor: "default",
                sansFont: "Geist",
                monoFont: "Geist Mono",
                autoConvertLongText: true,
                autoScrapeUrls: true,
                showCost: false,
                apiKeys: {},
                quickChat: {
                    modelConfigId: "anthropic::claude-sonnet-4-5-20250929",
                },
                // If we're accessing shortcut settings for the first time and
                // they are not yet set, we will initialize them with the
                // defaults but ensure we preserve quick chat from the previous
                // settings object.
                shortcuts: {
                    ...createDefaultShortcutsConfig(),
                    "ambient-chat": {
                        combo: quickChatShortcut,
                        disabled: quickChatEnabled,
                    },
                },
            };

            // If no settings exist yet, save the defaults
            if (!settings) {
                await this.set(defaultSettings);
                return defaultSettings;
            }

            return {
                ...defaultSettings,
                ...settings,
                shortcuts: {
                    ...defaultSettings.shortcuts,
                    ...settings.shortcuts,
                },
            };
        } catch (error) {
            console.error("Failed to get settings:", error);
            return {
                defaultEditor: "default",
                sansFont: "Geist",
                monoFont: "Fira Code",
                autoConvertLongText: true,
                autoScrapeUrls: true,
                showCost: false,
                apiKeys: {},
                quickChat: {
                    modelConfigId: "anthropic::claude-3-5-sonnet-latest",
                },
                shortcuts: createDefaultShortcutsConfig(),
            };
        }
    }

    public async set(settings: Settings): Promise<void> {
        try {
            const store = await getStore(this.storeName);
            await store.set("settings", settings);
            await store.save();
            await emit("settings-changed", settings);
        } catch (error) {
            console.error("Failed to save settings:", error);
        }
    }

    public async getChorusToken(): Promise<string | null> {
        try {
            const store = await getStore("auth.dat");
            const token = await store.get("api_token");
            return (token as string) || null;
        } catch (error) {
            console.error("Failed to get Chorus token:", error);
            return null;
        }
    }
}

import { getStore } from "@core/infra/Store";
import { emit } from "@tauri-apps/api/event";
import { createDefaultShortcutsConfig, ShortcutsSettings } from "./Shortcuts";

export const DEFAULT_SYNTHESIS_MODEL_CONFIG_ID =
    "openrouter::x-ai/grok-4.1-fast";

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
        modelConfigId?: string;
    };
    synthesis: {
        modelConfigId: string;
        prompt?: string;
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
                synthesis: {
                    modelConfigId: DEFAULT_SYNTHESIS_MODEL_CONFIG_ID,
                },
                shortcuts: createDefaultShortcutsConfig(),
            };

            // If no settings exist yet, save the defaults
            if (!settings) {
                await this.set(defaultSettings);
                return defaultSettings;
            }

            return {
                ...defaultSettings,
                ...settings,
                synthesis: {
                    ...defaultSettings.synthesis,
                    ...settings.synthesis,
                },
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
                synthesis: {
                    modelConfigId: DEFAULT_SYNTHESIS_MODEL_CONFIG_ID,
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
}

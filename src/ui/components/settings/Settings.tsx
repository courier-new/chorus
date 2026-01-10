import { useCallback, useEffect, useRef, useState } from "react";
import { SettingsManager } from "@core/utilities/Settings";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@ui/components/ui/dialog";
import {
    ExternalLink,
    MergeIcon,
    User2,
    Key,
    LucideIcon,
    PlugIcon,
    FileText,
    Import,
    BookOpen,
    Keyboard,
} from "lucide-react";
import { Button } from "../ui/button";
import { useSearchParams } from "react-router-dom";
import { openUrl } from "@tauri-apps/plugin-opener";
import { ApiKeysSettings } from "./ApiKeysSettings";
import { Textarea } from "../ui/textarea";
import { useDatabase } from "@ui/hooks/useDatabase";
import { UNIVERSAL_SYSTEM_PROMPT_DEFAULT } from "@core/chorus/prompts/prompts";
import { useQueryClient } from "@tanstack/react-query";
import { useReactQueryAutoSync } from "use-react-query-auto-sync";
import { RiClaudeFill } from "react-icons/ri";
import { SiOpenai } from "react-icons/si";
import ImportChatDialog from "./ImportChatDialog";
import { dialogActions } from "@core/infra/DialogStore";
import * as AppMetadataAPI from "@core/chorus/api/AppMetadataAPI";
import { SynthesisSettings } from "./SynthesisSettings";
import { cn } from "@ui/lib/utils";
import { KeyboardShortcutsSettings } from "./KeyboardShortcutsSettings";
import { GeneralSettings } from "./GeneralSettings";
import { ToolSettings } from "./ToolSettings";
import { SettingsTabHeader } from "./SettingsTabHeader";

export const SETTINGS_DIALOG_ID = "settings";

interface SettingsProps {
    tab?: SettingsTabId;
}

export type SettingsTabId =
    | "general"
    | "import"
    | "system-prompt"
    | "synthesis"
    | "api-keys"
    | "keyboard-shortcuts"
    | "tools"
    | "docs";

interface TabConfig {
    label: string;
    icon: LucideIcon;
}

const TABS: Record<SettingsTabId, TabConfig> = {
    general: { label: "General", icon: User2 },
    import: { label: "Import", icon: Import },
    "api-keys": { label: "API Keys", icon: Key },
    "system-prompt": { label: "System Prompt", icon: FileText },
    synthesis: { label: "Synthesis", icon: MergeIcon },
    "keyboard-shortcuts": { label: "Keyboard Shortcuts", icon: Keyboard },
    tools: { label: "Tools", icon: PlugIcon },
    docs: { label: "Documentation", icon: BookOpen },
} as const;

export default function Settings({ tab = "general" }: SettingsProps) {
    const settingsManager = SettingsManager.getInstance();
    const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
    const { db } = useDatabase();
    const [searchParams] = useSearchParams();
    const defaultTab =
        tab || (searchParams.get("tab") as SettingsTabId) || "general";

    const [lmStudioBaseUrl, setLmStudioBaseUrl] = useState(
        "http://localhost:1234/v1",
    );
    const queryClient = useQueryClient();

    // Universal system prompt autosync
    const { draft: universalSystemPrompt, setDraft: setUniversalSystemPrompt } =
        useReactQueryAutoSync({
            queryOptions: {
                queryKey: ["universalSystemPrompt"],
                queryFn: async () => {
                    const appMetadata = await AppMetadataAPI.fetchAppMetadata();
                    return (
                        appMetadata["universal_system_prompt"] ??
                        UNIVERSAL_SYSTEM_PROMPT_DEFAULT
                    );
                },
            },
            mutationOptions: {
                mutationFn: async (value: string) => {
                    await db.execute(
                        `INSERT OR REPLACE INTO app_metadata (key, value) VALUES ('universal_system_prompt', ?)`,
                        [value],
                    );
                    // Invalidate app metadata query
                    await queryClient.invalidateQueries({
                        queryKey: ["appMetadata"],
                    });
                    return value;
                },
            },
            autoSaveOptions: {
                wait: 1000, // Wait 1 second after last change
            },
        });

    const handleApiKeyChange = async (provider: string, value: string) => {
        const currentSettings = await settingsManager.get();
        const newApiKeys = {
            ...currentSettings.apiKeys,
            [provider]: value,
        };
        setApiKeys(newApiKeys);
        void settingsManager.set({
            ...currentSettings,
            apiKeys: newApiKeys,
        });

        // Invalidate the API keys query so components using useApiKeys will refresh
        void queryClient.invalidateQueries({ queryKey: ["apiKeys"] });
    };

    useEffect(() => {
        const loadSettings = async () => {
            const settings = await settingsManager.get();
            setApiKeys(settings.apiKeys ?? {});
            setLmStudioBaseUrl(
                settings.lmStudioBaseUrl ?? "http://localhost:1234/v1",
            );
        };

        void loadSettings();
    }, [db, settingsManager]);

    const onLmStudioBaseUrlChange = async (
        e: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const newUrl = e.target.value || "http://localhost:1234/v1";
        setLmStudioBaseUrl(newUrl);
        const currentSettings = await settingsManager.get();
        void settingsManager.set({
            ...currentSettings,
            lmStudioBaseUrl: newUrl,
        });
    };

    const handleImportHistory = (platform: "openai" | "anthropic") => {
        dialogActions.openDialog(`import-${platform}`);
    };

    const [activeTab, setActiveTab] = useState<SettingsTabId>(defaultTab);
    const contentRef = useRef<HTMLDivElement>(null);

    const navigateToTab = useCallback(
        (tab: SettingsTabId, scrollToId?: string) => {
            setActiveTab(tab);
            requestAnimationFrame(() => {
                if (scrollToId) {
                    const container = contentRef.current;
                    const element = document.getElementById(scrollToId);
                    if (container && element) {
                        const containerHeight = container.clientHeight;
                        const elementTop = element.offsetTop;
                        container.scrollTo({
                            // Buffer the scroll position so that the highlighted
                            // element is closer to the center of the screen
                            top: elementTop - containerHeight / 3,
                            behavior: "instant",
                        });
                        // Highlight the element's location briefly
                        element.classList.add("settings-flash");
                        // Clean up after animation completes
                        element.addEventListener(
                            "animationend",
                            () => element.classList.remove("settings-flash"),
                            { once: true },
                        );
                    }
                } else if (contentRef.current) {
                    contentRef.current.scrollTop = 0;
                }
            });
        },
        [],
    );

    // Update activeTab when tab prop changes
    useEffect(() => {
        navigateToTab(defaultTab);
    }, [defaultTab, navigateToTab]);

    const content = (
        <div className="flex flex-col h-full">
            <DialogHeader className="sr-only">
                <DialogTitle>Settings</DialogTitle>
                <DialogDescription>
                    Manage your Chorus settings
                </DialogDescription>
            </DialogHeader>

            <div className="h-full flex">
                {/* Settings Sidebar */}
                <div className="w-52 bg-sidebar p-4 overflow-y-auto border-r">
                    <div className="flex flex-col gap-1">
                        {Object.entries(TABS).map(
                            ([id, { label, icon: Icon }]) => (
                                <button
                                    key={id}
                                    onClick={() => {
                                        if (id === "docs") {
                                            void openUrl(
                                                "https://docs.chorus.sh",
                                            );
                                        } else {
                                            navigateToTab(id as SettingsTabId);
                                        }
                                    }}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-3 py-2 text-sm text-left rounded-md transition-all",
                                        "hover:bg-sidebar-accent",
                                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                        activeTab === id && id !== "docs"
                                            ? "bg-sidebar-accent font-medium"
                                            : "text-muted-foreground",
                                    )}
                                >
                                    <span className="w-5 shrink-0 flex items-center justify-center">
                                        <Icon className="size-4" />
                                    </span>
                                    <span className="flex items-center gap-2">
                                        {label}
                                        {id === "docs" && (
                                            <ExternalLink className="w-3 h-3 opacity-50" />
                                        )}
                                    </span>
                                </button>
                            ),
                        )}
                    </div>
                </div>

                {/* Content Area */}
                <div ref={contentRef} className="flex-1 overflow-y-auto p-6">
                    {activeTab === "general" && (
                        <GeneralSettings navigateToTab={navigateToTab} />
                    )}

                    {activeTab === "import" && (
                        <div className="space-y-6">
                            <SettingsTabHeader
                                title="Import Chat History"
                                description="Import your conversation history from other AI chat platforms."
                            />
                            <div className="space-y-4">
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            handleImportHistory("openai")
                                        }
                                        className="flex items-center gap-2"
                                    >
                                        <SiOpenai className="h-4 w-4" />
                                        Import from OpenAI
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            handleImportHistory("anthropic")
                                        }
                                        className="flex items-center gap-2"
                                    >
                                        <RiClaudeFill className="h-4 w-4" />
                                        Import from Anthropic
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "system-prompt" && (
                        <div className="space-y-6">
                            <SettingsTabHeader
                                title="System Prompt"
                                description="All AIs will see this prompt. Use it to control their tone, role, or conversation style."
                            />
                            <div className="space-y-4">
                                <Textarea
                                    value={universalSystemPrompt || ""}
                                    onChange={(e) =>
                                        setUniversalSystemPrompt(e.target.value)
                                    }
                                    placeholder="Enter your custom system prompt..."
                                    rows={30}
                                    className="w-full font-mono text-sm resize-y min-h-[200px]"
                                />
                                <div className="flex justify-end pt-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={async () => {
                                            // Delete the row from app_metadata
                                            await db.execute(
                                                `DELETE FROM app_metadata WHERE key = 'universal_system_prompt'`,
                                            );
                                            // Set the UI to show the default
                                            setUniversalSystemPrompt(
                                                UNIVERSAL_SYSTEM_PROMPT_DEFAULT,
                                            );
                                            // Invalidate app metadata query
                                            await queryClient.invalidateQueries(
                                                {
                                                    queryKey: ["appMetadata"],
                                                },
                                            );
                                        }}
                                    >
                                        Reset to default
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "synthesis" && <SynthesisSettings />}

                    {activeTab === "api-keys" && (
                        <ApiKeysSettings
                            apiKeys={apiKeys}
                            onApiKeyChange={handleApiKeyChange}
                            lmStudioBaseUrl={lmStudioBaseUrl}
                            onLmStudioBaseUrlChange={(e) =>
                                void onLmStudioBaseUrlChange(e)
                            }
                        />
                    )}

                    {activeTab === "keyboard-shortcuts" && (
                        <KeyboardShortcutsSettings />
                    )}

                    {activeTab === "tools" && <ToolSettings />}
                </div>
            </div>

            {/* Font preloader - hidden component to ensure fonts are loaded */}
            <div aria-hidden="true" className="hidden">
                <span className="font-monaspace-xenon">Font preload</span>
                <span className="font-geist">Font preload</span>
                <span className="font-monaspace-neon">Font preload</span>
                <span className="font-sf-pro">Font preload</span>
                <span className="font-inter">Font preload</span>
                <span className="font-jetbrains-mono">Font preload</span>
                <span className="font-fira-code">Font preload</span>
                <span className="font-monaspace-argon">Font preload</span>
                <span className="font-monaspace-krypton">Font preload</span>
                <span className="font-monaspace-radon">Font preload</span>
                <span className="font-geist-mono">Font preload</span>
            </div>
        </div>
    );

    return (
        <>
            <Dialog id={SETTINGS_DIALOG_ID}>
                <DialogContent
                    className="max-w-5xl p-0 h-[85vh] overflow-hidden flex flex-col"
                    aria-describedby={undefined}
                >
                    {content}
                </DialogContent>
            </Dialog>
            <ImportChatDialog provider="openai" />
            <ImportChatDialog provider="anthropic" />
        </>
    );
}

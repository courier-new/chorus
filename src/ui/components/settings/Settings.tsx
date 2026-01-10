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
    Loader2,
    ExternalLink,
    Pencil,
    Trash2,
    Plus,
    ExternalLinkIcon,
    LinkIcon,
    ShieldCheckIcon,
    MergeIcon,
} from "lucide-react";
import {
    User2,
    Key,
    LucideIcon,
    PlugIcon,
    FileText,
    Import,
    BookOpen,
    Globe,
    Keyboard,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@ui/components/ui/tabs";
import { useSearchParams } from "react-router-dom";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Input } from "../ui/input";
import { ApiKeysSettings } from "./ApiKeysSettings";
import { Textarea } from "../ui/textarea";
import { useDatabase } from "@ui/hooks/useDatabase";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { UNIVERSAL_SYSTEM_PROMPT_DEFAULT } from "@core/chorus/prompts/prompts";
import { CustomToolsetConfig, getEnvFromJSON } from "@core/chorus/Toolsets";
import * as ToolsetsAPI from "@core/chorus/api/ToolsetsAPI";
import { useQueryClient } from "@tanstack/react-query";
import { useReactQueryAutoSync } from "use-react-query-auto-sync";
import { RiClaudeFill, RiSupabaseFill } from "react-icons/ri";
import { TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { Tooltip } from "../ui/tooltip";
import { CodeBlock } from "../renderers/CodeBlock";
import { SiStripe } from "react-icons/si";
import { SiElevenlabs } from "react-icons/si";
import { ToolsetsManager } from "@core/chorus/ToolsetsManager";
import { getToolsetIcon } from "@core/chorus/Toolsets";
import { SiOpenai } from "react-icons/si";
import ImportChatDialog from "./ImportChatDialog";
import { dialogActions } from "@core/infra/DialogStore";
import * as AppMetadataAPI from "@core/chorus/api/AppMetadataAPI";
import { PermissionsTab } from "./PermissionsTab";
import { SynthesisSettings } from "./SynthesisSettings";
import { cn } from "@ui/lib/utils";
import { KeyboardShortcutsSettings } from "./KeyboardShortcutsSettings";
import { GeneralSettings } from "./GeneralSettings";

type ToolsetFormProps = {
    toolset: CustomToolsetConfig;
    errors: Record<string, string>;
    isReadOnly?: boolean;
    onChange: (field: keyof CustomToolsetConfig, value: string) => void;
    onSave: () => void;
    onCancel: () => void;
    title: string;
    apiKeyUrl?: string;
    docsUrl?: string;
};

function RemoteToolsetForm({
    isOpen,
    onClose,
    onSubmit,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (name: string, url: string) => void;
}) {
    const [name, setName] = useState("");
    const [url, setUrl] = useState("");
    const [errors, setErrors] = useState<{ name?: string; url?: string }>({});
    const { data: customToolsetConfigs = [] } =
        ToolsetsAPI.useCustomToolsetConfigs();

    // Validate name field
    const validateName = (value: string) => {
        if (!value.trim()) {
            return "Name is required";
        } else if (!/^[a-z0-9-]+$/.test(value)) {
            return "Name must be one word, lowercase, and contain only letters, numbers, and dashes";
        } else if (customToolsetConfigs.some((t) => t.name === value)) {
            return "Name already exists";
        }
        return undefined;
    };

    // Validate URL field
    const validateUrl = (value: string) => {
        if (!value.trim()) {
            return "URL is required";
        } else if (
            !value.startsWith("http://") &&
            !value.startsWith("https://")
        ) {
            return "URL must start with http:// or https://";
        } else {
            try {
                new URL(value);
            } catch {
                return "Invalid URL format";
            }
        }
        return undefined;
    };

    const validateForm = () => {
        const nameError = validateName(name);
        const urlError = validateUrl(url);

        const newErrors: { name?: string; url?: string } = {};
        if (nameError) newErrors.name = nameError;
        if (urlError) newErrors.url = urlError;

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setName(value);
        const error = validateName(value);
        setErrors((prev) => {
            const newErrors = { ...prev };
            if (error) {
                newErrors.name = error;
            } else {
                delete newErrors.name;
            }
            return newErrors;
        });
    };

    const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setUrl(value);
        const error = validateUrl(value);
        setErrors((prev) => {
            const newErrors = { ...prev };
            if (error) {
                newErrors.url = error;
            } else {
                delete newErrors.url;
            }
            return newErrors;
        });
    };

    const handleSubmit = () => {
        if (validateForm()) {
            onSubmit(name, url);
            setName("");
            setUrl("");
            setErrors({});
        }
    };

    // Clear form when closing
    useEffect(() => {
        if (!isOpen) {
            setName("");
            setUrl("");
            setErrors({});
        }
    }, [isOpen]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="space-y-4 border rounded-md p-4 max-w-full overflow-hidden">
            <h4 className="font-semibold flex items-center justify-between gap-1">
                Add Remote MCP
            </h4>

            <div className="space-y-2">
                <label htmlFor="remote-mcp-name" className="font-semibold">
                    Name
                </label>
                <Input
                    id="remote-mcp-name"
                    value={name}
                    onChange={handleNameChange}
                    onKeyDown={handleKeyDown}
                    placeholder="zapier"
                    className={errors.name ? "border-destructive" : ""}
                    autoFocus
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                />
                {errors.name && (
                    <div className="text-destructive text-sm">
                        {errors.name}
                    </div>
                )}
                <p className="text-xs text-muted-foreground">
                    One word, lowercase, letters, numbers, and dashes only
                </p>
            </div>

            <div className="space-y-2">
                <label htmlFor="remote-mcp-url" className="font-semibold">
                    URL
                </label>
                <Input
                    id="remote-mcp-url"
                    value={url}
                    onChange={handleUrlChange}
                    onKeyDown={handleKeyDown}
                    placeholder="https://mcp.zapier.com/api/mcp/s/.../sse"
                    className={errors.url ? "border-destructive" : ""}
                />
                {errors.url && (
                    <div className="text-destructive text-sm">{errors.url}</div>
                )}
                <p className="text-xs text-muted-foreground">
                    The URL of the remote MCP server.
                </p>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
                <Button variant="outline" size="sm" onClick={onClose}>
                    Cancel
                </Button>
                <Button
                    size="sm"
                    onClick={handleSubmit}
                    disabled={Object.keys(errors).length > 0}
                >
                    Save
                </Button>
            </div>
        </div>
    );
}

function ToolsetForm({
    toolset,
    errors,
    isReadOnly = false,
    onChange,
    onSave,
    onCancel,
    title,
    docsUrl,
    apiKeyUrl,
}: ToolsetFormProps) {
    return (
        <div className="space-y-4 border rounded-md p-4 max-w-full overflow-hidden">
            <h4 className="font-semibold flex items-center justify-between gap-1">
                {title}
                {docsUrl && (
                    <Button
                        variant="link"
                        size="iconSm"
                        onClick={() => void openUrl(docsUrl)}
                    >
                        Docs <ExternalLinkIcon className="w-4 h-4" />
                    </Button>
                )}
            </h4>

            {errors._general && (
                <div className="text-destructive ">{errors._general}</div>
            )}

            {!isReadOnly && (
                <div className="space-y-2">
                    <label className="font-semibold">Name</label>
                    <Input
                        value={toolset.name}
                        onChange={(e) => onChange("name", e.target.value)}
                        className={errors.name ? "border-destructive" : ""}
                        readOnly={isReadOnly}
                        placeholder="myserver"
                        autoCapitalize="off"
                        autoComplete="off"
                        spellCheck={false}
                    />
                    <span className="text-[10px] ">
                        One word, lowercase, letters, numbers, and dashes only
                    </span>
                    {errors.name && (
                        <div className="text-destructive ">{errors.name}</div>
                    )}
                </div>
            )}

            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="font-semibold">Command</label>
                    {toolset.command.includes("docker") && (
                        <p className="text-[10px]  flex items-center gap-1">
                            <InfoCircledIcon className="w-3 h-3" />
                            Make sure you have Docker running. We recommend{" "}
                            <button
                                className="font-semibold"
                                onClick={() =>
                                    void openUrl("https://orbstack.dev/")
                                }
                            >
                                OrbStack
                            </button>
                        </p>
                    )}
                </div>
                <Input
                    value={toolset.command}
                    spellCheck={false}
                    onChange={(e) => onChange("command", e.target.value)}
                    className={errors.command ? "border-destructive" : ""}
                    placeholder="/path/to/mcp/server/executable"
                />
                <span className="text-[10px] ">
                    Absolute path to a program, or a program available on your
                    PATH. For example: npx or /usr/bin/my-mcp-server
                </span>
                {errors.command && (
                    <div className="text-destructive ">{errors.command}</div>
                )}
            </div>

            <div className="space-y-2">
                <label className="font-semibold">Arguments</label>
                <Input
                    value={toolset.args || ""}
                    spellCheck={false}
                    onChange={(e) => onChange("args", e.target.value)}
                    className={errors.args ? "border-destructive" : ""}
                    placeholder="--port 8080 --host 0.0.0.0"
                />
                <span className="text-[10px] ">
                    Arguments to pass to the program. For example:{" "}
                    <code>--port 8080 --host 0.0.0.0</code>
                </span>
                {errors.args && (
                    <div className="text-destructive ">{errors.args}</div>
                )}
            </div>

            <div className="space-y-2">
                <div className=" items-center flex justify-between">
                    <label className="font-semibold">Environment (JSON)</label>
                    {apiKeyUrl && (
                        <Button
                            variant="default"
                            size="sm"
                            className="font-semibold"
                            onClick={() => void openUrl(apiKeyUrl)}
                        >
                            Get API key <ExternalLinkIcon className="w-4 h-4" />
                        </Button>
                    )}
                </div>
                <Input
                    spellCheck={false} // prevent smart quotes
                    value={toolset.env || "{}"}
                    onChange={(e) => onChange("env", e.target.value)}
                    className={errors.env ? "border-destructive" : ""}
                />
                <span className="text-[10px] ">
                    Environment variables to pass to the program. For example:{" "}
                    <code>
                        {`{
    "GITHUB_API_KEY": "...",
    "OPENAI_API_KEY": "..."
}`}
                    </code>
                </span>

                {errors.env && (
                    <div className="text-destructive ">{errors.env}</div>
                )}
            </div>

            <div className="flex justify-end space-x-2 pt-2">
                <Button variant="outline" size="sm" onClick={onCancel}>
                    Cancel
                </Button>
                <Button
                    size="sm"
                    onClick={onSave}
                    disabled={Object.keys(errors).length > 0}
                >
                    Save
                </Button>
            </div>
        </div>
    );
}

type CustomToolsetRowProps = {
    toolset: CustomToolsetConfig;
    onEdit: (toolset: CustomToolsetConfig) => void;
    onDelete: (name: string) => void;
};

function CustomToolsetRow({
    toolset,
    onEdit,
    onDelete,
}: CustomToolsetRowProps) {
    const recommendedMatch = RECOMMENDED_TOOLSETS.find(
        (t) => t.name === toolset.name,
    );
    const docsUrl = recommendedMatch?.docsUrl;
    const apiKeyUrl = recommendedMatch?.apiKeyUrl;
    const needsUserInput = recommendedMatch?.needsUserInput;

    // Convert env to a list of commands, e.g. FOO=bar QUUX=baz
    const envToCommands = () => {
        const parsedEnv = getEnvFromJSON(toolset.env);
        if (parsedEnv._type === "error") return "";
        return Object.entries(parsedEnv)
            .map(([key, value]) => `${key}=${value}`)
            .join(" ");
    };

    // Create a "full" command (for copying) and a truncated command (for display)
    const fullCommandText =
        `${envToCommands()} ${toolset.command} ${toolset.args || ""}`.trim();
    const displayCommandText =
        `${toolset.command} ${toolset.args || ""}`.trim();
    const truncatedCommandText =
        displayCommandText.length > 75
            ? displayCommandText.slice(0, 75) + "..."
            : displayCommandText;

    return (
        <div className="flex flex-col justify-between items-start p-4 border rounded-lg shadow-sm bg-card">
            <div className="w-full flex justify-between items-center">
                <div className="font-semibold  text-card-foreground flex items-center gap-2">
                    {recommendedMatch?.logo} {/* Display logo if available */}
                    {toolset.name}
                </div>
                <div className="flex space-x-1">
                    <Button
                        variant="ghost"
                        size="iconSm"
                        onClick={() => onEdit(toolset)}
                        title="Edit"
                    >
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="iconSm"
                        onClick={() => onDelete(toolset.name)}
                        title="Delete"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>
            <div className="mt-2 w-full border border-border text-sm rounded-md">
                <CodeBlock
                    language="sh"
                    overrideRunCommand={true}
                    contentToCopy={fullCommandText}
                    content={truncatedCommandText}
                />
            </div>
            {(docsUrl || (apiKeyUrl && needsUserInput)) && (
                <div className="text-[10px] flex justify-end items-center gap-2 mt-2 w-full">
                    {docsUrl && (
                        <button
                            type="button"
                            className="hover:text-foreground flex items-center gap-1"
                            onClick={(e) => {
                                e.preventDefault();
                                void openUrl(docsUrl);
                            }}
                        >
                            <InfoCircledIcon className="size-3" /> Docs
                        </button>
                    )}
                    {apiKeyUrl && needsUserInput && (
                        <button
                            type="button"
                            className="hover:text-foreground flex items-center gap-1"
                            onClick={(e) => {
                                e.preventDefault();
                                void openUrl(apiKeyUrl);
                            }}
                        >
                            <ExternalLinkIcon className="size-3" /> Get API Key
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

const RECOMMENDED_TOOLSETS = [
    {
        name: "context7",
        command: "npx",
        args: "-y @upstash/context7-mcp@latest",
        description: "Gets up-to-date documentation and code examples.",
        logo: <img src="/context7.png" className="size-8 rounded-lg" />,
        docsUrl: "https://github.com/upstash/context7-mcp",
        needsUserInput: false,
    },
    {
        name: "replicate",
        command: "npx",
        args: "-y mcp-remote@latest https://mcp.replicate.com/sse",
        env: `{"REPLICATE_API_TOKEN": "your-replicate-api-token"}`,
        description: "Run and manage machine learning models in the cloud.",
        logo: <img src="/replicate.png" className="size-8" />,
        docsUrl: "https://www.npmjs.com/package/replicate-mcp",
        apiKeyUrl: "https://replicate.com/account/api-tokens",
        needsUserInput: false,
    },
    {
        name: "stripe",
        command: "npx",
        args: "-y @stripe/mcp --tools=all --api-key=YOUR_STRIPE_API_KEY",
        description: "Manage payments, customers, and subscriptions.",
        logo: <SiStripe className="size-8" />,
        docsUrl: "https://docs.stripe.com/building-with-llms",
        apiKeyUrl: "https://dashboard.stripe.com/apikeys",
        needsUserInput: true,
    },
    {
        name: "elevenlabs",
        command: "uvx",
        args: "elevenlabs-mcp",
        env: `{"ELEVENLABS_API_KEY": "your-elevenlabs-api-key"}`,
        description: "Generate high-quality speech from text using AI voices.",
        logo: <SiElevenlabs className="size-8" />,
        docsUrl: "https://github.com/elevenlabs/elevenlabs-mcp",
        apiKeyUrl: "https://elevenlabs.io/app/settings/api-keys",
        needsUserInput: true,
    },
    {
        name: "supabase",
        command: "npx",
        args: "-y @supabase/mcp-server-supabase@latest --access-token <personal-access-token>",
        description:
            "Manage databases, authentication, and real-time subscriptions.",
        logo: <RiSupabaseFill className="size-8" />,
        docsUrl: "https://supabase.com/blog/mcp-server",
        apiKeyUrl: "https://supabase.com/dashboard/project/settings/api",
        needsUserInput: true,
    },
];

const CORE_BUILTIN_TOOLSETS_DATA = ToolsetsManager.instance
    .listToolsets()
    .filter((toolset) => toolset.isBuiltIn)
    .map((toolset) => ({
        name: toolset.name,
        displayName: toolset.displayName,
        icon: () => getToolsetIcon(toolset.name),
        description: toolset.description,
    }));

function ToolsTab() {
    // Database state (persisted toolsets)
    const { data: customToolsetConfigs = [] } =
        ToolsetsAPI.useCustomToolsetConfigs();
    const updateToolset = ToolsetsAPI.useUpdateCustomToolsetConfig();
    const deleteToolset = ToolsetsAPI.useDeleteCustomToolsetConfig();
    const importFromClaudeDesktop = ToolsetsAPI.useImportFromClaudeDesktop();

    // Form state
    const [formMode, setFormMode] = useState<
        "create" | "edit" | "remote" | null
    >(null);
    const [editingToolset, setEditingToolset] = useState<CustomToolsetConfig>({
        name: "",
        command: "",
        args: "",
        env: "{}",
    });
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [activeToolsetTab, setActiveToolsetTab] = useState<
        "custom" | "builtin"
    >("custom");

    const validateToolset = (
        toolset: CustomToolsetConfig,
        isEditing: boolean,
    ) => {
        const errors: Record<string, string> = {};
        if (!toolset.name) errors.name = "Name is required";
        if (!toolset.command) errors.command = "Command is required";

        // Validate name format (one word, lowercase, alphanumeric with dashes)
        if (toolset.name && !/^[a-z0-9-]+$/.test(toolset.name)) {
            errors.name =
                "Name must be one word, lowercase, and contain only letters, numbers, and dashes";
        }

        // Check for duplicate names only in create mode
        if (
            toolset.name &&
            !isEditing &&
            customToolsetConfigs.some((t) => t.name === toolset.name)
        ) {
            errors.name = "Name already exists";
        }

        // Parse and validate env if provided
        if (toolset.env) {
            try {
                const envParsed = getEnvFromJSON(toolset.env);
                if (envParsed._type === "error") {
                    errors.env = envParsed.error;
                }
            } catch {
                errors.env = "Invalid JSON format";
            }
        }

        return errors;
    };

    const handleEditToolset = (toolset: CustomToolsetConfig) => {
        setFormMode("edit");
        setEditingToolset({ ...toolset });
        setFormErrors({});
    };

    const handleCreateToolset = () => {
        setFormMode("create");
        setEditingToolset({ name: "", command: "", args: "", env: "{}" });
        setFormErrors({});
    };

    const handleCreateRemoteToolsetForm = () => {
        setFormMode("remote");
        setFormErrors({});
    };

    const handleCancelForm = () => {
        setFormMode(null);
        setEditingToolset({ name: "", command: "", args: "", env: "{}" });
        setFormErrors({});
    };

    const handleFieldChange = (
        field: keyof CustomToolsetConfig,
        value: string,
    ) => {
        const updatedToolset = { ...editingToolset, [field]: value };
        setEditingToolset(updatedToolset);
        setFormErrors(validateToolset(updatedToolset, formMode === "edit"));
    };

    const handleSaveToolset = async () => {
        const validationErrors = validateToolset(
            editingToolset,
            formMode === "edit",
        );
        if (Object.keys(validationErrors).length > 0) {
            setFormErrors(validationErrors);
            return;
        }

        try {
            await updateToolset.mutateAsync({
                toolset: editingToolset,
            });
            toast.success("Success", {
                description: `Connection ${formMode === "create" ? "created" : "updated"} successfully`,
            });
            setFormMode(null);
            setEditingToolset({ name: "", command: "", args: "", env: "{}" });
            setFormErrors({});
        } catch {
            setFormErrors({
                _general: `Failed to ${formMode} connection`,
            });
        }
    };

    const handleCreateRemoteToolset = async (name: string, url: string) => {
        await updateToolset.mutateAsync({
            toolset: {
                name: name,
                command: "npx",
                args: `-y mcp-remote ${url}`,
                env: "{}",
            },
        });
        toast.success("Success", {
            description: `Remote connection created successfully`,
        });
        setFormMode(null);
    };

    const handleDeleteToolset = async (name: string) => {
        try {
            await deleteToolset.mutateAsync(name);
            toast.success("Success", {
                description: "Connection deleted successfully",
            });
        } catch {
            toast.error("Error", {
                description: "Failed to delete connection",
            });
        }
    };

    const handleSuggestedMCP = (
        name: string,
        command: string,
        args: string,
        env: string,
        needsUserInput: boolean,
    ) => {
        if (needsUserInput) {
            setFormMode("create");
            setEditingToolset({
                name: name,
                command: command,
                args: args,
                env: env,
            });
        } else {
            // For toolsets that don't need user input, add them directly
            updateToolset
                .mutateAsync({
                    toolset: {
                        name: name,
                        command: command,
                        args: args,
                        env: env,
                        // description: description, // This line was causing a lint error
                    },
                })
                .then(() => {
                    toast.success("Success", {
                        description: `${name} connection added successfully`,
                    });
                })
                .catch((err) => {
                    toast.error("Error", {
                        description: `Failed to add ${name} connection ${err}`,
                    });
                });
        }
    };

    const onClaudeDesktopImportClick = async () => {
        try {
            const result = await importFromClaudeDesktop.mutateAsync();
            toast.success("Import Successful", {
                description: `Imported ${result.imported} tools from Claude Desktop`,
            });
        } catch (error) {
            toast.error("Import Failed", {
                description:
                    error instanceof Error
                        ? error.message
                        : "Failed to import tools from Claude Desktop",
            });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-2xl font-semibold">MCP Connections</h3>
            </div>

            {/* Form (for create, edit, and remote) */}
            {formMode === "remote" ? (
                <RemoteToolsetForm
                    isOpen={true}
                    onClose={handleCancelForm}
                    onSubmit={(name, url) => {
                        void handleCreateRemoteToolset(name, url);
                    }}
                />
            ) : formMode ? (
                <ToolsetForm
                    toolset={editingToolset}
                    errors={formErrors}
                    isReadOnly={formMode === "edit"}
                    onChange={handleFieldChange}
                    onSave={() => void handleSaveToolset()}
                    onCancel={handleCancelForm}
                    apiKeyUrl={
                        RECOMMENDED_TOOLSETS.find(
                            (t) => t.name === editingToolset.name,
                        )?.apiKeyUrl
                    }
                    docsUrl={
                        RECOMMENDED_TOOLSETS.find(
                            (t) => t.name === editingToolset.name,
                        )?.docsUrl
                    }
                    title={
                        formMode === "create"
                            ? "New MCP"
                            : `Edit ${editingToolset.name}`
                    }
                />
            ) : (
                <div className="gap-2">
                    <h5 className="text-sm font-geist-mono uppercase tracking-wider font-[350]">
                        Quick start
                    </h5>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                        <div className="col-span-1">
                            <button
                                onClick={handleCreateToolset}
                                className={`flex flex-col font-semibold items-center gap-2 border border-border hover:bg-muted rounded-md w-full py-4 disabled:opacity-50 disabled:hover:bg-transparent disabled:cursor-not-allowed`}
                            >
                                <Plus className="size-9" />
                                New Local MCP
                            </button>
                        </div>
                        <div className="col-span-1">
                            <button
                                onClick={handleCreateRemoteToolsetForm}
                                className={`flex flex-col font-medium items-center gap-2 border border-border hover:bg-muted rounded-md w-full py-4 disabled:opacity-50 disabled:hover:bg-transparent disabled:cursor-not-allowed`}
                            >
                                <Plus className="size-9" />
                                New Remote MCP
                            </button>
                        </div>
                        <div className="col-span-1">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={() =>
                                            void onClaudeDesktopImportClick()
                                        }
                                        className={`flex flex-col font-semibold items-center gap-2  border border-border hover:bg-muted rounded-md w-full py-4 disabled:opacity-50 disabled:hover:bg-transparent disabled:cursor-not-allowed`}
                                    >
                                        {importFromClaudeDesktop.isPending ? (
                                            <>
                                                <Loader2 className="size-9 animate-spin" />
                                                Importing...
                                            </>
                                        ) : (
                                            <>
                                                <RiClaudeFill className="size-9" />
                                                Import from Claude Desktop
                                            </>
                                        )}
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent
                                    side="bottom"
                                    className="max-w-[300px]"
                                >
                                    Import MCPs from Claude Desktop. If you've
                                    made changes to your MCPs in Claude Desktop,
                                    you can click this button again to refresh
                                    your Chorus MCPs.
                                </TooltipContent>
                            </Tooltip>
                        </div>

                        {RECOMMENDED_TOOLSETS.map((toolset) => (
                            <div key={toolset.name} className="relative">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            type="button"
                                            disabled={customToolsetConfigs.some(
                                                (t) => t.name === toolset.name,
                                            )}
                                            className={`flex flex-col items-center gap-2  font-semibold border border-border hover:bg-muted rounded-md w-full py-4 disabled:opacity-50 disabled:hover:bg-transparent disabled:cursor-not-allowed`}
                                            onClick={() => {
                                                handleSuggestedMCP(
                                                    toolset.name,
                                                    toolset.command,
                                                    toolset.args,
                                                    toolset.env || "{}",
                                                    toolset.needsUserInput,
                                                );
                                            }}
                                        >
                                            {toolset.logo}
                                            <span className="flex items-center gap-1">
                                                {toolset.name}{" "}
                                            </span>
                                        </button>
                                    </TooltipTrigger>
                                    {toolset.description && (
                                        <TooltipContent
                                            side="bottom"
                                            className="max-w-[300px]"
                                        >
                                            {toolset.description}
                                        </TooltipContent>
                                    )}
                                </Tooltip>

                                <div className="text-[10px] flex justify-end absolute top-1 right-1.5">
                                    <button
                                        type="button"
                                        className="hover:text-foreground flex items-center gap-1"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            if (toolset.docsUrl) {
                                                void openUrl(toolset.docsUrl);
                                            }
                                        }}
                                    >
                                        <InfoCircledIcon className="size-3" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Toolset list */}
            {!formMode && (
                <Tabs
                    value={activeToolsetTab}
                    onValueChange={(value) =>
                        setActiveToolsetTab(value as "custom" | "builtin")
                    }
                    className="mt-6"
                >
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="custom">Custom</TabsTrigger>
                        <TabsTrigger value="builtin">Built-in</TabsTrigger>
                    </TabsList>
                    <TabsContent value="custom" className="mt-4">
                        {customToolsetConfigs.length > 0 ? (
                            <div className="space-y-4 overflow-hidden">
                                {customToolsetConfigs.map((toolset) => (
                                    <CustomToolsetRow
                                        key={toolset.name}
                                        toolset={toolset}
                                        onEdit={handleEditToolset}
                                        onDelete={(name) =>
                                            void handleDeleteToolset(name)
                                        }
                                    />
                                ))}
                            </div>
                        ) : (
                            <button
                                type="button"
                                className="relative block w-full hover:bg-muted rounded-lg border-2 border-dashed border-border p-12 text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                onClick={handleCreateToolset}
                            >
                                <span className="mt-2 block">
                                    <Plus className="size-12 mx-auto text-muted-foreground" />
                                    <span className="mt-2 block  font-semibold">
                                        New MCP
                                    </span>
                                </span>
                            </button>
                        )}
                    </TabsContent>
                    <TabsContent value="builtin" className="mt-4">
                        <div className="space-y-4 overflow-hidden">
                            {CORE_BUILTIN_TOOLSETS_DATA.map((toolset) => (
                                <div
                                    key={toolset.name}
                                    className="flex items-start gap-4 p-4 border rounded-lg shadow-sm bg-card"
                                >
                                    <div className="text-primary flex-shrink-0 mt-1">
                                        {toolset.icon()}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-semibold  text-card-foreground">
                                            {toolset.displayName}
                                        </div>
                                        {toolset.description && (
                                            <p className="text-sm mt-1">
                                                {toolset.description}
                                            </p>
                                        )}
                                    </div>
                                    {toolset.name === "github" && (
                                        <Button
                                            onClick={() => {
                                                void openUrl(
                                                    "https://github.com/settings/connections/applications/Ov23liViInr7fzLZk61V",
                                                );
                                            }}
                                            variant="outline"
                                            size="iconSm"
                                        >
                                            <LinkIcon className="size-4" />
                                            Manage Connection
                                        </Button>
                                    )}
                                    {/* Future: Could add status indicators or links to specific settings if applicable */}
                                </div>
                            ))}
                        </div>
                    </TabsContent>
                </Tabs>
            )}

            <div className="flex flex-col gap-2  ">
                <p>
                    MCP servers are complicated. If you have any trouble, please
                    email us at{" "}
                    <a
                        href="mailto:humans@chorus.sh"
                        className="text-foreground"
                    >
                        humans@chorus.sh
                    </a>
                    .
                </p>
            </div>
        </div>
    );
}
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
    | "connections"
    | "permissions"
    | "base-url"
    | "docs";

interface TabConfig {
    label: string;
    icon: LucideIcon;
}

const TABS: Record<SettingsTabId, TabConfig> = {
    general: { label: "General", icon: User2 },
    import: { label: "Import", icon: Import },
    "system-prompt": { label: "System Prompt", icon: FileText },
    synthesis: { label: "Synthesis", icon: MergeIcon },
    "api-keys": { label: "API Keys", icon: Key },
    "keyboard-shortcuts": { label: "Keyboard Shortcuts", icon: Keyboard },
    connections: { label: "Connections", icon: PlugIcon },
    permissions: { label: "Tool Permissions", icon: ShieldCheckIcon },
    "base-url": { label: "Base URL", icon: Globe },
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

    // Use React Query hooks for custom base URL
    const customBaseUrl = AppMetadataAPI.useCustomBaseUrl() || "";
    const setCustomBaseUrlMutation = AppMetadataAPI.useSetCustomBaseUrl();

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

    const onCustomBaseUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newUrl = e.target.value;
        void setCustomBaseUrlMutation.mutate(newUrl);
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
                                    <Icon className="w-4 h-4 shrink-0" />
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

                    {activeTab === "connections" && (
                        <div className="space-y-6">
                            <ToolsTab />
                        </div>
                    )}

                    {activeTab === "permissions" && <PermissionsTab />}

                    {activeTab === "base-url" && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-2xl font-semibold mb-2">
                                    Base URL Configuration
                                </h2>
                                <p className="text-muted-foreground text-sm">
                                    Configure a custom base URL for all model
                                    requests. This allows you to route requests
                                    through your own proxy or server.
                                </p>
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label
                                        htmlFor="custom-base-url"
                                        className="font-semibold"
                                    >
                                        Custom Base URL
                                    </label>
                                    <Input
                                        id="custom-base-url"
                                        value={customBaseUrl}
                                        onChange={(e) =>
                                            void onCustomBaseUrlChange(e)
                                        }
                                        placeholder="https://your-proxy.com"
                                        className="font-mono"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Leave empty to use the default Chorus
                                        proxy. When set, all model requests will
                                        be sent directly to this URL without any
                                        path modifications.
                                    </p>
                                </div>

                                {customBaseUrl && (
                                    <div className="border rounded-md p-4 bg-muted/50">
                                        <h4 className="font-semibold text-sm mb-2">
                                            Configuration Details
                                        </h4>
                                        <div className="space-y-2 text-sm">
                                            <p>
                                                When using a custom base URL,
                                                requests will be sent directly
                                                to your proxy without any path
                                                prefixes.
                                            </p>
                                            <p className="text-muted-foreground">
                                                Your proxy should:
                                            </p>
                                            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                                                <li>
                                                    Handle routing to the
                                                    appropriate model providers
                                                </li>
                                                <li>
                                                    Manage authentication with
                                                    each provider
                                                </li>
                                                <li>
                                                    Forward request/response
                                                    data appropriately
                                                </li>
                                            </ul>
                                            <p className="text-xs mt-2 text-muted-foreground">
                                                The proxy will receive the raw
                                                OpenAI-compatible API requests
                                                for all providers.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-end gap-2 pt-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            void setCustomBaseUrlMutation.mutate(
                                                "",
                                            );
                                            toast.success(
                                                "Custom base URL cleared",
                                            );
                                        }}
                                        disabled={!customBaseUrl}
                                    >
                                        Clear
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
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

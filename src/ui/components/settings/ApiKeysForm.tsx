import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { ProviderName } from "@core/chorus/Models";
import { ProviderLogo } from "../ui/provider-logo";
import { Card } from "../ui/card";
import {
    CheckIcon,
    ExternalLinkIcon,
    EyeIcon,
    EyeOffIcon,
    FlameIcon,
    HardDriveIcon,
} from "lucide-react";
import { useCallback, useState } from "react";
import { Switch } from "../ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { cn } from "@ui/lib/utils";

type Provider = {
    id: string;
    name: string;
    placeholder: string;
    url: string;
    isModelProvider: boolean;
};

function ProviderApiKeyForm({
    provider,
    apiKey,
    onApiKeyChange,
    isVisible,
}: {
    provider: Provider;
    apiKey: string;
    onApiKeyChange: (value: string) => void;
    isVisible: boolean;
}) {
    const [showKey, setShowKey] = useState(false);

    return (
        <div
            className={cn(
                "grid transition-[grid-template-rows] duration-200 ease-out",
                isVisible ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
            )}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="min-h-0 overflow-hidden">
                <div className="min-h-0 mt-4 pt-4 border-t space-y-4 text-left">
                    <div className="space-y-2">
                        <Label htmlFor={`${provider.id}-key`}>API Key</Label>
                        <div className="relative">
                            <Input
                                id={`${provider.id}-key`}
                                type={showKey ? "text" : "password"}
                                placeholder={provider.placeholder}
                                value={apiKey}
                                onChange={(e) => onApiKeyChange(e.target.value)}
                                className="pr-9"
                                tabIndex={isVisible ? 0 : -1}
                            />
                            <button
                                type="button"
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                onClick={() => setShowKey((prev) => !prev)}
                                tabIndex={isVisible ? 0 : -1}
                            >
                                {showKey ? (
                                    <EyeOffIcon className="w-4 h-4" />
                                ) : (
                                    <EyeIcon className="w-4 h-4" />
                                )}
                            </button>
                        </div>
                    </div>
                    <a
                        href={provider.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-primary underline underline-offset-4 hover:text-primary/80"
                        tabIndex={isVisible ? 0 : -1}
                    >
                        Get {provider.name} API key
                        <ExternalLinkIcon className="w-3 h-3" />
                    </a>
                </div>
            </div>
        </div>
    );
}

interface ApiKeysFormProps {
    apiKeys: Record<string, string>;
    onApiKeyChange: (provider: string, value: string) => void;
    providerVisibility: Record<string, boolean>;
    onProviderVisibilityChange: (provider: string, visible: boolean) => void;
    lmStudioBaseUrl: string;
    onLmStudioBaseUrlChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function ApiKeysForm({
    apiKeys,
    onApiKeyChange,
    providerVisibility,
    onProviderVisibilityChange,
    lmStudioBaseUrl,
    onLmStudioBaseUrlChange,
}: ApiKeysFormProps) {
    const [expandedProviders, setExpandedProviders] = useState<Set<string>>(
        new Set(),
    );

    const toggleProvider = useCallback((providerId: string) => {
        setExpandedProviders((prev) => {
            const next = new Set(prev);
            if (next.has(providerId)) {
                next.delete(providerId);
            } else {
                next.add(providerId);
            }
            return next;
        });
    }, []);

    const providers = [
        {
            id: "anthropic",
            name: "Anthropic",
            placeholder: "sk-ant-...",
            url: "https://console.anthropic.com/settings/keys",
            isModelProvider: true,
        },
        {
            id: "openai",
            name: "OpenAI",
            placeholder: "sk-...",
            url: "https://platform.openai.com/api-keys",
            isModelProvider: true,
        },
        {
            id: "google",
            name: "Google AI (Gemini)",
            placeholder: "AI...",
            url: "https://aistudio.google.com/apikey",
            isModelProvider: true,
        },
        {
            id: "perplexity",
            name: "Perplexity",
            placeholder: "pplx-...",
            url: "https://www.perplexity.ai/account/api/keys",
            isModelProvider: true,
        },
        {
            id: "openrouter",
            name: "OpenRouter",
            placeholder: "sk-or-...",
            url: "https://openrouter.ai/keys",
            isModelProvider: true,
        },
        {
            id: "grok",
            name: "xAI",
            placeholder: "xai-...",
            url: "https://console.x.ai/settings/keys",
            isModelProvider: true,
        },
        {
            id: "firecrawl",
            name: "Firecrawl",
            placeholder: "fc-...",
            url: "https://www.firecrawl.dev/app/api-keys",
            isModelProvider: false,
        },
    ];

    const isProviderVisible = (providerId: string) =>
        providerVisibility[providerId] !== false;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
                {providers.map((provider) => (
                    <Card
                        key={provider.id}
                        className={`relative px-3 pt-6 pb-7 cursor-pointer hover:bg-muted transition-colors ${
                            expandedProviders.has(provider.id)
                                ? "ring-2 ring-primary"
                                : ""
                        } ${
                            provider.isModelProvider &&
                            !isProviderVisible(provider.id)
                                ? "opacity-50"
                                : ""
                        }`}
                        onClick={() => {
                            toggleProvider(provider.id);
                            if (
                                provider.isModelProvider &&
                                !isProviderVisible(provider.id)
                            ) {
                                onProviderVisibilityChange(provider.id, true);
                            }
                        }}
                    >
                        <button
                            type="button"
                            className="flex flex-col items-center gap-2 text-center w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset rounded-lg"
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleProvider(provider.id);
                                if (
                                    provider.isModelProvider &&
                                    !isProviderVisible(provider.id)
                                ) {
                                    onProviderVisibilityChange(
                                        provider.id,
                                        true,
                                    );
                                }
                            }}
                        >
                            {provider.id === "firecrawl" ? (
                                <FlameIcon className="w-4 h-4" />
                            ) : (
                                <ProviderLogo
                                    provider={provider.id as ProviderName}
                                    size="lg"
                                />
                            )}
                            <span className="font-medium">{provider.name}</span>
                        </button>
                        {apiKeys[provider.id] && (
                            <div className="absolute top-2 right-2">
                                <CheckIcon className="w-4 h-4 text-green-500" />
                            </div>
                        )}
                        {provider.isModelProvider && (
                            <div
                                className="absolute top-2 left-2"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span>
                                            <Switch
                                                checked={isProviderVisible(
                                                    provider.id,
                                                )}
                                                onCheckedChange={(checked) =>
                                                    onProviderVisibilityChange(
                                                        provider.id,
                                                        checked,
                                                    )
                                                }
                                                className="scale-75"
                                            />
                                        </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        {isProviderVisible(provider.id)
                                            ? "Disable provider"
                                            : "Enable provider"}
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                        )}
                        <ProviderApiKeyForm
                            provider={provider}
                            apiKey={apiKeys[provider.id] || ""}
                            onApiKeyChange={(value) =>
                                onApiKeyChange(provider.id, value)
                            }
                            isVisible={
                                expandedProviders.has(provider.id) &&
                                (!provider.isModelProvider ||
                                    isProviderVisible(provider.id))
                            }
                        />
                    </Card>
                ))}
            </div>

            {/* Local Models Toggle */}
            <Card className="p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <HardDriveIcon className="w-5 h-5 text-muted-foreground" />
                        <div>
                            <p className="font-medium">Local Models</p>
                            <p className="text-sm text-muted-foreground">
                                Show models from Ollama and LM Studio
                            </p>
                        </div>
                    </div>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span>
                                <Switch
                                    checked={isProviderVisible("local")}
                                    onCheckedChange={(checked) =>
                                        onProviderVisibilityChange(
                                            "local",
                                            checked,
                                        )
                                    }
                                />
                            </span>
                        </TooltipTrigger>
                        <TooltipContent>
                            {isProviderVisible("local")
                                ? "Disable local models"
                                : "Enable local models"}
                        </TooltipContent>
                    </Tooltip>
                </div>
                {isProviderVisible("local") && (
                    <div className="mt-4 pt-4 border-t space-y-2">
                        <Label htmlFor="lmstudio-url">LM Studio Base URL</Label>
                        <Input
                            id="lmstudio-url"
                            value={lmStudioBaseUrl}
                            onChange={onLmStudioBaseUrlChange}
                            placeholder="http://localhost:1234/v1"
                        />
                    </div>
                )}
            </Card>
        </div>
    );
}

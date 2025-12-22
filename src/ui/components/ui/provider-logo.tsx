import {
    getProviderName,
    LogoProviderName,
    ProviderName,
} from "@core/chorus/Models";
import { detectOpenRouterProviderLogo } from "@ui/lib/models";
import { cn } from "@ui/lib/utils";
import { BoxIcon } from "lucide-react";
import {
    RiAnthropicFill,
    RiOpenaiFill,
    RiGoogleFill,
    RiPerplexityFill,
    RiQuestionMark,
    RiMetaFill,
} from "react-icons/ri";
import { SiOllama } from "react-icons/si";

// can pass in either provider or modelId. provider takes precedence over modelId
export type ProviderLogoProps = {
    provider?: ProviderName;
    modelId?: string; // full model ID, which is useful for default openrouter model logo handling
    className?: string;
    size?: "xs" | "sm" | "md" | "lg";
};

export function ProviderLogo({
    provider,
    modelId,
    className,
    size = "md",
}: ProviderLogoProps) {
    // if neither are provided, will be handled in getLogoComponent
    let finalProvider = provider;
    if (!finalProvider && modelId) {
        finalProvider = getProviderName(modelId);
    }

    const sizeClasses = {
        xs: "w-3 h-3",
        sm: "w-4 h-4",
        md: "w-6 h-6",
        lg: "w-8 h-8",
    };

    const getLogoComponent = (
        provider: ProviderName | LogoProviderName | undefined,
    ) => {
        switch (provider) {
            case "anthropic":
                return <RiAnthropicFill className="w-4 h-4" />;
            case "openai":
                return <RiOpenaiFill className="w-4 h-4" />;
            case "google":
                return <RiGoogleFill className="w-4 h-4" />;
            case "perplexity":
                return <RiPerplexityFill className="w-4 h-4" />;
            case "ollama":
                return <SiOllama className="w-4 h-4" />;
            case "lmstudio":
                // TODO: Add LMStudio logo
                return <BoxIcon className="w-4 h-4" />;
            case "meta":
                return <RiMetaFill className="w-4 h-4" />;
            case "grok":
                return (
                    <img
                        src="/xai_light.svg"
                        alt="Grok"
                        className="w-4 h-4 dark:invert"
                    />
                );
            case "deepseek":
                return (
                    <img
                        src="/deepseek_light.svg"
                        alt="DeepSeek"
                        className="w-4 h-4 dark:invert"
                    />
                );
            case "kimi":
                return (
                    <img
                        src="/kimi_light.svg"
                        alt="Kimi"
                        className="w-4 h-4 dark:invert"
                    />
                );
            case "mistral":
                return (
                    <img
                        src="/mistral_light.svg"
                        alt="Mistral"
                        className="w-4 h-4 dark:invert"
                    />
                );
            case "nvidia":
                return (
                    <img
                        src="/nvidia_light.svg"
                        alt="NVIDIA"
                        className="w-4 h-4 dark:invert"
                    />
                );
            case "qwen":
                return (
                    <img
                        src="/qwen_light.svg"
                        alt="Qwen"
                        className="w-4 h-4 dark:invert"
                    />
                );
            case "zai":
                return (
                    <img
                        src="/zai_light.svg"
                        alt="01.AI"
                        className="w-4 h-4 dark:invert"
                    />
                );
            case "openrouter":
                if (modelId) {
                    const detectedProvider =
                        detectOpenRouterProviderLogo(modelId);
                    if (detectedProvider) {
                        return getLogoComponent(detectedProvider);
                    }
                }
                return (
                    <img
                        src="/openrouter_dark.svg"
                        alt="OpenRouter"
                        className="w-4 h-4 invert dark:invert-0"
                    />
                );
            default: {
                // @ts-expect-error: creating unused variable to provide exhaustiveness check
                const _unused: never = provider;
                console.warn(
                    `Unknown provider: ${(provider ?? "unknown") as string}`,
                );
                return <RiQuestionMark className="w-4 h-4" />;
            }
        }
    };

    return (
        <div
            className={cn(
                "flex items-center justify-center rounded-full",
                sizeClasses[size],
                className,
            )}
        >
            {getLogoComponent(finalProvider)}
        </div>
    );
}

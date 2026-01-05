import {
    getProviderName,
    LogoProviderName,
    ProviderName,
} from "@core/chorus/Models";
import { detectOpenRouterProviderLogo } from "@ui/lib/models";
import { cn } from "@ui/lib/utils";
import { BoxIcon } from "lucide-react";
import {
    RiAlibabaCloudFill,
    RiAmazonFill,
    RiAnthropicFill,
    RiBaiduFill,
    RiOpenaiFill,
    RiGoogleFill,
    RiMetaFill,
    RiMicrosoftFill,
    RiPerplexityFill,
    RiQuestionMark,
} from "react-icons/ri";
import { SiOllama } from "react-icons/si";
import {
    AI21Icon,
    AionLabsIcon,
    ArceeIcon,
    ByteDanceIcon,
    CohereIcon,
    DeepCogitoIcon,
    DeepSeekIcon,
    IBMIcon,
    InceptionIcon,
    InflectionIcon,
    KimiIcon,
    LiquidIcon,
    MinimaxIcon,
    MistralIcon,
    MorphIcon,
    NousResearchIcon,
    NvidiaIcon,
    OpenRouterIcon,
    QwenIcon,
    RelaceIcon,
    XaiIcon,
    ZaiIcon,
} from "@ui/components/provider-icons";

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
                return <XaiIcon className="w-4 h-4" />;
            case "ai21":
                return <AI21Icon className="w-4 h-4" />;
            case "aionlabs":
                return <AionLabsIcon className="w-4 h-4" />;
            case "alibaba":
                return <RiAlibabaCloudFill className="w-4 h-4" />;
            case "amazon":
                return <RiAmazonFill className="w-4 h-4" />;
            case "arcee":
                return <ArceeIcon className="w-4 h-4" />;
            case "baidu":
                return <RiBaiduFill className="w-4 h-4" />;
            case "bytedance":
                return <ByteDanceIcon className="w-4 h-4" />;
            case "cohere":
                return <CohereIcon className="w-4 h-4" />;
            case "deepcogito":
                return <DeepCogitoIcon className="w-4 h-4" />;
            case "deepseek":
                return <DeepSeekIcon className="w-4 h-4" />;
            case "ibm":
                return <IBMIcon className="w-4 h-4" />;
            case "inception":
                return <InceptionIcon className="w-4 h-4" />;
            case "inflection":
                return <InflectionIcon className="w-4 h-4" />;
            case "kimi":
                return <KimiIcon className="w-4 h-4" />;
            case "liquid":
                return <LiquidIcon className="w-4 h-4" />;
            case "microsoft":
                return <RiMicrosoftFill className="w-4 h-4" />;
            case "minimax":
                return <MinimaxIcon className="w-4 h-4" />;
            case "mistral":
                return <MistralIcon className="w-4 h-4" />;
            case "morph":
                return <MorphIcon className="w-4 h-4" />;
            case "nousresearch":
                return <NousResearchIcon className="w-4 h-4" />;
            case "nvidia":
                return <NvidiaIcon className="w-4 h-4" />;
            case "qwen":
                return <QwenIcon className="w-4 h-4" />;
            case "relace":
                return <RelaceIcon className="w-4 h-4" />;
            case "zai":
                return <ZaiIcon className="w-4 h-4" />;
            case "openrouter":
                if (modelId) {
                    const detectedProvider =
                        detectOpenRouterProviderLogo(modelId);
                    if (detectedProvider) {
                        return getLogoComponent(detectedProvider);
                    }
                }
                return <OpenRouterIcon className="w-4 h-4" />;
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

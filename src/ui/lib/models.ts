// Mapping of model IDs and config IDs for easier maintenance

import { LogoProviderName } from "@core/chorus/Models";

// The ordering of these keys is the same as the ordering of the models in the UI
export const MODEL_IDS = {
    basic: {
        GPT_5_NANO: "openai::gpt-5-nano",
        GPT_5_MINI: "openai::gpt-5-mini",
        GEMINI_FLASH: "google::gemini-2.5-flash",
        GROK_3_MINI: "grok::grok-3-mini-beta",
    },
    frontier: {
        O3_PRO: "openai::o3-pro",
        O3_DEEP_RESEARCH: "openai::o3-deep-research",
        CLAUDE_4_1_OPUS: "anthropic::claude-opus-4.1-latest",
        GROK_3_FAST: "grok::grok-3-fast-beta",
        SONAR_DEEP_RESEARCH: "5dfdba07-3bad-456d-8267-4aa448d7ae1c",
    },
    plus: {
        GPT_5: "openai::gpt-5",
        CLAUDE_4_SONNET: "anthropic::claude-sonnet-4-5-20250929",
        GEMINI_2_5_PRO: "google::gemini-2.5-pro-latest",
        O3: "openai::o3",
        O4_MINI: "openai::o4-mini",
        DEEPSEEK_R1_0528: "openrouter::deepseek/deepseek-r1-0528",
        GROK_3: "grok::grok-3-beta",
        GROK_4: "openrouter::x-ai/grok-4",
    },
} as const;

/**
 * Attempts to detect a known provider from an OpenRouter model ID by pattern matching.
 * This checks if any known provider name appears in the model ID string.
 *
 * Examples:
 * - "openrouter::x-ai/grok-4" → "grok" (matches "grok" or "x-ai")
 * - "openrouter::meta-llama/llama-3.3-70b" → "meta" (matches "meta")
 * - "openrouter::anthropic/claude-3-5-sonnet" → "anthropic" (matches "anthropic")
 * - "openrouter::openai/gpt-4o" → "openai" (matches "openai")
 * - "openrouter::google/gemini-2.0" → "google" (matches "google")
 * - "openrouter::deepseek/deepseek-r1" → "deepseek" (matches "deepseek")
 * - "openrouter::mistralai/mistral-large" → "mistral" (matches "mistral")
 *
 * @param modelId - The full model ID (e.g., "openrouter::x-ai/grok-4")
 * @returns The detected LogoProviderName or null if no match found
 */
export function detectOpenRouterProviderLogo(
    modelId: string,
): LogoProviderName | null {
    if (!modelId || !modelId.startsWith("openrouter::")) {
        return null;
    }

    // Providers to check for, in priority order
    // Less ambiguous patterns come first (openai, anthropic, google, perplexity)
    // More generic patterns come later (meta, grok)
    // Logo-only providers (deepseek, mistral, etc.) at the end
    const providerPatterns: Array<{
        pattern: string;
        provider: LogoProviderName;
    }> = [
        { pattern: "anthropic", provider: "anthropic" },
        { pattern: "openai", provider: "openai" },
        { pattern: "google", provider: "google" },
        { pattern: "perplexity", provider: "perplexity" },
        { pattern: "x-ai", provider: "grok" }, // xAI makes Grok
        { pattern: "grok", provider: "grok" },
        { pattern: "meta", provider: "meta" },
        // Logo-only providers (no full infrastructure)
        { pattern: "deepseek", provider: "deepseek" },
        { pattern: "mistralai", provider: "mistral" }, // Match "mistralai" first
        { pattern: "mistral", provider: "mistral" },
        { pattern: "moonshot", provider: "kimi" }, // Moonshot makes Kimi
        { pattern: "kimi", provider: "kimi" },
        { pattern: "nvidia", provider: "nvidia" },
        { pattern: "qwen", provider: "qwen" },
        { pattern: "z-ai", provider: "zai" }, // Z.AI makes GLM models
        { pattern: "thudm", provider: "zai" }, // THUDM also makes GLM models
    ];

    const lowerModelId = modelId.toLowerCase();

    // Find the first matching pattern
    for (const { pattern, provider } of providerPatterns) {
        if (lowerModelId.includes(pattern)) {
            return provider;
        }
    }

    return null; // No match, will fall back to OpenRouter logo
}

// Flatten the MODEL_IDS object into a single array of allowed IDs
export const ALLOWED_MODEL_IDS_FOR_QUICK_CHAT: string[] = [
    ...Object.values(MODEL_IDS).flatMap((tier) => Object.values(tier)),
    // Add our custom models for quick chat
    "24711c64-725c-4bdd-b5eb-65fe1dbfcde8", // Ambient Claude
    "google::ambient-gemini-2.5-pro-preview-03-25", // Ambient Gemini
    "openrouter::qwen/qwen3-32b", // Qwen 32B
];

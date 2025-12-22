import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "../DB";
import { SettingsManager } from "@core/utilities/Settings";
import * as Models from "../Models";

export const appMetadataKeys = {
    appMetadata: () => ["appMetadata"] as const,
};

export async function fetchAppMetadata(): Promise<Record<string, string>> {
    return (
        await db.select<{ key: string; value: string }[]>(
            `SELECT * FROM app_metadata`,
        )
    ).reduce(
        (acc, row) => {
            acc[row.key] = row.value;
            return acc;
        },
        {} as Record<string, string>,
    );
}

export function useAppMetadata() {
    return useQuery({
        queryKey: appMetadataKeys.appMetadata(),
        queryFn: async () =>
            (
                await db.select<{ key: string; value: string }[]>(
                    "SELECT key, value FROM app_metadata",
                )
            ).reduce(
                (acc, { key, value }) => {
                    acc[key] = value;
                    return acc;
                },
                {} as Record<string, string>,
            ),
    });
}

export function useSkipOnboarding() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationKey: ["skipOnboarding"] as const,
        mutationFn: async () => {
            await db.execute(
                "UPDATE app_metadata SET value = 'true' WHERE key = 'has_dismissed_onboarding'",
            );
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: appMetadataKeys.appMetadata(),
            });
        },
    });
}

export function useSetOnboardingStep() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationKey: ["setOnboardingStep"] as const,
        mutationFn: async ({ step }: { step: number }) => {
            await db.execute(
                "INSERT OR REPLACE INTO app_metadata (key, value) VALUES (?, ?)",
                ["onboarding_step", step.toString()],
            );
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: appMetadataKeys.appMetadata(),
            });
        },
    });
}

export function useOnboardingStep() {
    const { data: appMetadata } = useAppMetadata();
    const stepValue = appMetadata?.["onboarding_step"];
    return stepValue ? parseInt(stepValue, 10) : 0;
}

/**
 * Parse sections visibility from app_metadata
 * Returns default visibility if not found or parse fails
 */
function parseSectionVisibility(
    appMetadata: Record<string, string> | undefined,
): Record<string, boolean> {
    const defaultVisibility = {
        anthropic: true,
        openai: true,
        google: true,
        grok: true,
        perplexity: true,
        custom: true,
        local: true,
        openrouter: true,
    };

    if (!appMetadata?.sections_visibility) {
        return defaultVisibility;
    }

    try {
        const parsed = JSON.parse(appMetadata.sections_visibility) as unknown;
        // Validate that parsed is an object with boolean values
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            return {
                ...defaultVisibility,
                ...(parsed as Record<string, boolean>),
            };
        }
        return defaultVisibility;
    } catch {
        return defaultVisibility;
    }
}

/**
 * Get visibility state for all sections
 * Returns Record<string, boolean> with all section keys
 */
export function useSectionsVisibility() {
    const { data: appMetadata } = useAppMetadata();
    return parseSectionVisibility(appMetadata);
}

/**
 * Update visibility for a single section
 * Uses optimistic updates for instant UI feedback
 * No rollback on error (UI state is not critical)
 */
export function useSetSectionVisibility() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationKey: ["setSectionVisibility"] as const,

        // Optimistic update - immediately update UI
        onMutate: async ({
            section,
            visible,
        }: {
            section: string;
            visible: boolean;
        }) => {
            // Cancel outgoing refetches to avoid overwriting optimistic update
            await queryClient.cancelQueries({
                queryKey: appMetadataKeys.appMetadata(),
            });

            // Optimistically update the cache
            queryClient.setQueryData<Record<string, string>>(
                appMetadataKeys.appMetadata(),
                (old) => {
                    if (!old) return old;

                    const currentVisibility = parseSectionVisibility(old);
                    const updatedVisibility = {
                        ...currentVisibility,
                        [section]: visible,
                    };

                    return {
                        ...old,
                        sections_visibility: JSON.stringify(updatedVisibility),
                    };
                },
            );
        },

        // Actual database write
        mutationFn: async ({
            section,
            visible,
        }: {
            section: string;
            visible: boolean;
        }) => {
            // Read FRESH data from database to avoid race conditions
            const currentMetadata = await fetchAppMetadata();
            const currentVisibility = parseSectionVisibility(currentMetadata);

            // Merge the update
            const updatedVisibility = {
                ...currentVisibility,
                [section]: visible,
            };

            // Write back to database
            await db.execute(
                "INSERT OR REPLACE INTO app_metadata (key, value) VALUES (?, ?)",
                ["sections_visibility", JSON.stringify(updatedVisibility)],
            );
        },

        // Sync cache with database after write completes
        onSettled: () => {
            void queryClient.invalidateQueries({
                queryKey: appMetadataKeys.appMetadata(),
            });
        },
    });
}

export function useHasDismissedOnboarding() {
    const { data: appMetadata } = useAppMetadata();
    return appMetadata?.["has_dismissed_onboarding"] === "true";
}

export function useDismissedAlertVersion() {
    const { data: appMetadata } = useAppMetadata();
    return appMetadata?.["dismissed_alert_version"];
}

export function useSetDismissedAlertVersion() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationKey: ["setDismissedAlertVersion"] as const,
        mutationFn: async ({ version }: { version: string }) => {
            await db.execute(
                "INSERT OR REPLACE INTO app_metadata (key, value) VALUES (?, ?)",
                ["dismissed_alert_version", version],
            );
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: appMetadataKeys.appMetadata(),
            });
        },
    });
}

export function useYoloMode() {
    const { data: appMetadata } = useAppMetadata();
    return {
        data: appMetadata?.["yolo_mode"] === "true",
    };
}

export function useSetYoloMode() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationKey: ["setYoloMode"] as const,
        mutationFn: async (enabled: boolean) => {
            await db.execute(
                "INSERT OR REPLACE INTO app_metadata (key, value) VALUES (?, ?)",
                ["yolo_mode", enabled ? "true" : "false"],
            );
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: appMetadataKeys.appMetadata(),
            });
        },
    });
}

export function useSetVisionModeEnabled() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationKey: ["setVisionModeEnabled"] as const,
        mutationFn: async (enabled: boolean) => {
            await db.execute(
                "UPDATE app_metadata SET value = $1 WHERE key = 'vision_mode_enabled'",
                [enabled ? "true" : "false"],
            );
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: appMetadataKeys.appMetadata(),
            });
        },
    });
}

export async function getApiKeys() {
    const settingsManager = SettingsManager.getInstance();
    const settings = await settingsManager.get();
    return (settings.apiKeys || {}) as Models.ApiKeys;
}

export async function getCustomBaseUrl() {
    const result = await db.select<{ value: string }[]>(
        "SELECT value FROM app_metadata WHERE key = 'custom_base_url'",
    );
    return result[0]?.value || undefined;
}

/**
 * Hook to access the custom base URL
 */
export function useCustomBaseUrl() {
    const { data: appMetadata } = useAppMetadata();
    return appMetadata?.["custom_base_url"];
}

/**
 * Hook to set the custom base URL
 */
export function useSetCustomBaseUrl() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationKey: ["setCustomBaseUrl"] as const,
        mutationFn: async (url: string) => {
            if (url) {
                await db.execute(
                    "INSERT OR REPLACE INTO app_metadata (key, value) VALUES (?, ?)",
                    ["custom_base_url", url],
                );
            } else {
                await db.execute(
                    "DELETE FROM app_metadata WHERE key = 'custom_base_url'",
                );
            }
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: appMetadataKeys.appMetadata(),
            });
            // Also invalidate API keys since they might depend on the base URL
            await queryClient.invalidateQueries({
                queryKey: ["apiKeys"],
            });
        },
    });
}

/**
 * Hook to access the user's API keys
 */
export function useApiKeys() {
    return useQuery({
        queryKey: ["apiKeys"],
        queryFn: getApiKeys,
    });
}

export function useZoomLevel() {
    const { data: appMetadata } = useAppMetadata();
    return parseFloat(appMetadata?.["zoom_level"] || "100");
}

export function useSetZoomLevel() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationKey: ["setZoomLevel"] as const,
        mutationFn: async (zoomLevel: number) => {
            await db.execute(
                "INSERT OR REPLACE INTO app_metadata (key, value) VALUES (?, ?)",
                ["zoom_level", zoomLevel.toString()],
            );
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: appMetadataKeys.appMetadata(),
            });
        },
    });
}

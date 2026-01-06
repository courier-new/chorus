import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Models from "../Models";
import { v4 as uuidv4 } from "uuid";
import { db } from "../DB";
import {
    ModelConfig,
    SelectedModelConfig,
    ModelInstance,
    isModelInstance,
} from "../Models";
import { getApiKeys } from "./AppMetadataAPI";

// all
// --> list models
//     --> list model configs
// --> model details
//     --> [individual model detail]
//         --> [individual model config detail]

const modelKeys = {
    all: () => ["models"] as const,
};

export const modelQueries = {
    list: () => ({
        queryKey: [...modelKeys.all(), "list"] as const,
        queryFn: () => fetchModels(),
    }),
};

const modelConfigKeys = {
    all: () => ["modelConfigs"] as const,
};

export const modelConfigQueries = {
    listConfigs: () => ({
        queryKey: [...modelConfigKeys.all(), "list"] as const,
        queryFn: () => fetchModelConfigs(),
    }),
    quickChat: () => ({
        queryKey: [...modelConfigKeys.all(), "quickChat"] as const,
        queryFn: () => fetchModelConfigQuickChat(),
    }),
    compare: () => ({
        queryKey: [...modelConfigKeys.all(), "compare"] as const,
        queryFn: () => fetchModelConfigsCompare(),
    }),
};

type ModelDBRow = {
    id: string;
    display_name: string;
    is_enabled: boolean;
    supported_attachment_types: string;
    is_internal: boolean;
};

type ModelConfigDBRow = {
    id: string;
    display_name: string;
    author: "user" | "system";
    model_id: string;
    system_prompt: string;
    is_enabled: boolean;
    supported_attachment_types: string;
    is_default: boolean;
    is_internal: boolean;
    is_deprecated: boolean;
    budget_tokens: number | null;
    reasoning_effort: "low" | "medium" | "high" | null;
    new_until?: string;
    prompt_price_per_token: number | null;
    completion_price_per_token: number | null;
};

// Track whether we've attempted to refresh OpenRouter models within
// the current session, and store the promise if a download is in progress.
let openRouterDownloadPromise: Promise<number> | null = null;

function readModel(row: ModelDBRow): Models.Model {
    return {
        id: row.id,
        displayName: row.display_name,
        isEnabled: row.is_enabled,
        supportedAttachmentTypes: JSON.parse(
            row.supported_attachment_types,
        ) as Models.AttachmentType[],
        isInternal: row.is_internal,
    };
}

function readModelConfig(row: ModelConfigDBRow): ModelConfig {
    return {
        id: row.id,
        displayName: row.display_name,
        author: row.author,
        modelId: row.model_id,
        systemPrompt: row.system_prompt,
        isEnabled: row.is_enabled,
        supportedAttachmentTypes: JSON.parse(
            row.supported_attachment_types,
        ) as Models.AttachmentType[],
        isDefault: row.is_default,
        isInternal: row.is_internal,
        isDeprecated: row.is_deprecated,
        budgetTokens: row.budget_tokens ?? undefined,
        reasoningEffort: row.reasoning_effort ?? undefined,
        newUntil: row.new_until ?? undefined,
        promptPricePerToken: row.prompt_price_per_token ?? undefined,
        completionPricePerToken: row.completion_price_per_token ?? undefined,
    };
}

export async function fetchModelConfigs() {
    // Fetch OpenRouter models if we haven't already and the user has an OpenRouter API key.
    const apiKeys = await getApiKeys();
    if (apiKeys.openrouter) {
        // If a download is already in progress, wait for it to complete.
        // Otherwise, start a new download and store the promise.
        if (openRouterDownloadPromise) {
            await openRouterDownloadPromise;
        } else {
            openRouterDownloadPromise = Models.downloadOpenRouterModels(db);
            await openRouterDownloadPromise;
            // Keep the promise stored so subsequent calls know it completed
            // (we don't clear it to prevent re-downloads within the session)
        }
    }

    return (
        await db.select<ModelConfigDBRow[]>(
            `SELECT model_configs.id, model_configs.display_name, model_configs.author,
                        model_configs.model_id, model_configs.system_prompt, models.is_enabled,
                        models.is_internal, models.supported_attachment_types, model_configs.is_default,
                        models.is_deprecated, model_configs.budget_tokens, model_configs.reasoning_effort, model_configs.new_until,
                        model_configs.created_at, models.prompt_price_per_token, models.completion_price_per_token
                 FROM model_configs
                 JOIN models ON model_configs.model_id = models.id
                 ORDER BY
                    models.is_enabled DESC,
                    CASE WHEN models.id LIKE 'openrouter::%' THEN 0 ELSE 1 END,
                    CASE WHEN models.id LIKE 'openrouter::%' THEN model_configs.display_name ELSE NULL END ASC,
                    CASE WHEN models.id NOT LIKE 'openrouter::%' THEN model_configs.created_at ELSE NULL END DESC`,
        )
    ).map(readModelConfig);
}

export async function fetchModels() {
    return (await db.select<ModelDBRow[]>(`SELECT * FROM models`)).map(
        readModel,
    );
}

export function maybeMigrateModelsToInstances(
    configs: unknown[],
): [instances: ModelInstance[], wasMigrated: boolean] {
    // Check if it's the old format (array of strings) or new format (array
    // of objects). If we detect the old format, we will convert strings to
    // the new format (ModelInstance objects).
    if (typeof configs[0] === "string") {
        const migrated = (configs as string[]).map(
            (modelConfigId): ModelInstance => ({
                modelConfigId,
                instanceId: uuidv4(),
            }),
        );
        return [migrated, true];
    }
    return [configs.filter(isModelInstance), false];
}

/**
 * Fetches raw model instances from storage. This read also handles the one-time
 * migration from old string[] format to new ModelInstance[] format.
 */
async function fetchSelectedModelInstances(): Promise<ModelInstance[]> {
    const rows = await db.select<{ value: string }[]>(
        `SELECT value FROM app_metadata WHERE key = 'selected_model_configs_compare'`,
    );

    if (rows.length === 0 || !rows[0].value) {
        return [];
    }

    try {
        const parsed: unknown = JSON.parse(rows[0].value);
        if (!Array.isArray(parsed) || parsed.length === 0) return [];

        const [instances, wasMigrated] = maybeMigrateModelsToInstances(parsed);

        if (wasMigrated) {
            // Write the new migrated format to the database.
            await db.execute(
                "UPDATE app_metadata SET value = ? WHERE key = 'selected_model_configs_compare'",
                [JSON.stringify(instances)],
            );
        }

        return instances;
    } catch {
        return [];
    }
}

export async function fetchModelConfigsCompare(): Promise<
    SelectedModelConfig[]
> {
    // First get the model instances to ensure migration happens if needed.
    const instances = await fetchSelectedModelInstances();

    if (instances.length === 0) return [];

    // Extract unique model config IDs while preserving order
    const modelConfigIds = instances.map((instance) => instance.modelConfigId);

    // Build a VALUES entries clause, e.g.
    // (0, $1), (1, $2), (2, $3), ...
    const valuesEntries = modelConfigIds
        .map((_, i) => `(${i}, $${i + 1})`)
        .join(", ");

    const rows = await db.select<ModelConfigDBRow[]>(
        `WITH instance_order(position, config_id) AS (
            VALUES ${valuesEntries}
        )
        SELECT
            mc.id,
            mc.display_name,
            mc.author,
            mc.model_id,
            mc.system_prompt,
            m.is_enabled,
            m.is_internal,
            m.supported_attachment_types,
            mc.is_default,
            m.is_deprecated,
            mc.budget_tokens,
            mc.reasoning_effort,
            m.prompt_price_per_token,
            m.completion_price_per_token
        FROM model_configs mc
        JOIN models m ON mc.model_id = m.id
        JOIN instance_order io ON mc.id = io.config_id
        ORDER BY io.position`,
        modelConfigIds,
    );

    // Combine each row with its corresponding instance's instanceId
    return rows.map((row, index) => ({
        ...readModelConfig(row),
        instanceId: instances[index].instanceId,
    }));
}

export async function fetchModelConfigQuickChat() {
    const modelConfigs = await db
        .select<ModelConfigDBRow[]>(
            `WITH selected_config AS (
  SELECT
    value AS model_config_id
  FROM
    app_metadata
  WHERE
    key = 'quick_chat_model_config_id'
)

SELECT
  mc.id,
  mc.display_name,
  mc.author,
  mc.model_id,
  mc.system_prompt,
  m.is_enabled,
  m.is_internal,
  m.supported_attachment_types,
  mc.is_default,
  m.is_deprecated,
  mc.budget_tokens,
  mc.reasoning_effort,
  m.prompt_price_per_token,
  m.completion_price_per_token
FROM
  selected_config sc
JOIN
  model_configs mc ON mc.id = sc.model_config_id
JOIN
  models m ON mc.model_id = m.id;`,
        )
        .then((rows) => rows.map(readModelConfig));
    return modelConfigs.length > 0 ? modelConfigs[0] : null;
}

export async function fetchModelConfigById(
    modelConfigId: string,
): Promise<ModelConfig | null> {
    const rows = await db.select<ModelConfigDBRow[]>(
        `SELECT model_configs.id, model_configs.display_name, model_configs.author,
                    model_configs.model_id, model_configs.system_prompt, models.is_enabled,
                    models.is_internal, models.supported_attachment_types, model_configs.is_default,
                    models.is_deprecated, model_configs.budget_tokens, model_configs.reasoning_effort, model_configs.new_until,
                    models.prompt_price_per_token, models.completion_price_per_token
             FROM model_configs
             JOIN models ON model_configs.model_id = models.id
             WHERE model_configs.id = ?`,
        [modelConfigId],
    );

    if (rows.length === 0) {
        return null;
    }

    return readModelConfig(rows[0]);
}

export function useModelConfigs() {
    return useQuery(modelConfigQueries.listConfigs());
}

export function useModels() {
    return useQuery(modelQueries.list());
}

/**
 * Returns the selected model configs for comparison with their instance IDs.
 * This enables multi-instance selection support.
 */
export function useSelectedModelConfigsCompare() {
    return useQuery(modelConfigQueries.compare());
}

export function useSelectedModelConfigQuickChat() {
    return useQuery(modelConfigQueries.quickChat());
}

export function useRefreshOpenRouterModels() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationKey: ["refreshOpenRouterModels"] as const,
        mutationFn: async () => {
            await Models.downloadOpenRouterModels(db);
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries(
                modelConfigQueries.listConfigs(),
            );
        },
    });
}

export function useRefreshOllamaModels() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationKey: ["refreshOllamaModels"] as const,
        mutationFn: async () => {
            await Models.downloadOllamaModels(db);
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries(
                modelConfigQueries.listConfigs(),
            );
        },
    });
}

export function useRefreshLMStudioModels() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationKey: ["refreshLMStudioModels"] as const,
        mutationFn: async () => {
            await Models.downloadLMStudioModels(db);
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries(
                modelConfigQueries.listConfigs(),
            );
        },
    });
}

export function useRefreshModels() {
    const refreshOpenRouterModels = useRefreshOpenRouterModels();
    const refreshOllamaModels = useRefreshOllamaModels();
    const refreshLMStudioModels = useRefreshLMStudioModels();
    return useMutation({
        mutationKey: ["refreshAllModels"] as const,
        mutationFn: async () => {
            await Promise.all([
                refreshOpenRouterModels.mutateAsync(),
                refreshOllamaModels.mutateAsync(),
                refreshLMStudioModels.mutateAsync(),
            ]);
        },
    });
}

export function useDeleteModelConfig() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationKey: ["deleteModelConfig"] as const,
        mutationFn: async ({ modelConfigId }: { modelConfigId: string }) => {
            await db.execute("DELETE FROM model_configs WHERE id = $1", [
                modelConfigId,
            ]);
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries(
                modelConfigQueries.listConfigs(),
            );
        },
    });
}

export function useUpdateModelConfig() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationKey: ["updateModelConfig"] as const,
        mutationFn: async ({
            modelConfigId,
            displayName,
            systemPrompt,
        }: {
            modelConfigId: string;
            displayName: string;
            systemPrompt: string;
        }) => {
            await db.execute(
                "UPDATE model_configs SET display_name = $1, system_prompt = $2 WHERE id = $3",
                [displayName, systemPrompt, modelConfigId],
            );
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries(
                modelConfigQueries.listConfigs(),
            );
        },
    });
}

export function useCreateModelConfig() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationKey: ["createModelConfig"] as const,
        mutationFn: async ({
            configId,
            baseModel,
            displayName,
            systemPrompt,
        }: {
            configId: string;
            baseModel: string;
            displayName: string;
            systemPrompt: string;
        }) => {
            await db.execute(
                `INSERT INTO model_configs (id, model_id, display_name, author, system_prompt)
                 VALUES (?, ?, ?, ?, ?)`,
                [configId, baseModel, displayName, "user", systemPrompt],
            );
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries(
                modelConfigQueries.listConfigs(),
            );
        },
    });
}

/**
 * Updates the currently-selected model config instances.
 */
export function useUpdateSelectedModelInstances() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationKey: ["updateSelectedModelInstances"] as const,
        mutationFn: async ({ instances }: { instances: ModelInstance[] }) => {
            await db.execute(
                "UPDATE app_metadata SET value = ? WHERE key = 'selected_model_configs_compare'",
                [JSON.stringify(instances)],
            );
        },
        onSettled: async () => {
            await queryClient.invalidateQueries(modelConfigQueries.compare());
        },
    });
}

/**
 * Adds a new instance of a model config to the selection, not enforcing limits.
 */
export function useAddModelInstance() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationKey: ["addModelInstance"] as const,
        mutationFn: async ({ modelConfigId }: { modelConfigId: string }) => {
            // Read fresh data from DB to avoid race conditions
            const currentInstances = await fetchSelectedModelInstances();

            const newInstance: ModelInstance = {
                modelConfigId,
                instanceId: uuidv4(),
            };

            await db.execute(
                "UPDATE app_metadata SET value = ? WHERE key = 'selected_model_configs_compare'",
                [JSON.stringify([...currentInstances, newInstance])],
            );

            return newInstance;
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries(modelConfigQueries.compare());
        },
    });
}

/**
 * Removes a specific instance from the selection by its instance ID.
 */
export function useRemoveModelInstance() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationKey: ["removeModelInstance"] as const,
        mutationFn: async ({ instanceId }: { instanceId: string }) => {
            // Read fresh data from DB to avoid race conditions
            const currentInstances = await fetchSelectedModelInstances();

            const newInstances = currentInstances.filter(
                (i) => i.instanceId !== instanceId,
            );

            await db.execute(
                "UPDATE app_metadata SET value = ? WHERE key = 'selected_model_configs_compare'",
                [JSON.stringify(newInstances)],
            );
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries(modelConfigQueries.compare());
        },
    });
}

/**
 * Removes all instances of a specific model config from the selection.
 */
export function useRemoveAllModelInstances() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationKey: ["removeAllModelInstances"] as const,
        mutationFn: async ({ modelConfigId }: { modelConfigId: string }) => {
            // Read fresh data from DB to avoid race conditions
            const currentInstances = await fetchSelectedModelInstances();

            const newInstances = currentInstances.filter(
                (i) => i.modelConfigId !== modelConfigId,
            );

            await db.execute(
                "UPDATE app_metadata SET value = ? WHERE key = 'selected_model_configs_compare'",
                [JSON.stringify(newInstances)],
            );
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries(modelConfigQueries.compare());
        },
    });
}

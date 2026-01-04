import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "../DB";
import { v4 as uuidv4 } from "uuid";
import { ModelInstance } from "../Models";
import { modelConfigQueries, maybeMigrateModelsToInstances } from "./ModelsAPI";
import { fetchAppMetadata } from "./AppMetadataAPI";

export interface ModelGroup {
    id: string;
    name: string;
    description: string | undefined;
    modelInstances: ModelInstance[];
    createdAt: string;
    updatedAt: string;
}

interface ModelGroupDBRow {
    id: string;
    name: string;
    description: string | null;
    model_config_ids: string; // JSON string, originally a string[] of model config IDs but has since been migrated to ModelInstance[]
    created_at: string;
    updated_at: string;
}

/**
 * Reads a model group from DB row. This read also handles the one-time
 * migration from old string[] format to new ModelInstance[] format.
 */
async function readModelGroup(row: ModelGroupDBRow): Promise<ModelGroup> {
    const parsed: unknown = JSON.parse(row.model_config_ids);
    let modelInstances: ModelInstance[] = [];

    if (Array.isArray(parsed) && parsed.length > 0) {
        const [instances, wasMigrated] = maybeMigrateModelsToInstances(parsed);

        if (wasMigrated) {
            await db.execute(
                "UPDATE model_groups SET model_config_ids = ? WHERE id = ?",
                [JSON.stringify(instances), row.id],
            );
        }
        modelInstances = instances;
    }

    return {
        id: row.id,
        name: row.name,
        description: row.description ?? undefined,
        modelInstances,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

const modelGroupKeys = {
    all: () => ["modelGroups"] as const,
    list: () => [...modelGroupKeys.all(), "list"] as const,
    detail: (id: string) => [...modelGroupKeys.all(), "detail", id] as const,
    activeGroupId: () => ["activeModelGroupId"] as const,
};

export const modelGroupQueries = {
    list: () => ({
        queryKey: modelGroupKeys.list(),
        queryFn: () => fetchModelGroups(),
    }),
    detail: (id: string) => ({
        queryKey: modelGroupKeys.detail(id),
        queryFn: () => fetchModelGroup(id),
    }),
    activeGroupId: () => ({
        queryKey: modelGroupKeys.activeGroupId(),
        queryFn: () => fetchActiveModelGroupId(),
    }),
};

export async function fetchModelGroups(): Promise<ModelGroup[]> {
    const rows = await db.select<ModelGroupDBRow[]>(
        `SELECT * FROM model_groups ORDER BY created_at DESC`,
    );
    return Promise.all(rows.map(readModelGroup));
}

export async function fetchModelGroup(
    id: string,
): Promise<ModelGroup | undefined> {
    const rows = await db.select<ModelGroupDBRow[]>(
        `SELECT * FROM model_groups WHERE id = ?`,
        [id],
    );
    return rows.length > 0 ? readModelGroup(rows[0]) : undefined;
}

export async function fetchActiveModelGroupId(): Promise<string> {
    const appMetadata = await fetchAppMetadata();
    return appMetadata.active_model_group_id || ("" as const);
}

export function useModelGroups() {
    return useQuery(modelGroupQueries.list());
}

export function useModelGroup(id: string) {
    return useQuery(modelGroupQueries.detail(id));
}

export function useActiveModelGroupId() {
    return useQuery(modelGroupQueries.activeGroupId());
}

/**
 * Gets the full active model group object (combines activeGroupId + group data)
 */
export function useActiveModelGroup() {
    const { data: activeGroupId } = useActiveModelGroupId();
    const { data: groups } = useModelGroups();

    if (!activeGroupId || !groups) {
        return { data: undefined };
    }

    const activeGroup = groups.find((g) => g.id === activeGroupId);
    return { data: activeGroup };
}

/**
 * Create a new model group and set it as active
 */
export function useCreateModelGroup() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationKey: ["createModelGroup"] as const,
        mutationFn: async ({
            id,
            name,
            description,
            modelInstances,
        }: {
            id: string;
            name: string;
            description: string | undefined;
            modelInstances: ModelInstance[];
        }) => {
            await db.execute(
                `INSERT INTO model_groups (id, name, description, model_config_ids)
                 VALUES (?, ?, ?, ?)`,
                [id, name, description ?? null, JSON.stringify(modelInstances)],
            );

            // Set as active group
            await db.execute(
                `UPDATE app_metadata SET value = ? WHERE key = 'active_model_group_id'`,
                [id],
            );
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: modelGroupKeys.all(),
            });
            await queryClient.invalidateQueries({
                queryKey: modelGroupKeys.activeGroupId(),
            });
        },
    });
}

/**
 * Update a model group's name, description, and/or instances
 */
export function useUpdateModelGroup() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationKey: ["updateModelGroup"] as const,
        mutationFn: async ({
            id,
            name,
            description,
            modelInstances,
        }: {
            id: string;
            name?: string;
            description?: string;
            modelInstances?: ModelInstance[];
        }) => {
            const updates: string[] = [];
            const params: (string | null)[] = [];

            if (name !== undefined) {
                updates.push("name = ?");
                params.push(name);
            }
            if (description !== undefined) {
                updates.push("description = ?");
                params.push(description ?? null);
            }
            if (modelInstances !== undefined) {
                updates.push("model_config_ids = ?");
                params.push(JSON.stringify(modelInstances));
            }

            if (updates.length > 0) {
                updates.push("updated_at = CURRENT_TIMESTAMP");
                params.push(id);

                await db.execute(
                    `UPDATE model_groups SET ${updates.join(", ")} WHERE id = ?`,
                    params,
                );
            }
        },
        onSuccess: async (_data, variables) => {
            await queryClient.invalidateQueries({
                queryKey: modelGroupKeys.list(),
            });
            await queryClient.invalidateQueries({
                queryKey: modelGroupKeys.detail(variables.id),
            });
        },
    });
}

/**
 * Delete a model group
 */
export function useDeleteModelGroup() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationKey: ["deleteModelGroup"] as const,
        mutationFn: async ({ id }: { id: string }) => {
            // Check if this is the active group
            const activeGroupId = await fetchActiveModelGroupId();

            // Delete the group
            await db.execute(`DELETE FROM model_groups WHERE id = ?`, [id]);

            // If it was the active group, clear the active group ID
            if (activeGroupId === id) {
                await db.execute(
                    `UPDATE app_metadata SET value = '' WHERE key = 'active_model_group_id'`,
                );
            }
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: modelGroupKeys.all(),
            });
            await queryClient.invalidateQueries({
                queryKey: modelGroupKeys.activeGroupId(),
            });
        },
    });
}

/**
 * Set a group as active and restore its instances to the selection
 */
export function useSetActiveModelGroup() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationKey: ["setActiveModelGroup"] as const,
        mutationFn: async ({ groupId }: { groupId: string }) => {
            const group = await fetchModelGroup(groupId);
            if (!group) return;

            // Set the active group ID
            await db.execute(
                `UPDATE app_metadata SET value = ? WHERE key = 'active_model_group_id'`,
                [groupId],
            );

            // Update selected_model_configs_compare with the group's model instances
            await db.execute(
                `UPDATE app_metadata SET value = ? WHERE key = 'selected_model_configs_compare'`,
                [JSON.stringify(group.modelInstances)],
            );
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: modelGroupKeys.activeGroupId(),
            });
            await queryClient.invalidateQueries(modelConfigQueries.compare());
        },
    });
}

/**
 * Clear the active group (detach)
 */
export function useClearActiveModelGroup() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationKey: ["clearActiveModelGroup"] as const,
        mutationFn: async () => {
            await db.execute(
                `UPDATE app_metadata SET value = '' WHERE key = 'active_model_group_id'`,
            );
        },
        onSuccess: async () => {
            // Refetch the active group ID immediately
            await queryClient.refetchQueries({
                queryKey: modelGroupKeys.activeGroupId(),
            });
        },
    });
}

/**
 * Add an instance of a model to the active group
 */
export function useAddInstanceToActiveGroup() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationKey: ["addInstanceToActiveGroup"] as const,
        mutationFn: async ({
            groupId,
            modelConfigId,
        }: {
            groupId: string;
            modelConfigId: string;
        }) => {
            const group = await fetchModelGroup(groupId);
            if (!group) return;

            // Add a new instance (supports multiple instances of the same model)
            const newInstance: ModelInstance = {
                modelConfigId,
                instanceId: uuidv4(),
            };
            const updatedInstances = [...group.modelInstances, newInstance];

            await db.execute(
                `UPDATE model_groups SET model_config_ids = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                [JSON.stringify(updatedInstances), groupId],
            );
        },
        onSuccess: async (_data, variables) => {
            await queryClient.invalidateQueries({
                queryKey: modelGroupKeys.list(),
            });
            await queryClient.invalidateQueries({
                queryKey: modelGroupKeys.detail(variables.groupId),
            });
        },
    });
}

/**
 * Remove last instance of a model config from the provided group
 */
export function useRemoveInstanceFromActiveGroup() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationKey: ["removeInstanceFromActiveGroup"] as const,
        mutationFn: async ({
            groupId,
            instanceId,
        }: {
            groupId: string;
            instanceId: string;
        }) => {
            const group = await fetchModelGroup(groupId);
            if (!group) return;

            const updatedInstances = group.modelInstances.filter(
                (i) => i.instanceId !== instanceId,
            );

            await db.execute(
                `UPDATE model_groups SET model_config_ids = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                [JSON.stringify(updatedInstances), groupId],
            );
        },
        onSuccess: async (_data, variables) => {
            await queryClient.invalidateQueries({
                queryKey: modelGroupKeys.list(),
            });
            await queryClient.invalidateQueries({
                queryKey: modelGroupKeys.detail(variables.groupId),
            });
        },
    });
}

/**
 * Remove all instances of a model config from the provided group
 */
export function useRemoveAllInstancesFromActiveGroup() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationKey: ["removeAllInstancesFromActiveGroup"] as const,
        mutationFn: async ({
            groupId,
            modelConfigId,
        }: {
            groupId: string;
            modelConfigId: string;
        }) => {
            const group = await fetchModelGroup(groupId);
            if (!group) return;

            // Remove all instances of this model
            const updatedInstances = group.modelInstances.filter(
                (i) => i.modelConfigId !== modelConfigId,
            );

            await db.execute(
                `UPDATE model_groups SET model_config_ids = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                [JSON.stringify(updatedInstances), groupId],
            );
        },
        onSuccess: async (_data, variables) => {
            await queryClient.invalidateQueries({
                queryKey: modelGroupKeys.list(),
            });
            await queryClient.invalidateQueries({
                queryKey: modelGroupKeys.detail(variables.groupId),
            });
        },
    });
}

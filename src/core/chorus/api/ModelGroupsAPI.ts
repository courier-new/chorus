import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "../DB";
import { ModelConfig } from "../Models";
import { modelConfigQueries } from "./ModelsAPI";
import { fetchAppMetadata } from "./AppMetadataAPI";

export interface ModelGroup {
    id: string;
    name: string;
    description: string | undefined;
    modelConfigIds: string[];
    createdAt: string;
    updatedAt: string;
}

interface ModelGroupDBRow {
    id: string;
    name: string;
    description: string | null;
    model_config_ids: string;
    created_at: string;
    updated_at: string;
}

function readModelGroup(row: ModelGroupDBRow): ModelGroup {
    return {
        id: row.id,
        name: row.name,
        description: row.description ?? undefined,
        modelConfigIds: JSON.parse(row.model_config_ids) as string[],
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
    return rows.map(readModelGroup);
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
    return appMetadata.active_model_group_id || ("NONE" as const);
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
            modelConfigIds,
        }: {
            id: string;
            name: string;
            description: string | undefined;
            modelConfigIds: string[];
        }) => {
            await db.execute(
                `INSERT INTO model_groups (id, name, description, model_config_ids)
                 VALUES (?, ?, ?, ?)`,
                [id, name, description ?? null, JSON.stringify(modelConfigIds)],
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
 * Update a model group's name, description, and/or model_config_ids
 */
export function useUpdateModelGroup() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationKey: ["updateModelGroup"] as const,
        mutationFn: async ({
            id,
            name,
            description,
            modelConfigIds,
        }: {
            id: string;
            name?: string;
            description?: string;
            modelConfigIds?: string[];
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
            if (modelConfigIds !== undefined) {
                updates.push("model_config_ids = ?");
                params.push(JSON.stringify(modelConfigIds));
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
 * Set a group as active and update selected models to match the group
 */
export function useSetActiveModelGroup() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationKey: ["setActiveModelGroup"] as const,
        mutationFn: async ({
            groupId,
            modelConfigs,
        }: {
            groupId: string;
            modelConfigs: ModelConfig[];
        }) => {
            // Set the active group ID
            await db.execute(
                `UPDATE app_metadata SET value = ? WHERE key = 'active_model_group_id'`,
                [groupId],
            );

            // Update selected_model_configs_compare with the group's models
            await db.execute(
                `UPDATE app_metadata SET value = ? WHERE key = 'selected_model_configs_compare'`,
                [JSON.stringify(modelConfigs.map((m) => m.id))],
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
 * Add a model to the active group's model_config_ids
 */
export function useAddModelToActiveGroup() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationKey: ["addModelToActiveGroup"] as const,
        mutationFn: async ({
            groupId,
            modelConfigId,
        }: {
            groupId: string;
            modelConfigId: string;
        }) => {
            const group = await fetchModelGroup(groupId);
            if (!group) return;

            // Add model if not already in the group
            if (!group.modelConfigIds.includes(modelConfigId)) {
                const updatedIds = [...group.modelConfigIds, modelConfigId];
                await db.execute(
                    `UPDATE model_groups SET model_config_ids = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                    [JSON.stringify(updatedIds), groupId],
                );
            }
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
 * Remove a model from the active group's model_config_ids
 */
export function useRemoveModelFromActiveGroup() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationKey: ["removeModelFromActiveGroup"] as const,
        mutationFn: async ({
            groupId,
            modelConfigId,
        }: {
            groupId: string;
            modelConfigId: string;
        }) => {
            const group = await fetchModelGroup(groupId);
            if (!group) return;

            // Remove model from group
            const updatedIds = group.modelConfigIds.filter(
                (id) => id !== modelConfigId,
            );
            await db.execute(
                `UPDATE model_groups SET model_config_ids = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                [JSON.stringify(updatedIds), groupId],
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
 * Update the active group's model order after drag-and-drop
 */
export function useUpdateActiveGroupOrder() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationKey: ["updateActiveGroupOrder"] as const,
        mutationFn: async ({
            groupId,
            modelConfigIds,
        }: {
            groupId: string;
            modelConfigIds: string[];
        }) => {
            await db.execute(
                `UPDATE model_groups SET model_config_ids = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                [JSON.stringify(modelConfigIds), groupId],
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

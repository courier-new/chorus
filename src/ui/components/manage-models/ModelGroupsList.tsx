import { v4 as uuidv4 } from "uuid";
import { Button } from "../ui/button";
import { PencilIcon, PlusIcon, TrashIcon } from "lucide-react";
import * as ModelGroupsAPI from "@core/chorus/api/ModelGroupsAPI";
import * as ModelsAPI from "@core/chorus/api/ModelsAPI";
import { ModelGroupForm } from "./ModelGroupForm";
import { CommandGroup, CommandItem } from "../ui/command";
import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@ui/lib/utils";
import { SectionHeading } from "./SectionHeading";

/**
 * Button to delete a model group. Requires two clicks to confirm the action.
 * First click changes to confirmation state, second click executes the action.
 * Reverts to initial state after 5 seconds of inactivity or when clicking
 * elsewhere in the document.
 */
function DeleteConfirmButton({
    onConfirm,
    disabled = false,
}: {
    onConfirm: () => void;
    disabled?: boolean;
}) {
    const [isConfirming, setIsConfirming] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const handleClick = useCallback(
        (e: React.MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation();

            if (isConfirming) {
                onConfirm();
                setIsConfirming(false);
            } else {
                setIsConfirming(true);
            }
        },
        [isConfirming, onConfirm],
    );

    // Reset after 5 seconds
    useEffect(() => {
        if (!isConfirming) return;

        const timer = setTimeout(() => {
            setIsConfirming(false);
        }, 5000);

        return () => clearTimeout(timer);
    }, [isConfirming]);

    // Reset when clicking outside (but not on the button itself)
    useEffect(() => {
        if (!isConfirming) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (buttonRef.current?.contains(event.target as Node)) {
                return;
            }
            setIsConfirming(false);
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isConfirming]);

    return (
        <Button
            ref={buttonRef}
            className={cn(
                "p-1.5 w-6 h-7 hover:bg-accent",
                isConfirming && "w-auto",
            )}
            variant={isConfirming ? "destructive" : "ghost"}
            size="xs"
            onClick={handleClick}
            disabled={disabled}
            title={
                isConfirming
                    ? "Are you sure you want to delete this model group?"
                    : "Delete model group"
            }
        >
            {isConfirming ? "Confirm?" : <TrashIcon />}
        </Button>
    );
}

interface ModelGroupsListProps {
    isVisible?: boolean;
    onToggleVisibility: () => void;
}

type FormMode = "hidden" | "create" | "edit";

export function ModelGroupsList({
    isVisible = true,
    onToggleVisibility,
}: ModelGroupsListProps) {
    const { data: selectedModelConfigs = [] } =
        ModelsAPI.useSelectedModelConfigsCompare();
    const { data: allModelConfigs = [] } = ModelsAPI.useModelConfigs();

    const { data: activeGroupId } = ModelGroupsAPI.useActiveModelGroupId();
    const { data: groups = [] } = ModelGroupsAPI.useModelGroups();
    const createGroup = ModelGroupsAPI.useCreateModelGroup();
    const updateGroup = ModelGroupsAPI.useUpdateModelGroup();
    const deleteGroup = ModelGroupsAPI.useDeleteModelGroup();
    const setActiveGroup = ModelGroupsAPI.useSetActiveModelGroup();

    const [formMode, setFormMode] = useState<FormMode>("hidden");
    const [editingGroupId, setEditingGroupId] = useState<string | undefined>();
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");

    // Disable "Add" button is <2 models selected.
    const isAddDisabled = selectedModelConfigs.length < 2;

    const handleShowCreateForm = useCallback(() => {
        setFormMode("create");
        setEditingGroupId(undefined);
        setName("");
        setDescription("");
    }, []);

    const handleShowEditForm = useCallback(
        (group: ModelGroupsAPI.ModelGroup) => {
            setFormMode("edit");
            setEditingGroupId(group.id);
            setName(group.name);
            setDescription(group.description ?? "");
        },
        [],
    );

    const handleCancel = useCallback(() => {
        setFormMode("hidden");
        setName("");
        setDescription("");
        setEditingGroupId(undefined);
    }, []);

    const handleSave = useCallback(
        async (name: string, description: string) => {
            if (name.trim() === "") return;

            if (formMode === "create") {
                const groupId = uuidv4();
                await createGroup.mutateAsync({
                    id: groupId,
                    name: name.trim(),
                    description: description.trim(),
                    modelInstances: selectedModelConfigs.map((m) => ({
                        modelConfigId: m.id,
                        instanceId: m.instanceId,
                    })),
                });
            } else if (formMode === "edit" && editingGroupId) {
                await updateGroup.mutateAsync({
                    id: editingGroupId,
                    name: name.trim(),
                    description: description.trim(),
                });
            }

            handleCancel();
        },
        [
            formMode,
            editingGroupId,
            selectedModelConfigs,
            createGroup,
            updateGroup,
            handleCancel,
        ],
    );

    const handleDeleteGroup = useCallback(
        async (groupId: string) => {
            await deleteGroup.mutateAsync({ id: groupId });
        },
        [deleteGroup],
    );

    const handleActivateGroup = useCallback(
        async (group: ModelGroupsAPI.ModelGroup) => {
            // If already active, do nothing
            if (activeGroupId === group.id) {
                return;
            }

            await setActiveGroup.mutateAsync({
                groupId: group.id,
            });
        },
        [activeGroupId, setActiveGroup],
    );

    return (
        <CommandGroup
            heading={
                <SectionHeading
                    title="Saved groups"
                    isVisible={isVisible}
                    onToggleVisibility={onToggleVisibility}
                    rightButton={
                        formMode === "hidden" && (
                            // Since disabled form elements are treated as inert
                            // and don't receive mouse events, we need to wrap
                            // the button in a span to ensure the title can be
                            // shown even when the button is disabled.
                            <span
                                title={
                                    isAddDisabled
                                        ? "Select at least 2 models to create a group"
                                        : "Save current selection of models as a new group"
                                }
                                className="inline-block"
                            >
                                <Button
                                    variant="outline"
                                    size="xs"
                                    onClick={handleShowCreateForm}
                                    className="gap-1 px-1.5"
                                    disabled={isAddDisabled}
                                >
                                    <PlusIcon className="w-3.5 h-3.5" />
                                    <span className="text-sm font-sans normal-case">
                                        New
                                    </span>
                                </Button>
                            </span>
                        )
                    }
                />
            }
        >
            {isVisible && (
                <>
                    {/* Show button or form for creating new group */}
                    {formMode === "create" && (
                        <ModelGroupForm
                            instructions="Save your current selection of models as a new group."
                            name={name}
                            description={description}
                            onNameChange={setName}
                            onDescriptionChange={setDescription}
                            onSave={handleSave}
                            onCancel={handleCancel}
                            idPrefix="group"
                        />
                    )}

                    {/* List of Groups */}
                    {groups.length === 0 && formMode === "hidden" && (
                        <p className="pb-2 text-center text-sm tracking-wider uppercase font-[350] text-gray-500 font-geist-mono">
                            No model groups created.
                        </p>
                    )}
                    {groups.map((group) => {
                        const isActive = activeGroupId === group.id;
                        const isEditing =
                            formMode === "edit" && editingGroupId === group.id;
                        const modelNames = group.modelInstances
                            .map(
                                (instance) =>
                                    allModelConfigs.find(
                                        (mc) =>
                                            mc.id === instance.modelConfigId,
                                    )?.displayName,
                            )
                            .filter(
                                (name): name is string => name !== undefined,
                            );

                        return (
                            <CommandItem
                                key={group.id}
                                value={group.id}
                                onSelect={() => void handleActivateGroup(group)}
                                className={cn(
                                    "group",
                                    isEditing && "flex-wrap",
                                )}
                            >
                                <div className="flex items-center justify-between w-full gap-1.5">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex min-w-0 gap-1">
                                            <p className="min-w-fit">
                                                {group.name}
                                                {group.description && ":"}
                                            </p>
                                            <span
                                                className="text-muted-foreground truncate"
                                                title={group.description}
                                            >
                                                {group.description}
                                            </span>
                                        </div>
                                        <p
                                            className="text-xs text-muted-foreground mt-1.5"
                                            title={modelNames.join(", ")}
                                        >
                                            {modelNames.slice(0, 4).join(", ")}
                                            {modelNames.length > 4 &&
                                                " and " +
                                                    modelNames.slice(4).length +
                                                    " more"}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1 group-data-[selected=false]:hidden">
                                        <Button
                                            variant="ghost"
                                            size="xs"
                                            className="p-1.5 w-6 h-7 hover:bg-accent"
                                            title="Edit group name and description"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleShowEditForm(group);
                                            }}
                                        >
                                            <PencilIcon className="w-3.5 h-3.5" />
                                        </Button>
                                        <DeleteConfirmButton
                                            onConfirm={() =>
                                                void handleDeleteGroup(group.id)
                                            }
                                        />
                                    </div>
                                    {isActive && (
                                        <span className="bg-accent-500 rounded-full px-1.5 py-1 text-primary-foreground text-xs font-medium">
                                            Active
                                        </span>
                                    )}
                                </div>
                                {isEditing && (
                                    <div className="w-full">
                                        <ModelGroupForm
                                            name={name}
                                            description={description}
                                            onNameChange={setName}
                                            onDescriptionChange={setDescription}
                                            onSave={handleSave}
                                            onCancel={handleCancel}
                                            idPrefix="edit-group"
                                        />
                                    </div>
                                )}
                            </CommandItem>
                        );
                    })}
                </>
            )}
        </CommandGroup>
    );
}

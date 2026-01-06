import { v4 as uuidv4 } from "uuid";
import { Button } from "../ui/button";
import { PlusIcon } from "lucide-react";
import * as ModelGroupsAPI from "@core/chorus/api/ModelGroupsAPI";
import * as ModelsAPI from "@core/chorus/api/ModelsAPI";
import { ModelGroupForm } from "./ModelGroupForm";
import { CommandGroup } from "../ui/command";
import { useState, useCallback } from "react";
import { SectionHeading } from "./SectionHeading";
import { ModelGroupCommandItem } from "./ModelGroupCommandItem";

interface ModelGroupsListProps {
    isVisible?: boolean;
    onToggleVisibility: () => void;
}

export function ModelGroupsList({
    isVisible = true,
    onToggleVisibility,
}: ModelGroupsListProps) {
    const { data: selectedModelConfigs = [] } =
        ModelsAPI.useSelectedModelConfigsCompare();

    const { data: activeGroupId } = ModelGroupsAPI.useActiveModelGroupId();
    const { data: groups = [] } = ModelGroupsAPI.useModelGroups();
    const createGroup = ModelGroupsAPI.useCreateModelGroup();
    const { mutate: deleteGroup } = ModelGroupsAPI.useDeleteModelGroup();
    const { mutate: setActiveGroup } = ModelGroupsAPI.useSetActiveModelGroup();

    const [isCreating, setIsCreating] = useState(false);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");

    // Disable "Add" button if fewer than 2 models selected
    const isAddDisabled = selectedModelConfigs.length < 2;

    const closeForm = useCallback(() => {
        setIsCreating(false);
        setName("");
        setDescription("");
    }, []);

    const handleSave = useCallback(
        async (name: string, description: string) => {
            if (name.trim() === "") return;

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
            closeForm();
        },
        [selectedModelConfigs, createGroup, closeForm],
    );

    const handleDeleteGroup = useCallback(
        (groupId: string) => {
            deleteGroup({ id: groupId });
        },
        [deleteGroup],
    );

    const handleActivateGroup = useCallback(
        (groupId: string) => {
            // If already active, do nothing
            if (activeGroupId === groupId) {
                return;
            }

            setActiveGroup({ groupId });
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
                        !isCreating && (
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
                                    onClick={() => setIsCreating(true)}
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
                    {/* Show form for creating new group */}
                    {isCreating && (
                        <ModelGroupForm
                            instructions="Save your current selection of models as a new group."
                            name={name}
                            description={description}
                            onNameChange={setName}
                            onDescriptionChange={setDescription}
                            onSave={handleSave}
                            onCancel={closeForm}
                            idPrefix="group"
                        />
                    )}

                    {/* List of Groups */}
                    {groups.length === 0 && !isCreating && (
                        <p className="pb-2 text-center text-sm tracking-wider uppercase font-[350] text-gray-500 font-geist-mono">
                            No model groups created.
                        </p>
                    )}
                    {groups.map((group) => (
                        <ModelGroupCommandItem
                            key={group.id}
                            group={group}
                            onActivate={handleActivateGroup}
                            onDelete={handleDeleteGroup}
                        />
                    ))}
                </>
            )}
        </CommandGroup>
    );
}

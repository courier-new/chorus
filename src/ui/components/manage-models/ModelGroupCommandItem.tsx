import type { ModelGroup } from "@core/chorus/api/ModelGroupsAPI";
import * as ModelGroupsAPI from "@core/chorus/api/ModelGroupsAPI";
import * as ModelsAPI from "@core/chorus/api/ModelsAPI";
import { CommandItem } from "../ui/command";
import { cn } from "@ui/lib/utils";
import { DotIcon, PencilIcon, TrashIcon } from "lucide-react";
import { Button } from "../ui/button";
import { useState, useRef, useEffect, useCallback } from "react";
import { ModelGroupForm } from "./ModelGroupForm";

/**
 * Helper function to truncate a list of model names to a maximum length, taking
 * full model names up to that length and then adding a count of remaining
 * models if there are any left.
 *
 * @param modelNames - The list of model names to truncate.
 * @param maxLength - The maximum length of the truncated string.
 * @returns The truncated string.
 */
function truncateModelNames(modelNames: string[], maxLength: number): string {
    let lengthRemaining = maxLength;
    let numRemaining = modelNames.length;
    const namesToInclude: string[] = [];

    for (const name of modelNames) {
        if (lengthRemaining - name.length < 0) {
            break;
        }
        namesToInclude.push(name);
        lengthRemaining -= name.length;
        numRemaining--;
    }

    return (
        namesToInclude.join(", ") +
        (numRemaining > 0 ? " and " + numRemaining + " more" : "")
    );
}

/**
 * Hook to format the model display names for a model group.
 *
 * @param group - The model group to get the model names for.
 * @param isActive - Whether the model group is active.
 * @returns A tuple containing the full model names string and the truncated
 * model names string.
 */
function useModelNames(
    group: ModelGroup,
    isActive: boolean,
): [fullString: string, truncatedString: string] {
    const { data: allModelConfigs = [] } = ModelsAPI.useModelConfigs();
    const modelNames = group.modelInstances
        .map(
            (instance) =>
                allModelConfigs.find((mc) => mc.id === instance.modelConfigId)
                    ?.displayName,
        )
        .filter((name): name is string => name !== undefined);

    const fullString = modelNames.join(", ");
    const truncatedString = truncateModelNames(modelNames, isActive ? 75 : 95);
    return [fullString, truncatedString];
}

type ModelGroupCommandItemProps = {
    group: ModelGroup;
    readonly?: boolean;
    onActivate: (groupId: string) => void;
    onDelete?: (groupId: string) => void;
};

export function ModelGroupCommandItem({
    group,
    onActivate,
    onDelete,
}: ModelGroupCommandItemProps) {
    const { mutateAsync: updateGroup } = ModelGroupsAPI.useUpdateModelGroup();
    const { data: activeGroupId } = ModelGroupsAPI.useActiveModelGroupId();
    const isActive = activeGroupId === group.id;

    const [fullModelNames, truncatedModelNames] = useModelNames(
        group,
        isActive,
    );

    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(group.name);
    const [description, setDescription] = useState(group.description ?? "");

    const handleSave = useCallback(
        async (name: string, description: string) => {
            if (name.trim() === "") return;

            await updateGroup({
                id: group.id,
                name: name.trim(),
                description: description.trim(),
            });

            setIsEditing(false);
        },
        [group.id, updateGroup],
    );

    return (
        <CommandItem
            value={group.id}
            onSelect={() => onActivate(group.id)}
            className={cn("group", isEditing && "flex-wrap")}
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
                        title={fullModelNames}
                    >
                        {truncatedModelNames}
                        {isActive && (
                            <>
                                <DotIcon className="inline-block !w-2.5 !h-2.5 mx-1" />
                                <span className="text-helper">
                                    (add/remove with ⇧)
                                </span>
                            </>
                        )}
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
                            if (isEditing) {
                                setIsEditing(false);
                            } else {
                                setIsEditing(true);
                            }
                        }}
                    >
                        <PencilIcon className="w-3.5 h-3.5" />
                    </Button>
                    {onDelete && (
                        <DeleteConfirmButton
                            onConfirm={() => onDelete(group.id)}
                        />
                    )}
                </div>
                {isActive && <ActivePill />}
            </div>
            {isEditing && (
                // Set background color to primary[0.5] to match the active state
                <div className="w-full">
                    <ModelGroupForm
                        name={name}
                        description={description}
                        onNameChange={setName}
                        onDescriptionChange={setDescription}
                        onSave={handleSave}
                        onCancel={() => setIsEditing(false)}
                        idPrefix="edit-group"
                        showModelSelectionHelpText={true}
                    />
                </div>
            )}
        </CommandItem>
    );
}

// Read-only variant of the model group item that is not a command item
export function ReadonlyModelGroupItem({ group }: { group: ModelGroup }) {
    const { data: activeGroupId } = ModelGroupsAPI.useActiveModelGroupId();
    const isActive = activeGroupId === group.id;

    const [fullModelNames, truncatedModelNames] = useModelNames(
        group,
        isActive,
    );
    return (
        <div className="relative flex cursor-default gap-2 select-none items-center rounded-sm px-2 py-3 border border-transparent">
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
                        title={fullModelNames}
                    >
                        {truncatedModelNames}
                        {isActive && (
                            <>
                                <DotIcon className="inline-block !w-2.5 !h-2.5 mx-1" />
                                <span className="text-helper">
                                    (add/remove with ⇧)
                                </span>
                            </>
                        )}
                    </p>
                </div>

                {isActive && <ActivePill />}
            </div>
        </div>
    );
}

// Pill to indicate that a model group is active
function ActivePill() {
    return (
        <span className="bg-accent-500 rounded-full px-1.5 py-1 text-primary-foreground text-xs font-medium">
            Active
        </span>
    );
}

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

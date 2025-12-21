import { useCallback, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";

interface ModelGroupFormProps {
    instructions?: string;
    name: string;
    description: string;
    onNameChange: (value: string) => void;
    onDescriptionChange: (value: string) => void;
    onSave: (name: string, description: string) => void;
    onCancel: () => void;
    idPrefix?: string;
}

const DESCRIPTION_MAX_LENGTH = 200;
const NAME_MAX_LENGTH = 50;

export function ModelGroupForm({
    instructions,
    name,
    description,
    onNameChange,
    onDescriptionChange,
    onSave,
    onCancel,
    idPrefix = "group",
}: ModelGroupFormProps) {
    const [nameHasError, setNameHasError] = useState(false);
    const [descriptionHasError, setDescriptionHasError] = useState(false);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (
                e.key === "Enter" &&
                (e.target instanceof HTMLInputElement ||
                    e.target instanceof HTMLTextAreaElement)
            ) {
                e.preventDefault();
                if (
                    name.trim() !== "" &&
                    !nameHasError &&
                    !descriptionHasError
                ) {
                    onSave(name, description);
                }
            } else if (e.key === "Escape") {
                onCancel();
            }
        },
        [
            name,
            description,
            onSave,
            onCancel,
            nameHasError,
            descriptionHasError,
        ],
    );

    const handleNameChange = useCallback(
        (value: string) => {
            onNameChange(value);
            if (value.length > NAME_MAX_LENGTH) {
                setNameHasError(true);
            } else {
                setNameHasError(false);
            }
        },
        [onNameChange],
    );

    const handleDescriptionChange = useCallback(
        (value: string) => {
            onDescriptionChange(value);
            if (value.length > DESCRIPTION_MAX_LENGTH) {
                setDescriptionHasError(true);
            } else {
                setDescriptionHasError(false);
            }
        },
        [onDescriptionChange],
    );

    return (
        <div className="grid grid-cols-2 gap-2 px-2 py-2.5 border-dashed !border-helper border rounded-md">
            {instructions && (
                <p className="text-sm text-helper col-span-2 mb-1">
                    {instructions}
                </p>
            )}
            <label htmlFor={`${idPrefix}-name`} className="text-sm">
                Name <span className="text-destructive">*</span>
            </label>
            {nameHasError && (
                <p className="text-destructive text-sm text-right">
                    Must be less than {NAME_MAX_LENGTH} characters
                </p>
            )}
            <Input
                id={`${idPrefix}-name`}
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g., My Favorite Models"
                autoFocus
                className="h-7 text-sm col-span-2 mb-2"
                isError={nameHasError}
            />
            <label htmlFor={`${idPrefix}-description`} className="text-sm">
                Description (optional)
            </label>
            {descriptionHasError && (
                <p className="text-destructive text-sm text-right">
                    Must be less than {DESCRIPTION_MAX_LENGTH} characters
                </p>
            )}
            <Textarea
                id={`${idPrefix}-description`}
                value={description}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g., Best models for coding"
                className="text-sm resize-none col-span-2 min-h-[initial]"
                isError={descriptionHasError}
                rows={2}
            />
            <div />
            <div className="flex gap-2 mt-1">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onCancel}
                    className="flex-1"
                >
                    Cancel
                </Button>
                <Button
                    size="sm"
                    onClick={() => void onSave(name, description)}
                    disabled={
                        name.trim() === "" ||
                        nameHasError ||
                        descriptionHasError
                    }
                    className="flex-1"
                >
                    Save
                </Button>
            </div>
        </div>
    );
}

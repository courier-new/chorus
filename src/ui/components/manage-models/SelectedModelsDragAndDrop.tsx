import {
    DragDropContext,
    Droppable,
    Draggable,
    DropResult,
    DraggableProvided,
    DraggableStateSnapshot,
    DraggableRubric,
} from "@hello-pangea/dnd";
import { ModelPill } from "./ModelPill";
import * as ModelsAPI from "@core/chorus/api/ModelsAPI";
import { useState, useEffect, useCallback } from "react";
import type { SelectedModelConfig } from "@core/chorus/Models";
import { useShortcutDisplay } from "@core/utilities/ShortcutsAPI";

type SelectedModelsDragAndDropProps = {
    onReorder: (items: SelectedModelConfig[]) => void;
    onClearAll: () => void;
    onRemoveInstance: (index: number, shiftKey: boolean) => void;
};

export function SelectedModelsDragAndDrop({
    onReorder,
    onClearAll,
    onRemoveInstance,
}: SelectedModelsDragAndDropProps) {
    const clearModelsShortcut = useShortcutDisplay("clear-models");
    const { data: selectedModelConfigsData = [] } =
        ModelsAPI.useSelectedModelConfigsCompare();

    // Local state for immediate drag-and-drop updates (prevents visual flash)
    const [localOrder, setLocalOrder] = useState(selectedModelConfigsData);

    // Sync local state when query data changes (from server or other sources)
    useEffect(() => {
        setLocalOrder(selectedModelConfigsData);
    }, [selectedModelConfigsData]);

    // Use local state for rendering to prevent flash during drag operations
    const selectedModelConfigs = localOrder;

    // Helper function to render model pills for dragging
    const renderModelPill = useCallback(
        (
            provided: DraggableProvided,
            snapshot: DraggableStateSnapshot,
            rubric: DraggableRubric,
        ) => {
            const index = rubric.source.index;
            const modelConfig = selectedModelConfigs[index];
            return (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                >
                    <ModelPill
                        modelConfig={modelConfig}
                        index={index}
                        onRemove={onRemoveInstance}
                        isDragging={snapshot.isDragging}
                    />
                </div>
            );
        },
        [selectedModelConfigs, onRemoveInstance],
    );

    const onDragEnd = useCallback(
        (result: DropResult) => {
            if (!result.destination) return;

            const items = [...selectedModelConfigs];
            const [moved] = items.splice(result.source.index, 1);
            items.splice(result.destination.index, 0, moved);

            setLocalOrder(items);
            onReorder(items);
        },
        [selectedModelConfigs, onReorder],
    );

    return (
        <div className="px-3 py-2 relative border-b border-border">
            <div className="overflow-x-auto no-scrollbar flex-grow">
                <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable
                        droppableId="model-pills"
                        direction="horizontal"
                        getContainerForClone={() => document.body}
                        renderClone={renderModelPill}
                    >
                        {(provided) => (
                            <div
                                className="flex items-center gap-2 whitespace-nowrap pr-8"
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                            >
                                {selectedModelConfigs.map(
                                    (modelConfig, index) => (
                                        <Draggable
                                            key={`${modelConfig.id}-${index}`}
                                            draggableId={`${modelConfig.id}-${index}`}
                                            index={index}
                                        >
                                            {renderModelPill}
                                        </Draggable>
                                    ),
                                )}
                                {provided.placeholder}
                                <button
                                    onClick={onClearAll}
                                    className="text-sm text-muted-foreground hover:text-foreground flex-shrink-0"
                                    title="Clear all models"
                                >
                                    Clear{" "}
                                    {clearModelsShortcut && (
                                        <span className="text-[10px] inline-flex items-center gap-0.5 bg-muted-foreground/10 rounded px-1 py-0.5">
                                            {clearModelsShortcut}
                                        </span>
                                    )}
                                </button>
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>
            </div>
        </div>
    );
}

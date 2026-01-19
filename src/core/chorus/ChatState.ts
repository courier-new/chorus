import type { LLMMessage } from "./Models";
import type { Attachment } from "./api/AttachmentsAPI";
import * as Toolsets from "./Toolsets";
import type { UserToolCall, UserToolResult } from "./Toolsets";
import * as Prompts from "./prompts/prompts";

// ----------------------------------
// Types
// ----------------------------------

export type MessageSet = {
    id: string;
    chatId: string;
    type: "user" | "ai";
    level: number;
    selectedBlockType: BlockType;
    createdAt: string;
};

export type MessageSetDetail = MessageSet & {
    userBlock: UserBlock;
    toolsBlock: ToolsBlock;
};

export interface Message {
    id: string;
    chatId: string;
    messageSetId: string;
    blockType: BlockType;
    text: string;
    model: string;
    selected: boolean;
    attachments: Attachment[] | undefined;
    state: "streaming" | "idle";
    streamingToken: string | undefined; // says which stream is updating this message
    errorMessage: string | undefined;
    level: number | undefined;
    parts: MessagePart[];
    replyChatId: string | undefined;
    branchedFromId: string | undefined;
    // Token usage and cost
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    costUsd?: number;
    // UI state
    isCollapsed?: boolean;
    // For distinguishing multiple instances of the same model config
    instanceId?: string;
}

export interface MessagePart {
    chatId: string;
    messageId: string;
    level: number;
    content: string;
    toolCalls?: UserToolCall[];
    toolResults?: UserToolResult[];
}

export function createAIMessage({
    chatId,
    messageSetId,
    blockType,
    model,
    selected = false,
    level,
    instanceId,
    isCollapsed = false,
}: {
    chatId: string;
    messageSetId: string;
    blockType: BlockType;
    model: string;
    selected?: boolean;
    level?: number;
    instanceId?: string;
    isCollapsed?: boolean;
}): Omit<Message, "id" | "streamingToken" | "parts"> {
    return {
        chatId,
        blockType,
        text: "",
        model,
        messageSetId,
        selected,
        attachments: undefined,
        state: "streaming",
        errorMessage: undefined,
        level,
        replyChatId: undefined,
        branchedFromId: undefined,
        instanceId,
        isCollapsed,
    };
}

export function createUserMessage({
    chatId,
    messageSetId,
    text,
}: {
    messageSetId: string;
    chatId: string;
    text: string;
}): Omit<Message, "id" | "streamingToken" | "parts" | "attachments"> {
    return {
        chatId,
        blockType: "user",
        text,
        model: "user",
        messageSetId,
        selected: true,
        state: "idle",
        errorMessage: undefined,
        level: undefined,
        replyChatId: undefined,
        branchedFromId: undefined,
    };
}

// a message will have a state of "streaming" or "idle"
// if streaming, it will have a streamingToken
// idle = it finished, user stopped it, or it timed out
// this lets us stop it, retry it, and time it out
// also should there be an "error" state?

export type BlockType = "user" | "tools";

export type UserBlock = {
    type: "user";
    message: Message | undefined;
};
export type ToolsBlock = {
    type: "tools";
    chatMessages: Message[];
    synthesis: Message | undefined;
};
export type Block = UserBlock | ToolsBlock;

function encodeSingleToolsMessage(selectedMessage: Message): LLMMessage[] {
    const result: LLMMessage[] = [];

    if (!selectedMessage.parts.length) {
        return [];
    }

    for (const part of selectedMessage.parts) {
        if (part.toolResults) {
            // Tool response message
            if (part.toolResults.length === 0) {
                console.warn("Tool response message without toolResults", part);
                continue;
            }
            result.push({
                role: "tool_results",
                toolResults: part.toolResults,
            });
        } else {
            // Assistant message
            result.push({
                role: "assistant",
                content: part.content,
                model: selectedMessage.model,
                toolCalls: part.toolCalls || [],
            });
        }
    }

    const lastPart = selectedMessage.parts[selectedMessage.parts.length - 1];
    if (lastPart.toolCalls) {
        // this is an interrupted tool call
        result.push({
            role: "tool_results",
            toolResults: lastPart.toolCalls.map((toolCall) => ({
                id: toolCall.id,
                namespacedToolName: toolCall.namespacedToolName,
                content: Toolsets.TOOL_CALL_INTERRUPTED_MESSAGE,
            })),
        });
    }

    return result;
}

function encodeToolsBlock(block: ToolsBlock): LLMMessage[] {
    const selectedMessages = block.chatMessages.filter((m) => m.selected);
    if (selectedMessages.length === 0) {
        return [];
    }

    // Single selection: use full encoding with tool calls/results
    if (selectedMessages.length === 1) {
        return encodeSingleToolsMessage(selectedMessages[0]);
    }

    // Multiple selections: use perspective format (like synthesis)
    return [
        {
            role: "assistant",
            content: selectedMessages
                .map(
                    (message) =>
                        `<perspective sender="${message.model}">
${message.parts.map((p) => p.content).join("")}
</perspective>`,
                )
                .join("\n\n"),
            toolCalls: [],
        },
    ];
}

function encodeUserBlock(block: UserBlock): LLMMessage[] {
    return [
        {
            role: "user",
            content: block.message?.text ?? "",
            attachments: block.message?.attachments || [],
        },
    ];
}

type LabeledPerspective = {
    message: Message;
    senderLabel: string;
};

function labelPerspectives(messages: Message[]): LabeledPerspective[] {
    // Check if all the models are unique (only present once). If not, we need
    // to label the perspective instances to distinguish them.
    let shouldLabelInstances = false;
    const modelsEncountered = new Set<string>();
    for (const message of messages) {
        if (modelsEncountered.has(message.model)) {
            shouldLabelInstances = true;
            break;
        }
        modelsEncountered.add(message.model);
    }

    if (!shouldLabelInstances) {
        return messages.map((message) => ({
            message,
            senderLabel: message.model,
        }));
    }

    // Track the number of times each model appears
    const modelCounts: Record<string, number> = {};
    const labeledPerspectives: LabeledPerspective[] = [];
    for (const message of messages) {
        const modelCount = modelCounts[message.model] ?? 1;
        labeledPerspectives.push({
            message,
            senderLabel: `${message.model} (${modelCount})`,
        });
        modelCounts[message.model] = modelCount + 1;
    }
    return labeledPerspectives;
}

function encodeToolsBlockForSynthesis(block: ToolsBlock): LLMMessage[] {
    const labeledPerspectives = labelPerspectives(block.chatMessages);

    const result: LLMMessage[] = [
        {
            role: "user",
            content: [
                Prompts.SYNTHESIS_INTERJECTION,
                ...labeledPerspectives
                    .map(({ message, senderLabel }) => {
                        return [
                            `<perspective sender="${senderLabel}">`,
                            // For tools block messages, content is in parts
                            message.parts.map((p) => p.content).join(""),
                            "</perspective>",
                        ];
                    })
                    .flat(),
            ].join("\n\n"),
            attachments: [],
        },
    ];

    return result;
}

function blockIsEmptyTools(block: ToolsBlock): boolean {
    return block.chatMessages.length === 0;
}

export function blockIsEmpty(
    messageSet: MessageSetDetail,
    blockType: BlockType,
): boolean {
    switch (blockType) {
        case "tools":
            return blockIsEmptyTools(messageSet.toolsBlock);
        default:
            throw new Error(
                `Unexpected block type for blockIsEmpty: ${blockType}`,
            );
    }
}

/**
 * Returns the index of the last user message set, or -1 if there are no user message sets.
 * This is used to determine whether to include ephemeral attachments in the LLM conversation.
 * The last message set in the list is not always a user message set, since tools messages
 * can be multi-part (meaning an AI message can be created before reaching llmConversation).
 */
function getLastUserMessageSetIndex(messageSets: MessageSetDetail[]): number {
    for (let i = messageSets.length - 1; i >= 0; i--) {
        if (messageSets[i].selectedBlockType === "user") {
            return i;
        }
    }
    return -1;
}

/**
 * This is the conversation that will be sent to the LLM.
 */
export function llmConversation(messageSets: MessageSetDetail[]): LLMMessage[] {
    const conversation: LLMMessage[] = [];

    const lastUserMessageSetIndex = getLastUserMessageSetIndex(messageSets);

    messageSets.forEach((messageSet, index) => {
        function removeEphemeralAttachments(llmMessages: LLMMessage[]) {
            if (index === lastUserMessageSetIndex) {
                return llmMessages;
            }
            return llmMessages.map((llmMessage) => {
                if (llmMessage.role !== "user") {
                    return llmMessage;
                }
                return {
                    ...llmMessage,
                    attachments: llmMessage.attachments.filter(
                        (a) => !a.ephemeral,
                    ),
                };
            });
        }

        switch (messageSet.selectedBlockType) {
            case "user": {
                if (messageSet.userBlock) {
                    conversation.push(
                        ...removeEphemeralAttachments(
                            encodeUserBlock(messageSet.userBlock),
                        ),
                    );
                }
                break;
            }
            case "tools": {
                if (messageSet.toolsBlock) {
                    conversation.push(
                        ...removeEphemeralAttachments(
                            encodeToolsBlock(messageSet.toolsBlock),
                        ),
                    );
                }
                break;
            }
            default: {
                console.warn(
                    "unknown block type",
                    messageSet.selectedBlockType,
                );
                break;
            }
        }
    });

    return conversation;
}

export function llmConversationForSynthesis(
    messageSets: MessageSetDetail[],
    targetMessageSetId?: string,
): LLMMessage[] {
    // Find the target message set by ID, or fall back to the last one
    const targetIndex = targetMessageSetId
        ? messageSets.findIndex((ms) => ms.id === targetMessageSetId)
        : messageSets.length - 1;
    const targetMessageSet = messageSets[targetIndex];

    if (!targetMessageSet) {
        return [];
    }

    const synthesisMessages = targetMessageSet.toolsBlock
        ? encodeToolsBlockForSynthesis(targetMessageSet.toolsBlock)
        : [];

    // Include conversation history up to (but not including) the target message set
    return [
        ...llmConversation(messageSets.slice(0, targetIndex)),
        ...synthesisMessages,
    ];
}

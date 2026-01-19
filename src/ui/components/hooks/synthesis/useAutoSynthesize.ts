import { useCallback, useEffect, useRef } from "react";
import { useAutoSynthesize as useAutoSynthesizeSettings } from "../useSettings";
import type { ToolsBlock } from "@core/chorus/ChatState";
import * as MessageAPI from "@core/chorus/api/MessageAPI";
import { useParams } from "react-router-dom";

/**
 * Hook to automatically synthesize a tools block when all messages complete, if
 * auto-synthesize is enabled in the settings.
 *
 * @param isEnabled - Whether auto-synthesize should be enabled (e.g. to disable
 * for quick chat windows).
 * @param messageSetId - The ID of the message set to synthesize.
 * @param toolsBlock - The tools block to synthesize.
 */
export function useAutoSynthesize({
    isEnabled,
    messageSetId,
    toolsBlock,
}: {
    isEnabled: boolean;
    messageSetId: string;
    toolsBlock: ToolsBlock;
}) {
    const { chatId } = useParams();
    const autoSynthesize = useAutoSynthesizeSettings();
    const { mutate: selectMessage } = MessageAPI.useSelectMessage();
    const { mutateAsync: selectSynthesis } = MessageAPI.useSelectSynthesis();

    // Track streaming states and trigger synthesis when all messages complete
    const prevStreamingStatesRef = useRef<Map<string, boolean>>(new Map());
    // Track whether synthesis has been triggered for this message set already
    const autoSynthesisTriggeredRef = useRef<Set<string>>(new Set());

    const triggerSynthesis = useCallback(
        async (chatId: string, messageSetId: string) => {
            const { messageId } = await selectSynthesis({
                chatId,
                messageSetId,
            });
            // Also select the message as "in chat"
            if (messageId) {
                selectMessage({ chatId, messageSetId, messageId });
            }
        },
        [selectSynthesis, selectMessage],
    );

    useEffect(() => {
        // Skip if disabled
        if (!isEnabled || !autoSynthesize || !chatId || !messageSetId) return;

        const messages = toolsBlock.chatMessages;
        const hasEnoughMessages = messages.length >= 2;
        const hasSynthesis = !!toolsBlock.synthesis;
        const allIdle = messages.every((m) => m.state === "idle");
        const hasNonEmptyResponses = messages.some(
            (m) =>
                !m.errorMessage && m.parts.some((p) => p.content.trim() !== ""),
        );

        // Check if any message just transitioned from streaming to idle
        const anyJustCompleted = messages.some((m) => {
            const wasStreaming = prevStreamingStatesRef.current.get(m.id);
            return wasStreaming && m.state === "idle";
        });

        // Update refs for next render
        messages.forEach((m) => {
            prevStreamingStatesRef.current.set(m.id, m.state === "streaming");
        });

        // Trigger if: 2+ messages, no synthesis, all idle, something just completed,
        // has real responses, not already triggered
        if (
            hasEnoughMessages &&
            !hasSynthesis &&
            allIdle &&
            anyJustCompleted &&
            hasNonEmptyResponses &&
            !autoSynthesisTriggeredRef.current.has(messageSetId)
        ) {
            console.debug("[auto-synthesize] triggering synthesis...");
            autoSynthesisTriggeredRef.current.add(messageSetId);
            void triggerSynthesis(chatId, messageSetId);
        }
    }, [
        autoSynthesize,
        isEnabled,
        toolsBlock.chatMessages,
        toolsBlock.synthesis,
        messageSetId,
        chatId,
        triggerSynthesis,
    ]);
}

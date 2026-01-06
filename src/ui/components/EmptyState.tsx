import { SplitIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useShortcutDisplay } from "@core/utilities/ShortcutsAPI";
import { comboToDisplayString } from "@core/utilities/Shortcuts";
import { AnimatePresence, motion } from "framer-motion";

const useEmptyStateShortcuts = () => {
    const newProjectDisplay = useShortcutDisplay("new-project", true);
    const commandMenuDisplay = useShortcutDisplay("command-menu", true);
    const modelPickerDisplay = useShortcutDisplay("model-picker", true);
    const shareChatDisplay = useShortcutDisplay("share-chat", true);
    const toggleSidebarDisplay = useShortcutDisplay("toggle-sidebar", true);
    const toolsBoxDisplay = useShortcutDisplay("tools-box", true);
    const settingsDisplay = useShortcutDisplay("settings", true);
    const quickChatDisplay = useShortcutDisplay("ambient-chat", true);

    return useMemo(
        () =>
            ({
                newProject: newProjectDisplay,
                commandMenu: commandMenuDisplay,
                modelPicker: modelPickerDisplay,
                shareChat: shareChatDisplay,
                toggleSidebar: toggleSidebarDisplay,
                toolsBox: toolsBoxDisplay,
                settings: settingsDisplay,
                quickChat: quickChatDisplay,
            }) as const,
        [
            newProjectDisplay,
            commandMenuDisplay,
            modelPickerDisplay,
            shareChatDisplay,
            toggleSidebarDisplay,
            toolsBoxDisplay,
            settingsDisplay,
            quickChatDisplay,
        ],
    );
};

const useEmptyStateTips = () => {
    const shortcuts = useEmptyStateShortcuts();
    return useMemo(
        () =>
            [
                shortcuts.commandMenu &&
                    `Press ${shortcuts.commandMenu} to access commands and search.`,
                shortcuts.newProject &&
                    `Create a project with ${shortcuts.newProject} to share context across related chats.`,
                shortcuts.modelPicker &&
                    `Press ${shortcuts.modelPicker} to switch models.`,
                "Drag and drop images, documents, or other files into the chat.",
                shortcuts.shareChat &&
                    `Press ${shortcuts.shareChat} to share your chat as a web page.`,
                shortcuts.toggleSidebar &&
                    `Toggle the sidebar with ${shortcuts.toggleSidebar}`,
                shortcuts.settings &&
                    `Open settings with ${shortcuts.settings}`,
                shortcuts.toolsBox &&
                    `Press ${shortcuts.toolsBox} to give models access to tools.`,
                "Paste in a URL and Chorus will read it for you.",
                <>
                    Click the{" "}
                    <SplitIcon className="w-3 h-3 inline-block mx-1" /> icon to
                    fork your chat.
                </>,
                shortcuts.quickChat &&
                    `Press ${shortcuts.quickChat} to open an Ambient Chat.`,
                "Click to choose the active message to keep in conversation.",
                `Use ${comboToDisplayString("Shift+Click", true)} to select multiple messages to keep in conversation.`,
            ].filter((tip): tip is string | JSX.Element => tip !== null),
        [shortcuts],
    );
};

export function EmptyState() {
    const tips = useEmptyStateTips();
    const [randomTipIndex, setRandomTipIndex] = useState(
        Math.floor(Math.random() * tips.length),
    );

    // Change the tip every 15 seconds
    useEffect(() => {
        const timer = setInterval(() => {
            setRandomTipIndex(Math.floor(Math.random() * tips.length));
        }, 15000);
        return () => clearInterval(timer);
    }, [tips.length]);

    const randomTip = tips[randomTipIndex];

    return (
        <div className="absolute bottom-0 left-0 right-0 pb-8 flex justify-center">
            <div className="space-y-4 max-w-3xl">
                <div className="text-helper space-y-2 font-[350] text-sm">
                    <AnimatePresence mode="wait">
                        <motion.p
                            key={randomTipIndex}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="flex items-center"
                        >
                            Tip: {randomTip}
                        </motion.p>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

import { ChevronDownIcon } from "lucide-react";

/**
 * Section heading for a list of models that acts as an accordion header.
 * Clickable to expand/collapse the section, with chevron indicator and optional
 * action buttons.
 */
export function SectionHeading({
    title,
    isVisible,
    onToggleVisibility,
    rightButton,
}: {
    title: string;
    isVisible: boolean;
    onToggleVisibility: () => void;
    rightButton?: React.ReactNode;
}) {
    return (
        <div className="flex items-center justify-between w-full min-h-8">
            <button
                onClick={(e) => {
                    e.preventDefault();
                    onToggleVisibility();
                }}
                className="flex items-center gap-1"
                title={isVisible ? `Collapse ${title}` : `Expand ${title}`}
            >
                <span>{title}</span>
                <div className="flex items-center w-3.5 h-3.5 overflow-hidden">
                    <ChevronDownIcon
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${
                            isVisible ? "" : "-rotate-90"
                        }`}
                    />
                </div>
            </button>
            <div className="flex items-center gap-1 tracking-normal">
                {/* Show right button only when section is visible */}
                {isVisible && rightButton}
            </div>
        </div>
    );
}

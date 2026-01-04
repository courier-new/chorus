import * as ModelGroupsAPI from "@core/chorus/api/ModelGroupsAPI";
import { CommandGroup } from "../ui/command";
import { SectionHeading } from "./SectionHeading";
import { ReadonlyModelGroupItem } from "./ModelGroupCommandItem";

export function ActiveReadOnlyModelGroupSection({
    isGroupsSectionVisible,
    onToggleGroupsSectionVisibility,
}: {
    isGroupsSectionVisible: boolean;
    onToggleGroupsSectionVisibility: () => void;
}) {
    const { data: activeGroup } = ModelGroupsAPI.useActiveModelGroup();

    if (!activeGroup) return null;

    return (
        <CommandGroup
            heading={
                <div className="flex items-center justify-between w-full">
                    <SectionHeading
                        title="Active Group"
                        isVisible={isGroupsSectionVisible}
                        onToggleVisibility={onToggleGroupsSectionVisibility}
                    />
                </div>
            }
        >
            {isGroupsSectionVisible && (
                <ReadonlyModelGroupItem group={activeGroup} />
            )}
        </CommandGroup>
    );
}

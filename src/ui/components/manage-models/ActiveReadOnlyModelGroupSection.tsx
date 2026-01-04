import * as ModelGroupsAPI from "@core/chorus/api/ModelGroupsAPI";
import { useShiftKey } from "../hooks/useShiftKey";
import { CommandGroup, CommandItem } from "../ui/command";
import { DotIcon } from "lucide-react";

export function ActiveModelGroupSection() {
    const { data: activeGroup } = ModelGroupsAPI.useActiveModelGroup();
    const instanceCount = activeGroup?.modelInstances.length ?? 0;

    const { mutate: clearActiveModelGroup } =
        ModelGroupsAPI.useClearActiveModelGroup();

    const shiftKeyEnabled = useShiftKey();

    if (!activeGroup) return null;

    return (
        <CommandGroup className="border-b border-border py-2 sticky top-0">
            <CommandItem
                className="group justify-between"
                onSelect={() => clearActiveModelGroup()}
            >
                <div className="flex flex-col gap-1 -mb-0.5">
                    <strong className="font-medium text-xs font-geist-mono text-muted-foreground tracking-wider uppercase">
                        Active Group
                    </strong>
                    <span className="text-foreground">
                        {activeGroup.name}
                        <DotIcon className="inline-block !w-4 !h-4 text-muted-foreground" />
                        <span className="text-muted-foreground font-light">
                            {instanceCount} models
                        </span>
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground opacity-0 group-data-[selected=true]:opacity-100 transition-opacity">
                        ⤶ to deselect
                        {!shiftKeyEnabled &&
                            " (use ⇧ to update model selections)"}
                    </p>
                    {shiftKeyEnabled && (
                        <span className="bg-accent-500 animate-accent-pulse rounded-full px-1.5 py-1 text-primary-foreground text-xs font-medium">
                            Updating
                        </span>
                    )}
                </div>
            </CommandItem>
        </CommandGroup>
    );
}

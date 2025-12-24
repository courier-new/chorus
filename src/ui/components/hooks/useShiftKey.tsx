import { useEffect, useRef } from "react";

export function useShiftKey(): React.MutableRefObject<boolean> {
    const shiftKeyRef = useRef<boolean>(false);

    // Track shift key state
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Shift") {
                shiftKeyRef.current = true;
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === "Shift") {
                shiftKeyRef.current = false;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
        };
    }, []);

    return shiftKeyRef;
}

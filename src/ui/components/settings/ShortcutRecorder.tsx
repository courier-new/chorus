import React, { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "../ui/input";
import { cn } from "@ui/lib/utils";
import {
    ValidationResult,
    comboToDisplayString,
    keyFromEvent,
} from "@core/utilities/Shortcuts";

interface ShortcutRecorderProps {
    /** Current value in binding format (e.g., "Meta+Shift+K") */
    value: string;
    /** Called with new value in binding string format */
    onChange: (binding: string) => void;
    /** Validation function called when a shortcut is recorded */
    onValidate?: (binding: string[]) => ValidationResult;
    /** Error message to display */
    error?: string;
    /** Warning message to display */
    warning?: string;
    /** Whether the input should be disabled */
    disabled?: boolean;
    /** Additional class names */
    className?: string;
    /** Artificial value to force a reset of the recorder */
    forceReset?: number;
}

export default function ShortcutRecorder({
    value,
    onChange,
    onValidate,
    error: externalError,
    warning,
    disabled = false,
    className,
    forceReset,
}: ShortcutRecorderProps) {
    const isFocusedRef = useRef<boolean>(false);
    const [recording, setRecording] = useState<boolean>(false);
    const [displayValue, setDisplayValue] = useState<string>(
        comboToDisplayString(value, true),
    );
    const [validationError, setValidationError] = useState<
        string | undefined
    >();
    const keysRef = useRef<Set<string>>(new Set());

    // If forceReset or value changes externally (e.g. reset button), reset the display
    useEffect(() => {
        console.log("Resetting shortcut recorder");
        setRecording(false);
        setDisplayValue(comboToDisplayString(value, true));
        setValidationError(undefined);
    }, [value, forceReset]);

    const startRecording = useCallback(() => {
        setRecording(true);
        keysRef.current.clear();
        setValidationError(undefined);
    }, []);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === " " && isFocusedRef.current && !recording) {
                e.preventDefault();
                return;
            }
            if (disabled || !recording) return;
            // Allow Tab and Escape to bubble up to native/parent handlers
            if (e.key === "Tab" || e.key === "Escape") return;

            e.preventDefault();
            keysRef.current.add(keyFromEvent(e));

            setDisplayValue(
                comboToDisplayString(
                    Array.from(keysRef.current).join("+"),
                    true,
                ),
            );
        },
        [disabled, recording],
    );

    const handleKeyUp = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (disabled) return;

            if (!recording) {
                // If the key was "Return" or "Space", we should start recording.
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    startRecording();
                }
                // Otherwise, key down is a no-op.
                return;
            }

            setRecording(false);

            const validationResult = onValidate?.(Array.from(keysRef.current));
            if (validationResult && !validationResult.valid) {
                setValidationError(validationResult.error);
                return;
            }

            onChange(Array.from(keysRef.current).join("+"));
        },
        [disabled, recording, onValidate, onChange, startRecording],
    );

    const handleFocus = useCallback(() => {
        isFocusedRef.current = true;
    }, []);

    const handleClick = useCallback(() => {
        if (disabled) return;
        startRecording();
    }, [disabled, startRecording]);

    // We stop recording and restore the original value in case the user
    // manually blurs (e.g. clicks away) while still holding down the original record key
    const handleBlur = useCallback(() => {
        isFocusedRef.current = false;
        keysRef.current.clear();
        setRecording(false);
        if (!displayValue) {
            setDisplayValue(comboToDisplayString(value, true));
        }
    }, [displayValue, value]);

    const errorMessage = externalError ?? validationError;
    const hasError = Boolean(errorMessage);
    const hasWarning = Boolean(warning) && !hasError;

    return (
        <div className={cn("space-y-1", className)}>
            <Input
                type="text"
                value={displayValue}
                onClick={handleClick}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                onKeyUp={handleKeyUp}
                readOnly
                isError={hasError}
                isWarning={hasWarning}
                disabled={disabled}
                placeholder={recording ? "Recording..." : "Record"}
                aria-label="Shortcut recorder"
                className={cn(
                    "font-mono text-center text-base text-muted-foreground placeholder:text-xs placeholder:opacity-70",
                    disabled && "opacity-50 cursor-not-allowed",
                    recording && "focus:ring-2 focus:ring-primary",
                )}
            />
            {hasError && <p className="text-xs text-red-500">{errorMessage}</p>}
            {hasWarning && <p className="text-xs text-yellow-500">{warning}</p>}
        </div>
    );
}

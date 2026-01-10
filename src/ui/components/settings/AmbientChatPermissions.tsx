import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@ui/components/ui/button";
import { Loader2, BadgeCheck, ExternalLink } from "lucide-react";
import { checkScreenRecordingPermission } from "tauri-plugin-macos-permissions-api";

interface AmbientChatPermissionsStatus {
    screen_recording?: boolean;
    error?: string;
}

export function AmbientChatPermissions() {
    const [settings, setSettings] = useState<AmbientChatPermissionsStatus>({
        screen_recording: false,
    });
    const [loading, setLoading] = useState(true);

    const checkSettings = async () => {
        try {
            const screenRecordingStatus =
                await checkScreenRecordingPermission();
            setSettings({
                screen_recording: screenRecordingStatus,
            });
        } catch (error) {
            console.error(
                "Failed to check screen recording permission:",
                error,
            );
            setSettings({ error: String(error) });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void checkSettings();
    }, []);

    const openSettings = async () => {
        try {
            await invoke("open_screen_recording_settings");
        } catch (error) {
            console.error("Failed to open settings:", error);
        }
    };

    return (
        <div className="flex flex-col space-y-2">
            <label className="font-semibold">Permissions</label>
            {loading ? (
                <div className="inline-flex items-center gap-2 pb-4">
                    <Loader2 className="h-4 w-4 animate-spin" /> Checking
                    permissions...
                </div>
            ) : settings.error ? (
                <div className="text-destructive pb-4">{settings.error}</div>
            ) : (
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="flex items-start gap-3">
                            {settings.screen_recording ? (
                                <BadgeCheck className="h-4 w-4 text-green-500 mt-1" />
                            ) : (
                                <div className="h-4 w-4 rounded-full border border-destructive mt-1" />
                            )}
                            <div>
                                <span className="font-medium">
                                    Screen recording
                                </span>
                                <p className="text-sm text-muted-foreground">
                                    Required to capture screenshots for vision
                                    features
                                </p>
                            </div>
                        </div>
                        {!settings.screen_recording && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => void openSettings()}
                                className="gap-1"
                            >
                                <ExternalLink className="h-3 w-3" />
                                Open OS settings
                            </Button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

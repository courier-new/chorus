import * as AppMetadataAPI from "@core/chorus/api/AppMetadataAPI";
import ApiKeysForm from "./ApiKeysForm";
import { useCallback } from "react";
import { SettingsTabHeader } from "./SettingsTabHeader";

interface ApiKeysTabContentProps {
    apiKeys: Record<string, string>;
    onApiKeyChange: (provider: string, value: string) => Promise<void>;
    lmStudioBaseUrl: string;
    onLmStudioBaseUrlChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ApiKeysSettings({
    apiKeys,
    onApiKeyChange,
    lmStudioBaseUrl,
    onLmStudioBaseUrlChange,
}: ApiKeysTabContentProps) {
    const providerVisibility = AppMetadataAPI.useProviderVisibility();
    const { mutate: setProviderVisibility } =
        AppMetadataAPI.useSetProviderVisibility();

    const handleProviderVisibilityChange = useCallback(
        (provider: string, visible: boolean) => {
            setProviderVisibility({ provider, visible });
        },
        [setProviderVisibility],
    );

    return (
        <div className="space-y-6">
            <SettingsTabHeader
                title="API Keys"
                description="Enter your API keys for the providers you want to use. Models for each provider will become available once you add a valid key. Toggle off providers to hide them from the model selector."
            />
            <div className="space-y-4">
                <ApiKeysForm
                    apiKeys={apiKeys}
                    onApiKeyChange={onApiKeyChange}
                    providerVisibility={providerVisibility}
                    onProviderVisibilityChange={handleProviderVisibilityChange}
                    lmStudioBaseUrl={lmStudioBaseUrl}
                    onLmStudioBaseUrlChange={onLmStudioBaseUrlChange}
                />
            </div>
        </div>
    );
}

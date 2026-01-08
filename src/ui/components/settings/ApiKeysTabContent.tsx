import * as AppMetadataAPI from "@core/chorus/api/AppMetadataAPI";
import ApiKeysForm from "./ApiKeysForm";
import { useCallback } from "react";

interface ApiKeysTabContentProps {
    apiKeys: Record<string, string>;
    onApiKeyChange: (provider: string, value: string) => Promise<void>;
    lmStudioBaseUrl: string;
    onLmStudioBaseUrlChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ApiKeysTabContent({
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
            <div>
                <h2 className="text-2xl font-semibold mb-2">API Keys</h2>
                <p className="text-sm text-muted-foreground">
                    Enter your API keys for the providers you want to use.
                    Models for each provider will become available once you add
                    a valid key. Toggle off providers to hide them from the
                    model selector.
                </p>
            </div>
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

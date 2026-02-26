/**
 * [PROPS]: None
 * [EMITS]: None
 * [POS]: Agent Browser 模块布局（Outlet 容器 + API Key 上下文）
 */

import { useState } from 'react';
import { Outlet, useMatch } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@moryflow/ui';
import { resolveActiveApiKeySelection, useApiKeys } from '@/features/api-keys';
import { ApiKeySelector } from '@/features/playground-shared';
import { PlaygroundErrorBoundary } from '@/features/agent-browser-playground';

export type AgentBrowserOutletContext = {
  apiKey: string;
  hasApiKeys: boolean;
  sessionId: string;
  setSessionId: (sessionId: string) => void;
};

export default function AgentBrowserLayoutPage() {
  const { data: apiKeys = [], isLoading: isLoadingKeys } = useApiKeys();
  const [selectedKeyId, setSelectedKeyId] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');
  const isAgentChat = useMatch('/agent-browser/agent');

  const { effectiveKeyId, apiKeyValue, hasActiveKey } = resolveActiveApiKeySelection(
    apiKeys,
    selectedKeyId
  );
  const apiKey = apiKeyValue;
  const hasApiKeys = hasActiveKey;

  const handleKeyChange = (keyId: string) => {
    setSelectedKeyId(keyId);
    setSessionId('');
  };

  const outletContext: AgentBrowserOutletContext = {
    apiKey,
    hasApiKeys,
    sessionId,
    setSessionId,
  };

  if (isLoadingKeys) {
    return (
      <div className="container py-6">
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">Loading...</CardContent>
        </Card>
      </div>
    );
  }

  if (isAgentChat) {
    return (
      <PlaygroundErrorBoundary>
        <div className="h-full">
          <Outlet context={outletContext} />
        </div>
      </PlaygroundErrorBoundary>
    );
  }

  return (
    <PlaygroundErrorBoundary>
      <div className="container py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Agent Browser</h1>
          <p className="mt-1 text-muted-foreground">
            Run browser sessions and agent tasks with public APIs.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>API Key</CardTitle>
            <CardDescription>Select an active API key to authorize requests.</CardDescription>
          </CardHeader>
          <CardContent>
            <ApiKeySelector
              apiKeys={apiKeys}
              selectedKeyId={effectiveKeyId}
              onKeyChange={handleKeyChange}
              disabled={!hasActiveKey}
            />
          </CardContent>
        </Card>

        <Outlet context={outletContext} />
      </div>
    </PlaygroundErrorBoundary>
  );
}

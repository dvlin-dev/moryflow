/**
 * [PROPS]: None
 * [EMITS]: None
 * [POS]: Agent Browser 模块布局（API Key 选择 + Outlet）
 */

import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@anyhunt/ui';
import { useApiKeys } from '@/features/api-keys';
import { ApiKeySelector } from '@/features/playground-shared';
import { PlaygroundErrorBoundary } from '@/features/agent-browser-playground';

export type AgentBrowserOutletContext = {
  apiKeyId: string;
  sessionId: string;
  setSessionId: (sessionId: string) => void;
};

export default function AgentBrowserLayoutPage() {
  const { data: apiKeys = [], isLoading: isLoadingKeys } = useApiKeys();
  const [selectedKeyId, setSelectedKeyId] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');

  const activeKeyId = selectedKeyId || apiKeys.find((key) => key.isActive)?.id || '';

  const handleKeyChange = (keyId: string) => {
    setSelectedKeyId(keyId);
    setSessionId('');
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

  return (
    <PlaygroundErrorBoundary>
      <div className="container py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Agent Browser</h1>
          <p className="mt-1 text-muted-foreground">
            Run browser sessions and agent tasks with console proxy APIs.
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
              selectedKeyId={activeKeyId}
              onKeyChange={handleKeyChange}
              disabled={apiKeys.length === 0}
            />
          </CardContent>
        </Card>

        <Outlet
          context={{
            apiKeyId: activeKeyId,
            sessionId,
            setSessionId,
          }}
        />
      </div>
    </PlaygroundErrorBoundary>
  );
}

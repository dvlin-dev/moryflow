/**
 * [PROPS]: None
 * [EMITS]: None
 * [POS]: Console Agent Browser Playground 路由页
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@anyhunt/ui';
import { useApiKeys } from '@/features/api-keys';
import { ApiKeySelector } from '@/features/playground-shared';
import {
  AgentRunPanel,
  BrowserSessionPanel,
  FlowRunner,
  PlaygroundErrorBoundary,
} from '@/features/agent-browser-playground';

export default function AgentBrowserPlaygroundPage() {
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
          <h1 className="text-2xl font-semibold">Agent Browser Playground</h1>
          <p className="mt-1 text-muted-foreground">
            Test Browser sessions and Agent runs end-to-end with console proxy APIs.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>API Key</CardTitle>
            <CardDescription>
              Select an active API key to authorize playground calls.
            </CardDescription>
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

        <FlowRunner apiKeyId={activeKeyId} onSessionChange={setSessionId} />

        <div className="grid gap-6 lg:grid-cols-2">
          <BrowserSessionPanel
            apiKeyId={activeKeyId}
            sessionId={sessionId}
            onSessionChange={setSessionId}
          />
          <AgentRunPanel apiKeyId={activeKeyId} />
        </div>
      </div>
    </PlaygroundErrorBoundary>
  );
}

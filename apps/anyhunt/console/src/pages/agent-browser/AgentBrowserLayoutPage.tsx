/**
 * [PROPS]: None
 * [EMITS]: None
 * [POS]: Agent Browser 模块布局（Outlet 容器 + API Key 上下文）
 */

import { useState } from 'react';
import { Outlet, useMatch } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@anyhunt/ui';
import { useApiKeys } from '@/features/api-keys';
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

  const activeKeyId =
    selectedKeyId || apiKeys.find((key) => key.isActive)?.id || apiKeys[0]?.id || '';
  const activeKey = apiKeys.find((key) => key.id === activeKeyId) ?? null;
  const apiKey = activeKey?.key ?? '';
  const hasApiKeys = apiKeys.length > 0;

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
      <div className={isAgentChat ? 'h-full' : 'container py-6 space-y-6'}>
        {!isAgentChat && (
          <>
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
                  selectedKeyId={activeKeyId}
                  onKeyChange={handleKeyChange}
                  disabled={apiKeys.length === 0}
                />
              </CardContent>
            </Card>
          </>
        )}

        <Outlet
          context={{
            apiKey,
            hasApiKeys,
            sessionId,
            setSessionId,
          }}
        />
      </div>
    </PlaygroundErrorBoundary>
  );
}

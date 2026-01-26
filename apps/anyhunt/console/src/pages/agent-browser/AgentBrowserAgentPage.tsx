/**
 * [PROPS]: None
 * [EMITS]: None
 * [POS]: Agent Browser 对话页（仅消息列表与输入）
 */

import { useOutletContext } from 'react-router-dom';
import { AgentRunPanel } from '@/features/agent-browser-playground';
import type { AgentBrowserOutletContext } from './AgentBrowserLayoutPage';
import { AgentBrowserEmptyState } from './AgentBrowserEmptyState';

export default function AgentBrowserAgentPage() {
  const { apiKey, hasApiKeys } = useOutletContext<AgentBrowserOutletContext>();

  if (!hasApiKeys) {
    return (
      <AgentBrowserEmptyState
        title="No API keys yet"
        description="Create an API key to start chatting with Agent Browser."
        actionLabel="Create API Key →"
        actionHref="/api-keys"
      />
    );
  }

  return <AgentRunPanel apiKey={apiKey} />;
}
